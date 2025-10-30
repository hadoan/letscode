import type { Example } from "../types.ts";
import { chatJson } from "../llm/openai.ts";

export const CRITIC_PROMPT = `
You are a prompt critic and editor.
Given a planner prompt and a failure set, do:
1) FLAWS
2) PATCHES
3) REWRITE (<=350 tokens)
4) RISKS
Return JSON:
{ "flaws":[], "patches":[], "rewrite":"...", "risks":[] }
`;

export async function selfRefine(prompt: string, failures: Example[]) {
  const out = await chatJson(CRITIC_PROMPT, { prompt, failures }, {
    model: "gpt-4o-mini",
    temperature: 0.2,
  });
  return out.rewrite || prompt;
}
