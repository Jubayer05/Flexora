FROM oven/bun:1

WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy Prisma schema first (needed for generation)
COPY prisma ./prisma
COPY prisma.config.ts ./

# Generate Prisma client with dummy DATABASE_URL (generation doesn't need real DB connection)
# Prisma generate only reads schema, doesn't connect to database
ARG DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV DATABASE_URL=$DATABASE_URL
RUN bun run db:generate

# Copy rest of application code
COPY . .

# Create files directory 
RUN mkdir -p /app/files

# Expose port
EXPOSE 5000

# Run the application
CMD ["bun", "run", "start"]