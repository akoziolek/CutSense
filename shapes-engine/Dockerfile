FROM python:3.12-slim AS base

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# download extra dependencies for opencv that ultralytics uses
RUN apt-get update && apt-get install -y --no-install-recommends \
libgl1 \
libglib2.0-0 \
libxcb1 \
libx11-xcb1 \
&& rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv
COPY requirements.txt ./

# download lighter version of torch for cpu (quicker builds)
RUN --mount=type=cache,target=/root/.cache/uv \
    uv pip install --system \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    --index-strategy unsafe-best-match \
    -r requirements.txt

FROM base AS development
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--app-dir", "src", "--host", "0.0.0.0", "--port", "8000", "--reload"]