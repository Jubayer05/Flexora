# UHQ Backend - Automated Account Selling Platform

## 🚀 Quick Start

### Setup

```bash
# Copy environment file
cp .env.example .env

# Start database containers
docker compose up -d

# Install dependencies
bun install

# Generate Prisma client
bun run db:generate

# Push database schema
bun run db:push

# Start the server
bun run dev
```

## 🐳 Docker Services

### Core Services

- **PostgreSQL 17.0-alpine**: Main database on port `5432`
- **Redis latest**: Caching and sessions on port `6379`

## 🔧 Configuration

Copy `.env.example` to `.env` and configure your settings:

```env
DATABASE_URL="postgresql://uhq_user:uhq_password@localhost:5432/uhq_database"
REDIS_URL="redis://:uhq_redis_password@localhost:6379"
JWT_SECRET=your-super-secret-jwt-key
ENCRYPTION_KEY=your-32-character-encryption-key
```

TELEGRAM_BOT_TOKEN="8099632727:AAHlDY1r1EJ0956mGjsfpqAM0gJk-QJOBE"
TELEGRAM_WEBHOOK_URL=https://your-domain.com/webhook/telegram

# Telegram API Configuration (for Python OTP Service)

TELEGRAM_API_ID="3453"
TELEGRAM_API_HASH="e6007742c350754a115fff7547567345"

==================================== DEPLOYMENT GUIDE JUBAYER ====================================

# DEPLOYMENT GUIDE FOR JUBAYER

## 1. CREATE SUPER ADMIN BY RUNNING THE SCRIPT

```
  bun run src/scripts/create-first-admin.ts
```

after that remove the superadmin functionality.
