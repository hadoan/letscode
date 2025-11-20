import os
from typing import Literal

from langchain_openai import ChatOpenAI

try:
    from langchain_anthropic import ChatAnthropic
except Exception:  # pragma: no cover - optional dependency
    ChatAnthropic = None

LLMProvider = Literal["openai", "claude"]

OPENAI_MODEL = "gpt-4.1-mini"
# Default to a broadly available Claude model; override via ANTHROPIC_MODEL or CLAUDE_MODEL env if needed.
CLAUDE_SONNET_MODEL = os.getenv(
    "ANTHROPIC_MODEL", os.getenv("CLAUDE_MODEL", "claude-3-opus-20240229")
)


def build_langfuse_callbacks(enable: bool = True):
    """
    Lazily attach Langfuse callbacks if the library is installed and configured.
    """
    if not enable:
        return []
    try:
        from langfuse.langchain import CallbackHandler
    except Exception:
        print("[warn] langfuse not installed or incompatible; skipping callbacks.")
        return []
    public_key = os.getenv("LANGFUSE_PUBLIC_KEY")
    secret_key = os.getenv("LANGFUSE_SECRET_KEY")
    host = os.getenv("LANGFUSE_HOST")
    if not (public_key and secret_key):
        print("[warn] LANGFUSE_PUBLIC_KEY/SECRET_KEY missing; skipping callbacks.")
        return []
    try:
        from langfuse import Langfuse

        # Initialize the default Langfuse client so the callback can attach.
        Langfuse(public_key=public_key, secret_key=secret_key, host=host)
        handler = CallbackHandler(public_key=public_key)
        print("[info] Langfuse callbacks enabled.")
        return [handler]
    except Exception as exc:
        print(f"[warn] Failed to initialize Langfuse callbacks: {exc}")
        return []


def get_llm(provider: LLMProvider = "openai", *, use_langfuse: bool = True):
    """
    Return a chat model wired to the requested provider and optionally instrumented with Langfuse.
    """
    callbacks = build_langfuse_callbacks(use_langfuse)

    if provider == "claude":
        if ChatAnthropic is None:
            raise RuntimeError("langchain-anthropic is required for Claude Sonnet support.")
        return ChatAnthropic(model=CLAUDE_SONNET_MODEL, temperature=0, callbacks=callbacks)

    return ChatOpenAI(model=OPENAI_MODEL, temperature=0, callbacks=callbacks)
