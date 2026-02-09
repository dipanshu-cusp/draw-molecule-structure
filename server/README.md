# Molecule Search API Server

FastAPI backend server for the molecule search application with Google Vertex AI Discovery Engine integration. This server acts as a middleware between the Next.js frontend and Vertex AI, handling database filtering, query augmentation, and real-time response streaming.

## Features

- **Vertex AI Integration**: Leverages Google Cloud's Vertex AI Discovery Engine for intelligent search and answer generation
- **Server-Sent Events (SSE)**: Real-time streaming responses on the `/chat` route for enhanced user experience
- **Session Management**: Supports conversation continuity through session IDs
- **Molecule Context Enrichment**: Performs database lookups to enrich queries with relevant molecule and notebook information
- **Database Integration**: PostgreSQL with SQLAlchemy ORM for efficient molecule and notebook data management
- **CORS Support**: Configurable cross-origin resource sharing for frontend integration
- **Health Monitoring**: Built-in health check endpoint for load balancers and monitoring systems

## Prerequisites

- Python 3.13 or higher
- PostgreSQL database (for production use)
- Google Cloud Project with Vertex AI Discovery Engine enabled
- Google Cloud credentials with appropriate permissions

## Setup Instructions

### 1. Install Dependencies

Using Poetry (recommended):
```bash
cd server
poetry install
```

Or using pip:
```bash
cd server
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Create a `.env` file in the `server` directory with the following variables:

#### Required Environment Variables

```bash
# Vertex AI Configuration
VERTEX_AI_PROJECT_ID=your-gcp-project-id
VERTEX_AI_ENGINE_ID=your-discovery-engine-id
VERTEX_AI_LOCATION=global
VERTEX_AI_COLLECTION=default_collection

# Database Configuration
DATABASE_URL=postgresql://user:password@host:port/database_name

# Application Configuration
ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend-domain.com
ENVIRONMENT=development
```

#### Optional Environment Variables

```bash
# Database Connection Pool Settings
DATABASE_POOL_SIZE=5
DATABASE_MAX_OVERFLOW=10
DATABASE_POOL_TIMEOUT=30
DATABASE_POOL_RECYCLE=1800
DATABASE_ECHO=false

# Authentication (for manual override)
GOOGLE_ACCESS_TOKEN=your-access-token
```

#### Environment Variable Details

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VERTEX_AI_PROJECT_ID` | Your Google Cloud Project ID | - | Yes |
| `VERTEX_AI_ENGINE_ID` | Vertex AI Discovery Engine ID | - | Yes |
| `VERTEX_AI_LOCATION` | Vertex AI engine location | `global` | Yes |
| `VERTEX_AI_COLLECTION` | Vertex AI collection name | `default_collection` | Yes |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://localhost:5432/molecule_db` | Yes |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins | `http://localhost:3000` | No |
| `ENVIRONMENT` | Runtime environment (development/production) | `development` | No |
| `DATABASE_POOL_SIZE` | Number of connections in the pool | `5` | No |
| `DATABASE_MAX_OVERFLOW` | Maximum overflow connections | `10` | No |
| `DATABASE_POOL_TIMEOUT` | Connection timeout in seconds | `30` | No |
| `DATABASE_POOL_RECYCLE` | Connection recycle time in seconds | `1800` | No |
| `DATABASE_ECHO` | Log all SQL queries (true/false) | `false` | No |

### 3. Google Cloud Authentication

The server uses Application Default Credentials (ADC) for authentication. Choose one of the following methods:

#### For Local Development:
```bash
gcloud auth application-default login
```

#### For Production (Cloud Run):
The service will automatically use the service account attached to the Cloud Run instance.

#### Manual Override (Optional):
Set the `GOOGLE_ACCESS_TOKEN` environment variable with a valid access token.

### 4. Database Setup

Ensure your PostgreSQL database is running and accessible. The server will automatically initialize the connection pool on startup.

For development without a database:
- Set `ENVIRONMENT=development`
- The server will continue running even if the database connection fails

### 5. Run the Server

Using uvicorn directly:
```bash
cd server
uvicorn src.server:app --reload --host 0.0.0.0 --port 8000
```

Using Poetry:
```bash
poetry run uvicorn src.server:app --reload --host 0.0.0.0 --port 8000
```

The server will be available at `http://localhost:8000`

### 6. Verify Installation

Check the health endpoint:
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{"status": "healthy"}
```

## API Documentation

Once the server is running, visit the interactive API documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### Health Check
```
GET /health
```
Returns server health status.

### Chat Endpoint (SSE Streaming)
```
POST /chat
Content-Type: application/json

{
  "prompt": "Your question here",
  "smiles": "C1=CC=CC=C1",  // Optional: SMILES notation
  "session_id": "abc123"     // Optional: For conversation continuity
}
```

**Response**: Server-Sent Events (SSE) stream

The `/chat` endpoint uses Server-Sent Events to stream responses in real-time:

1. **Content Chunks**: Streamed as they arrive from Vertex AI
   ```
   data: {"content": "partial response text"}
   ```

2. **Metadata**: Sent after content completion
   ```
   data: {
     "type": "metadata",
     "sessionId": "new-or-existing-session-id",
     "relatedQuestions": ["question1", "question2"],
     "references": [
       {
         "title": "Document Title",
         "uri": "gs://bucket/path/to/file.pdf",
         "content": "Relevant excerpt",
         "pageNumber": 5
       }
     ]
   }
   ```

3. **Completion Signal**:
   ```
   data: [DONE]
   ```

## Vertex AI Integration

The server integrates with Google Cloud's Vertex AI Discovery Engine to provide:

- **Intelligent Search**: Semantic search across indexed documents (PDFs, notebooks)
- **Answer Generation**: AI-powered responses with citations
- **Contextual Understanding**: Enriches queries with molecule data from the database
- **Session Continuity**: Maintains conversation context across multiple queries
- **Real-time Streaming**: SSE-based streaming for immediate response feedback

### How It Works

1. User sends a query (optionally with SMILES notation)
2. Server performs database lookup to enrich the query with molecule context
3. Enriched query is sent to Vertex AI Discovery Engine
4. Response is streamed back to the client in real-time via SSE
5. Related questions and citations are provided after the main response

## Project Structure

```
server/
├── src/
│   ├── __init__.py
│   ├── server.py              # Main FastAPI application
│   ├── database/
│   │   ├── __init__.py
│   │   └── connection.py      # Database connection & session management
│   ├── models/                # SQLAlchemy ORM models
│   │   ├── molecule.py
│   │   ├── notebook.py
│   │   ├── reaction.py
│   │   └── ...
│   ├── repositories/          # Data access layer
│   │   ├── molecule.py
│   │   └── notebook.py
│   ├── routes/
│   │   └── chat.py            # Chat endpoint with SSE streaming
│   ├── schema/
│   │   └── chat.py            # Pydantic schemas for API requests/responses
│   └── services/
│       └── vertex_ai.py       # Vertex AI Discovery Engine client
├── scripts/
│   └── gcs_metadata.py        # Utility scripts for GCS operations
├── tests/                     # Unit tests
├── pyproject.toml             # Poetry dependencies
├── Dockerfile                 # Container build instructions
└── README.md                  # This file
```

## Development

### Running Tests
```bash
pytest tests/
```

### Code Formatting
```bash
black src/
```

### Type Checking
```bash
mypy src/
```

## Docker Deployment

Build the Docker image:
```bash
docker build -t molecule-search-api .
```

Run the container:
```bash
docker run -p 8000:8000 \
  -e VERTEX_AI_PROJECT_ID=your-project \
  -e VERTEX_AI_ENGINE_ID=your-engine \
  -e DATABASE_URL=your-db-url \
  molecule-search-api
```

## Production Deployment

### Cloud Run Deployment

1. Build and push to Container Registry:
```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/molecule-search-api
```

2. Deploy to Cloud Run:
```bash
gcloud run deploy molecule-search-api \
  --image gcr.io/PROJECT_ID/molecule-search-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars VERTEX_AI_PROJECT_ID=your-project,VERTEX_AI_ENGINE_ID=your-engine \
  --set-env-vars DATABASE_URL=your-db-url
```

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is correctly formatted
- Ensure PostgreSQL is running and accessible
- Check firewall rules for database port access

### Vertex AI Authentication Errors
- Run `gcloud auth application-default login` for local development
- Verify service account has necessary permissions in production
- Check that all Vertex AI environment variables are set correctly

### CORS Errors
- Add your frontend URL to `ALLOWED_ORIGINS`
- Ensure the URL includes the protocol (http:// or https://)

### SSE Connection Issues
- Check that your reverse proxy doesn't buffer SSE responses
- Ensure `X-Accel-Buffering: no` header is respected by nginx
- Verify client is properly handling `text/event-stream` content type

## License

This project is part of the Molecule Search application.

## Support

For issues and questions, please contact the development team or create an issue in the project repository.
