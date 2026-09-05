import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { requireUser } from "@/lib/auth";

type Context = { params: Promise<{ buildId: string }> };

export async function GET(_request: Request, context: Context) {
  const { buildId } = await context.params;
  const result = await requireUser();
  if ("response" in result) return result.response;
  const { data: build, error } = await result.supabase.from("system_builds").select("id, customer_id, status, attempt_count, error_code, error_message, started_at, completed_at, created_at, updated_at").eq("id", buildId).single();
  if (error || !build) return jsonError("Build not found", 404, "build_not_found");
  const { data: configuration } = build.status === "completed" ? await result.supabase.from("system_configurations").select("id, version, configuration, created_at").eq("build_id", buildId).single() : { data: null };
  return NextResponse.json({ build, configuration });
}
