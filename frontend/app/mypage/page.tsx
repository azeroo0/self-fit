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

const MODE_LABEL: Record<SessionMode, string> = {
  live: '실시간 면접',
  upload: '영상 업로드 분석',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function HistoryList() {
  const router = useRouter();
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
          <Link className="btn-solid" href="/interview">모의면접 시작하기 →</Link>
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

      <HistoryList />
    </div>
  );
}
