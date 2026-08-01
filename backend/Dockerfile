FROM node:20-slim

WORKDIR /app/backend

COPY backend/package.json ./
RUN npm install --omit=dev

COPY backend/ ./
COPY docs/ ../docs/

RUN mkdir -p /app/backend/data

ENV PORT=3000
ENV DB_PATH=/app/backend/data/lernsprint.db

EXPOSE 3000
CMD ["node", "server.js"]
