# syntax=docker/dockerfile:1.7

# Install dependencies in a cache-friendly layer.
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps --include=optional

# Build stage
FROM node:20-slim AS builder
WORKDIR /app

# Accept build arguments
ARG NEXT_PUBLIC_APP_ROOT_API
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_BASE_API
ARG NEXT_PUBLIC_FRONTEND_URL
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

# Set them as environment variables during build
ENV NEXT_PUBLIC_APP_ROOT_API=$NEXT_PUBLIC_APP_ROOT_API
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_BASE_API=$NEXT_PUBLIC_BASE_API
ENV NEXT_PUBLIC_FRONTEND_URL=$NEXT_PUBLIC_FRONTEND_URL
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production stage
FROM node:20-slim AS runner
WORKDIR /app
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Run as a non-root user inside the container.
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs
EXPOSE 3001
CMD ["node", "server.js"]