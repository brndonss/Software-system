export type BusinessResource = "leads" | "tasks" | "followUps" | "automations" | "marketing";

export type LeadStatus = "new" | "qualified" | "follow_up" | "closed";
export type TaskStatus = "open" | "in_progress" | "completed";
export type FollowUpStatus = "scheduled" | "in_progress" | "completed";
export type AutomationAction = "approve" | "activate" | "pause" | "reject";
export type CampaignAction = "submit_for_approval" | "approve" | "reject";

export type BusinessRecord = Record<string, unknown> & { id: string; customer_id: string };