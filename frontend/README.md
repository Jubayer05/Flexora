# UHQ Account

## Installation

### Prerequisites

- [Bun](https://bun.sh) (Package Manager)
- Node.js 20+ (if not using Bun runtime)

### Local Setup

1. **Install Dependencies**

   ```bash
   bun install
   ```

2. **Environment Configuration**

   - Create `.env.local` file in the root directory
   - Configure required environment variables (API endpoints, etc.)

3. **Development Server**

   ```bash
   bun run dev
   ```

   - Runs on `http://localhost:3000`
   - Hot reload enabled

4. **Production Build**

   ```bash
   bun run build
   ```

   - Cleans `.next` directory and builds optimized production bundle

5. **Start Production Server**
   ```bash
   bun start
   ```

## Tech Stack

- **Framework**: Next.js 15.5.3 with App Router
- **Runtime**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI + shadcn/ui
- **Forms**: React Hook Form + Zod
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Package Manager**: Bun

## Project Structure

```
src/
├── app/              # Next.js App Router pages
│   ├── (front)/      # User-facing pages
│   └── admin/        # Admin panel pages
├── components/       # React components
│   ├── ui/           # shadcn/ui components
│   ├── admin/        # Admin-specific components
│   └── frontend/     # Frontend components
├── hooks/            # Custom React hooks
├── lib/              # Utilities & helpers
├── services/         # API services & networking
└── types/            # TypeScript type definitions
```

================================================================================================================================================================================================
# Jubayer's guide to do productions:
## 1. Create a superadmin account using the command:
   ``` bun run src/scripts/create-a