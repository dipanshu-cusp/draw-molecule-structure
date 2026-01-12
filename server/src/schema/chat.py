from pydantic import BaseModel, Field
from typing import Optional


class SendMessageRequest(BaseModel):
    """Request schema for sending a chat message"""
    smiles: Optional[str] = Field(None, description="SMILES representation of the molecule (optional)")
    prompt: str = Field(..., description="User's prompt or question about the molecule")
    session_id: Optional[str] = Field(None, description="Session ID for conversation continuity")


class Reference(BaseModel):
    """Reference/citation from the AI response"""
    title: Optional[str] = None
    uri: Optional[str] = None
    content: Optional[str] = None


class ChatMetadata(BaseModel):
    """Metadata returned with the chat response"""
    session_id: Optional[str] = None
    related_questions: list[str] = []
    references: list[Reference] = []
    
    