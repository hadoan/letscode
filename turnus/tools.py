def process_questionnaire_via_turnus(file_path: str) -> str:
    """
    Stub for the Turnus API.
    In a real system this would call an external service.
    Here, just return a fake 'completed' file path.
    """
    return file_path.replace(".pdf", "_completed.pdf")


def send_email(to: str, subject: str, body: str, attachment_path: str | None = None) -> None:
    """
    Simulate sending an email by printing to stdout.
    """
    print("=== OUTGOING EMAIL ===")
    print(f"To: {to}")
    print(f"Subject: {subject}")
    print("Body:")
    print(body)
    if attachment_path:
        print(f"Attachment: {attachment_path}")
    print("======================\n")
