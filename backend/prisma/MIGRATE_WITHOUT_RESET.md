# Syncing schema without resetting the database

When Prisma reports **drift** or **modified migration** and suggests `prisma migrate reset`, **do not reset** if you need to keep your data. Use this workflow instead.

## Quick fix: sync schema and keep data

### 1. Apply your current schema to the database (no reset)

From the `backend` folder:

```bash
npm run db:sync
# or
npx prisma db push
```

This:

- Pushes your current `schema.prisma` to the database
- **Adds** new tables and columns (e.g. `blog_authors`, `authorId` on `blogs`)
- **Does not** use migration history, so it does not trigger a reset
- **Does not** drop existing data for existing tables

Use this whenever you have schema changes and cannot run `prisma migrate dev` because of drift or “modified migration” errors.

### 2. (Optional) Update migration history for the new change

If you added a new migration (e.g. `add_blog_author`) and applied the changes with `db push`, you can mark that migration as applied so the migration table stays in sync:

```bash
npx prisma migrate resolve --applied 20260215000000_add_blog_author
```

Replace the migration name with your migration folder name under `prisma/migrations/`. This only updates `_prisma_migrations`; it does **not** run the migration SQL again.

## When to use which command

| Goal                         | Command              |
|-----------------------------|----------------------|
| **Apply pending migrations** (production/CI) | `npx prisma migrate deploy` |
| **Sync schema, keep all data** (no migration history) | `npm run db:sync` or `npx prisma db push` |
| Mark a migration as applied | `npx prisma migrate resolve --applied <migration_name>` |
| Normal dev (no drift)       | `npm run db:migrate` or `npx prisma migrate dev` |
| Reset DB (destroys data)    | `npm run db:migrate:reset` — avoid if data matters |

### `migrate deploy` vs `db push`

- **`prisma migrate deploy`** – Applies only **pending migration files** that exist in `prisma/migrations/`. Uses the migration table; does not create new migrations. Use in production or CI when you want to run only unapplied migrations.
- **`prisma db push`** – Diffs your **current schema** against the database and applies the changes. Does **not** use migration history or migration files. Use when you have drift or when you can’t run `migrate dev` (e.g. to add new tables/columns without reset).

## Why drift happens

- A migration file was changed **after** it was applied.
- Schema was changed with `prisma db push` or manual SQL, so the DB no longer matches what the migration history would produce.
- Different branches or environments applied different migrations.

## Fixing “modified migration” (optional)

If one migration is reported as “modified after it was applied”, you can:

1. Restore that migration file to the version that was originally applied (e.g. from git history), **or**
2. Keep using `db:sync` / `db push` for schema updates and avoid `migrate dev` on that database until you’re ready to baseline or fix history.

## Baselining (advanced)

For a one-time “this DB is the source of truth” setup, see Prisma’s [Baselining](https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining) guide. That’s useful when you’re adding Prisma Migrate to an existing database and want a clean migration history going forward.
