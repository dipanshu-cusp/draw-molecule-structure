"""
Chat API routes for molecule search application.

This module handles chat requests, processes them through the database layer
for filtering, and then streams responses from Vertex AI Discovery Engine.
"""

import json
import logging
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from src.database import get_db
from src.repositories import MoleculeRepository, SearchType
from src.schema.chat import SendMessageRequest
from src.services.vertex_ai import stream_answer, StreamChunk

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()

def get_molecule_context(db: Session, smiles: str) -> str | None:
    """
    Get context about a molecule from the database.
    
    Performs reversed search (single query) to find notebooks containing the molecule.
    
    Args:
        db: Database session
        smiles: SMILES notation of the molecule
        
    Returns:
        Context string with molecule information, or None if not found
    """
    repo = MoleculeRepository(db)
    
    # Try exact match first, then substructure
    results = repo.search_notebooks_by_smiles(
        smiles,
        search_type=SearchType.EXACT,
    )
    
    if not results:
        results = repo.search_notebooks_by_smiles(
            smiles,
            search_type=SearchType.SUBSTRUCTURE,
            limit=50,
        )
    
    if not results:
        return None
    
    # Build context from search results
    context_parts = [f"Found {len(results)} notebooks containing this molecule."]
    
    for i, result in enumerate(results[:5], 1):
        notebook = result.notebook
        context_parts.append(f"\n{i}. Notebook: {notebook.title or notebook.filename}")
        
        if result.matched_smiles:
            context_parts.append(f"   Matched SMILES: {', '.join(result.matched_smiles[:3])}")
        
        if result.reaction_ids:
            context_parts.append(f"   Related reactions: {len(result.reaction_ids)}")
        
        if result.molecule_roles:
            roles = set(role for _, role in result.molecule_roles)
            context_parts.append(f"   Roles: {', '.join(roles)}")
    
    return "\n".join(context_parts)

async def generate_sse_response(
    query: str,
    session_id: str | None = None,
    smiles: str | None = None,
    db: Session | None = None,
) -> AsyncGenerator[str, None]:
    """
    Generate Server-Sent Events (SSE) response from Vertex AI.
    
    This function:
    1. Performs database lookups for molecule context
    2. Streams the response from Vertex AI
    3. Formats the response as SSE events
    
    Args:
        query: The user's query/prompt
        session_id: Optional session ID for conversation continuity
        smiles: Optional SMILES notation of the molecule for context
        db: Optional database session for molecule lookups
    
    Yields:
        SSE formatted strings
    """
    try:
        # Build the final query with molecule context if available
        final_query = query
        
        if smiles:
            final_query = f"{query}\n\nContext: The user has provided a molecule with SMILES notation: {smiles}"
            
            # Perform database lookup for molecule context
            if db:
                try:
                    molecule_context = get_molecule_context(db, smiles)
                    if molecule_context:
                        final_query += f"\n\nDatabase context:\n{molecule_context}"
                        logger.info(f"Added molecule context from database for SMILES: {smiles[:50]}...")
                except Exception as e:
                    logger.warning(f"Failed to get molecule context from database: {e}")
        
        logger.info(f"Processing chat request with session_id={session_id}")
        
        # Stream response from Vertex AI
        async for chunk in stream_answer(final_query, session_id):
            if chunk.type == "chunk" and chunk.content:
                # Send content chunk
                data = {"content": chunk.content}
                if chunk.replace:
                    data["replace"] = True
                yield f"data: {json.dumps(data)}\n\n"
                
            elif chunk.type == "metadata":
                # Send metadata (session ID, related questions, references)
                metadata = {
                    "type": "metadata",
                    "sessionId": chunk.session_id,
                    "relatedQuestions": chunk.related_questions,
                    "references": [
                        {"title": ref.title, "uri": ref.uri, "content": ref.content}
                        for ref in chunk.references
                    ]
                }
                yield f"data: {json.dumps(metadata)}\n\n"
                
            elif chunk.type == "done":
                # Send completion signal
                yield "data: [DONE]\n\n"
                
    except Exception as e:
        logger.error(f"Error in chat streaming: {e}")
        # Send error message
        error_data = {
            "error": True,
            "content": f"I encountered an error while processing your request: {str(e)}. Please try again."
        }
        yield f"data: {json.dumps(error_data)}\n\n"
        yield "data: [DONE]\n\n"


@router.post("")
async def send_chat_message(
    body: SendMessageRequest,
    db: Session = Depends(get_db),
) -> StreamingResponse:
    """
    Endpoint to send a chat message and receive a streaming response.
    
    This endpoint:
    1. Receives the user's prompt and optional molecule data
    2. Performs database lookups to find related notebooks and reactions
    3. Queries Vertex AI Discovery Engine with enriched context
    4. Streams the response back using Server-Sent Events (SSE)
    
    Args:
        body: SendMessageRequest containing prompt, optional smiles, and session_id
        db: Database session (injected via dependency)
        
    Returns:
        StreamingResponse: SSE stream of the AI response
    """
    if not body.prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")
    
    return StreamingResponse(
        generate_sse_response(
            query=body.prompt,
            session_id=body.session_id,
            smiles=body.smiles,
            db=db,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering for SSE
        }
    )
