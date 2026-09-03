import { jsonError } from "@/lib/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) return { supabase, response: jsonError("Authentication required", 401, "unauthorized") };
  return { supabase, user };
}

export async function requireOwner(customerId: string) {
  const result = await requireUser();
  if ("response" in result) return result;

  const { data: profile, error } = await result.supabase
    .from("user_profiles")
    .select("id, customer_id, role, first_name, last_name")
    .eq("id", result.user.id)
    .eq("customer_id", customerId)
    .eq("role", "owner")
    .single();

  if (error || !profile) return { response: jsonError("Customer not found", 404, "customer_not_found") };
  return { ...result, profile };
}
