// dataset.ts
import { Example } from "./types.ts";

export const DATASET: Example[] = [
    {
        id: "next-week-3-slots",
        input: {
            userText: "Propose 3 meeting slots next week for ha.doanmanh@gmail.com (30m) and hold them."
        },
        spec: { mustReturnJson: true, mustHaveSteps: true }
    },
    {
        id: "missing-email",
        input: { userText: "Propose 2 meeting slots tomorrow morning (45m)." },
        spec: { mustReturnJson: true, mustHaveSteps: false } // should emit error.raise or ask for email
    },
    {
        id: "bad-timephrase",
        input: { userText: "Book soonish with Alex." },
        spec: { mustReturnJson: true, mustHaveSteps: false } // vague; should refuse or ask
    },
    {
        id: "count-3-must-yield-3-holds",
        input: { userText: "Please find 3 30m slots next week with ha.doanmanh@gmail.com and hold them." },
        spec: { mustReturnJson: true, mustHaveSteps: true }
    },
    {
        id: "present-email-no-error-raise",
        input: { userText: "Propose two 45m slots next Tuesday for ha.doanmanh@gmail.com." },
        spec: { mustReturnJson: true, mustHaveSteps: true }
    }
];
