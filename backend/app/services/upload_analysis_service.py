"""업로드된 사전 녹화 영상 분석: 프레임 추출 → 추론 → 판정 집계 → 리포트 저장.

live_session.LiveSession._process 와 같은 "프레임 → AnalysisLog + RuleEngine → Event" 로직을
WebSocket 없이 오프라인으로 반복한다. 질문 구간이 없으므로 영상 전체를 세션에 딸린 질문 하나에 대한
답변으로 취급하고, 끝나면 session_service/report_service/stt_service 를 그대로 재사용한다.
"""

import asyncio
import logging
import subprocess
import tempfile
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

from app.analysis.client import InferenceClient
from app.analysis.rules import RuleEngine, gaze_state
from app.analysis.types import FrameResult
from app.config import Settings, get_settings
from app.db import SessionLocal
from app.models import AnalysisLog, Event, Session
from app.services import recording_service as rec
from app.services import report_service, stt_service
from app.services import session_service as svc

log = logging.getLogger("selffit.upload_analysis")

FRAME_INTERVAL_MS = 333  # 실시간 세션과 동일한 3fps 상당 간격


def _extract_frames(video_path: Path, out_dir: Path) -> list[Path]:
    fps = 1000 / FRAME_INTERVAL_MS
    pattern = out_dir / "frame_%06d.jpg"
    r = subprocess.run(  # noqa: PLW1510
        [
            "ffmpeg",
            "-nostdin",
            "-y",
            "-loglevel",
            "error",
            "-i",
            str(video_path),
            "-vf",
            f"fps={fps}",
            "-q:v",
            "3",
            str(pattern),
        ],
        capture_output=True,
        text=True,
        timeout=600,
        stdin=subprocess.DEVNULL,
    )
    if r.returncode != 0:
        log.warning("프레임 추출 실패 %s: %s", video_path, r.stderr[:300])
        return []
    return sorted(out_dir.glob("frame_*.jpg"))


def _save_log(db, session_id: uuid.UUID, r: FrameResult, q_index: int | None, settings: Settings) -> None:
    db.add(
        AnalysisLog(
            session_id=session_id,
            ts_ms=r.ts_ms,
            question_index=q_index,
            face_found=r.face_found,
            gaze_yaw=r.gaze.yaw_deg if r.gaze else None,
            gaze_pitch=r.gaze.pitch_deg if r.gaze else None,
            gaze_state=gaze_state(r, settings) if r.face_found is not None else None,
            emotion_probs=r.emotion.probs if r.emotion else None,
            emotion_top=r.emotion.top if r.emotion else None,
            attention_probs=r.attention.probs if r.attention else None,
            attention_top=r.attention.top if r.attention else None,
        )
    )
    db.commit()


async def _analyze(
    db,
    session_id: uuid.UUID,
    frames: list[Path],
    client: InferenceClient,
    settings: Settings,
    q_index: int | None,
) -> None:
    rules = RuleEngine(settings)
    for idx, path in enumerate(frames):
        jpeg = path.read_bytes()
        ts_ms = idx * FRAME_INTERVAL_MS
        try:
            result = await asyncio.wait_for(
                client.analyze(str(session_id), jpeg, ts_ms), timeout=settings.inference_timeout_ms / 1000
            )
        except Exception as e:  # noqa: BLE001 - 이 프레임만 실패 처리하고 계속 진행
            log.warning("업로드 프레임 분석 실패 ts_ms=%s: %s", ts_ms, e)
            result = FrameResult(ts_ms=ts_ms, face_found=None)

        _save_log(db, session_id, result, q_index, settings)
        events = rules.feed(result) if result.face_found is not None else []
        for ev in events:
            db.add(
                Event(
                    session_id=session_id,
                    ts_ms=ev.ts_ms,
                    question_index=q_index,
                    type=ev.type,
                    severity=ev.severity,
                    message=ev.message,
                    payload=ev.payload,
                )
            )
        if events:
            db.commit()


async def run(session_id: uuid.UUID, video_path: Path, client: InferenceClient) -> None:
    """업로드 endpoint 의 BackgroundTasks 로 실행된다.

    요청 스코프의 db 세션은 응답이 나간 뒤 이미 닫혀 있으므로 stt_service/llm_service 와 같은 방식으로
    새 SessionLocal 을 연다.
    """
    settings = get_settings()
    with SessionLocal() as db:
        s = db.get(Session, session_id)
        if s is None:
            log.warning("업로드 분석 대상 세션 없음: %s", session_id)
            return

        duration_ms = await asyncio.to_thread(rec.duration_ms, video_path) or 0
        question = s.questions[0] if s.questions else None

        t0 = datetime.now(UTC)
        s.started_at = t0
        if question is not None:
            question.started_at = t0
            question.ended_at = t0 + timedelta(milliseconds=duration_ms)
        db.commit()

        try:
            with tempfile.TemporaryDirectory(prefix=f"selffit-upload-{session_id}-") as tmp:
                frames = await asyncio.to_thread(_extract_frames, video_path, Path(tmp))
                q_index = question.order_index if question is not None else None
                await _analyze(db, session_id, frames, client, settings, q_index)
        except Exception:  # noqa: BLE001 - 분석이 실패해도 빈 결과로 리포트를 만들어 폴링이 멈추지 않게 한다
            log.exception("업로드 영상 분석 실패: %s", session_id)

        svc.finish_session(db, s)
        s.finished_at = t0 + timedelta(milliseconds=duration_ms)  # 처리 시간이 아닌 영상 길이를 총 시간으로
        db.commit()
        report_service.save_report(db, s)
        stt_service.schedule(session_id, client)
