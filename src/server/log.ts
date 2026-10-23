type Level = "info" | "warn" | "error";

/**
 * One JSON object per line, so Vercel Logs / a log drain can search and alert on fields
 * (e.g. level="error" or requestId="..."). Never put customer personal data or secrets in `fields`.
 */
export function log(level: Level, msg: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({ level, msg, time: new Date().toISOString(), ...fields });
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(line);
}

export function errorFields(err: unknown) {
  if (err instanceof Error) return { error: err.message, name: err.name, stack: err.stack?.split("\n").slice(0, 6).join("\n") };
  return { error: String(err) };
}
