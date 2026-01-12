"""
Chat API routes for molecule search application.

This module handles chat requests, processes them through the database layer
for filtering, and then streams responses from Vertex AI Discovery Engine.
"""

import json
import logging
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from src.schema.chat import SendMessageRequest
from src.services.vertex_ai import stream_answer, StreamChunk

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()


async def generate_sse_response(
    query: str,
    session_id: str | None = None,
    smiles: str | None = None
) -> AsyncGenerator[str, None]:
    """
    Generate Server-Sent Events (SSE) response from Vertex AI.
    
    This function:
    1. Performs database lookups for filtering (placeholder)
    2. Streams the response from Vertex AI
    3. Formats the response as SSE events
    
    Args:
        query: The user's query/prompt
        session_id: Optional session ID for conversation continuity
        smiles: Optional SMILES notation of the molecule for context
    
    Yields:
        SSE formatted strings
    """
    try:
        # =================================================================
        # DATABASE FILTERING LOGIC - PLACEHOLDER
        # =================================================================
        # TODO: Add database calls here to filter/augment the query
        # 
        # Example workflow:
        # 1. If SMILES is provided, look up molecule in database
        #    molecule_info = await database.get_molecule_by_smiles(smiles)
        # 
        # 2. Retrieve relevant molecular properties, research data, etc.
        #    properties = await database.get_molecule_properties(molecule_id)
        # 
        # 3. Check if molecule exists in any compound databases
        #    compound_data = await database.search_compounds(smiles)
        # 
        # 4. Apply any user-specific filters or preferences
        #    user_prefs = await database.get_user_preferences(user_id)
        # 
        # 5. Augment the query with database context
        #    enriched_query = enrich_query_with_context(query, molecule_info, properties)
        # =================================================================
        
        # Build the final query with molecule context if available
        final_query = query
        if smiles:
            final_query = f"{query}\n\nContext: The user has provided a molecule with SMILES notation: {smiles}"
            
            # TODO: Replace with actual database lookup
            # molecule_context = await get_molecule_context_from_db(smiles)
            # if molecule_context:
            #     final_query += f"\n\nAdditional context: {molecule_context}"
        
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
async def send_chat_message(body: SendMessageRequest) -> StreamingResponse:
    """
    Endpoint to send a chat message and receive a streaming response.
    
    This endpoint:
    1. Receives the user's prompt and optional molecule data
    2. Performs database filtering (placeholder for future implementation)
    3. Queries Vertex AI Discovery Engine
    4. Streams the response back using Server-Sent Events (SSE)
    
    Args:
        body: SendMessageRequest containing prompt, optional smiles, and session_id
        
    Returns:
        StreamingResponse: SSE stream of the AI response
    """
    if not body.prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")
    
    return StreamingResponse(
        generate_sse_response(
            query=body.prompt,
            session_id=body.session_id,
            smiles=body.smiles
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering for SSE
        }
    )
