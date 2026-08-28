# Two Jars — Household Budget Tracker (Backend)

A Node.js + TypeScript + Express + PostgreSQL (Prisma ORM) backend for a
multi-user, household-based personal finance tracker.

## Stack

- **Runtime:** Node.js, TypeScript, ts-node/nodemon for dev
- **Framework:** Express 5
- **Database:** PostgreSQL (local via Docker for dev, Azure Postgres Flexible Server planned for prod)
- **ORM:** Prisma 7.x (`prisma-client` generator + driver adapter pattern —
  client is instantiated with `new PrismaClient({ adapter })` using
  `@prisma/adapter-pg`, not the classic implicit `.env`-only setup)
- **Auth:** JWT access tokens (15 min) + rotating refresh tokens (7 days,
  stored in DB, reuse-detection revokes the whole token family if an
  already-used token is replayed)
- **Password hashing:** bcrypt

## Architecture

Follows a **Model → Service → Controller → Route** layering:

```
src/
  generated/prisma/     Prisma-generated client (gitignored, regenerate with `npx prisma generate`)
  services/              Business logic. No knowledge of HTTP/Express.
  controller/             Reads req, calls a service, maps results/errors to res.
                          Shared errorHandler.ts maps a list of {errorClass, status}
                          pairs to responses, replacing repeated instanceof chains.
  routes/                  Wires URL + HTTP method -> controller, with middleware.
  middleware/              authenticate (JWT verification), admin (role check,
                           must run after authenticate)
  errors/                  Custom Error subclasses, one file per domain, with an
                           index.ts barrel file: import { X } from "../errors"
  types/express.d.ts       Declaration-merged req.user typing (AuthenticatedUser)
```

Each domain (auth, household, account, category, transaction, transfer,
budget, bill) gets its own service/controller/route file set.

## Domain model

- **User** — belongs to exactly one Household. Roles: `ADMIN` (exactly one,
  global, with a placeholder `"__ADMIN__"` household) or `MEMBER` (everyone
  else, equal privileges within their household).
- **Household** — owns Accounts and non-global Categories. New household
  creation requires admin approval; joining an existing household requires
  approval from any existing member (first-approve-wins). Pending
  registrations live in `HouseholdCreationRequest` / `HouseholdJoinRequest`
  tables and only become real `Household`/`User` rows on approval.
- **Account** — belongs to a Household (no per-account owner — this was
  built and then deliberately reverted; ownership carries no functional
  privilege). Has a free-text `accountType` and an optional `institution`.
  Creating an account also creates an initial `INCOME` transaction for the
  starting balance, atomically.
- **Category** — either global (admin-created, visible to everyone,
  `householdId: null`) or personal (household-created, visible only to that
  household). Only the admin can edit/delete global categories; only a
  household's own members can edit/delete its personal categories.
  Case-insensitive duplicate names are rejected within the same scope.
  No standalone categories UI — created inline from the transaction form.
- **Transaction** — `INCOME` / `EXPENSE` / `TRANSFER`. Always tied to an
  Account and a User (who entered it), optionally a Category. List supports
  filtering by `accountId`, `category`, `type`, `dateMin`, `dateMax`, always
  scoped to the caller's household. TRANSFER-type transactions can't be
  edited directly. Deleting a transaction also removes any linked
  `RecurringBillPayment` record (so the bill correctly reverts to unpaid).
- **Transfer** — stored as two linked `TRANSFER` transactions (one per
  account), created/updated atomically so each row's `transferPairId` points
  at the other. Deleting either side deletes both.
- **Budget** — per-household, per-category, per-month. Setting a budget
  upserts: if a row already exists for that exact (household, category,
  year, month), it's updated in place; otherwise a new row is inserted. The
  "effective" budget for any queried month is the most recent row at or
  before it, so unchanged months carry the previous value forward and past
  months keep their original amount even after a later change.
- **RecurringBill** — a template (description, account, category, amount,
  day of month). **RecurringBillPayment** links a bill to a real Transaction
  for a specific (year, month) — at most one per bill per month. A bill's
  "paid this month" status is derived by checking for a matching payment
  record, not stored as a flag. Deleting a bill removes its payment links
  but keeps the historical payment transactions intact.

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
3. `POST /api/auth/login` — returns `{ accessToken, refreshToken, user }`,
   where `user` includes `householdName` for display purposes.
4. Protected routes require `Authorization: Bearer <accessToken>`.
   `authenticate` middleware verifies the JWT and attaches `req.user`; a
   `TokenExpiredError` gets a `"code": "TOKEN_EXPIRED"` field in the 401
   body so the frontend can distinguish "refresh silently" from "log in again."
5. `POST /api/auth/refresh` — exchanges a valid, unused refresh token for a
   new access + refresh token pair (rotation). Reusing an already-rotated
   refresh token revokes every refresh token for that user (compromise
   response).
6. `POST /api/auth/logout` — revokes a specific refresh token server-side.

## Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | — | `409`/`404` |
| POST | `/api/auth/login` | — | `401` |
| POST | `/api/auth/refresh` | — | rotates tokens; `401` on invalid/expired/reused |
| POST | `/api/auth/logout` | — | revokes the given refresh token |
| POST | `/api/admin/household-creation-requests/:id/approve` | admin | `404` |
| POST | `/api/household/join-requests/:id/approve` | member | `403`/`404` |
| GET | `/api/households/members` | member | list current household's members |
| GET/POST | `/api/accounts` | member | own household's accounts only |
| GET/PUT/PATCH | `/api/accounts/:id` | member | `403` if not yours, `404` if missing |
| GET/POST | `/api/categories` | member | global + own household's |
| POST | `/api/categories/global` | admin | |
| PUT/PATCH/DELETE | `/api/categories/:id` | admin for global, member for own household's | `403`/`404`/`409` (duplicate) |
| GET/POST | `/api/transactions` | member | filters: `accountId`, `category`, `type`, `dateMin`, `dateMax` |
| GET | `/api/transactions/summary` | member | `?year=&month=` income/expense/net |
| PUT/PATCH | `/api/transactions/:id` | member | rejects TRANSFER type |
| DELETE | `/api/transactions/:id` | member | cascades to paired transfer row and any linked bill payment |
| POST | `/api/transfers` | member | `{ fromAccountId, toAccountId, amount, date, description }` |
| GET/POST | `/api/budgets` | member | `{ categoryId, amount, effectiveYear, effectiveMonth }` — upserts |
| GET | `/api/budgets/summary` | member | `?year=&month=` budget vs actual spend per category |
| GET/POST | `/api/bills` | member | recurring bill templates |
| PUT/PATCH/DELETE | `/api/bills/:id` | member | |
| POST | `/api/bills/:id/payments` | member | logs a payment (`{ transactionId }`), marks that month paid |

**Not yet built:** `DELETE /api/accounts/:id` (descoped — needs a decision
on what happens to existing transactions on the account), account lockout
after N failed logins (423 — descoped), `GET /api/admin/users` per-member
aggregates (descoped), a user belonging to more than one household at once
(descoped — current model is strictly one household per user).

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
- `Decimal` fields (money amounts) serialize to **strings** in JSON, not
  numbers — always `Number(...)` before doing arithmetic on the client side.
- Foreign keys default to `RESTRICT` on delete — deleting a `Transaction` or
  `RecurringBill` that's still referenced elsewhere (e.g. a linked
  `RecurringBillPayment`) will fail unless the dependent rows are removed
  first, inside the same `$transaction`.