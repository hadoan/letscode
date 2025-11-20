# Dependencies: langchain, langgraph, langchain-openai, langchain-anthropic, langfuse, pydantic (or typing.TypedDict)

import logging
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
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    )
    logger = logging.getLogger(__name__)

    provider = choose_provider(os.getenv("LLM_PROVIDER"))
    # Enable Langfuse by default; change to False here if you want to disable tracing.
    use_langfuse = True

    logger.info("Starting demo run with provider=%s langfuse=%s", provider, use_langfuse)
    app = build_app(llm_provider=provider, use_langfuse=use_langfuse)

    excel_path = "docs/Transparency Act Questionnaire.xlsx"
    logger.info("Using questionnaire file at %s", excel_path)

    # Simulated incoming email
    email = {
        "from": "customer@example.com",
        "subject": "Transparency Act Questionnaire - Due 2025-11-30",
        "body": "Please complete the attached Transparency Act questionnaire by 30 November 2025.",
        "attachments": [excel_path],
    }

    initial_state: CaseState = {
        "email": email,
        "file_path": excel_path,
        "status": "new",
        "missing_fields": [],
    }

    final_state = app.invoke(initial_state)

    print("\n=== FINAL STATE ===")
    print(final_state)
    logger.info("Workflow finished with status=%s", final_state.get("status"))


if __name__ == "__main__":
    demo_run()
