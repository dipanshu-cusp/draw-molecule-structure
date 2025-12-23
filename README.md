This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Google Cloud SDK (gcloud) for Vertex AI integration

### Environment Setup

1. Copy the example environment file:

```bash
cp .env.example .env.local
```

2. Configure your Vertex AI settings in `.env.local`:

```bash
# Set to true to enable Vertex AI (false uses mock responses for development)
USE_VERTEX_AI=true

# Your Google Cloud Project configuration
VERTEX_AI_PROJECT_ID=your-project-id
VERTEX_AI_ENGINE_ID=your-engine-id
VERTEX_AI_LOCATION=global
VERTEX_AI_COLLECTION=default_collection
```

3. Authenticate with Google Cloud:

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### Running the Development Server

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Vertex AI Integration

This project integrates with Google Cloud's Vertex AI Discovery Engine for intelligent search and answer generation. The integration supports:

- **Search with generated answers**: Get AI-generated responses with citations
- **Session management**: Maintain context across follow-up questions
- **Related questions**: Receive suggested follow-up questions

### Configuration Options

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| `USE_VERTEX_AI` | Enable Vertex AI (`true`) or mock mode (`false`) | `false` |
| `VERTEX_AI_PROJECT_ID` | Google Cloud Project ID | - |
| `VERTEX_AI_ENGINE_ID` | Discovery Engine ID | - |
| `VERTEX_AI_LOCATION` | Engine location | `global` |
| `VERTEX_AI_COLLECTION` | Collection name | `default_collection` |
| `GOOGLE_ACCESS_TOKEN` | Access token (optional, uses gcloud CLI if not set) | - |

### Authentication

For local development, the app uses `gcloud auth print-access-token` to get credentials automatically.

For production deployments, you can either:
1. Set `GOOGLE_ACCESS_TOKEN` environment variable
2. Use a service account with appropriate IAM permissions

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
