import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/api";
import { resolveCustomerIdFromSession } from "@/lib/business/module-helpers";

const taskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).optional().default(""),
  status: z.enum(["open", "in_progress", "completed"]).default("open"),
  dueDate: z.string().datetime({ offset: true }).optional().or(z.literal("")).transform((value) => value && value !== "" ? value : null),
});

export async function GET() {
  const resolved = await resolveCustomerIdFromSession();
  if ("response" in resolved) return resolved.response;

  const { data, error } = await resolved.supabase.from("business_tasks").select("id, customer_id, title, description, status, due_date, created_at, updated_at").eq("customer_id", resolved.customerId).order("created_at", { ascending: false });
  if (error) return jsonError("Unable to load tasks", 500, "tasks_fetch_failed");
  return NextResponse.json({ tasks: data ?? [] });
}

export async function POST(request: Request) {
  const resolved = await resolveCustomerIdFromSession();
  if ("response" in resolved) return resolved.response;

  let body: unknown;
  try { body = await request.json(); } catch { return jsonError("Request body must be valid JSON", 400); }

  const parsed = taskSchema.safeParse(body);
  if (!parsed.success) return jsonError("Please provide valid task data", 400, "invalid_task");

  const { data, error } = await resolved.supabase.from("business_tasks").insert({
    customer_id: resolved.customerId,
    title: parsed.data.title,
    description: parsed.data.description ?? "",
    status: parsed.data.status,
    due_date: parsed.data.dueDate,
  }).select("id, customer_id, title, description, status, due_date, created_at, updated_at").single();

  if (error || !data) return jsonError("Unable to create task", 500, "task_create_failed");
  return NextResponse.json({ task: data }, { status: 201 });
}
