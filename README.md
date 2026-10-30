# Solicitud de Apertura de Cuenta — LAFISE Digital Empresas

Zona (micro-frontend) de Next.js 16 y React 19 para crear y completar la solicitud de apertura de cuenta empresarial. Se sirve bajo `/account-request` y se integra detrás del portal (host, puerto 3000).

## Alcance

- Esta zona: creación de la solicitud (`/new`) y los pasos del formulario (`/{requestId}/...`).
- Login: portal. Registro: zona de onboarding. Listado de solicitudes: zona home.

## Desarrollo local

```bash
pnpm install
cp .env.example .env.local   # API de dxb-account-request + x-api-key
pnpm dev                     # zona en http://localhost:3001/account-request
pnpm dev:all                 # zona + home + POC (HOME_REPO / POC_APP)
```

El portal (puerto 3000) reescribe `/account-request/*` hacia esta zona. Las llamadas HTTP van al backend configurado en `API_BASE_URL` / `NEXT_PUBLIC_API_BASE_URL` (BFF en `src/app/api/[...slug]`). Ver `AGENTS.md` para estructura y reglas del repositorio.

## Verificación

`pnpm build` requiere las variables de `.env.local` (ver `.env.example`). `pnpm lint`, `pnpm type-check`, `pnpm test`, `pnpm knip`, `pnpm build` y `pnpm lint:spell` deben pasar antes de abrir un PR.

## Plantilla base

El tooling (ESLint, Prettier, Vitest, Knip, CSpell, Husky, Changesets) proviene de la plantilla de módulos de LAFISE Digital Empresas y las convenciones de la zona `approvals`.
