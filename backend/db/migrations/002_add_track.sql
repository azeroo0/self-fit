-- 직군별 질문 트랙 추가. Supabase SQL Editor 에서 001_init.sql 이후 실행.

alter table questions add column if not exists track varchar(20) not null default 'general';

-- 기존 질문 5개는 track='general' 로 유지 (default 값이 이미 채워주지만 명시적으로 고정)
update questions set track = 'general' where track is null;

insert into questions (text, category, track, sort_order) values
  ('대용량 트래픽 처리 경험이 있다면 설명해주세요.', 'experience', 'backend', 10),
  ('장애 대응 경험에 대해 말씀해주세요.', 'experience', 'backend', 11),
  ('데이터베이스 성능 최적화를 해본 경험이 있나요?', 'experience', 'backend', 12),
  ('API 설계 시 가장 중요하게 생각하는 것은 무엇인가요?', 'general', 'backend', 13),

  ('사용자 경험(UX) 개선 사례에 대해 말씀해주세요.', 'experience', 'frontend', 20),
  ('크로스 브라우저 이슈를 해결한 경험이 있나요?', 'experience', 'frontend', 21),
  ('웹 성능 최적화를 위해 어떤 노력을 하셨나요?', 'experience', 'frontend', 22),
  ('상태 관리 라이브러리를 선택할 때 고려하는 기준은 무엇인가요?', 'general', 'frontend', 23),

  ('모델 성능 개선을 위해 시도했던 방법을 설명해주세요.', 'experience', 'ai', 30),
  ('데이터 전처리 과정에서 겪었던 어려움은 무엇인가요?', 'experience', 'ai', 31),
  ('모델을 실제 서비스에 배포해본 경험이 있나요?', 'experience', 'ai', 32),
  ('최근 관심 있는 AI 기술 트렌드는 무엇인가요?', 'general', 'ai', 33),

  ('사용자 리서치를 바탕으로 디자인을 개선한 경험이 있나요?', 'experience', 'design', 40),
  ('개발자와 협업하며 겪은 어려움과 해결 방법을 말씀해주세요.', 'experience', 'design', 41),
  ('디자인 시스템을 구축하거나 활용한 경험이 있나요?', 'experience', 'design', 42),
  ('피드백을 받고 디자인을 수정했던 경험을 설명해주세요.', 'general', 'design', 43)
on conflict do nothing;
