import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/auth";

export function json(data: unknown, init?: number | ResponseInit) {
  const responseInit = typeof init === "number" ? { status: init } : init;
  return NextResponse.json(data as object, responseInit);
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function unauthorized() {
  return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
}

export function serverError(message = "Internal error") {
  return NextResponse.json({ error: message }, { status: 500 });
}

/** Returns the current user id or a 401 Response. Usage:
 *   const uid = await requireUser(); if (uid instanceof Response) return uid; */
export async function requireUser(): Promise<string | Response> {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();
  return userId;
}
