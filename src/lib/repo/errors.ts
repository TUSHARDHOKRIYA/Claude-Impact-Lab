export class ReportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReportValidationError";
  }
}

export class ItemTooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ItemTooLargeError";
  }
}
