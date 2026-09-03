import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, slugify } from "@/lib/api";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  businessName: z.string().trim().min(1).max(200),
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON", 400);
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return jsonError("Email, password, and business name are required", 400);

  const admin = createSupabaseAdminClient();
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: parsed.data.email.toLowerCase(),
    password: parsed.data.password,
    email_confirm: false,
  });
  if (authError || !authData.user) return jsonError(authError?.message ?? "Unable to create account", 400, "registration_failed");

  const slug = `${slugify(parsed.data.businessName)}-${crypto.randomUUID().slice(0, 8)}`;
  const { data: customer, error: customerError } = await admin
    .from("customers")
    .insert({ business_name: parsed.data.businessName, slug })
    .select("id, business_name, slug, status, created_at")
    .single();

  if (customerError || !customer) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return jsonError("Unable to create business", 500, "registration_failed");
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
    return jsonError("Unable to finish account setup", 500, "registration_failed");
  }

  return NextResponse.json({ user: authData.user, customer }, { status: 201 });
}
