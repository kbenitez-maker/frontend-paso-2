type ErrorCode =
  | 'UNAUTHENTICATED'
  | 'MODULE_FORBIDDEN'
  | 'PERMISSION_DENIED'
  | 'REQUEST_NOT_FOUND'
  | 'REQUEST_NOT_EDITABLE'
  | 'REQUEST_INCOMPLETE'
  | 'SURVEY_NOT_AVAILABLE'
  | 'CATALOG_UNAVAILABLE'
  | 'SAVE_FAILED'
  | 'REQUIRED_FIELD_MISSING'
  | 'VALIDATION_FAILED'
  | 'DOCUMENT_ITEM_NOT_FOUND'
  | 'DOCUMENT_FILE_NOT_FOUND'
  | 'FILE_FORMAT_NOT_ALLOWED'
  | 'FILE_TOO_LARGE';

interface ApiError {
  code: ErrorCode;
  message: string;
}

/** One rejected field of a section save (`field` is a dotted form path). */
interface FieldError {
  field: string;
  code: string;
  message: string;
}

export type { ApiError, ErrorCode, FieldError };
