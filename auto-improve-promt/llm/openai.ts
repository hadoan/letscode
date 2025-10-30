// llm/openai.ts
import fs from "fs";
import path from "path";
import OpenAI from "openai";

// Quick private loader for a local `.env` file so `npm run dev` works without
// requiring the external `dotenv` package. This reads .env from the repo root
// and sets process.env entries only if they're not already set.
if (!process.env.OPENAI_API_KEY) {
    try {
        const envPath = path.resolve(process.cwd(), ".env");
        const content = fs.readFileSync(envPath, "utf8");
        for (const line of content.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#")) continue;
            const eq = trimmed.indexOf("=");
            if (eq === -1) continue;
            const key = trimmed.slice(0, eq).trim();
            let val = trimmed.slice(eq + 1).trim();
            // remove optional surrounding quotes
            if ((val.startsWith("\"") && val.endsWith("\"")) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
            }
            if (key && val && !process.env[key]) process.env[key] = val;
        }
    } catch (e) {
        // ignore — we'll fall back to mock behavior if no key is available
    }
}

// Only instantiate the real OpenAI client when an API key is provided.
// The SDK will throw on construction if apiKey is missing, so guard it.
const openaiClient: any = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : undefined;

// Centralized call helper (JSON mode, no streaming). If OPENAI_API_KEY is not set,
// return a deterministic mock response so `npm run dev` works offline.
export async function chatJson(system: string, input: any, opts?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
}) {
    if (openaiClient) {
        const res = await openaiClient.chat.completions.create({
            model: opts?.model ?? "gpt-4o-mini",
            temperature: opts?.temperature ?? 0.2,
            max_tokens: opts?.maxTokens ?? 800,
            response_format: { type: "json_object" }, // JSON mode
            messages: [
                { role: "system", content: system },
                { role: "user", content: JSON.stringify(input) }
            ],
        });
        const content = res.choices[0]?.message?.content || "{}";
        // Be tolerant of non-strict JSON from the model: try direct parse, then
        // try extracting the first JSON object substring, then fall back to a
        // safe error object so the runtime doesn't crash.
        try {
            return JSON.parse(content);
        } catch (err) {
            // Attempt to extract JSON between triple-backtick fences if present
            const fenceMatch = content.match(/```(?:json)?\n([\s\S]*?)\n```/i);
            if (fenceMatch && fenceMatch[1]) {
                try {
                    return JSON.parse(fenceMatch[1]);
                } catch (_) {
                    // continue to next fallback
                }
            }

            // Attempt to find the first {...} block
            const firstBrace = content.indexOf('{');
            const lastBrace = content.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                const sub = content.slice(firstBrace, lastBrace + 1);
                try {
                    return JSON.parse(sub);
                } catch (_) {
                    // fall through
                }
            }

            // As a last resort, return a structured error the rest of the app can
            // understand (an error.raise plan), embedding a truncated raw string
            const raw = typeof content === 'string' ? content.slice(0, 2000) : String(content);
            return { steps: [{ tool: "error.raise", args: { reason: "openai parse error", raw } }] };
        }
    }

    // Mock behaviour when no API key is present. Return useful defaults based on
    // the input shape so callers (critic, evolve, planner) get reasonable values.
    // - critic.selfRefine expects { rewrite }
    // - evolve expects { variants: [ { prompt } ] }
    // - planner expects a plan-like object with `steps`
    try {
        const payload = input ?? {};
        if (payload && typeof payload === "object") {
            if (typeof payload.prompt === "string") {
                return { rewrite: payload.prompt };
            }
            if (typeof payload.base === "string") {
                return {
                    variants: [
                        { delta: "base", prompt: payload.base },
                        { delta: "minor", prompt: payload.base + " (variant 1)" },
                        { delta: "minor", prompt: payload.base + " (variant 2)" },
                    ],
                };
            }
        }
    } catch {
        // fall through to generic mock
    }

    // Generic planner mock: return a single error.raise step so the harness/judge
    // can continue deterministically without external calls.
    return { steps: [{ tool: "error.raise", args: { reason: "mock: no OPENAI_API_KEY" } }] };
}
