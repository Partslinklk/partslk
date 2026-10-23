import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { errorFields, log } from "./log";

/** Thrown from handlers/services to produce a specific HTTP error. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export const json = <T>(data: T, init?: ResponseInit) => NextResponse.json(data, init);

function fieldErrors(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) out[issue.path.join(".") || "_"] ??= issue.message;
  return out;
}

/** Reads the JSON body and validates it. Throws HttpError(400) on bad JSON or schema mismatch. */
export async function parseBody<S extends z.ZodType>(request: Request, schema: S): Promise<z.infer<S>> {
  const raw = await request.json().catch(() => {
    throw new HttpError(400, "Request body must be valid JSON.");
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, "Validation failed.", fieldErrors(parsed.error));
  return parsed.data;
}

/**
 * Maps any thrown error to a JSON response. Unknown errors are logged (structured, with the request id from
 * src/proxy.ts) and answered with the id only; no internals leak.
 */
export function errorResponse(err: unknown, request?: Request): NextResponse {
  if (err instanceof HttpError) {
    if (err.status >= 500) log("error", "http_error", { status: err.status, message: err.message, ...requestFields(request) });
    return NextResponse.json({ error: err.message, ...(err.fields ? { fields: err.fields } : {}) }, { status: err.status });
  }
  if (err instanceof ZodError) {
    return NextResponse.json({ error: "Validation failed.", fields: fieldErrors(err) }, { status: 400 });
  }
  const code = (err as { code?: string } | null)?.code;
  if (code === "23505") return NextResponse.json({ error: "That record already exists." }, { status: 409 });
  if (code === "23503") return NextResponse.json({ error: "Referenced record does not exist or is still in use." }, { status: 409 });
  if (code === "23514" || code === "23502" || code === "22P02") {
    return NextResponse.json({ error: "Invalid data." }, { status: 400 });
  }

  const requestId = request?.headers.get("x-request-id") || randomUUID();
  log("error", "unhandled_error", { requestId, ...requestFields(request), ...errorFields(err) });
  return NextResponse.json({ error: "Something went wrong.", requestId }, { status: 500 });
}

function requestFields(request?: Request) {
  if (!request) return {};
  return { requestId: request.headers.get("x-request-id") ?? undefined, method: request.method, path: new URL(request.url).pathname };
}

/** Wraps a route handler so thrown errors become consistent JSON responses. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      return errorResponse(e, args[0] instanceof Request ? args[0] : undefined);
    }
  };
}
