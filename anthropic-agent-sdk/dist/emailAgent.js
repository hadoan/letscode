// src/emailAgent.ts
import "dotenv/config";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { emailMcpServer } from "./emailTools.js";
async function runEmailAgent(userInstruction) {
    const systemPrompt = `
You are an email assistant for a busy professional.

You can:
- List emails with the "list_inbox" tool
- Read details with the "read_email" tool
- Draft and send replies with the "send_email" tool

Always:
- Ask clarifying questions if the user is vague
- Confirm important details (recipient, tone, dates) before sending
- Keep emails clear, polite, and concise
`;
    const stream = query({
        prompt: userInstruction,
        options: {
            systemPrompt,
            mcpServers: {
                email: emailMcpServer,
            },
            allowedTools: ["list_inbox", "read_email", "send_email"],
            // Skip interactive permission prompts for the local demo tools.
            permissionMode: "bypassPermissions",
            allowDangerouslySkipPermissions: true,
            settingSources: [],
            model: "sonnet", // or whatever model/alias you have configured
            maxTurns: 8,
        },
    });
    console.log("=== Agent output ===\n");
    for await (const message of stream) {
        // For now, just dump all messages as JSON.
        // Later, you can pretty-print assistant text vs tool calls.
        console.log(JSON.stringify(message, null, 2));
    }
}
const userInstruction = process.argv.slice(2).join(" ") ||
    "Show me my unread emails and draft a reply to the client asking for 2 more days.";
runEmailAgent(userInstruction).catch((err) => {
    console.error(err);
    process.exit(1);
});
