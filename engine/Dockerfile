# NetSentinel Engine — Docker Image
# Build: docker build -t netsentinel-engine ./engine
# Run:   docker run -p 8765:8765 -e DATABASE_PATH=/data/netsentinel.db -v engine-data:/data netsentinel-engine

FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    nmap \
    iproute2 \
    net-tools \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8765

ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8765"]
