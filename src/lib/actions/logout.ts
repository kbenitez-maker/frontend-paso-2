import { createLogoutServerActions } from '@lafise/lde-web-core/server';

/**
 * Bound Server Action pair produced by
 * `@lafise/lde-web-core/server::createLogoutServerActions`.
 *
 * The kit factory is a plain (sync) function that binds the underlying
 * top-level `'use server'` handlers with the app's defaults (session
 * cookie name, post-logout path, JWT user-id claim priority). Invoking
 * it exactly once at module scope keeps the RPC endpoint identity
 * stable across every consumer that imports these references — the
 * root `ReactQueryProvider` and the `(request)/layout.tsx` Server Component
 * that hands them to `<SessionClient>` (`LdeAppShellProvider` logout
 * config). The inactivity logout calls `usePerformLogout()`, which reads
 * these actions from the provider.
 *
 * The file intentionally omits the `'use server'` directive: the bound
 * references produced by `createLogoutServerActions()` are already
 * server references (Next.js recognizes `$$typeof: react.server.reference`
 * on `.bind()`ed Server Actions), so no re-registration is needed. This
 * matches the canonical example in the kit's `createLogoutServerActions`
 * docstring and avoids the "$$id" collision that would occur if we
 * re-exported them through a fresh `'use server'` module.
 */
const { getUserIdAction, clearSessionAction } = createLogoutServerActions();

export { clearSessionAction, getUserIdAction };
