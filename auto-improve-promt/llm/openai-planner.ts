import type { LLM } from "../types.ts";
import { chatJson } from "./openai.ts";

export const plannerLLM: LLM = async (args) => {
  const { system, input } = args;
  const json = await chatJson(system, input, {
    model: "gpt-4o-mini",
    temperature: 0.1,
    maxTokens: 1200,
  });
  return JSON.stringify(json);
};
