// src/emailTools.ts
import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { listEmails, getEmailById, addSentEmail } from "./emailStore.js";

export const listInboxTool = tool(
  "list_inbox",
  "List recent emails in the inbox",
  {
    limit: z.number().int().min(1).max(50).optional(),
  },
  async ({ limit }, _extra) => {
    const items = listEmails(limit);
    return {
      content: [
        {
          type: "text",
          text: `Inbox (${items.length}):\n` + items.map((e) => `- [${e.id}] ${e.from} — ${e.subject}${e.unread ? " (unread)" : ""}`).join("\n"),
        },
      ],
      structuredContent: { emails: items },
    };
  }
);

export const readEmailTool = tool(
  "read_email",
  "Read a specific email by ID",
  {
    id: z.string(),
  },
  async ({ id }, _extra) => {
    const email = getEmailById(id);
    if (!email) {
      return {
        content: [
          {
            type: "text",
            text: `Email with id=${id} not found`,
          },
        ],
        isError: true,
      };
    }
    return {
      content: [
        {
          type: "text",
          text: `Email ${email.id} from ${email.from} to ${email.to}\nSubject: ${email.subject}\n\n${email.body}`,
        },
      ],
      structuredContent: { email },
    };
  }
);

export const sendEmailTool = tool(
  "send_email",
  "Send an email (simulated: logs to console and stores in memory)",
  {
    to: z.string().email(),
    subject: z.string(),
    body: z.string(),
  },
  async ({ to, subject, body }, _extra) => {
    const sent = addSentEmail({
      from: "you@example.com",
      to,
      subject,
      body,
    });

    console.log("\n[send_email] Simulated sending email:\n", { to, subject, body });

    return {
      content: [
        {
          type: "text",
          text: `Sent email to ${to} with subject "${subject}".`,
        },
      ],
      structuredContent: {
        status: "sent",
        email: sent,
      },
    };
  }
);

// Bundle tools into a local MCP server
export const emailMcpServer = createSdkMcpServer({
  name: "email-server",
  version: "0.1.0",
  tools: [listInboxTool, readEmailTool, sendEmailTool],
});
