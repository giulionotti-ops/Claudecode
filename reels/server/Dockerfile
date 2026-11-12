# Reels server image: Node 22 + Chromium (Playwright) + ffmpeg + Python/numpy.
# Build from the reels/ folder:  docker build -f server/Dockerfile -t reels .
FROM mcr.microsoft.com/playwright:v1.49.1-noble
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg python3 python3-numpy && rm -rf /var/lib/apt/lists/*
RUN npm install -g playwright@1.49.1
ENV NODE_PATH=/usr/lib/node_modules
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server/server.mjs"]
