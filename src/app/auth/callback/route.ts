import { NextResponse } from "next/server";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/api";

const allowedDestinations = new Set(["/onboarding", "/system-builder", "/dashboard"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next") ?? "/system-builder";
  const next = allowedDestinations.has(requestedNext) ? requestedNext : "/system-builder";

  if (url.searchParams.get("error")) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("Google sign-in was cancelled or could not be completed.")}`, url.origin));
  }

  if (!code) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("The Google sign-in link is missing or expired.")}`, url.origin));
  }

  const supabase = await createSupabaseServerClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("Unable to complete Google sign-in. Please try again.")}`, url.origin));
  }

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("No authenticated user was returned by Google.")}`, url.origin));
  }

  const provisioning = await ensureCustomerProfile(authData.user);
  if (!provisioning.ok) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(provisioning.message ?? "Unable to finish your Northstar account setup.")}`, url.origin));
  }

  const admin = createSupabaseAdminClient();
  const { data: onboarding } = await admin
    .from("customer_onboarding")
    .select("status")
    .eq("customer_id", provisioning.customerId)
    .maybeSingle();
  const destination = onboarding?.status === "completed" ? "/dashboard" : "/onboarding";

  return NextResponse.redirect(new URL(requestedNext === "/dashboard" ? destination : next, url.origin));
}

async function ensureCustomerProfile(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }) {
  const admin = createSupabaseAdminClient();
  const { data: existingProfile, error: profileLookupError } = await admin
    .from("user_profiles")
    .select("id, customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileLookupError) return { ok: false, message: "Unable to check your Northstar account." };
  if (existingProfile) return { ok: true, customerId: existingProfile.customer_id as string };

  const metadata = user.user_metadata ?? {};
  const fullName = String(metadata.full_name ?? metadata.name ?? "").trim();
  const emailName = (user.email ?? "northstar-user").split("@")[0] || "northstar-user";
  const businessName = fullName ? `${fullName}'s workspace` : `${emailName}'s workspace`;
  const slug = `${slugify(businessName)}-${crypto.randomUUID().slice(0, 8)}`;

  const { data: customer, error: customerError } = await admin
    .from("customers")
    .insert({ business_name: businessName.slice(0, 200), slug })
    .select("id")
    .single();

  if (customerError || !customer) return { ok: false, message: "Unable to create your Northstar workspace." };

  const { error: profileError } = await admin.from("user_profiles").insert({
    id: user.id,
    customer_id: customer.id,
    role: "owner",
    first_name: fullName.split(" ")[0] || null,
    last_name: fullName.split(" ").slice(1).join(" ") || null,
  });

  if (profileError) {
    await admin.from("customers").delete().eq("id", customer.id);
    return { ok: false, message: "Unable to finish your Northstar account setup." };
  }

  return { ok: true, customerId: customer.id };
}
