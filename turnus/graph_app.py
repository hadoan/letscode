from langgraph.graph import END, StateGraph

from llms import LLMProvider, get_llm
from nodes import (
    analyze_questionnaire_node,
    make_parse_email_node,
    process_with_turnus_node,
    request_clarification_node,
    route_after_analysis,
)
from state import CaseState


def build_app(llm_provider: LLMProvider = "openai", *, use_langfuse: bool = True):
    """
    Construct and compile the LangGraph state machine for the questionnaire workflow.
    """
    graph = StateGraph(CaseState)

    llm = get_llm(provider=llm_provider, use_langfuse=use_langfuse)

    graph.add_node("parse_email", make_parse_email_node(llm))
    graph.add_node("analyze_questionnaire", analyze_questionnaire_node)
    graph.add_node("process_with_turnus", process_with_turnus_node)
    graph.add_node("request_clarification", request_clarification_node)

    graph.set_entry_point("parse_email")
    graph.add_edge("parse_email", "analyze_questionnaire")

    graph.add_conditional_edges(
        "analyze_questionnaire",
        route_after_analysis,
        {
            "request_clarification": "request_clarification",
            "process_with_turnus": "process_with_turnus",
        },
    )

    graph.add_edge("request_clarification", END)
    graph.add_edge("process_with_turnus", END)

    return graph.compile()
