// src/emailStore.ts
const emails = [
    {
        id: "1",
        from: "severin@example.com",
        to: "you@example.com",
        subject: "Termsheet draft",
        body: "Hi, could you please review the latest termsheet draft by tomorrow?",
        unread: true,
    },
    {
        id: "2",
        from: "hr@example.com",
        to: "you@example.com",
        subject: "Welcome to the team!",
        body: "We are excited to have you on board. Here is some onboarding information...",
        unread: false,
    },
    {
        id: "3",
        from: "client@example.com",
        to: "you@example.com",
        subject: "Follow-up on our call",
        body: "Thanks for the call today. Can you send a short summary?",
        unread: true,
    },
];
export function listEmails(limit) {
    return emails.slice(0, limit ?? 20).map((e) => ({
        id: e.id,
        from: e.from,
        subject: e.subject,
        unread: e.unread,
    }));
}
export function getEmailById(id) {
    return emails.find((e) => e.id === id) ?? null;
}
export function addSentEmail(email) {
    const id = String(emails.length + 1);
    const newEmail = { id, unread: false, ...email };
    emails.push(newEmail);
    return newEmail;
}
