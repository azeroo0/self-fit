import { getSupabase } from './supabase';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export async function apiFetch(path: string, init?: RequestInit) {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

export async function apiFetchRaw(path: string, init?: RequestInit) {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getWsUrl(sessionId: string, token: string) {
  return `${API_URL.replace('http', 'ws')}/ws/sessions/${sessionId}?token=${token}`;
}

/** 로그인 없이 접근하는 공개 API (공유 리포트). Authorization 헤더를 붙이지 않는다. */
export function publicFetch(path: string, init?: RequestInit) {
  return fetch(`${API_URL}${path}`, init);
}

export function publicUrl(path: string) {
  return `${API_URL}${path}`;
}