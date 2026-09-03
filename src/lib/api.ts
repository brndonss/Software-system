import { NextResponse } from "next/server";

export function jsonError(message: string, status: number, code = "bad_request") {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "business";
}
