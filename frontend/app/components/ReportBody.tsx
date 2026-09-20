'use client';

import React from 'react';
import { formatTime, isRunning, type Report } from '@/lib/report';

type ReportBodyProps = {
  overview: Report['overview'];
  bars: { label: string; value: number }[];
  feedback: { q: string; note: string }[];
  noMetrics: boolean;
  jobs?: Report['status'];
  transcript: NonNullable<Report['transcript']>;
  llm: Report['llm'];
  recording: Report['recording'];
  timeline: NonNullable<Report['timeline']>;
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
  videoSrc: string | null;
  videoFailed: boolean;
  onVideoError?: () => void;
  actions: React.ReactNode;
};

const statValueOf = (noMetrics: boolean, value: React.ReactNode) =>
  noMetrics ? (
    <div className="v" style={{ fontSize: 15 }}>데이터 없음</div>
  ) : (
    <div className="v num">{value}</div>
  );

export function ReportBody({
  overview,
  bars,
  feedback,
  noMetrics,
  jobs,
  transcript,
  llm,
  recording,
  timeline,
  videoRef,
  videoSrc,
  videoFailed,
  onVideoError,
  actions,
}: ReportBodyProps) {
  const canPlay = !!recording && jobs?.recording === 'done';

  const seekTo = (ms: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = ms / 1000;
    void v.play().catch(() => {});
  };

  return (
    <>
      {isRunning(jobs?.llm) && (
        <div className="question-card">
          <div className="question-index">AI 분석</div>
          <p className="question-text">답변 분석 중… 완료되면 총평이 자동으로 나타납니다.</p>
        </div>
      )}

      {jobs?.stt === 'failed' && (
        <div className="question-card">
          <div className="question-index">음성 분석</div>
          <p className="question-text">음성 분석에 실패했어요. 행동 지표만 표시합니다.</p>
        </div>
      )}

      {jobs?.llm === 'failed' && (
        <div className="question-card">
          <div className="question-index">AI 분석</div>
          <p className="question-text">AI 총평 생성에 실패했어요. 기본 피드백만 표시합니다.</p>
        </div>
      )}

      <div className="report-stat-grid">
        <div className="report-stat"><div className="k">시선 유지율</div>{statValueOf(noMetrics, `${Math.round((overview.gaze_hold_rate ?? 0) * 100)}%`)}</div>
        <div className="report-stat"><div className="k">안정 표정 비율</div>{statValueOf(noMetrics, `${Math.round((overview.stable_emotion_rate ?? 0) * 100)}%`)}</div>
        <div className="report-stat"><div className="k">집중 유지율</div>{statValueOf(noMetrics, `${Math.round((overview.attention_rate ?? 0) * 100)}%`)}</div>
        <div className="report-stat"><div className="k">알림 횟수</div>{statValueOf(noMetrics, `${overview.event_count ?? 0}회`)}</div>
      </div>

      <div className="question-card">
        <div className="question-index">질문별 시선 유지율</div>
        {noMetrics ? (
          <p className="question-text">행동 지표가 측정되지 않았어요. 카메라에 얼굴이 잡히지 않았을 수 있어요.</p>
        ) : (
          bars.map((s, i) => (
            <div className="bar-row" key={`${s.label}-${i}`}>
              <span className="bar-label">{s.label}</span>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${s.value}%` }} /></div>
              <span className="bar-value num">{s.value}%</span>
            </div>
          ))
        )}
      </div>

      {(canPlay || isRunning(jobs?.recording)) && (
        <div className="question-card">
          <div className="question-index">
            면접 영상
            {canPlay && recording?.duration_ms ? ` · ${formatTime(recording.duration_ms)}` : ''}
          </div>
          {!canPlay && <p className="question-text">영상 처리 중…</p>}
          {canPlay && videoFailed && <p className="question-text">영상을 불러오지 못했어요.</p>}
          {canPlay && !videoFailed && !videoSrc && <p className="question-text">영상 불러오는 중…</p>}
          {canPlay && videoSrc && (
            <video
              ref={videoRef}
              className="recording-player"
              src={videoSrc}
              controls
              playsInline
              onError={onVideoError}
            />
          )}
        </div>
      )}

      {timeline.length > 0 && (
        <div className="question-card">
          <div className="question-index">타임라인</div>
          <ul className="feedback-list">
            {timeline.map((ev, i) => (
              <li
                key={`timeline-${ev.ts_ms}-${i}`}
                style={{ cursor: videoSrc ? 'pointer' : 'default' }}
                onClick={() => seekTo(ev.ts_ms)}
              >
                <b>{formatTime(ev.ts_ms)}</b>질문 {ev.question_index + 1} · {ev.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {transcript.length > 0 && (
        <div className="question-card">
          <div className="question-index">답변 내용</div>
          <ul className="feedback-list">
            {transcript.map((t, i) => (
              <li key={`transcript-${t.question_index}-${i}`}>
                <b>질문 {t.question_index + 1}</b>{t.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {llm ? (
        <>
          <div className="question-card">
            <div className="question-index">총평</div>
            <p className="question-text">{llm.summary}</p>

            {(llm.strengths ?? []).length > 0 && (
              <>
                <div className="question-index" style={{ marginTop: 18 }}>강점</div>
                <ul className="feedback-list">
                  {llm.strengths.map((s, i) => (
                    <li key={`strength-${i}`}>{s}</li>
                  ))}
                </ul>
              </>
            )}

            {(llm.improvements ?? []).length > 0 && (
              <>
                <div className="question-index" style={{ marginTop: 18 }}>개선점</div>
                <ul className="feedback-list">
                  {llm.improvements.map((s, i) => (
                    <li key={`improvement-${i}`}>{s}</li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {(llm.per_question ?? []).length > 0 && (
            <div className="question-card">
              <div className="question-index">질문별 피드백</div>
              <ul className="feedback-list">
                {llm.per_question.map((f, i) => (
                  <li key={`llm-feedback-${f.question_index}-${i}`}>
                    <b>질문 {f.question_index + 1}</b>{f.feedback}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <div className="question-card">
          <div className="question-index">피드백</div>
          <ul className="feedback-list">
            {feedback.map((f, i) => (
              <li key={`${f.q}-${i}`}><b>{f.q}</b>{f.note}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="action-row">{actions}</div>
    </>
  );
}
