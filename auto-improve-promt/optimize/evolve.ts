import { chatJson } from "../llm/openai.ts";

// src/optimize/evolve.ts (change MUTATOR_PROMPT)
export const MUTATOR_PROMPT = `
Given a base system prompt for a JSON-only planner, produce 3 variants that are
STRUCTURALLY different and likely to change behavior:

- V1: Add a REQUIRED step pattern: first step MUST be "calendar.checkAvailability",
      followed by exactly N "calendar.hold" steps when count=N.
- V2: Add strict arg schema for tools with required keys and types. Refuse if any mismatch.
- V3: Add refusal guard: when inputs are complete, NEVER return error.raise; produce at least 1 actionable step.

Return:
{ "variants": [
  {"delta":"enforce step pattern", "prompt":"..."},
  {"delta":"strict arg schema", "prompt":"..."},
  {"delta":"anti-refusal", "prompt":"..."}
]}
`;


function fallbackVariants(base: string): string[] {
  const v1 = `${base}\n\nRequirement: First step MUST be \"calendar.checkAvailability\"; then exactly N \"calendar.hold\" steps when count=N. Refuse any other first tool.`;
  const v2 = `${base}\n\nArguments schema: Enforce strict arg schemas for tools. Required keys and types must match exactly. If mismatch, return an error.step with reason.`;
  const v3 = `${base}\n\nRefusal guard: When inputs are sufficient, NEVER return error.raise; always return at least one actionable step.`;
  return [v1, v2, v3];
}

export async function evolve(base: string): Promise<string[]> {
  let prompts: string[] = [];
  try {
    const out = await chatJson(MUTATOR_PROMPT, { base }, {
      model: "gpt-4o-mini",
      temperature: 0.6,
    });
    const raw = Array.isArray(out?.variants) ? out.variants : Array.isArray(out) ? out : [];
    const mapped = raw
      .map((v: any) => (v?.prompt ?? v?.rewrite ?? v?.text ?? (typeof v === "string" ? v : "")).toString())
      .filter(Boolean);
    prompts = mapped.filter((p: string) => p && p.trim());
  } catch (_) {
    // ignore and fall back
  }

  // Ensure we always return 3 structurally-different variants
  if (prompts.length < 3) {
    const f = fallbackVariants(base);
    // Merge keeping unique strings, preserving order preference for model outputs
    const seen = new Set<string>();
    const merged = [...prompts, ...f].filter((p) => {
      if (seen.has(p)) return false;
      seen.add(p);
      return true;
    });
    prompts = merged.slice(0, 3);
  } else if (prompts.length > 3) {
    prompts = prompts.slice(0, 3);
  }

  return prompts;
}
