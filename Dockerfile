FROM node:22-bookworm-slim

ENV NODE_ENV=production \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    TRANSCRIPTION_MODEL=small \
    TRANSCRIPTION_DEVICE=cpu \
    TRANSCRIPTION_COMPUTE_TYPE=int8 \
    TRANSCRIPTION_MODEL_DIR=/tmp/streamfusion-whisper-model

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-venv ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && python3 -m venv /opt/venv

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY python-transcription/requirements.txt /tmp/requirements.txt
RUN /opt/venv/bin/pip install --no-cache-dir -r /tmp/requirements.txt

COPY . .

ENV PATH="/opt/venv/bin:${PATH}"

EXPOSE 3000
CMD ["npm", "start"]
