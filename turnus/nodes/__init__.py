from typing import Callable, Literal

from metadata import extract_email_metadata_with_llm
from state import CaseState
from tools import process_questionnaire_via_turnus, send_email

RouteLabel = Literal["request_clarification", "process_with_turnus"]


def make_parse_email_node(llm) -> Callable[[CaseState], CaseState]:
    def parse_email_node(state: CaseState) -> CaseState:
        email = state["email"]
        due_date, priority = extract_email_metadata_with_llm(email, llm)
        state["due_date"] = due_date
        state["priority"] = priority
        state["status"] = "processing"
        return state

    return parse_email_node


def analyze_questionnaire_node(state: CaseState) -> CaseState:
    # Simulate that we always know company_name and hq_country, but sometimes miss "esg_score".
    required_fields = ["company_name", "hq_country", "esg_score"]
    available_fields = ["company_name", "hq_country"]

    missing = [field for field in required_fields if field not in available_fields]
    state["missing_fields"] = missing
    return state


def process_with_turnus_node(state: CaseState) -> CaseState:
    file_path = state["file_path"]
    completed_path = process_questionnaire_via_turnus(file_path)
    state["completed_file_path"] = completed_path
    state["status"] = "completed"

    email = state["email"]
    send_email(
        to=email["from"],
        subject=f"Completed: {email.get('subject', 'Questionnaire')}",
        body="Please find the completed questionnaire attached.",
        attachment_path=completed_path,
    )
    return state


def request_clarification_node(state: CaseState) -> CaseState:
    email = state["email"]
    missing = state.get("missing_fields", [])

    body = (
        "We started working on your questionnaire but need some additional information:\n\n"
        + "\n".join(f"- {field}" for field in missing)
        + "\n\nPlease reply with these details so we can complete the process before your deadline."
    )

    send_email(
        to=email["from"],
        subject=f"Missing information for: {email.get('subject', 'Questionnaire')}",
        body=body,
    )
    state["status"] = "waiting_for_data"
    return state


def route_after_analysis(state: CaseState) -> RouteLabel:
    missing = state.get("missing_fields", [])
    if missing:
        return "request_clarification"
    return "process_with_turnus"
