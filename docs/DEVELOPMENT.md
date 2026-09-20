# 개발 문서

## 시스템 흐름
```
 브라우저                    노트북 (로컬)                  노트북 GPU
┌────────────┐  로그인   ┌────────────┐
│ FE Next.js │─────────▶│ Supabase   │  인증 + PostgreSQL
│            │◀─────────│            │
│ 웹캠 3fps  │  토큰     └─────┬──────┘
│ 또는 영상  │  REST/WS ┌─────┴──────┐  JPEG/오디오  ┌─────────────┐
│ 업로드     │─────────▶│ BE FastAPI │──────────────▶│ 추론 서버    │ 얼굴 검출
│            │◀─────────│ 세션·STT·  │◀──────────────│ 모델 3개    │ L2CS-Net (시선)
└────────────┘ 토스트    │ LLM·리포트 │  결과 JSON    └─────────────┘ EmotionNet (감정)
               리포트    └────────────┘                               Former-DFER (집중)
```

## 폴더
| 폴더 | 내용 |
|---|---|
| `frontend/` | Next.js 14. 랜딩, 직군 선택, 면접, 리포트, 업로드, 마이페이지 화면 |
| `backend/` | FastAPI. 인증, 세션, WebSocket, 판정, STT, LLM 리포트 |
| `inference/` | 추론 서버. 모델 3개 + 얼굴 검출. **Docker로 실행** |
| `ai/` | 모델 학습·검증 코드 |

## 시작하기
| 파트 | 명령 |
|---|---|
| FE | `cd frontend && cp .env.local.example .env.local && npm install && npm run dev` → http://localhost:3000 |
| BE | `cd backend && cp .env.example .env && uv sync && uv run uvicorn app.main:app --reload --port 8000` → http://localhost:8000/docs |
| 추론 서버 | Docker Desktop 설치 후 `cd inference && docker compose up --build` → http://localhost:9000/v1/health |
| 연결 확인 | 둘 다 띄운 뒤 http://localhost:3000/dev/connect |

`.env` 값(Supabase URL, 키 등)은 직접 발급받아 채워야 합니다. 저장소에 올리지 않습니다.

실행 환경: 노트북 한 대에서 FE(3000), BE(8000), 추론 서버(9000) 로컬 실행. 배포는 따로.

## 진행 단계
| 단계 | 내용 | 상태 |
|---|---|---|
| Phase 0 | BE 골격, 로그인 연동, FE-BE-Supabase 연결 | 완료 |
| Phase 1 | 세션·WebSocket·판정·리포트를 Mock으로 완성 | 완료 |
| Phase 2 | 추론 서버, 실제 모델 연결 | 완료 |
| Phase 3 | 영상 업로드 분석 | 완료 |
| 배포 | fork 후 진행 | 완료 |
