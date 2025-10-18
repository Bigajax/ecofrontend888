export class EcoApiError extends Error {
  status?: number;
  details?: unknown;

  constructor(
    message: string,
    options: { status?: number; details?: unknown } = {}
  ) {
    super(message);
    this.name = "EcoApiError";
    this.status = options.status;
    this.details = options.details;
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
