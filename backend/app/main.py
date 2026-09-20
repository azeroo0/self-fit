import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.analysis.client import build_client
from app.config import get_settings
from app.db import Base, SessionLocal, engine, is_sqlite
from app.models import Question
from app.routers import health, me, questions, recordings, reports, sessions, ws

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

SEED_QUESTIONS = [
    ("1분간 자기소개를 해주세요.", "general", "general"),
    ("이 직무에 지원한 동기를 말씀해주세요.", "motivation", "general"),
    ("본인의 강점과 약점은 무엇인가요?", "general", "general"),
    ("협업 중 갈등을 해결했던 경험이 있나요?", "experience", "general"),
    ("마지막으로 하고 싶은 말씀이 있다면 해주세요.", "closing", "general"),
    ("대용량 트래픽 처리 경험이 있다면 설명해주세요.", "experience", "backend"),
    ("장애 대응 경험에 대해 말씀해주세요.", "experience", "backend"),
    ("데이터베이스 성능 최적화를 해본 경험이 있나요?", "experience", "backend"),
    ("API 설계 시 가장 중요하게 생각하는 것은 무엇인가요?", "general", "backend"),
    ("사용자 경험(UX) 개선 사례에 대해 말씀해주세요.", "experience", "frontend"),
    ("크로스 브라우저 이슈를 해결한 경험이 있나요?", "experience", "frontend"),
    ("웹 성능 최적화를 위해 어떤 노력을 하셨나요?", "experience", "frontend"),
    ("상태 관리 라이브러리를 선택할 때 고려하는 기준은 무엇인가요?", "general", "frontend"),
    ("모델 성능 개선을 위해 시도했던 방법을 설명해주세요.", "experience", "ai"),
    ("데이터 전처리 과정에서 겪었던 어려움은 무엇인가요?", "experience", "ai"),
    ("모델을 실제 서비스에 배포해본 경험이 있나요?", "experience", "ai"),
    ("최근 관심 있는 AI 기술 트렌드는 무엇인가요?", "general", "ai"),
    ("사용자 리서치를 바탕으로 디자인을 개선한 경험이 있나요?", "experience", "design"),
    ("개발자와 협업하며 겪은 어려움과 해결 방법을 말씀해주세요.", "experience", "design"),
    ("디자인 시스템을 구축하거나 활용한 경험이 있나요?", "experience", "design"),
    ("피드백을 받고 디자인을 수정했던 경험을 설명해주세요.", "general", "design"),
    ("업로드한 영상 전체에 대한 답변", "upload", "upload"),
]


def init_sqlite_dev_db() -> None:
    """로컬 SQLite 전용: 테이블 생성 + 질문 seed. Supabase 는 db/migrations/*.sql 로."""
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        if db.scalar(select(Question).limit(1)) is None:
            db.add_all(
                [
                    Question(text=t, category=c, track=trk, sort_order=i + 1)
                    for i, (t, c, trk) in enumerate(SEED_QUESTIONS)
                ]
            )
            db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    if is_sqlite():
        init_sqlite_dev_db()
    app.state.inference_client = build_client(
        settings.inference_backend,
        url=settings.inference_url,
        token=settings.inference_token,
        timeout_ms=settings.inference_timeout_ms,
    )
    logging.getLogger("selffit").info(
        "db=%s inference=%s", engine.url.get_backend_name(), settings.inference_backend
    )
    yield
    await app.state.inference_client.close()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="SelfFit Backend", version="0.2.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    for r in (health, me, questions, sessions, reports, recordings, ws):
        app.include_router(r.router)
    return app


app = create_app()
