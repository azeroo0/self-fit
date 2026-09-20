-- 리포트 공유 링크. share_token 이 있으면 로그인 없이 /api/public/... 으로 조회 가능.
alter table sessions add column if not exists share_token varchar(64);
create unique index if not exists sessions_share_token on sessions (share_token);
