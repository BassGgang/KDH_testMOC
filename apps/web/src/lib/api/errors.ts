import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: 'bad_request', message, details }, { status: 400 });
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
  return NextResponse.json({ error: 'server_error', message, details }, { status: 500 });
}

export function fromZodError(err: ZodError) {
  return badRequest('Validation failed', err.flatten());
}
