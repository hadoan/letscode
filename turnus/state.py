from typing import List, Literal, Optional, TypedDict

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

    # processing
    completed_file_path: Optional[str]

    # lifecycle
    status: Status
