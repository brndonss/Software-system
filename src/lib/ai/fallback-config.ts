import { z } from "zod";
import { MODULE_CATALOG, APPROVED_MODULE_KEYS } from "@/lib/system-config/catalog";
import { systemConfigurationSchema } from "@/lib/system-config/schema";

export function getFallbackConfiguration(input: Record<string, unknown>): z.infer<typeof systemConfigurationSchema> {
  const onboarding = (input.onboarding ?? {}) as Record<string, unknown>;
  const businessNiche = String(onboarding.business_niche ?? onboarding.businessNiche ?? "local service business").trim() || "local service business";
  const businessSize = String(onboarding.business_size ?? onboarding.businessSize ?? "2-10").trim() || "2-10";
  const services = String(onboarding.services_products ?? onboarding.servicesProducts ?? "Core services").trim() || "Core services";
  const goals = String(onboarding.software_goals ?? onboarding.softwareGoals ?? "Better organization and follow-up").trim() || "Better organization and follow-up";

  const selected = MODULE_CATALOG.filter((module) => {
    const moduleName = module.name.toLowerCase();
    const content = [businessNiche, services, goals, businessSize].join(" ").toLowerCase();
    const words = moduleName.split(/\s+/).map((part) => part.toLowerCase());
    return words.some((word) => content.includes(word)) || module.defaultEnabled;
  }).slice(0, 6);

  const defaultModules = selected.length ? selected : MODULE_CATALOG.filter((module) => module.defaultEnabled).slice(0, 6);

  const modules = defaultModules.map((module) => ({
    key: module.key,
    name: module.name,
    enabled: true,
    fields: module.fields.map((field) => ({
      key: field.key,
      label: field.label,
      type: field.type,
      required: field.required ?? false,
      options: "options" in field ? field.options : undefined,
    })),
  }));

  const workflows = defaultModules.flatMap((module) => {
    const moduleData = module as unknown as Record<string, unknown>;
    const templates: Array<{
      key: string;
      name: string;
      trigger: { module: string; event: string };
      actions: Array<{ type: string; delayMinutes?: number }>;
    }> = Array.isArray(moduleData.workflowTemplates) ? moduleData.workflowTemplates as Array<{
      key: string;
      name: string;
      trigger: { module: string; event: string };
      actions: Array<{ type: string; delayMinutes?: number }>;
    }> : [];

    return templates.map((template) => ({
      key: template.key,
      name: template.name,
      trigger: template.trigger,
      actions: template.actions.map((action) => ({
        type: action.type,
        delayMinutes: action.delayMinutes,
      })),
    }));
  }).slice(0, 10);

  const dashboardWidgets: Array<{ type: "metric" | "list" | "pipeline"; module: string; metric?: string; groupBy?: string }> = [];
  defaultModules.forEach((module) => {
    const moduleData = module as unknown as Record<string, unknown>;
    const widgets: Array<{ type: "metric" | "list" | "pipeline"; module: string; metric?: string; groupBy?: string }> = Array.isArray(moduleData.dashboardWidgets) ? moduleData.dashboardWidgets as Array<{ type: "metric" | "list" | "pipeline"; module: string; metric?: string; groupBy?: string }> : [];
    widgets.slice(0, 2).forEach((widget) => dashboardWidgets.push({
      type: widget.type === "metric" || widget.type === "list" || widget.type === "pipeline" ? widget.type : "metric",
      module: widget.module,
      metric: widget.metric,
      groupBy: widget.groupBy,
    }));
  });

  const normalizedModules = modules.map((module) => ({
    ...module,
    key: APPROVED_MODULE_KEYS.includes(module.key) ? module.key : "tasks",
    fields: module.fields.map((field) => ({
      ...field,
      key: field.key,
      type: ["text", "number", "date", "select", "boolean"].includes(field.type) ? field.type : "text",
    })),
  }));

  return systemConfigurationSchema.parse({
    schemaVersion: 1,
    businessSummary: {
      niche: businessNiche,
      primaryGoals: [
        goals,
        ...["Organize daily operations", "Improve follow-up consistency"].filter((goal) => goal !== goals),
      ].slice(0, 3),
    },
    modules: normalizedModules,
    workflows,
    dashboard: {
      widgets: dashboardWidgets.length ? dashboardWidgets : [
        { type: "metric", module: "tasks", metric: "open_tasks" },
        { type: "list", module: "customers", groupBy: "customer_status" },
      ],
    },
  });
}
