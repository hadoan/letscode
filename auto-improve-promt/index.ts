import { BASELINE_PROMPT } from "./prompts/baseline.ts";
import { selfRefine } from "./optimize/critic.ts";
import { evolve } from "./optimize/evolve.ts";
import { scorePrompt } from "./optimize/harness.ts";
import { DATASET } from "./dataset.ts";
import type { LLM } from "./types.ts";
import { plannerLLM } from "./llm/openai-planner.ts";

async function main() {
  const refined = await selfRefine(BASELINE_PROMPT, []);
  const variants = await evolve(refined);
  // Cap to 3 total candidates for scoring to match expectation
  const candidates = [refined, ...variants].slice(0, 3);

  const scored = await Promise.all(
    candidates.map(async (p) => ({
      prompt: p,
      ...(await scorePrompt(plannerLLM as LLM, p, DATASET)),
    }))
  );

  scored.sort((a, b) => b.avg - a.avg);
  const winner = scored[0];

  console.log("Candidates:", scored.map((s, i) => ({ i, avg: s.avg.toFixed(2) })));
  console.log("Winner avg:", winner.avg.toFixed(2));
  console.log("Winner prompt:", winner.prompt);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
