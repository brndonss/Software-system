export function omitUndefined(values: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
}

export function activitySummary(action: string, title: string) {
  return `${action.replaceAll("_", " ")}: ${title}`;
}