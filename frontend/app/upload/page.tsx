'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch, apiFetchRaw } from '@/lib/api';

type Phase = 'idle' | 'uploading' | 'analyzing' | 'transcribing' | 'summarizing';

const PHASE_LABEL: Record<Exclude<Phase, 'idle'>, string> = {
  uploading: '영상 업로드 중…',
  analyzing: '영상 분석 중…',
  transcribing: '음성 인식 중…',
  summarizing: '리포트 작성 중…',
};

const PHASE_PERCENT: Record<Exclude<Phase, 'idle'>, number> = {
  uploading: 15,
  analyzing: 45,
  transcribing: 75,
  summarizing: 92,
};

const POLL_MS = 3000;
const MAX_POLLS = 100;

type ReportStatus = { metrics: string; stt: string; llm: string; recording: string };
type ReportResp = { status?: ReportStatus };
type CreatedSession = { id: string };

const isRunning = (s?: string) => s === 'pending' || s === 'running';

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(false);
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setError(null);
    }
  };

  const startAnalysis = async () => {
    if (!file) return;
    setError(null);
    setPhase('uploading');

    try {
      const createRes = await apiFetch('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({ mode: 'upload' }),
      });
      if (!createRes.ok) throw new Error(`POST /api/sessions → ${createRes.status}`);
      const session: CreatedSession = await createRes.json();

      const form = new FormData();
      form.append('file', file, file.name);
      const uploadRes = await apiFetchRaw(`/api/sessions/${session.id}/upload`, {
        method: 'POST',
        body: form,
      });
      if (!uploadRes.ok) throw new Error(`POST /api/sessions/${session.id}/upload → ${uploadRes.status}`);
      if (!mountedRef.current) return;
      setPhase('analyzing');

      for (let i = 0; i < MAX_POLLS; i += 1) {
        await sleep(POLL_MS);
        if (!mountedRef.current) return;

        const res = await apiFetch(`/api/sessions/${session.id}/report`);
        if (res.status === 409) continue;

        if (!res.ok) throw new Error(`GET report → ${res.status}`);
        const data: ReportResp = await res.json();
        const s = data.status;

        if (!mountedRef.current) return;

        if (s && isRunning(s.stt)) {
          setPhase('transcribing');
          continue;
        }
        if (s && isRunning(s.llm)) {
          setPhase('summarizing');
          continue;
        }
        router.push(`/interview/report?session=${session.id}`);
        return;
      }
      throw new Error('분석이 너무 오래 걸리고 있어요.');
    } catch (e) {
      console.warn('[upload] 분석 실패', e);
      if (!mountedRef.current) return;
      setError('영상 분석 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.');
      setPhase('idle');
    }
  };

  const analyzing = phase !== 'idle';

  return (
    <div className="page-shell">
      <Link className="page-back" href="/">← 홈으로</Link>
      <h1 className="page-title">영상 업로드 분석</h1>
      <p className="page-sub" style={{ color: 'var(--ink)' }}>이미 녹화한 면접 영상을 올리면 동일한 안구, 표정 모델로 분석합니다.</p>

      <div className="upload-box" onClick={() => inputRef.current?.click()}>
        <div style={{ fontSize: 28 }}>🎬</div>
        <p>{file ? file.name : 'MP4, MOV 파일을 선택하거나 끌어다 놓으세요'}</p>
        <input ref={inputRef} type="file" accept="video/*" onChange={handleFile} style={{ display: 'none' }} />
      </div>

      {error && <p className="form-error">{error}</p>}

      {analyzing && (
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${PHASE_PERCENT[phase as Exclude<Phase, 'idle'>]}%` }} />
        </div>
      )}

      <div className="action-row">
        <button className="btn-solid" disabled={!file || analyzing} onClick={startAnalysis}>
          {analyzing ? PHASE_LABEL[phase as Exclude<Phase, 'idle'>] : '분석 시작 →'}
        </button>
      </div>
    </div>
  );
}
