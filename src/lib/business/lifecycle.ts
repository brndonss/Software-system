import type { AutomationAction, CampaignAction, FollowUpStatus, LeadStatus, TaskStatus } from "@/lib/business/types";

const leadTransitions: Record<LeadStatus, LeadStatus[]> = {
  new: ["qualified", "follow_up", "closed"],
  qualified: ["follow_up", "closed"],
  follow_up: ["qualified", "closed"],
  closed: ["follow_up"],
};

const taskTransitions: Record<TaskStatus, TaskStatus[]> = {
  open: ["in_progress", "completed"],
  in_progress: ["open", "completed"],
  completed: ["open"],
};

const followUpTransitions: Record<FollowUpStatus, FollowUpStatus[]> = {
  scheduled: ["in_progress", "completed"],
  in_progress: ["scheduled", "completed"],
  completed: ["scheduled"],
};

export function canTransitionLead(from: LeadStatus, to: LeadStatus) { return leadTransitions[from].includes(to); }
export function canTransitionTask(from: TaskStatus, to: TaskStatus) { return taskTransitions[from].includes(to); }
export function canTransitionFollowUp(from: FollowUpStatus, to: FollowUpStatus) { return followUpTransitions[from].includes(to); }

export function automationUpdateForAction(status: string, approvalStatus: string, action: AutomationAction) {
  if (action === "approve" && status === "recommended" && approvalStatus === "pending") return { status: "recommended", approval_status: "approved", enabled: false, activity: "automation_approved" };
  if (action === "activate" && ((status === "recommended" && approvalStatus === "approved") || status === "paused")) return { status: "active", approval_status: "approved", enabled: true, activity: "automation_activated" };
  if (action === "pause" && status === "active") return { status: "paused", approval_status: "paused", enabled: false, activity: "automation_paused" };
  if (action === "reject" && status === "recommended") return { status: "rejected", approval_status: "rejected", enabled: false, activity: "automation_rejected" };
  return null;
}

export function campaignUpdateForAction(status: string, action: CampaignAction) {
  if (action === "submit_for_approval" && (status === "draft" || status === "rejected")) return { status: "pending_approval", approval_status: "pending", activity: "campaign_submitted_for_approval" };
  if (action === "approve" && status === "pending_approval") return { status: "approved", approval_status: "approved", activity: "campaign_approved" };
  if (action === "reject" && status === "pending_approval") return { status: "rejected", approval_status: "rejected", activity: "campaign_rejected" };
  return null;
}