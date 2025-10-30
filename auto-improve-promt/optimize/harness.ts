import type { LLM } from "../types.ts";
import type { Example } from "../types.ts";
import { judge } from "./judge.ts";

export async function scorePrompt(
  llm: LLM,
  systemPrompt: string,
  dataset: Example[]
) {
  const results: { id: string; score: number; out: string }[] = [];
  for (const ex of dataset) {
    const out = await llm({ system: systemPrompt, input: ex.input });
    const s = judge(ex, out);
    // after computing `out` and `s`
    console.log("[DEBUG]", { example: ex.id, out });

    results.push({ id: ex.id, score: s, out });
  }
  const avg =
    results.reduce((a, b) => a + b.score, 0) / Math.max(results.length, 1);
  return { avg, results };
}
