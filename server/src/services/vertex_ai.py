"""
Vertex AI Discovery Engine integration for chat functionality

This module handles communication with Google's Vertex AI Discovery Engine
for search and answer generation with session support for follow-up questions.
"""

import os
import json
import re
import subprocess
from typing import AsyncGenerator, Optional
from dataclasses import dataclass, field

import httpx
from google.auth import default
from google.auth.transport.requests import Request

# Configuration from environment variables
PROJECT_ID = os.getenv("VERTEX_AI_PROJECT_ID")
ENGINE_ID = os.getenv("VERTEX_AI_ENGINE_ID")
LOCATION = os.getenv("VERTEX_AI_LOCATION")
COLLECTION = os.getenv("VERTEX_AI_COLLECTION")

BASE_URL = f"https://discoveryengine.googleapis.com/v1alpha/projects/{PROJECT_ID}/locations/{LOCATION}/collections/{COLLECTION}/engines/{ENGINE_ID}/servingConfigs/default_search"


def clean_answer_text(text: str) -> str:
    """
    Clean the answer text by removing any embedded JSON metadata
    Sometimes the Vertex AI response includes metadata as part of the text
    NOTE: This should only be called on the FINAL complete text, not during streaming
    """
    if not text:
        return text

    cleaned_text = text

    # Look for the start of a JSON object with known metadata fields
    patterns = [
        r'\{"type"\s*:\s*"metadata".*$',
        r'\{"sessionId"\s*:\s*"[^"]*".*"relatedQuestions".*$',
        r'\{"sessionId"\s*:\s*"[0-9]+".*$',
    ]

    for pattern in patterns:
        match = re.search(pattern, cleaned_text)
        if match:
            cleaned_text = cleaned_text[:match.start()]
            break

    # Fallback: look for the literal pattern '{"type":"metadata"' anywhere
    metadata_index = cleaned_text.find('{"type":"metadata"')
    if metadata_index != -1:
        cleaned_text = cleaned_text[:metadata_index]

    # Also check for '{"sessionId":' followed by numbers (session IDs are numeric)
    session_id_match = re.search(r'\{"sessionId"\s*:\s*"[0-9]+"', cleaned_text)
    if session_id_match:
        cleaned_text = cleaned_text[:session_id_match.start()]

    return cleaned_text


@dataclass
class Reference:
    """Reference/citation from Vertex AI response"""
    title: Optional[str] = None
    uri: Optional[str] = None
    content: Optional[str] = None
    page_number: Optional[int] = None


@dataclass
class StreamChunk:
    """Represents a chunk in the streaming response"""
    type: str  # "chunk", "metadata", or "done"
    content: Optional[str] = None
    replace: bool = False
    session_id: Optional[str] = None
    related_questions: list[str] = field(default_factory=list)
    references: list[Reference] = field(default_factory=list)


# Cached credentials
_credentials = None


async def get_access_token() -> str:
    """
    Get access token for Google Cloud API authentication
    Uses Application Default Credentials for Cloud Run, falls back to gcloud CLI for local dev
    """
    global _credentials

    # Option 1: Use environment variable (for manual override)
    if os.getenv("GOOGLE_ACCESS_TOKEN"):
        return os.getenv("GOOGLE_ACCESS_TOKEN")

    # Option 2: Check if running in Cloud Run
    if os.getenv("K_SERVICE"):
        try:
            if _credentials is None:
                _credentials, _ = default(
                    scopes=["https://www.googleapis.com/auth/cloud-platform"]
                )
            
            # Refresh the token if needed
            if not _credentials.valid:
                _credentials.refresh(Request())
            
            return _credentials.token
        except Exception as e:
            raise Exception(
                f"Unable to authenticate with Google Cloud. "
                f"Please ensure the service account has the necessary permissions. Error: {e}"
            )

    # Option 3: Use gcloud CLI (for local development)
    try:
        result = subprocess.run(
            ["gcloud", "auth", "print-access-token"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        token = result.stdout.strip()
        
        if not token or "ERROR" in token:
            raise Exception("Invalid token received from gcloud")
        
        return token
    except subprocess.TimeoutExpired:
        raise Exception("gcloud command timed out")
    except FileNotFoundError:
        raise Exception("gcloud CLI not found. Please install Google Cloud SDK.")
    except Exception as e:
        raise Exception(
            f"Unable to authenticate with Google Cloud. "
            f"Please run 'gcloud auth login' to refresh your credentials, "
            f"or set the GOOGLE_ACCESS_TOKEN environment variable. Error: {e}"
        )


def _build_session_path(session_id: Optional[str] = None) -> str:
    """Build the session path for Vertex AI API calls"""
    if session_id:
        return f"projects/{PROJECT_ID}/locations/{LOCATION}/collections/{COLLECTION}/engines/{ENGINE_ID}/sessions/{session_id}"
    return f"projects/{PROJECT_ID}/locations/{LOCATION}/collections/{COLLECTION}/engines/{ENGINE_ID}/sessions/-"


def _extract_session_id(session_name: Optional[str]) -> Optional[str]:
    """Extract session ID from the full session path"""
    if not session_name:
        return None
    parts = session_name.split("/sessions/")
    return parts[1] if len(parts) > 1 else None


def _extract_page_number(content: Optional[str]) -> Optional[int]:
    """
    Extract page number from content if it starts with a page number.
    Vertex AI often includes page numbers at the start of content like '206 Chapter 5...'
    """
    if not content:
        return None
    
    # Pattern: starts with a number (page number) followed by space
    match = re.match(r'^(\d+)\s', content.strip())
    if match:
        try:
            return int(match.group(1))
        except ValueError:
            return None
    return None


def _parse_references(references_data: list) -> list[Reference]:
    """Parse references from Vertex AI response"""
    references = []
    
    for ref in references_data:
        if "unstructuredDocumentInfo" in ref:
            info = ref["unstructuredDocumentInfo"]
            chunk_contents = info.get("chunkContents", [])
            content = chunk_contents[0].get("content") if chunk_contents else None
            page_number = _extract_page_number(content)
            references.append(Reference(
                title=info.get("title"),
                uri=info.get("uri"),
                content=content,
                page_number=page_number
            ))
        elif "chunkInfo" in ref:
            info = ref["chunkInfo"]
            doc_metadata = info.get("documentMetadata", {})
            content = info.get("content")
            page_number = _extract_page_number(content)
            references.append(Reference(
                title=doc_metadata.get("title"),
                uri=doc_metadata.get("uri"),
                content=content,
                page_number=page_number
            ))
    
    return references


def inject_citations_into_text(
    answer_text: str, 
    citations: list, 
    references: list[Reference]
) -> str:
    """
    Inject citation markers into the answer text based on the citations array.
    
    The Vertex AI API returns a citations array with startIndex and endIndex
    that indicates where in the text each citation applies.
    
    If citations are not already in the text (as [1], [2], etc.), this function
    adds them at the appropriate positions.
    """
    if not answer_text:
        return answer_text
    
    # Check if the text already has citation markers
    if re.search(r'\[\d+\]', answer_text):
        return answer_text
    
    # If no citations array but we have references, add citations at paragraph ends
    if not citations and references:
        paragraphs = answer_text.split('\n\n')
        if len(paragraphs) > 1:
            # Distribute references across paragraphs
            result_paragraphs = []
            refs_per_paragraph = max(1, len(references) // len(paragraphs))
            ref_index = 0
            
            for i, para in enumerate(paragraphs):
                if para.strip() and ref_index < len(references):
                    # Add citations at the end of this paragraph
                    end_ref = min(ref_index + refs_per_paragraph, len(references))
                    citation_markers = "".join(f"[{j+1}]" for j in range(ref_index, end_ref))
                    result_paragraphs.append(para.rstrip() + " " + citation_markers)
                    ref_index = end_ref
                else:
                    result_paragraphs.append(para)
            
            return '\n\n'.join(result_paragraphs)
        else:
            # Single paragraph - add all citations at the end
            citation_markers = "".join(f"[{i+1}]" for i in range(len(references)))
            return answer_text.rstrip() + " " + citation_markers
    
    if not citations:
        return answer_text
    
    # Build a list of insertions (position, citation_text)
    insertions = []
    
    for citation in citations:
        sources = citation.get("sources", [])
        end_index = citation.get("endIndex")
        
        if not sources or end_index is None:
            continue
        
        # Collect all reference indices for this citation
        ref_indices = []
        for source in sources:
            # Vertex AI returns 'referenceId' as a string, e.g., "0", "1"
            ref_id = source.get("referenceId") or source.get("referenceIndex")
            if ref_id is not None:
                try:
                    ref_indices.append(int(ref_id) + 1)  # 1-indexed for display
                except (ValueError, TypeError):
                    pass
        
        if ref_indices:
            # Create citation marker(s)
            citation_text = "".join(f"[{idx}]" for idx in sorted(set(ref_indices)))
            insertions.append((int(end_index), citation_text))
    
    # Sort insertions by position in reverse order (so we can insert from end to start)
    insertions.sort(key=lambda x: x[0], reverse=True)
    
    # Insert citation markers
    result = answer_text
    for position, citation_text in insertions:
        # Make sure position is within bounds
        if position <= len(result):
            result = result[:position] + citation_text + result[position:]
    
    return result


async def stream_answer(
    query: str,
    session_id: Optional[str] = None
) -> AsyncGenerator[StreamChunk, None]:
    """
    Stream-like response generator for SSE compatibility
    This uses the Vertex AI streamAnswer endpoint for true streaming
    """
    access_token = await get_access_token()
    
    session = _build_session_path(session_id)
    
    request_body = {
        "query": {
            "text": query,
        },
        "session": session,
        "relatedQuestionsSpec": {"enable": True},
        "answerGenerationSpec": {
            "ignoreAdversarialQuery": True,
            "ignoreNonAnswerSeekingQuery": False,
            "ignoreLowRelevantContent": True,
            "includeCitations": True,
        },
    }
    
    url = f"{BASE_URL}:streamAnswer"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            url,
            headers=headers,
            json=request_body
        ) as response:
            if response.status_code != 200:
                error_text = await response.aread()
                raise Exception(
                    f"Vertex AI streamAnswer failed: {response.status_code} {error_text.decode()}"
                )
            
            buffer = ""
            last_answer_text = ""
            extracted_session_id: Optional[str] = None
            related_questions: list[str] = []
            references: list[Reference] = []
            citations: list = []  # Store citations for final processing
            final_answer_text = ""  # Store the complete answer text
            
            async for chunk in response.aiter_bytes():
                chunk_str = chunk.decode("utf-8")
                buffer += chunk_str
                
                # Parse complete JSON objects from the buffer
                # The stream returns JSON objects, potentially multiple per chunk
                start_index = 0
                brace_count = 0
                in_string = False
                escape_next = False
                object_start = -1
                
                i = 0
                while i < len(buffer):
                    char = buffer[i]
                    
                    if escape_next:
                        escape_next = False
                        i += 1
                        continue
                    
                    if char == "\\" and in_string:
                        escape_next = True
                        i += 1
                        continue
                    
                    if char == '"' and not escape_next:
                        in_string = not in_string
                        i += 1
                        continue
                    
                    if in_string:
                        i += 1
                        continue
                    
                    if char == "{":
                        if brace_count == 0:
                            object_start = i
                        brace_count += 1
                    elif char == "}":
                        brace_count -= 1
                        if brace_count == 0 and object_start != -1:
                            # Found a complete JSON object
                            json_str = buffer[object_start:i + 1]
                            start_index = i + 1
                            
                            try:
                                parsed = json.loads(json_str)
                                
                                answer = parsed.get("answer", {})
                                answer_state = answer.get("state")
                                current_answer_text = answer.get("answerText", "")
                                
                                # Extract session ID if available
                                session_data = parsed.get("session", {})
                                if session_data.get("name"):
                                    extracted_session_id = _extract_session_id(
                                        session_data.get("name")
                                    )
                                
                                # Handle the final SUCCEEDED state
                                if answer_state == "SUCCEEDED" and current_answer_text:
                                    final_answer_text = current_answer_text
                                    if len(current_answer_text) > len(last_answer_text):
                                        if current_answer_text.startswith(last_answer_text):
                                            delta = current_answer_text[len(last_answer_text):]
                                            if delta:
                                                yield StreamChunk(
                                                    type="chunk",
                                                    content=delta
                                                )
                                        else:
                                            # The final answer differs from streamed content
                                            yield StreamChunk(
                                                type="chunk",
                                                content=current_answer_text,
                                                replace=True
                                            )
                                        last_answer_text = current_answer_text
                                
                                # During STREAMING state, show incremental progress
                                elif answer_state == "STREAMING" and current_answer_text:
                                    final_answer_text = current_answer_text  # Keep updating final text
                                    if (len(current_answer_text) > len(last_answer_text) and 
                                        current_answer_text.startswith(last_answer_text)):
                                        delta = current_answer_text[len(last_answer_text):]
                                        if delta:
                                            yield StreamChunk(
                                                type="chunk",
                                                content=delta
                                            )
                                        last_answer_text = current_answer_text
                                    elif last_answer_text == "" and current_answer_text:
                                        # First content we see
                                        yield StreamChunk(
                                            type="chunk",
                                            content=current_answer_text
                                        )
                                        last_answer_text = current_answer_text
                                
                                # Extract related questions (usually in final response)
                                if answer.get("relatedQuestions"):
                                    related_questions = answer["relatedQuestions"]
                                
                                # Extract references
                                if answer.get("references"):
                                    references = _parse_references(answer["references"])
                                
                                # Extract citations (for injecting into text)
                                if answer.get("citations"):
                                    citations = answer["citations"]
                                
                            except json.JSONDecodeError:
                                # JSON parsing failed, might be incomplete - keep in buffer
                                pass
                            
                            object_start = -1
                    
                    i += 1
                
                # Keep unparsed content in buffer
                if start_index > 0:
                    buffer = buffer[start_index:]
            
            # After streaming is complete, inject citations into the final text if needed
            if final_answer_text and references:
                enriched_text = inject_citations_into_text(
                    final_answer_text, citations, references
                )
                # If citations were injected (text changed), send a replace chunk
                if enriched_text != final_answer_text:
                    yield StreamChunk(
                        type="chunk",
                        content=enriched_text,
                        replace=True
                    )
            
            # Send metadata
            yield StreamChunk(
                type="metadata",
                session_id=extracted_session_id,
                related_questions=related_questions,
                references=references
            )
            
            # Send done signal
            yield StreamChunk(type="done")


async def search_and_answer(
    query: str,
    session_id: Optional[str] = None
) -> dict:
    """
    Combined search and answer flow (non-streaming)
    First performs a search to get queryId and session, then gets an answer
    """
    access_token = await get_access_token()
    session = _build_session_path(session_id)
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        # Step 1: Perform search to get session and query ID
        search_body = {
            "query": query,
            "pageSize": 10,
            "queryExpansionSpec": {"condition": "AUTO"},
            "spellCorrectionSpec": {"mode": "AUTO"},
            "languageCode": "en-GB",
            "contentSearchSpec": {
                "snippetSpec": {"returnSnippet": True},
            },
            "session": session,
        }
        
        search_response = await client.post(
            f"{BASE_URL}:search",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json=search_body
        )
        
        if search_response.status_code != 200:
            raise Exception(
                f"Vertex AI search failed: {search_response.status_code} {search_response.text}"
            )
        
        search_data = search_response.json()
        
        # Extract session ID and query ID
        session_name = search_data.get("session", {}).get("name")
        extracted_session_id = _extract_session_id(session_name)
        query_id = search_data.get("queryId")
        
        # Step 2: Get answer using the query ID and session
        answer_session = _build_session_path(extracted_session_id)
        answer_body = {
            "query": {
                "text": query,
                **({"queryId": query_id} if query_id else {}),
            },
            "session": answer_session,
            "relatedQuestionsSpec": {"enable": True},
            "answerGenerationSpec": {
                "ignoreAdversarialQuery": True,
                "ignoreNonAnswerSeekingQuery": False,
                "ignoreLowRelevantContent": True,
                "includeCitations": True,
            },
        }
        
        answer_response = await client.post(
            f"{BASE_URL}:answer",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json=answer_body
        )
        
        if answer_response.status_code != 200:
            raise Exception(
                f"Vertex AI answer failed: {answer_response.status_code} {answer_response.text}"
            )
        
        answer_data = answer_response.json()
        
        # Extract the answer text
        answer_text = (
            answer_data.get("answer", {}).get("answerText") or
            search_data.get("summary", {}).get("summaryText") or
            "I couldn't find a relevant answer to your question."
        )
        
        # Clean the answer text
        answer_text = clean_answer_text(answer_text)
        
        # Extract related questions and references
        related_questions = answer_data.get("answer", {}).get("relatedQuestions", [])
        references = _parse_references(
            answer_data.get("answer", {}).get("references", [])
        )
        
        # Get final session ID
        final_session_id = (
            _extract_session_id(answer_data.get("session", {}).get("name")) or
            extracted_session_id
        )
        
        return {
            "answer": answer_text,
            "session_id": final_session_id,
            "query_id": query_id,
            "related_questions": related_questions,
            "references": [
                {"title": r.title, "uri": r.uri, "content": r.content}
                for r in references
            ],
        }
