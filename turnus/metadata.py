import json
from typing import Optional

from state import Priority


def extract_email_metadata_with_llm(email: dict, llm) -> tuple[Optional[str], Priority]:
    """
    Use the provided LLM to extract due date and priority signals from an email payload.
    """
    prompt = f"""
    You are a helpful assistant extracting metadata from emails.

    Email:
    From: {email.get("from")}
    Subject: {email.get("subject")}
    Body: {email.get("body")}

    1. If there is a clear deadline (e.g. "due on 30 November 2025"), output it as YYYY-MM-DD.
    2. Classify priority as one of: urgent, high, normal.
       - urgent: due within 2 days or explicitly 'ASAP'
       - high: due within 7 days
       - normal: everything else

    Respond in JSON with keys: "due_date", "priority".
    """
    try:
        resp = llm.invoke(prompt)
    except Exception as exc:
        print(f"[warn] LLM metadata extraction failed ({exc}); falling back to defaults.")
        return None, "normal"
    due_date: Optional[str] = None
    priority: Priority = "normal"
    try:
        content = resp.content if hasattr(resp, "content") else resp
        data = json.loads(content)
        if isinstance(data, dict):
            due_candidate = data.get("due_date")
            if isinstance(due_candidate, str) and due_candidate.strip():
                due_date = due_candidate.strip()
            priority_candidate = data.get("priority")
            if priority_candidate in ("urgent", "high", "normal"):
                priority = priority_candidate  # type: ignore[assignment]
    except Exception:
        # Fall back to defaults if parsing fails.
        pass
    return due_date, priority
