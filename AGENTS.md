# AGENTS.md

Operational guidance for AI coding agents working in **dxb-portal-account-request**, a
LAFISE Digital Enterprise micro-frontend zone (Next.js 16 App Router, React 19, TypeScript
strict, Tailwind 4, LAFISE Onyx design system, next-intl).

## Zone context

- Served under basePath `/account-request`. The portal (host, port 3000) rewrites to this zone.
- Login lives in the portal, registration in the onboarding zone, the request list in home.
  This zone owns request creation (`/new`) and the form steps (`/{requestId}/...`).
- Local dev: portal `:3000` + zone `:3001` (`pnpm dev`). Set `API_BASE_URL` and
  `NEXT_PUBLIC_API_BASE_URL` to the dxb-account-request API (see `.env.example`).

## Structure

```text
src/app/          Thin routes only: mount a feature component, nothing else.
src/features/     One folder per screen: index.ts (public API) + <slug>-step.tsx.
src/shared/       Feature-agnostic UI (auth guard, error pages, step rail/title, registry-driven form fields in `form/`,
                  step-agnostic block form in `step-form/`; see docs/adding-a-step.md).
src/server/api/   endpoints.ts + one file per resource (queries/mutations + DTO types).
src/lib/          http, query, env, auth, routes, constants (steps, query keys, layout).
src/types/        Shared domain types (domain, request, user, api-error).
src/contracts/    Field-contract runtime (visibility evaluator, schema builder) + generated/.
contracts/        Inventory tooling: XLSX snapshot, overlays, generator (see inventory/README.md).
src/i18n/         next-intl request config + message aggregation.
i18n/{es,en}/     One JSON per feature/namespace (parity enforced by types).
test/             Test setup, render helper, i18n wrapper, contract sample fixtures (`fixtures/generated/`).
```

## Dependency rules

Direction: `app -> features -> shared -> lib / server / types`.

- Features are imported only through their index: `@/features/<name>`. ESLint
  (`no-restricted-imports`) forbids `@/features/*/*`.
- `shared/` never imports from `features/`.
- `lib/`, `server/`, `types/` never import from `app/`, `features/` or `shared/`.

## Centralization rules

- `src/server/api/endpoints.ts` is the only place that builds API paths.
- `src/lib/routes.ts` is the only place that builds hrefs (internal and cross-zone).
  Internal routes omit the basePath; Next adds it.
- `src/lib/constants/steps.ts` (`STEPS`) is the single registry of form steps. Derive
  `StepSlug`, `BlockOf<S>` and use `isStepSlug` / `isBlockOf` instead of re-listing slugs.
- Query keys come from `src/lib/constants/query-keys.ts`.
- `BASE_PATH` (`src/lib/constants/layout.ts`) must match `basePath` in `next.config.ts`.

## Component rules

Reference: `src/shared/form/` (e.g. `collection-field/`, `collection-item-editor/`), built the way
Onyx base components are (`Modal`, `Avatar`, `ListBox`).

- One folder per component, kebab-case, with an `index.ts` as its only entry point. Code outside
  the folder imports the index, never inner files.
- One component per file. Hooks (`use-*.ts`), context (`context.ts`), types (`types.ts`) and
  pure helpers (`lib/`) live in the folder of the component that owns them; tests in `<folder>/tests/`.
- Compound pattern when a component has parts: the root is the callable default and the parts
  hang off it via `Object.assign(Root, { Header, List, Item })`, read as `CollectionField.Item`.
  Parts read shared state from the folder's context (`use<Component>()`), not prop drilling.
- Styles go in the folder's `themes.ts` as `tailwind-variants` (`tv` from `@lafise/onyx-theme/tv`):
  `slots` per styled element, `variants` for state (`invalid`, `fullWidth`). Destructure slots at
  module scope (`const { header } = theme()`) and pass variant props at render.
- No class-string constants (`const HEADER = '...'`) or conditional template-literal `className`s.

## Typing rules

- No `any`. No `as` on external data (API payloads, cookies, route params, request bodies):
  narrow with type guards (`isRequestId`, `isStepSlug`, ...) or validate with Zod.
- DTO types (snake_case, mirroring the API) live in the `server/api` resource file that
  uses them and are exported from `server/api/index.ts`.
- Use arrow functions, export at the end of the file, types in `types/` when shared.

## i18n

- All user-facing strings go through next-intl. Add keys to both `i18n/es/*.json` and
  `i18n/en/*.json`; Spanish is neutral professional Spanish (no voseo).
- Code, comments and identifiers are English.

## API

The browser calls this zone's BFF (`src/app/api/[...slug]`), which forwards to
`API_BASE_URL/v1/<path>` with `x-api-key` and the portal `auth_session` Bearer token.
Server Components may call the same upstream directly via `src/lib/http.ts`.

## Commands

```bash
pnpm dev           # zone on :3001
pnpm lint          # ESLint, --max-warnings 0
pnpm type-check    # tsc
pnpm test          # Vitest with coverage
pnpm knip          # unused files/exports/deps
pnpm build         # production build
pnpm lint:spell    # CSpell (en + es)
pnpm format:check  # Prettier
pnpm contracts:snapshot  # XLSX -> contracts/inventory/snapshot.json (needs source/inventario.xlsx)
pnpm contracts:generate  # overlays + snapshot -> src/contracts/generated, test fixtures
pnpm contracts:check     # fails if generated files are stale (run it before a PR)
```

All of the above must pass before a change is done. Do not bypass Husky hooks.

## Do not

- Do not hardcode strings, hex colors or magic spacing; use i18n and Onyx tokens.
- No raw `<p>`, `<span>`, `<button>`, `<input>`, `<a>`, `<img>`, `<label>` or headings in JSX (ESLint enforces it):
  use Onyx (`Text`, `Heading`, `Button`, `Link`, `Avatar`, `TextField`, ...) or `next/image`. Layout `<div>`s and
  semantic lists are fine.
- Do not add `console.*`; use `@lafise/onyx-logger` (`src/lib/logger.ts`).
- Do not copy `.env.local` or secrets between repositories; `.env.example` holds placeholders.
- Do not edit `src/contracts/generated/**`, `test/fixtures/generated/**` or `i18n/*/*-fields.json`;
  change the overlay and run `pnpm contracts:generate`.
- Google Drive sources (specs, designs) are **read-only**: never modify or create files there.
