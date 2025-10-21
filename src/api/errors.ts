export type EcoApiErrorCode = "NETWORK" | "TIMEOUT";

export class EcoApiError extends Error {
  status?: number;
  details?: unknown;
  code?: EcoApiErrorCode;

  constructor(
    message: string,
    options: { status?: number; details?: unknown; code?: EcoApiErrorCode } = {}
  ) {
    super(message);
    this.name = "EcoApiError";
    this.status = options.status;
    this.details = options.details;
    this.code = options.code;
  }
}

export class MissingUserIdError extends Error {
  readonly endpoint: string;
  readonly status = 400;

  constructor(endpoint: string) {
    super("missing_user_id");
    this.name = "MissingUserIdError";
    this.endpoint = endpoint;
  }
}
