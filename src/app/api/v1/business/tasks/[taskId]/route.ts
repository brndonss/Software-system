import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/api";
import { canTransitionTask } from "@/lib/business/lifecycle";
import { getBusinessRecord, updateBusinessRecord } from "@/lib/business/operations-service";
import { activitySummary, omitUndefined } from "@/lib/business/serializers";
import { resolveCustomerIdFromSession } from "@/lib/business/module-helpers";
import type { TaskStatus } from "@/lib/business/types";

const patchSchema = z.object({ title: z.string().trim().min(1).max(200).optional(), description: z.string().trim().max(4000).nullable().optional(), status: z.enum(["open", "in_progress", "completed"]).optional(), dueDate: z.string().datetime({ offset: true }).nullable().optional() });

export async function GET(_: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const resolved = await resolveCustomerIdFromSession(); if ("response" in resolved) return resolved.response;
  const { taskId } = await params; const result = await getBusinessRecord(resolved.supabase, resolved.customerId, "tasks", taskId);
  if (result.error) return jsonError("Unable to load task", 500, "task_fetch_failed"); if (!result.record) return jsonError("Task not found", 404, "task_not_found");
  return NextResponse.json({ task: result.record });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const resolved = await resolveCustomerIdFromSession(); if ("response" in resolved) return resolved.response;
  let body: unknown; try { body = await request.json(); } catch { return jsonError("Request body must be valid JSON", 400); }
  const parsed = patchSchema.safeParse(body); if (!parsed.success) return jsonError("Please provide valid task updates", 400, "invalid_task");
  const { taskId } = await params; const current = await getBusinessRecord(resolved.supabase, resolved.customerId, "tasks", taskId);
  if (current.error) return jsonError("Unable to load task", 500, "task_fetch_failed"); if (!current.record) return jsonError("Task not found", 404, "task_not_found");
  if (parsed.data.status && !canTransitionTask(current.record.status as TaskStatus, parsed.data.status)) return jsonError("This task cannot make that status transition", 409, "invalid_transition");
  const changes = omitUndefined({ title: parsed.data.title, description: parsed.data.description, status: parsed.data.status, due_date: parsed.data.dueDate });
  if (!Object.keys(changes).length) return jsonError("Provide at least one task update", 400, "empty_update");
  const action = parsed.data.status === "completed" ? "task_completed" : parsed.data.status === "in_progress" ? "task_started" : parsed.data.status === "open" ? "task_reopened" : parsed.data.dueDate !== undefined ? "task_due_date_changed" : "task_updated";
  const result = await updateBusinessRecord(resolved.supabase, resolved.customerId, "tasks", taskId, changes, { automation: "task_management", action, resultSummary: activitySummary(action, String(current.record.title)) });
  if (result.error) return jsonError("Unable to update task", 500, "task_update_failed"); if (!result.record) return jsonError("Task not found", 404, "task_not_found"); if (result.activityError) return jsonError("Task updated but activity logging failed", 500, "activity_log_failed");
  return NextResponse.json({ task: result.record });
}