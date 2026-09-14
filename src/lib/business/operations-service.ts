import type { SupabaseClient } from "@supabase/supabase-js";
import { createActivityLog } from "@/lib/business/module-helpers";
import type { BusinessRecord, BusinessResource } from "@/lib/business/types";

const tableByResource: Record<BusinessResource, string> = {
  leads: "business_leads",
  tasks: "business_tasks",
  followUps: "business_follow_ups",
  automations: "business_automations",
  marketing: "marketing_campaign_drafts",
};

export async function getBusinessRecord(supabase: SupabaseClient, customerId: string, resource: BusinessResource, recordId: string) {
  const { data, error } = await supabase.from(tableByResource[resource]).select("*").eq("id", recordId).eq("customer_id", customerId).maybeSingle();
  if (error) return { error };
  return { record: data as BusinessRecord | null };
}

export async function updateBusinessRecord(
  supabase: SupabaseClient,
  customerId: string,
  resource: BusinessResource,
  recordId: string,
  changes: Record<string, unknown>,
  activity: { automation: string; action: string; resultSummary: string } | null,
) {
  const { data, error } = await supabase.from(tableByResource[resource]).update(changes).eq("id", recordId).eq("customer_id", customerId).select("*").maybeSingle();
  if (error) return { error };
  if (!data) return { record: null };

  if (activity) {
    const activityError = await createActivityLog(supabase, customerId, activity.automation, activity.action, activity.resultSummary);
    if (activityError) return { record: data as BusinessRecord, activityError };
  }

  return { record: data as BusinessRecord };
}

export async function validateFollowUpRelation(supabase: SupabaseClient, customerId: string, relatedType: string, relatedId: string | null) {
  if (!relatedId) return null;
  if (relatedType === "customer") return relatedId === customerId ? null : "A customer follow-up must reference your current business account";
  const { data, error } = await supabase.from("business_leads").select("id").eq("id", relatedId).eq("customer_id", customerId).maybeSingle();
  if (error || !data) return "The related lead was not found in your business";
  return null;
}