'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { publicFetch, publicUrl } from '@/lib/api';
import { toBars, toFeedback, type Report } from '@/lib/report';
import { ReportBody } from '@/app/components/ReportBody';

type Status = 'loading' | 'ready' | 'notfound' | 'unfinished' | 'error';

export default function SharedReportPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const [status, setStatus] = useState<Status>('loading');
  const [report, setReport] = useState<Report | null>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await publicFetch(`/api/public/reports/${token}`);
        if (cancelled) return;
        if (res.status === 404) {
          setStatus('notfound');
          return;
        }
        if (res.status === 409) {
          setStatus('unfinished');
          return;
        }
        if (!res.ok) throw new Error(`GET /api/public/reports/${token} → ${res.status}`);
        const data: Report = await res.json();
        if (cancelled) return;
        setReport(data);
        setStatus('ready');
      } catch (e) {
        if (cancelled) return;
        console.warn('[report/share] 공유 리포트 조회 실패', e);
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const recording = report?.recording ?? null;
  const jobs = report?.status;
  const canPlay = !!recording && jobs?.recording === 'done';
  const videoSrc = canPlay ? publicUrl(`/api/public/recordings/${token}`) : null;

  return (
    <div className="page-shell">
      <Link className="page-back" href="/">← 홈으로</Link>
      <h1 className="page-title">공유된 행동 리포트</h1>
      <p className="page-sub" style={{ color: 'var(--ink)' }}>다른 사람이 공유한 모의면접 분석 결과입니다.</p>

      {status === 'loading' && (
        <div className="question-card">
          <div className="question-index">행동 리포트</div>
          <p className="question-text">리포트를 불러오는 중...</p>
        </div>
      )}

      {status === 'notfound' && (
        <div className="question-card">
          <div className="question-index">행동 리포트</div>
          <p className="question-text">존재하지 않거나 만료된 링크입니다.</p>
        </div>
      )}

      {status === 'unfinished' && (
        <div className="question-card">
          <div className="question-index">행동 리포트</div>
          <p className="question-text">세션이 아직 끝나지 않았습니다.</p>
        </div>
      )}

      {status === 'error' && (
        <div className="question-card">
          <div className="question-index">행동 리포트</div>
          <p className="question-text">리포트를 불러오지 못했어요.</p>
        </div>
      )}

      {status === 'ready' && report && (
        <ReportBody
          overview={report.overview}
          bars={toBars(report)}
          feedback={toFeedback(report)}
          noMetrics={report.overview?.frames_analyzed === 0}
          jobs={jobs}
          transcript={report.transcript ?? []}
          llm={report.llm ?? null}
          recording={recording}
          timeline={report.timeline ?? []}
          videoRef={videoRef}
          videoSrc={videoSrc}
          videoFailed={videoFailed}
          onVideoError={() => setVideoFailed(true)}
          actions={<Link className="btn-solid" href="/">self-fit 둘러보기 →</Link>}
        />
      )}
    </div>
  );
}
