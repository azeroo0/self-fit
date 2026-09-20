export type Overview = {
  gaze_hold_rate: number;
  stable_emotion_rate: number;
  attention_rate: number;
  event_count: number;
  frames_analyzed?: number;
};

export type PerQuestion = {
  order_index: number;
  text: string;
  gaze_hold_rate: number;
  dominant_emotion: string;
  attention_rate: number;
  event_count: number;
};

export type Report = {
  overview: Overview;
  per_question: PerQuestion[];
  feedback: { question_index: number; note: string }[];
  emotion_distribution?: Record<string, number>;
  timeline?: { ts_ms: number; question_index: number; type: string; message: string }[];
  status?: { metrics: string; stt: string; llm: string; recording: string };
  recording?: { url: string; duration_ms: number } | null;
  transcript?: { question_index: number; text: string; words: number; speech_ms: number }[];
  llm?: {
    summary: string;
    per_question: { question_index: number; feedback: string }[];
    strengths: string[];
    improvements: string[];
    model: string;
  } | null;
};

export const pct = (v: number) => `${Math.round((v ?? 0) * 100)}%`;

export const isRunning = (s?: string) => s === 'pending' || s === 'running';

export const needsPoll = (s?: Report['status']) =>
  !!s && [s.metrics, s.stt, s.llm, s.recording].some(isRunning);

export function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor((ms ?? 0) / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function toBars(report: Report): { label: string; value: number }[] {
  return (report.per_question ?? []).map((q) => ({
    label: `질문 ${q.order_index + 1}`,
    value: Math.round((q.gaze_hold_rate ?? 0) * 100),
  }));
}

export function toFeedback(report: Report): { q: string; note: string }[] {
  return (report.feedback ?? []).map((f) => ({ q: `질문 ${f.question_index + 1}`, note: f.note }));
}
