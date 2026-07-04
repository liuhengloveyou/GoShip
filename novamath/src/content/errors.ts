export type CmsErrorCode =
  | "CMS_CONFIG_MISSING"
  | "CMS_SOURCE_UNAVAILABLE"
  | "CMS_NOT_FOUND"
  | "CMS_VALIDATION_FAILED"
  | "CMS_INVALID_STATUS_TRANSITION"
  | "CMS_REQUEST_FAILED";

export class CmsError extends Error {
  code: CmsErrorCode;
  details?: Record<string, unknown>;

  constructor(
    code: CmsErrorCode,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "CmsError";
    this.code = code;
    this.details = details;
  }
}

export function isCmsError(error: unknown): error is CmsError {
  return error instanceof CmsError;
}
