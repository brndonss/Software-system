import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const resetRequestSchema = z.object({
  email: z.string().trim().email(),
});

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON", 400, "invalid_payload");
  }

  const parsed = resetRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Enter a valid email address", 400, "invalid_email");
  }

  const origin = new URL(request.url).origin;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email.toLowerCase(), {
    redirectTo: `${origin}/reset-password`,
  });

  if (error) {
    return jsonError(error.message || "Unable to send password reset email", 400, "password_reset_failed");
  }

  return NextResponse.json({ success: true });
}
