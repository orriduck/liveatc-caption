from pydantic import BaseModel
from typing import Literal

class TranscriptionResult(BaseModel):
    text: str
    speaker: Literal["ATC", "PLANE", "UNKNOWN"]
