# SelfFit

웹캠 기반 모의 면접 자가진단 서비스. 면접 중 **시선·표정·집중 상태**를 AI가 실시간으로 분석해 토스트로 알려 주고, 종료 후 행동 리포트를 제공합니다.

경기 AI 멤버십 채용연계형 교육 1차 프로젝트 (2026-09).

## 배포
- 프론트: https://self-fit-ashy.vercel.app
- 백엔드: https://self-fit.onrender.com
- 추론 서버(AI 분석): **배포하지 않음** — GPU 리소스 비용 문제로 로컬 실행만 지원

배포본에서는 로그인, 세션 생성, 웹캠 프레임 전송, 녹화 업로드, 리포트 화면까지 정상 동작합니다. 다만 추론 서버가 없어 실제 시선·표정 분석 수치는 나오지 않고, 규칙 기반 폴백(질문 목록, 목업 알림 등)으로 동작합니다.

## 사용자 흐름
```
로그인 → 질문 목록 확인 → 면접 시작(웹캠) → 질문별 답변 → 종료 → 리포트
                                   │
                          시선 이탈·긴장 표정·집중 저하 시 토스트 알림 (사용자가 켜고 끌 수 있음)
```

최신 시스템 흐름·폴더 구조·로컬 실행 방법은 [docs/DEVELOPMENT.md](DEVELOPMENT.md) 참고.

## 협업 규칙 요약
- 모든 작업은 `dev` 브랜치 기준. 브랜치는 `파트/작업` 이름으로 따고 PR은 `dev`로.
- 자기 파트 폴더만 커밋. 루트 파일과 다른 파트 폴더는 담당자와 먼저 상의.
- 모델 파일, 데이터셋, `.env`는 커밋 금지 (`.gitignore`가 막고 있음).

## 문서
| 읽을 사람 | 문서 |
|---|---|
| 전원 | [backend/guideline/00-summary.md](../backend/guideline/00-summary.md) 백엔드 설계 요약 보고: 결정 사항, 현재 상태, 남은 일 |
| 전원 | [backend/guideline/01-architecture.md](../backend/guideline/01-architecture.md) 설계 개요 |
| FE | [backend/guideline/02-for-frontend.md](../backend/guideline/02-for-frontend.md) API·WebSocket 사용법 |
| AI | [backend/guideline/03-for-ai.md](../backend/guideline/03-for-ai.md) 모델 실행 위치, 납품 규약 |
| 전원 | [backend/guideline/04-dev-workflow.md](../backend/guideline/04-dev-workflow.md) 깃·로컬 실행 |
| BE | [backend/docs/](../backend/docs/) 기획·설계 상세 |

## 진행 단계
| 단계 | 내용 | 상태 |
|---|---|---|
| Phase 0 | BE 골격, 로그인 연동, FE-BE-Supabase 연결 | 완료 |
| Phase 1 | 세션·WebSocket·판정·리포트를 Mock으로 완성 | 완료 |
| Phase 2 | 추론 서버, 실제 모델 연결 | 완료 |
| Phase 3 | 영상 업로드 분석 | 진행 중 |
| 배포 | fork 후 진행 | 완료 |

## 참고
- 데이터·모델: AI-Hub [디스플레이 중심 안구 움직임 영상 데이터](https://www.aihub.or.kr/aihubdata/data/view.do?dataSetSn=71421), [한국인 감정인식을 위한 복합 영상](https://aihub.or.kr/aihubdata/data/view.do?dataSetSn=82)
- 실행 환경: 노트북 한 대에서 FE(3000), BE(8000), 추론 서버(9000) 로컬 실행. 배포는 따로