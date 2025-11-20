from typing import List, Literal, Optional, TypedDict

AnswerType = Literal["yes_no", "text", "multi", "number", "date"]


class Question(TypedDict, total=False):
    id: str
    section: str
    text: str
    answerType: AnswerType
    options: List[str]
    answer: Optional[str]


class Questionnaire(TypedDict, total=False):
    title: str
    sourceFile: str
    questions: List[Question]

Priority = Literal["urgent", "high", "normal"]
Status = Literal["new", "waiting_for_data", "processing", "completed"]


class CaseState(TypedDict, total=False):
    email: dict  # full raw email
    file_path: str

    # extracted metadata
    due_date: Optional[str]
    priority: Priority

    # analysis
    missing_fields: List[str]
    questionnaire: Questionnaire

    # processing
    completed_file_path: Optional[str]

    # lifecycle
    status: Status
