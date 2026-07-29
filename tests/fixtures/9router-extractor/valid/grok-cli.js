export const GROK_CLI_MODEL = "grok-build";
export function supportsGrokCliReasoningEffort(model) {
  return /^grok-4\.5(?:$|-)/.test(String(model || ""));
}
