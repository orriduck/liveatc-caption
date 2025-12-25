from pydantic import BaseModel, ConfigDict
from typing import Optional, List


class ATCCaptionResult(BaseModel):
    model_config = ConfigDict(extra="ignore")
    is_error: bool = False
    speaker: Optional[str] = None  # "ATC" or "PLANE" or None if error
    caption: Optional[str] = None  # The text or None if error
    timestamp: str  # ISO format
    error_type: Optional[str] = None
    details: Optional[str] = None


class TranscriptionResponse(BaseModel):
    results: List[ATCCaptionResult]
