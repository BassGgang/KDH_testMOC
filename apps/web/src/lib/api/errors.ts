import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AuthError } from '@/lib/auth';

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: 'bad_request', message, details }, { status: 400 });
}

export function unauthorized(message: string) {
  return NextResponse.json({ error: 'unauthorized', message }, { status: 401 });
}

export function forbidden(message: string) {
  return NextResponse.json({ error: 'forbidden', message }, { status: 403 });
}

/** Map an AuthError thrown by requireUser/requireRole to a response. */
export function fromAuthError(err: AuthError) {
  return err.status === 401 ? unauthorized(err.message) : forbidden(err.message);
}

export function unprocessable(message: string, details?: unknown) {
  return NextResponse.json({ error: 'unprocessable', message, details }, { status: 422 });
}

export function conflict(message: string, details?: unknown) {
  return NextResponse.json({ error: 'conflict', message, details }, { status: 409 });
}

export function notFound(message: string) {
  return NextResponse.json({ error: 'not_found', message }, { status: 404 });
}

export function serverError(message: string, details?: unknown) {
  // Never leak raw DB/internal error details to the client — log them instead.
  if (details !== undefined) {
    console.error(`[server_error] ${message}:`, details);
  }
  return NextResponse.json({ error: 'server_error', message }, { status: 500 });
}

export function fromZodError(err: ZodError) {
  return badRequest('Validation failed', err.flatten());
}
