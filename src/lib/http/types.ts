/**
 * Discriminant for {@link ClassifiedBackendError}.
 *
 * Used by `error.tsx` and mutation handlers to pick the correct error page
 * or side-effect (e.g. session cleanup on 401).
 */
enum BackendErrorKind {
  Unauthorized = 'unauthorized',
  Forbidden = 'forbidden',
  NotFound = 'not-found',
  Internal = 'internal',
  ClientError = 'client-error',
}

type ClassifiedBackendError =
  | { kind: BackendErrorKind.Unauthorized; status: 401 }
  | { kind: BackendErrorKind.Forbidden; status: 403 }
  | { kind: BackendErrorKind.NotFound; status: 404 }
  | { kind: BackendErrorKind.Internal; status: number }
  | { kind: BackendErrorKind.ClientError; status: number };

export { BackendErrorKind, type ClassifiedBackendError };
