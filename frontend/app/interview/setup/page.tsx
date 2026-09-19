'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';

const TRACKS: { value: string; label: string }[] = [
  { value: 'general', label: '전체' },
  { value: 'backend', label: '백엔드' },
  { value: 'frontend', label: '프론트엔드' },
  { value: 'ai', label: 'AI' },
  { value: 'design', label: '디자인' },
];

function TrackSetup() {
  const router = useRouter();

  return (
    <div className="page-shell">
      <Link className="page-back" href="/">← 홈으로</Link>
      <h1 className="page-title">어떤 직군으로 연습하시겠어요?</h1>
      <p className="page-sub" style={{ color: 'var(--ink)' }}>선택한 직군에 맞춘 질문으로 모의면접을 진행합니다.</p>

      <div className="action-row" style={{ flexWrap: 'wrap' }}>
        {TRACKS.map((t) => (
          <button
            key={t.value}
            className="btn-ghost"
            type="button"
            onClick={() => router.push(`/interview?track=${t.value}`)}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function InterviewSetupPage() {
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
        console.warn('[interview/setup] 세션 확인 실패 — 로그인 화면으로 보냅니다.', e);
        if (cancelled) return;
      }
      setAuthed(false);
      router.replace('/login?redirect=/interview/setup');
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

  return <TrackSetup />;
}
