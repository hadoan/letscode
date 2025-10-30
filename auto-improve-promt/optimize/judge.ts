// src/optimize/judge.ts
import type { Example } from "../types";

export function judge(example: Example, modelOutput: string): number {
    let score = 0;

    let parsed: any = null;
    try {
        parsed = JSON.parse(modelOutput);
        score += 2; // valid JSON
    } catch {
        return 0;
    }

    if (!parsed || !Array.isArray(parsed.steps)) return 0;
    const steps = parsed.steps;
    score += 1; // has steps array

    const hasErrorRaise =
        steps.length === 1 && steps[0]?.tool === "error.raise" && steps[0]?.args?.reason;

    // Heuristic: detect actionable input (email + propose/slot/hold words)
    const txt: string = (example.input?.userText || "").toLowerCase();
    const actionable = /propose|slot|hold|meeting/.test(txt);
    const hasEmail = /[^\s]+@[^\s]+/.test(txt);

    // If actionable & has email, we expect a concrete plan (no error.raise)
    if (actionable && hasEmail) {
        if (hasErrorRaise) return 2; // harsh penalty
        score += 2; // not an error
        // Expect at least 4 steps: 1 check + 3 holds (for "3 slots")
        const holdCount = steps.filter((s: any) => s.tool === "calendar.hold").length;
        const hasCheck = steps.some((s: any) => s.tool === "calendar.checkAvailability");
        if (hasCheck) score += 2;
        if (holdCount >= 3) score += 2;
        // Attendees present?
        const attendeesOk = steps.every((s: any) => !s.args || s.args.attendees);
        if (attendeesOk) score += 1;
    } else {
        // If not actionable/missing email, error.raise gets full credit
        score += hasErrorRaise ? 3 : 1;
    }

    // Lightweight bloat penalty/bonus
    const length = JSON.stringify(parsed).length;
    if (length < 4000) score += 1;

    return Math.max(0, Math.min(score, 10));
}
