export interface EmailValidationResult {
  email: string;
  status:
    | "deliverable"
    | "not_deliverable"
    | "invalid"
    | "disposable"
    | "unknown";
  details: {
    syntaxOk: boolean;
    disposable: boolean;
    mxRecords: string[];
    smtpResponse: { code: number; text: string } | null;
    timeTakenMs: number;
    error?: string;
  };
}

// RFC 5322 compliant email regex (simplified but robust)
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function validateEmailSyntax(email: string): boolean {
  if (!email || email.length > 254) return false;

  const parts = email.split("@");
  if (parts.length !== 2) return false;

  const [local, domain] = parts;
  if (local.length > 64 || domain.length > 253) return false;

  return EMAIL_REGEX.test(email);
}

export function extractDomain(email: string): string {
  const parts = email.split("@");
  return parts.length === 2 ? parts[1].toLowerCase() : "";
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function parseEmailList(input: string): string[] {
  if (!input.trim()) return [];

  // Handle comma-separated, space-separated, or newline-separated emails
  const emails = input
    .split(/[,\n\r\s]+/)
    .map((email) => normalizeEmail(email))
    .filter((email) => email.length > 0);

  // Remove duplicates
  return [...new Set(emails)];
}
