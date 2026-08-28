# Two Jars — Household Budget Tracker (Backend)

A Node.js + TypeScript + Express + PostgreSQL (Prisma ORM) backend for a
multi-user, household-based personal finance tracker.

## Stack

- **Runtime:** Node.js, TypeScript, ts-node/nodemon for dev
- **Framework:** Express 5
- **Database:** PostgreSQL (local via Docker for dev, AWS RDS planned for prod)
- **ORM:** Prisma 7.x (uses the newer `prisma-client` generator + driver
  adapter pattern — client is instantiated with `new PrismaClient({ adapter })`
  using `@prisma/adapter-pg`, not the classic implicit `.env`-only setup)
- **Auth:** JWT access tokens (15 min) + rotating refresh tokens (7 days,
  stored in DB, reuse-detection revokes the whole token family if an
  already-used token is replayed)
- **Password hashing:** bcrypt

## Architecture

Follows a **Model → Service → Controller → Route** layering:

```
src/
  generated/prisma/     Prisma-generated client (custom output path)
  services/              Business logic. No knowledge of HTTP/Express.
  controllers/            Reads req, calls a service, maps results/errors to res.
  routes/                  Wires URL + HTTP method -> controller, with middleware.
  middleware/              authenticate (JWT verification), requireAdmin (role check)
  errors/                  Custom Error subclasses, organized by domain, with an
                           index.ts barrel file so everything can be imported
                           from one place: import { X } from "../errors"
  types/express.d.ts       Declaration-merged req.user typing (AuthenticatedUser)
```

Each domain (auth, household, account, category, transaction, transfer,
budget) gets its own service/controller/route file set, organized by domain
rather than by individual endpoint.

## Domain model

- **User** — belongs to exactly one Household. Roles: `ADMIN` (exactly one,
  global, with a placeholder `"__ADMIN__"` household since they don't
  belong to a real one) or `MEMBER` (everyone else, equal privileges within
  their household).
- **Household** — owns Accounts and non-global Categories. New household
  creation requires admin approval; joining an existing household requires
  approval from any existing member (first-approve-wins). Pending
  registrations live in `HouseholdCreationRequest` / `HouseholdJoinRequest`
  tables and only become real `Household`/`User` rows on approval.
- **Account** — belongs to a Household (no per-account owner; ownership
  carries no special privilege). Has a free-text `accountType`. Creating an
  account also creates an initial `INCOME` transaction for the starting
  balance, atomically, attributed to the creating user.
- **Category** — either global (admin-created, visible to everyone,
  `householdId: null`) or personal (household-created, visible only to that
  household). Only the admin can edit/delete global categories; only a
  household's own members can edit/delete its personal categories.
- **Transaction** — `INCOME` / `EXPENSE` / `TRANSFER`. Always tied to an
  Account and a User (who entered it), optionally a Category. List supports
  filtering by `accountId`, `category`, `type`, `dateMin`, `dateMax`, always
  scoped to the caller's household via the related Account.
- **Transfer** — stored as two linked `TRANSFER` transactions (one per
  account), created/updated atomically so each row's `transferPairId` points
  at the other. Deleting either side deletes both.
- **Budget** — per-household, per-category, per-month. Setting a budget
  inserts a new row effective from that month forward; the "effective"
  budget for any queried month is the most recent row at or before it, so
  changes carry forward until explicitly overridden, and history is
  preserved (past months keep their original amount even after a later
  change).

## Auth flow

1. `POST /api/auth/register` — `{ name, email, password, isNewHouseHold,
   householdName }`. Creates a pending `HouseholdCreationRequest` or
   `HouseholdJoinRequest` depending on `isNewHouseHold`. Blocks duplicate
   emails (existing user or existing pending request) and nonexistent
   household names (409/404).
2. Admin approves via `POST /api/admin/household-creation-requests/:id/approve`
   (admin-only), or any existing household member approves via
   `POST /api/household/join-requests/:id/approve` — each atomically creates
   the real `Household`/`User` row(s) and deletes the pending request.
3. `POST /api/auth/login` — returns `{ accessToken, refreshToken, user }`.
4. Protected routes require `Authorization: Bearer <accessToken>`.
   `authenticate` middleware verifies the JWT and attaches `req.user`; a
   `TokenExpiredError` gets a `"code": "TOKEN_EXPIRED"` field in the 401
   body so a frontend can distinguish "refresh silently" from "log in again."
5. `POST /api/auth/refresh` — exchanges a valid, unused refresh token for a
   new access + refresh token pair (rotation). Reusing an already-rotated
   refresh token revokes every refresh token for that user (compromise
   response).
6. `POST /api/auth/logout` — revokes a specific refresh token.

## Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | — | `409`/`404` |
| POST | `/api/auth/login` | — | `401` |
| POST | `/api/auth/refresh` | — | rotates tokens; `401` on invalid/expired/reused |
| POST | `/api/auth/logout` | — | revokes the given refresh token |
| POST | `/api/admin/household-creation-requests/:id/approve` | admin | `404` |
| POST | `/api/household/join-requests/:id/approve` | member | `403`/`404` |
| GET/POST | `/api/accounts` | member | own household's accounts only |
| GET/PUT/PATCH | `/api/accounts/:id` | member | `403` if not yours, `404` if missing |
| GET/POST | `/api/categories` | member | global + own household's |
| POST | `/api/categories/global` | admin | |
| PUT/PATCH/DELETE | `/api/categories/:id` | admin for global, member for own household's | `403`/`404` |
| GET/POST | `/api/transactions` | member | filters: `accountId`, `category`, `type`, `dateMin`, `dateMax` |
| DELETE | `/api/transactions/:id` | member | deletes both sides if it's a transfer |
| POST | `/api/transfers` | member | `{ fromAccountId, toAccountId, amount, date, description }` |
| POST | `/api/budgets` | member | `{ categoryId, amount, effectiveYear, effectiveMonth }` |
| GET | `/api/budgets/summary?year=&month=` | member | budget vs actual spend per category |

**Not yet built:** `DELETE /api/accounts/:id` (descoped — needs a decision
on what happens to existing transactions on the account), account lockout
after N failed logins (423 — descoped, to be designed later),
`GET /api/admin/users` per-member aggregates (descoped for now), a user
belonging to more than one household at once (descoped — current model is
strictly one household per user via a single required `householdId`).

## Local development

```powershell
# Postgres running locally via Docker on port 5433
npm run dev              # nodemon + ts-node, src/app.ts
npx prisma migrate dev   # after any schema.prisma change
npx prisma generate      # regenerate client (needed after schema changes)
npx prisma studio        # inspect data at localhost:5555
npx tsc --noEmit         # type-check without building
```

`.env` (never committed) needs `DATABASE_URL`, `PORT`, `JWT_SECRET`.

## Known quirks worth remembering

- Prisma's generator here is the newer `prisma-client` (not
  `prisma-client-js`) provider with a custom `output` path
  (`src/generated/prisma`). `PrismaClient` must be constructed with an
  explicit driver adapter: `new PrismaClient({ adapter: new PrismaPg({
  connectionString: process.env.DATABASE_URL }) })`.
- `dotenv.config()` must run before anything that reads `process.env` is
  imported — import ordering matters, since ES/CJS imports execute before
  later lines in the same file.
- Prisma-level `@default(uuid())` only applies through the Prisma client —
  raw SQL inserts bypass it entirely.