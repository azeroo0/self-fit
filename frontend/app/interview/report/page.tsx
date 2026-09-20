'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiFetch, apiFetchRaw } from '@/lib/api';
import { needsPoll, toBars, toFeedback, type Report } from '@/lib/report';
import { ReportBody } from '@/app/components/ReportBody';

const DEMO_REPORT: Report = {
  overview: {
    gaze_hold_rate: 0.82,
    stable_emotion_rate: 0.74,
    attention_rate: 0.81,
    event_count: 6,
  },
  per_question: [
    { order_index: 0, text: '', gaze_hold_rate: 0.78, dominant_emotion: '', attention_rate: 0, event_count: 0 },
    { order_index: 1, text: '', gaze_hold_rate: 0.84, dominant_emotion: '', attention_rate: 0, event_count: 0 },
    { order_index: 2, text: '', gaze_hold_rate: 0.71, dominant_emotion: '', attention_rate: 0, event_count: 0 },
    { order_index: 3, text: '', gaze_hold_rate: 0.88, dominant_emotion: '', attention_rate: 0, event_count: 0 },
    { order_index: 4, text: '', gaze_hold_rate: 0.9, dominant_emotion: '', attention_rate: 0, event_count: 0 },
  ],
  feedback: [
    { question_index: 0, note: '초반 시선 이탈이 2회 감지됐어요. 답변 시작 전 카메라를 먼저 응시해보세요.' },
    { question_index: 2, note: '답변 중 긴장 표정이 가장 오래 지속됐어요. 호흡을 고르고 천천히 답해보세요.' },
    { question_index: 4, note: '시선 유지율과 표정 안정도 모두 가장 높았어요. 이 리듬을 기억해두세요.' },
  ],
};

type Status = 'demo' | 'loading' | 'ready' | 'unfinished';

const POLL_MS = 3000;

function ReportContent() {
  const sessionId = useSearchParams().get('session');
  const [status, setStatus] = useState<Status>(sessionId ? 'loading' : 'demo');
  const [report, setReport] = useState<Report | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [shareLabel, setShareLabel] = useState('공유 링크 만들기');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    setStatus('loading');

    const load = async () => {
      try {
        const res = await apiFetch(`/api/sessions/${sessionId}/report`);
        if (cancelled) return;
        if (res.status === 409) {
          setStatus('unfinished');
          return;
        }
        if (!res.ok) throw new Error(`GET /api/sessions/${sessionId}/report → ${res.status}`);
        const data: Report = await res.json();
        if (cancelled) return;
        setReport(data);
        setStatus('ready');
        if (needsPoll(data.status)) timer = setTimeout(load, POLL_MS);
      } catch (e) {
        if (cancelled) return;
        console.warn('[report] 리포트 조회 실패', e);
        setStatus((prev) => (prev === 'ready' ? 'ready' : 'demo'));
      }
    };

    load();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId]);

  const displayReport = report ?? DEMO_REPORT;
  const overview = displayReport.overview;
  const bars = toBars(displayReport);
  const feedback = toFeedback(displayReport);
  const noMetrics = report?.overview?.frames_analyzed === 0;
  const jobs = report?.status;
  const transcript = report?.transcript ?? [];
  const llm = report?.llm ?? null;
  const recording = report?.recording ?? null;
  const timeline = report?.timeline ?? [];
  const recordingUrl = recording && jobs?.recording === 'done' ? recording.url : null;

  useEffect(() => {
    if (!recordingUrl) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    setVideoFailed(false);

    (async () => {
      try {
        const res = await apiFetchRaw(recordingUrl);
        if (!res.ok) throw new Error(`GET ${recordingUrl} → ${res.status}`);
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setVideoSrc(objectUrl);
      } catch (e) {
        if (cancelled) return;
        console.warn('[report] 녹화 영상 로드 실패', e);
        setVideoFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setVideoSrc(null);
    };
  }, [recordingUrl]);

  const handleShare = async () => {
    if (!sessionId) return;
    try {
      const res = await apiFetch(`/api/sessions/${sessionId}/share`, { method: 'POST' });
      if (!res.ok) throw new Error(`POST /api/sessions/${sessionId}/share → ${res.status}`);
      const data: { share_token: string } = await res.json();
      const url = `${window.location.origin}/report/share/${data.share_token}`;
      await navigator.clipboard.writeText(url);
      setShareLabel('복사됨!');
      setTimeout(() => setShareLabel('공유 링크 만들기'), 2000);
    } catch (e) {
      console.warn('[report] 공유 링크 생성 실패', e);
      setShareLabel('실패했어요');
      setTimeout(() => setShareLabel('공유 링크 만들기'), 2000);
    }
  };

  if (status === 'loading') {
    return (
      <div className="question-card">
        <div className="question-index">행동 리포트</div>
        <p className="question-text">리포트를 불러오는 중...</p>
      </div>
    );
  }

  if (status === 'unfinished') {
    return (
      <div className="question-card">
        <div className="question-index">행동 리포트</div>
        <p className="question-text">세션이 아직 끝나지 않았습니다.</p>
        <div className="action-row">
          <Link className="btn-solid" href="/interview">면접으로 돌아가기 →</Link>
        </div>
      </div>
    );
  }

  return (
    <ReportBody
      overview={overview}
      bars={bars}
      feedback={feedback}
      noMetrics={noMetrics}
      jobs={jobs}
      transcript={transcript}
      llm={llm}
      recording={recording}
      timeline={timeline}
      videoRef={videoRef}
      videoSrc={videoSrc}
      videoFailed={videoFailed}
      actions={
        <>
          {status === 'ready' && sessionId && (
            <button type="button" className="btn-ghost" onClick={handleShare}>{shareLabel}</button>
          )}
          <Link className="btn-ghost" href="/upload">영상으로 다시 분석</Link>
          <Link className="btn-solid" href="/interview">다시 도전하기 →</Link>
        </>
      }
    />
  );
}

export default function ReportPage() {
  return (
    <div className="page-shell">
      <Link className="page-back" href="/">← 홈으로</Link>
      <h1 className="page-title">행동 리포트</h1>
      <p className="page-sub" style={{ color: 'var(--ink)' }}>방금 진행한 모의면접의 시선, 표정 분석 결과입니다.</p>

      <Suspense
        fallback={
          <div className="question-card">
            <div className="question-index">행동 리포트</div>
            <p className="question-text">리포트를 불러오는 중...</p>
          </div>
        }
      >
        <ReportContent />
      </Suspense>
    </div>
  );
}
