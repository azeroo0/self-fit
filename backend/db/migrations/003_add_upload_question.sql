-- 업로드 분석 모드 전용 가상 질문. 질문 구간이 없으므로 영상 전체를 답변 하나로 취급한다.
insert into questions (text, category, track, sort_order) values
  ('업로드한 영상 전체에 대한 답변', 'upload', 'upload', 100)
on conflict do nothing;
