# syntax=docker/dockerfile:1
# Explicit copies only; .dockerignore denies everything not allowlisted.
FROM node:22-bookworm-slim AS node-build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json vite.config.ts vite-plugin-meta-images.ts postcss.config.js ./
COPY build-scripts/build.ts ./build-scripts/build.ts
COPY client/index.html ./client/index.html
COPY client/src ./client/src
COPY client/public ./client/public
COPY server ./server
COPY shared ./shared
COPY rulebaseTranslation/phraseTranslator.ts ./rulebaseTranslation/phraseTranslator.ts
ARG VITE_GOOGLE_CLIENT_ID=""
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
RUN npm run build

FROM node-build AS migrate
COPY drizzle.config.ts ./
CMD ["npm", "run", "db:push"]

FROM node:22-bookworm-slim AS node-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-bookworm-slim AS web
RUN apt-get update && apt-get install -y --no-install-recommends python3 ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=5000 PYTHONDONTWRITEBYTECODE=1
COPY --from=node-deps /app/node_modules ./node_modules
COPY --from=node-build /app/dist ./dist
COPY package.json package-lock.json ./
COPY rulebaseTranslation/phraseTranslator.py rulebaseTranslation/phrase_rules.json ./rulebaseTranslation/
RUN mkdir -p /app/rasa/actions /app/data /app/server/account /app/reports/performance /app/backups/json \
    "/app/docs/Testing/FULL TESTING TOPICS/result" && chown -R node:node /app
USER node
EXPOSE 5000
CMD ["node", "dist/index.cjs"]

FROM python:3.10-slim-bookworm AS actions
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app/rasa
COPY deployment/requirements-actions.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt \
    && useradd --uid 1000 --create-home chatbot
COPY rasa/actions/*.py ./actions/
COPY ["rasa/actions/Magical Aliases/aliases.py", "./actions/Magical Aliases/aliases.py"]
USER chatbot
EXPOSE 5055
CMD ["python", "-m", "rasa_sdk", "--actions", "actions.actions", "--port", "5055"]

# Match the trained model environment; Linux AMD64, not ARM.
FROM python:3.10-slim-bookworm AS rasa
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 RASA_TELEMETRY_ENABLED=false
WORKDIR /app/rasa
COPY deployment/requirements-rasa.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt \
    && useradd --uid 1000 --create-home chatbot && chown chatbot:chatbot /app/rasa
COPY deployment/endpoints.yml ./endpoints.yml
COPY deployment/credentials.yml ./credentials.yml
USER chatbot
EXPOSE 5005
CMD ["python", "-m", "rasa", "run", "--enable-api", "--interface", "0.0.0.0", "--port", "5005", "--model", "/app/model.tar.gz", "--endpoints", "endpoints.yml", "--credentials", "credentials.yml"]
