# Dependencies: langchain, langgraph, langchain-openai, langchain-anthropic, langfuse, pydantic (or typing.TypedDict)

import os

from graph_app import build_app
from llms import LLMProvider
from state import CaseState


def choose_provider(raw: str | None) -> LLMProvider:
    if raw is None:
        return "openai"
    token = raw.strip().lower()
    if token.startswith("claude"):
        return "claude"
    return "openai"


def demo_run():
    provider = choose_provider(os.getenv("LLM_PROVIDER"))
    # Enable Langfuse by default; change to False here if you want to disable tracing.
    use_langfuse = True

    app = build_app(llm_provider=provider, use_langfuse=use_langfuse)

    # Simulated incoming email
    email = {
        "from": "customer@example.com",
        "subject": "ESG Questionnaire - Due 2025-11-30",
        "body": "Hi, please complete the attached ESG questionnaire by 30 November 2025.",
        "attachments": ["esg_questionnaire.pdf"],
    }

    initial_state: CaseState = {
        "email": email,
        "file_path": "esg_questionnaire.pdf",
        "status": "new",
        "missing_fields": [],
    }

    final_state = app.invoke(initial_state)

    print("\n=== FINAL STATE ===")
    print(final_state)


if __name__ == "__main__":
    demo_run()
