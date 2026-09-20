#!/bin/sh
set -e

cd /srv/inference
python -m uvicorn app.main:app --host 0.0.0.0 --port 9000 &

echo "[start] inference 서버 기동 대기 중..."
i=0
until curl -fs http://localhost:9000/v1/health >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -ge 60 ]; then
    echo "[start] inference 서버가 준비되지 않았습니다 (timeout)" >&2
    exit 1
  fi
  sleep 2
done
echo "[start] inference 준비 완료"

cd /srv/backend
exec python -m uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"