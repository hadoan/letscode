import logging
from typing import Callable, List, Literal

import pandas as pd

from metadata import extract_email_metadata_with_llm
from state import AnswerType, CaseState, Questionnaire, Question
from tools import process_questionnaire_via_turnus, send_email

RouteLabel = Literal["request_clarification", "process_with_turnus"]

logger = logging.getLogger(__name__)


def make_parse_email_node(llm) -> Callable[[CaseState], CaseState]:
    def parse_email_node(state: CaseState) -> CaseState:
        email = state["email"]
        due_date, priority = extract_email_metadata_with_llm(email, llm)
        state["due_date"] = due_date
        state["priority"] = priority
        state["status"] = "processing"
        logger.info(
            "Parsed email metadata due_date=%s priority=%s status=%s",
            due_date,
            priority,
            state["status"],
        )
        return state

    return parse_email_node


def parse_excel_questionnaire(file_path: str) -> Questionnaire:
    """
    Parse the Transparency Act Questionnaire Excel into a simple Questionnaire object.
    This is a pragmatic parser tailored to this file, not a generic engine.
    """
    logger.info("Parsing Excel questionnaire at %s", file_path)
    try:
        df = pd.read_excel(file_path, sheet_name=0)
    except Exception as e:
        print(f"[WARN] Failed to read Excel file {file_path}: {e}")
        logger.warning("Failed to read Excel file %s: %s", file_path, e)
        return {
            "title": "Transparency Act Questionnaire",
            "sourceFile": file_path,
            "questions": [],
        }

    # Try to guess columns
    cols_lower = {c.lower(): c for c in df.columns if isinstance(c, str)}

    # Possible question text columns
    question_col_candidates = ["question", "frage", "description", "text"]
    question_col = None
    for cand in question_col_candidates:
        if cand in cols_lower:
            question_col = cols_lower[cand]
            break
    if question_col is None and len(df.columns) > 0:
        question_col = df.columns[0]

    id_col = cols_lower.get("id")
    section_col = cols_lower.get("section")
    type_col = cols_lower.get("type")

    questions: List[Question] = []

    for idx, row in df.iterrows():
        text = str(row.get(question_col, "")).strip() if question_col else ""
        if not text:
            continue

        qid: str
        if id_col:
            qid_val = row.get(id_col)
            qid = str(qid_val).strip() if pd.notna(qid_val) else f"Q{idx+1}"
        else:
            qid = f"Q{idx+1}"

        section = ""
        if section_col:
            sec_val = row.get(section_col)
            section = str(sec_val).strip() if pd.notna(sec_val) else "Main"
        else:
            section = "Main"

        # Infer answer type
        answer_type: AnswerType = "text"
        if type_col:
            t_val = str(row.get(type_col, "")).lower()
            if "yes" in t_val and "no" in t_val:
                answer_type = "yes_no"

        questions.append(
            {
                "id": qid,
                "section": section,
                "text": text,
                "answerType": answer_type,
                "options": [],
            }
        )

    logger.info("Parsed %d questions from %s", len(questions), file_path)
    return {
        "title": "Transparency Act Questionnaire",
        "sourceFile": file_path,
        "questions": questions,
    }


def analyze_questionnaire_node(state: CaseState) -> CaseState:
    file_path = state["file_path"]

    # Excel path → real parser
    if file_path.lower().endswith((".xlsx", ".xls")):
        q = parse_excel_questionnaire(file_path)
        state["questionnaire"] = q

        # Simple demo: define some required questions by heuristic
        required_ids = set()
        for question in q.get("questions", []):
            text_lower = question["text"].lower()
            if "company" in text_lower or "unternehmen" in text_lower:
                required_ids.add(question["id"])

        missing: list[str] = []
        for question in q.get("questions", []):
            if question["id"] in required_ids and not question.get("answer"):
                missing.append(question["id"])

        state["missing_fields"] = missing
        logger.info("Excel analysis found missing fields: %s", missing)
        return state

    # Non-Excel fallback (keep whatever stub you had before)
    required_fields = ["company_name", "hq_country", "esg_score"]
    available_fields = ["company_name", "hq_country"]
    missing = [f for f in required_fields if f not in available_fields]
    state["missing_fields"] = missing
    logger.info("Fallback analysis missing fields: %s", missing)
    return state


def process_with_turnus_node(state: CaseState) -> CaseState:
    file_path = state["file_path"]
    completed_path = process_questionnaire_via_turnus(file_path)
    state["completed_file_path"] = completed_path
    state["status"] = "completed"
    logger.info("Processed questionnaire via Turnus: %s -> %s", file_path, completed_path)
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
    logger.info("Sent clarification request for missing fields: %s", missing)
    return state


def route_after_analysis(state: CaseState) -> RouteLabel:
    missing = state.get("missing_fields", [])
    if missing:
        return "request_clarification"
    return "process_with_turnus"
