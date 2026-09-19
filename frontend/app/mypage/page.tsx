'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getSupabase } from '@/lib/supabase';

type SessionMode = 'live' | 'upload';

type SessionItem = {
  id: string;
  mode: SessionMode;
  status: string;
  created_at: string;
  finished_at: string | null;
  has_report: boolean;
};

type SessionListResponse = {
  items: SessionItem[];
  total: number;
};

type FetchState = 'loading' | 'ready' | 'error';

type ReportOverview = {
  gaze_hold_rate: number;
};

type SessionReport = {
  overview: ReportOverview;
};

type GazePoint = {
  id: string;
  date: string;
  rate: number;
};

type ChartStatus = 'idle' | 'below-threshold' | 'loading' | 'ready';

const MODE_LABEL: Record<SessionMode, string> = {
  live: '실시간 면접',
  upload: '영상 업로드 분석',
};

const MIN_SESSIONS_FOR_TREND = 3;
const MAX_TREND_POINTS = 10;

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatMonthDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
}

function GazeTrendChart({ items, listState }: { items: SessionItem[]; listState: FetchState }) {
  const [status, setStatus] = useState<ChartStatus>('idle');
  const [points, setPoints] = useState<GazePoint[]>([]);

  useEffect(() => {
    if (listState !== 'ready') return;

    const recent = items
      .filter((i) => !!i.finished_at && i.has_report)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, MAX_TREND_POINTS)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    if (recent.length < MIN_SESSIONS_FOR_TREND) {
      setStatus('below-threshold');
      return;
    }

    let cancelled = false;
    setStatus('loading');

    (async () => {
      const settled = await Promise.allSettled(
        recent.map(async (item): Promise<GazePoint> => {
          const res = await apiFetch(`/api/sessions/${item.id}/report`);
          if (!res.ok) throw new Error(`GET /api/sessions/${item.id}/report → ${res.status}`);
          const data: SessionReport = await res.json();
          return { id: item.id, date: item.created_at, rate: data.overview?.gaze_hold_rate ?? 0 };
        })
      );
      if (cancelled) return;
      const next = settled
        .filter((r): r is PromiseFulfilledResult<GazePoint> => r.status === 'fulfilled')
        .map((r) => r.value);
      setPoints(next);
      setStatus('ready');
    })();

    return () => {
      cancelled = true;
    };
  }, [items, listState]);

  if (status === 'idle' || status === 'loading') return null;

  if (status === 'below-threshold') {
    return (
      <div className="question-card">
        <div className="question-index">시선 유지율 추이</div>
        <p className="question-text">추이를 보려면 3회 이상 면접을 진행해보세요</p>
      </div>
    );
  }

  if (points.length < 2) return null;

  const W = 500;
  const H = 160;
  const PAD_LEFT = 34;
  const PAD_RIGHT = 16;
  const PAD_TOP = 28;
  const PAD_BOTTOM = 28;
  const plotW = W - PAD_LEFT - PAD_RIGHT;
  const plotH = H - PAD_TOP - PAD_BOTTOM;

  const coords = points.map((p, i) => ({
    ...p,
    x: PAD_LEFT + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW),
    y: PAD_TOP + (1 - Math.min(1, Math.max(0, p.rate))) * plotH,
  }));
  const linePoints = coords.map((c) => `${c.x},${c.y}`).join(' ');

  const diffPct = Math.round((points[points.length - 1].rate - points[0].rate) * 100);
  const trendLabel =
    diffPct > 0
      ? `지난 회차 대비 ${diffPct}%p 상승`
      : diffPct < 0
      ? `지난 회차 대비 ${Math.abs(diffPct)}%p 하락`
      : '지난 회차 대비 변동 없음';
  const trendColor = diffPct > 0 ? 'var(--good)' : 'var(--ink-muted)';

  return (
    <div className="question-card">
      <div className="question-index">시선 유지율 추이</div>
      <p style={{ fontSize: 13.5, fontWeight: 600, color: trendColor, margin: '0 0 12px' }}>{trendLabel}</p>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
        <line x1={PAD_LEFT} y1={PAD_TOP} x2={W - PAD_RIGHT} y2={PAD_TOP} stroke="var(--line)" strokeWidth={1} />
        <line x1={PAD_LEFT} y1={PAD_TOP + plotH} x2={W - PAD_RIGHT} y2={PAD_TOP + plotH} stroke="var(--line)" strokeWidth={1} />
        <text x={0} y={PAD_TOP + 4} fontSize={11} fill="var(--ink-muted)">100%</text>
        <text x={0} y={PAD_TOP + plotH + 4} fontSize={11} fill="var(--ink-muted)">0%</text>
        <polyline points={linePoints} fill="none" stroke="var(--blue)" strokeWidth={3} strokeLinecap="round" />
        {coords.map((c, i) => (
          <g key={`${c.id}-${i}`}>
            <circle cx={c.x} cy={c.y} r={4} fill="var(--blue)" />
            <text x={c.x} y={H - 6} fontSize={11} textAnchor="middle" fill="var(--ink-muted)">
              {formatMonthDay(c.date)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function HistoryList({ items, state }: { items: SessionItem[]; state: FetchState }) {
  const router = useRouter();

  if (state === 'loading') {
    return (
      <div className="question-card">
        <p className="question-text">기록을 불러오는 중…</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="question-card">
        <p className="question-text">기록을 불러오지 못했어요</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="question-card">
        <p className="question-text">아직 진행한 면접이 없어요. 첫 모의면접을 시작해보세요</p>
        <div className="action-row">
          <Link className="btn-solid" href="/interview/setup">모의면접 시작하기 →</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {items.map((item) => {
        const finished = item.status === 'finished';
        const clickable = item.has_report;
        return (
          <div
            key={item.id}
            className={`question-card history-card${clickable ? ' history-card--clickable' : ''}`}
            style={{ cursor: clickable ? 'pointer' : 'default' }}
            onClick={clickable ? () => router.push(`/interview/report?session=${item.id}`) : undefined}
          >
            <div className="question-index">{formatDate(item.created_at)} · {MODE_LABEL[item.mode] ?? item.mode}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className={`history-badge${finished ? ' history-badge--done' : ''}`}>
                {finished ? '완료' : '진행 중'}
              </span>
              {clickable ? (
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-muted)' }}>리포트 보기 →</span>
              ) : (
                <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>리포트 없음</span>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}

function SessionsSection() {
  const [state, setState] = useState<FetchState>('loading');
  const [items, setItems] = useState<SessionItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await apiFetch('/api/sessions?limit=20&offset=0');
        if (!res.ok) throw new Error(`GET /api/sessions → ${res.status}`);
        const data: SessionListResponse = await res.json();
        if (cancelled) return;
        setItems(data.items ?? []);
        setState('ready');
      } catch (e) {
        if (cancelled) return;
        console.warn('[mypage] 기록 조회 실패', e);
        setState('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <GazeTrendChart items={items} listState={state} />
      <HistoryList items={items} state={state} />
    </>
  );
}

export default function MyPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await getSupabase().auth.getSession();
        if (cancelled) return;
        if (data.session) {
          setAuthed(true);
          return;
        }
      } catch (e) {
        console.warn('[mypage] 세션 확인 실패 — 로그인 화면으로 보냅니다.', e);
        if (cancelled) return;
      }
      setAuthed(false);
      router.replace('/login?redirect=/mypage');
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (authed !== true) {
    return (
      <div className="page-shell">
        <div className="question-index">확인 중...</div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <Link className="page-back" href="/">← 홈으로</Link>
      <h1 className="page-title">내 기록</h1>
      <p className="page-sub" style={{ color: 'var(--ink)' }}>지금까지 진행한 모의면접 기록입니다</p>

      <SessionsSection />
    </div>
  );
}
