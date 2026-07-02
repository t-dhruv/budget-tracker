# 🏗️ Stage 1️⃣: Build
FROM node:23.11.0 AS build-stage

WORKDIR /app

# Build inputs are passed as ARGs (compose interpolates them from the user's
# .env.production via --env-file). The .env.production file itself is NEVER
# copied into the image — that file contains DB passwords + auth secrets that
# must not leak into pushed image layers.
ARG VITE_APP_API_HTTP
ARG VITE_APP_API_VER=/api/v1
ARG VITE_MCP_BASE_URL=
ARG VITE_POSTHOG_KEY=
ARG VITE_POSTHOG_HOST=
ARG VITE_LOGO_DEV_TOKEN=
ARG VITE_SENTRY_DSN=
ARG VITE_SENTRY_RELEASE=
ARG VITE_APP_COMMIT_HASH=
ARG SENTRY_AUTH_TOKEN=
ARG SENTRY_ORG=
ARG SENTRY_PROJECT=
ARG CSP_EXTRA_ANALYTICS=

# envsubst (gettext-base) renders CSP placeholders in nginx.conf below.
RUN apt-get update && apt-get install -y --no-install-recommends gettext-base && rm -rf /var/lib/apt/lists/*

# Copy root-level package files and post-install script
COPY package*.json ./
COPY post-install.sh ./
RUN chmod +x ./post-install.sh

# Copy package files for workspaces
COPY packages/frontend/package*.json ./packages/frontend/
COPY packages/landing/package*.json ./packages/landing/

# Install dependencies
RUN npm ci

# Materialize a minimal .env.production from build args. vite.config.js does
# loadEnv from /app, so it picks these up at build time. Only VITE_* values
# end up inlined into the bundle (Vite's prefix filter for client-side env).
RUN printf '%s\n' \
    "VITE_APP_API_HTTP=$VITE_APP_API_HTTP" \
    "VITE_APP_API_VER=$VITE_APP_API_VER" \
    "VITE_MCP_BASE_URL=$VITE_MCP_BASE_URL" \
    "VITE_POSTHOG_KEY=$VITE_POSTHOG_KEY" \
    "VITE_POSTHOG_HOST=$VITE_POSTHOG_HOST" \
    "VITE_LOGO_DEV_TOKEN=$VITE_LOGO_DEV_TOKEN" \
    "VITE_SENTRY_DSN=$VITE_SENTRY_DSN" \
    "VITE_SENTRY_RELEASE=$VITE_SENTRY_RELEASE" \
    "VITE_APP_COMMIT_HASH=$VITE_APP_COMMIT_HASH" \
    "SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN" \
    "SENTRY_ORG=$SENTRY_ORG" \
    "SENTRY_PROJECT=$SENTRY_PROJECT" \
    > /app/.env.production

# Copy the rest of the code
COPY tsconfig.json ./
COPY packages/shared ./packages/shared
COPY packages/frontend ./packages/frontend
COPY packages/landing ./packages/landing

# Build frontend SPA
WORKDIR /app/packages/frontend
RUN npm run build

# Build Astro landing
WORKDIR /app/packages/landing
RUN npm run build

# Render CSP placeholders in nginx.conf. Only CSP_EXTRA_ANALYTICS is
# envsubst'd now — connect-src uses 'self' (API is same-origin via nginx
# proxy) and form-action also defaults to 'self'.
WORKDIR /app
RUN export CSP_EXTRA_ANALYTICS && \
    envsubst '$CSP_EXTRA_ANALYTICS' \
      < /app/packages/frontend/nginx.conf \
      > /tmp/nginx.conf

# 🚀 Stage 2️⃣: Production
FROM nginx:1.27-alpine AS production-stage

# Create app directories with proper permissions
RUN mkdir /app /landing && chown nginx:nginx /app /landing

# Copy built assets
COPY --from=build-stage --chown=nginx:nginx /app/packages/frontend/dist /app
COPY --from=build-stage --chown=nginx:nginx /app/packages/landing/dist /landing
COPY --from=build-stage --chown=nginx:nginx /tmp/nginx.conf /etc/nginx/nginx.conf

# Use non-root user
USER nginx

EXPOSE 24680
