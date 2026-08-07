/** Normalize level string for display (e.g. Level4ProfoundUnderstanding__c -> Level 4) */
export function formatLevel(level: string): string {
  const match = level.match(/Level(\d+)/i);
  if (match) return `Level ${match[1]}`;
  return level.replace(/__c$/, "").replace(/([A-Z])/g, " $1").trim() || level;
}
