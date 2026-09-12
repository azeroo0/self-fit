# SelfFit 추론 서버. 의존성만 굽고 소스(app/)와 가중치(weights/)는 compose 에서 볼륨으로 붙인다.
# CPU 전용 (GPU 서버는 로컬에서 compose 의 deploy.devices 로 별도 사용).
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
RUN apt-get update && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install torch==2.4.1 torchvision==0.19.1 --index-url https://download.pytorch.org/whl/cpu \
    && pip install -r requirements.txt \
    && pip uninstall -y jax jaxlib ml_dtypes opt_einsum scipy
# mediapipe 가 강제로 끌어오지만 face_detection 솔루션에서는 쓰이지 않는 jax/scipy 스택 제거 (~470MB 절감, 임포트 확인됨)

EXPOSE 9000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "9000"]
