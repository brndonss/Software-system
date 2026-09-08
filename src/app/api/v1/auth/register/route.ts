import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, slugify } from "@/lib/api";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const passwordRequirements = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

const registerSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(12, "Password must be at least 12 characters long."),
  confirmPassword: z.string().min(1, "Please confirm your password."),
  businessName: z.string().trim().min(1).max(200),
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON", 400, "invalid_payload");
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message ?? "Email, password, and business name are required";
    return jsonError(issue, 400, "invalid_registration");
  }

  if (parsed.data.password !== parsed.data.confirmPassword) {
    return jsonError("Passwords do not match.", 400, "password_mismatch");
  }

  if (!passwordRequirements.test(parsed.data.password)) {
    return jsonError("Use 12+ characters with uppercase, a number, and a symbol.", 400, "weak_password");
  }

  const admin = createSupabaseAdminClient();
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: parsed.data.email.toLowerCase(),
    password: parsed.data.password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    const message = authError?.message ?? "Unable to create account";
    return jsonError(message, 400, "registration_failed");
  }

  const slug = `${slugify(parsed.data.businessName)}-${crypto.randomUUID().slice(0, 8)}`;
  const { data: customer, error: customerError } = await admin
    .from("customers")
    .insert({ business_name: parsed.data.businessName, slug })
    .select("id, business_name, slug, status, created_at")
    .single();

  if (customerError || !customer) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return jsonError("Unable to create your business workspace.", 500, "registration_failed");
  }

  const { error: profileError } = await admin.from("user_profiles").insert({
    id: authData.user.id,
    customer_id: customer.id,
    role: "owner",
    first_name: parsed.data.firstName ?? null,
    last_name: parsed.data.lastName ?? null,
  });

  if (profileError) {
    await admin.from("customers").delete().eq("id", customer.id);
    await admin.auth.admin.deleteUser(authData.user.id);
    return jsonError("Unable to finish account setup.", 500, "registration_failed");
  }

  return NextResponse.json({ user: authData.user, customer }, { status: 201 });
}
