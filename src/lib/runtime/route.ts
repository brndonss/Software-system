import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { resolveCustomerIdFromSession } from "@/lib/business/module-helpers";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { resolveActiveRuntime, RuntimeServiceError, type RuntimeContext } from "./service";

export async function resolveRuntimeRequest(request: Request) {
  const resolved = await resolveCustomerIdFromSession();
  if ("response" in resolved) return { response: resolved.response } as const;
  try {
    const workspaceId = new URL(request.url).searchParams.get("workspaceId") ?? undefined;
    const context = await resolveActiveRuntime(resolved.customerId, resolved.supabase, workspaceId);
    return { ...resolved, context } as const;
  } catch (error) {
    return { response: runtimeError(error) } as const;
  }
}

export function adminContext(context: RuntimeContext): RuntimeContext {
  return { ...context, supabase: createSupabaseAdminClient() };
}

export function runtimeError(error: unknown): NextResponse {
  if (error instanceof RuntimeServiceError) return jsonError(error.message, error.status, error.code);
  return jsonError("Unable to process runtime request", 500, "runtime_request_failed");
}
