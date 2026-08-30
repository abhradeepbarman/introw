# 🎙️ Introw — AI-Powered Technical Interview & Candidate Assessment Platform

<div align="center">

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.2+-black.svg?style=for-the-badge&logo=bun&logoColor=white)](https://bun.sh/)
[![Turborepo](https://img.shields.io/badge/Turborepo-Monorepo-EF4444.svg?style=for-the-badge&logo=turborepo&logoColor=white)](https://turbo.build/)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB.svg?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED.svg?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-4169E1.svg?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748.svg?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Stripe](https://img.shields.io/badge/Stripe-Billing-635BFF.svg?style=for-the-badge&logo=stripe&logoColor=white)](https://stripe.com/)

**Next-generation technical mock interview platform that simulates realistic, dynamic interview conversations tailored to a candidate's GitHub repositories, code history, and resume.**

[Live Demo](https://introw.tech) • [API Endpoint](https://api.introw.tech) • [Architecture](#-system-architecture) • [Getting Started](#-getting-started) • [Deployment](#-devops--deployment)

</div>

---

## 🌟 Executive Summary

**Introw** is a full-stack, AI-native SaaS application designed to revolutionize technical interview preparation and automated candidate screening. Unlike static quiz tools, Introw leverages multimodal AI to:

1. **Ingest Real Candidate Context**: Deeply analyzes a candidate's actual GitHub repositories, commit patterns, language distributions, and uploaded PDF resumes.
2. **Conduct Real-Time Interactive Voice/Audio Interviews**: Simulates realistic conversational back-and-forth technical discussions with sub-second latency over WebSockets.
3. **Generate Actionable Evaluation Rubrics**: Produces structured feedback, detailed scoring breakdown across technical depth, communication, and problem-solving, with comprehensive improvement roadmaps.

Built on an enterprise-grade **Turborepo monorepo** powered by the ultra-fast **Bun runtime**, **React 19**, **Express**, and **PostgreSQL with Prisma**, Introw guarantees end-to-end type safety across client, server, and shared validation layers.

---

## ✨ Key Features

### 🤖 1. Context-Aware AI Interview Engine
- **GitHub Repository Analysis**: Automatically inspects public GitHub profiles and repositories to ask deep architectural and code-level questions about projects the candidate actually built.
- **Resume & Document Parsing**: Extracts work experience, skill trees, and projects from PDF resumes via ImageKit and `pdf-parse`.
- **Model Router (`@repo/ai`)**: Dynamic AI orchestration supporting **OpenAI (GPT-4o / Realtime)** and **Google Gemini** with structured output parsing and domain-specific prompt engineering.

### 🎙️ 2. Real-Time Interview Room
- **Interactive Audio & Text Streams**: Real-time bidirectional communication powered by WebSockets and OpenAI Realtime API sideband connections.
- **Live Transcript Capturing**: Automatically records turn-by-turn conversation between candidate and AI interviewer into persistent PostgreSQL storage.
- **Session State Management**: Tracks active calls, start times, completion statuses, and connection lifecycles.

### 📊 3. Deep Evaluation & Structured Feedback
- **Automated Score Generation**: Evaluates responses against an objective rubric covering technical proficiency, problem-solving ability, and clarity.
- **Detailed Feedback Cards**: Highlights specific strengths, critical gaps, and actionable recommendations.
- **Export & History**: Full historical archive of past interviews, scores, and downloadable transcripts.

### 💳 4. Billing, Subscriptions & Credit Quotas
- **Stripe Integration**: Supports subscription tiers (Free and Starter plans) with Stripe Checkout, Customer Portal, and webhook synchronization.
- **Credit-Based Usage**: Automatically validates and deducts interview credits with database transaction safety.

### 🔐 5. Robust Authentication & Security
- **Hybrid Authentication**: Secure password-based authentication with `bcryptjs` and one-click Google OAuth 2.0.
- **JWT Session Security**: Short-lived Access Tokens and HttpOnly Refresh Tokens with automatic token rotation and session refresh.
- **Transactional Emails**: Password reset links and transactional notifications powered by Resend.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Client["Frontend Client (apps/web)"]
        UI["React 19 + Tailwind CSS 4"]
        RC["React Router v7 + Route Guards"]
        AC["Auth Context + Axios Client"]
        IR["Interview Room (WebSocket / Audio)"]
    end

    subgraph Nginx["Reverse Proxy (VPS)"]
        NG["Nginx + SSL (Certbot)"]
    end

    subgraph Server["Backend API (apps/server)"]
        EX["Express API Server (Bun Runtime)"]
        WS["WebSocket Server (ws)"]
        MW["Auth Middleware & Zod Validation"]
        QUEUE["pg-boss Background Job Queue"]
        ROUTER["AI Model Router (@repo/ai)"]
    end

    subgraph Services["External Integrations"]
        OAI["OpenAI (GPT-4o & Realtime API)"]
        GEM["Google Gemini API"]
        STR["Stripe Billing & Webhooks"]
        GH["GitHub REST & GraphQL API"]
        IK["ImageKit & PDF Parsing"]
        RES["Resend Email Service"]
    end

    subgraph DB["Persistence Layer"]
        PG[(PostgreSQL 18)]
        PRISMA["Prisma ORM (@repo/db)"]
    end

    UI --> Nginx
    Nginx --> EX
    Nginx --> WS
    EX --> MW --> PRISMA --> PG
    EX --> ROUTER --> OAI & GEM
    EX --> GH
    EX --> IK
    EX --> RES
    EX --> STR
    WS --> EX
    QUEUE --> PG
```

---

## 📦 Monorepo Structure

```text
introw/
├── apps/
│   ├── web/                    # React 19 Single Page App
│   │   ├── src/components/     # UI design system (Radix UI, Tailwind CSS 4, Lucide)
│   │   ├── src/contexts/       # Global state (Auth, Sessions)
│   │   ├── src/pages/          # Auth, Interview Room, Results, Billing, History
│   │   ├── src/services/       # Strongly-typed Axios API clients
│   │   └── build.ts            # Bun-native frontend bundler
│   │
│   └── server/                 # Express API Server (Bun Runtime)
│       ├── src/controller/     # Request handlers (Auth, Billing, Interviews)
│       ├── src/middlewares/    # JWT verification, CORS, error boundaries
│       ├── src/routes/         # Versioned REST endpoints (/api/v1/*)
│       ├── src/services/       # GitHub scraper, PDF parser, Email, Stripe
│       └── src/index.ts        # Server entrypoint & WebSocket listener
│
├── packages/
│   ├── ai/                     # AI abstraction layer (OpenAI & Gemini routers)
│   ├── common/                 # Shared TypeScript types, DTOs & Zod schemas
│   ├── db/                     # Prisma ORM schema, client generator & migrations
│   ├── eslint-config/          # Shared ESLint configuration
│   └── typescript-config/      # Shared tsconfig bases
│
├── docker/                     # Production multi-stage Dockerfiles (web & server)
├── .github/workflows/          # Automated GitHub Actions CI/CD pipelines
├── docker-compose.yaml         # Production Docker Compose stack
└── docker-compose.dev.yaml     # Local development Docker Compose stack
```

---

## 🗄️ Database Schema Overview

```mermaid
erDiagram
    User ||--o{ Interview : creates
    User ||--o{ PasswordToken : owns
    Interview ||--o{ Message : contains
    Interview ||--o| InterviewResult : produces

    User {
        string id PK
        string email UK
        string name
        AuthProvider authProvider
        int credits
        Plan plan
        string stripeCustomerId UK
        datetime planExpiresAt
    }

    Interview {
        string id PK
        string userId FK
        json githubMetadata
        string resumeUrl
        json resumeData
        InterviewStatus status
        datetime startedAt
    }

    InterviewResult {
        string id PK
        string interviewId FK,UK
        int score
        string feedback
        json rubric
    }

    Message {
        string id PK
        string interviewId FK
        string message
        UserType createdBy
        datetime createdAt
    }
```

---

## 🛠️ Technology Stack

| Domain | Technologies & Libraries |
| :--- | :--- |
| **Runtime & Monorepo** | [Bun](https://bun.sh/) (v1.2+), [Turborepo](https://turbo.build/) |
| **Frontend UI** | [React 19](https://react.dev/), [React Router v7](https://reactrouter.com/), [Tailwind CSS v4](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/), [Lucide Icons](https://lucide.dev/) |
| **Backend API** | [Express 5](https://expressjs.com/), [WebSockets (ws)](https://github.com/websockets/ws), [pg-boss](https://github.com/timgit/pg-boss) |
| **Database & ORM** | [PostgreSQL 18](https://www.postgresql.org/), [Prisma ORM](https://www.prisma.io/) |
| **Validation & Types** | [Zod](https://zod.dev/), [TypeScript 5.9](https://www.typescriptlang.org/) |
| **AI & LLM Services** | [OpenAI Realtime API & GPT-4o](https://openai.com/), [Google Gemini](https://ai.google.dev/) |
| **Third-Party APIs** | [Stripe](https://stripe.com/) (Payments), [Resend](https://resend.com/) (Emails), [ImageKit](https://imagekit.io/) (Assets/PDFs), [GitHub API](https://docs.github.com/en/rest) |
| **DevOps & Infrastructure** | [Docker](https://www.docker.com/), [Docker Hub](https://hub.docker.com/), [Nginx](https://nginx.org/), [Certbot (SSL)](https://certbot.eff.org/), [GitHub Actions](https://github.com/features/actions) |

---

## 🚀 Getting Started

### Prerequisites
- [Bun](https://bun.sh/) >= 1.2.21
- [Docker](https://www.docker.com/) & Docker Compose
- Node.js >= 18 (optional, for compatibility)

### 1. Clone the Repository
```bash
git clone https://github.com/abhradeepbarman/introw.git
cd introw
```

### 2. Install Dependencies
```bash
bun install
```

### 3. Environment Configuration
Copy the sample environment file and configure your API keys:
```bash
cp .env.example .env
```

| Variable | Description |
| :--- | :--- |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | PostgreSQL credentials |
| `PORT` | Express backend port (default: `8000`) |
| `WEB_PORT` | React frontend port (default: `3000`) |
| `APP_URL` | Frontend public URL (e.g. `http://localhost:3000`) |
| `BUN_PUBLIC_API_BASE_URL` | Backend public URL (e.g. `http://localhost:8000`) |
| `ACCESS_SECRET` / `REFRESH_SECRET` | JWT signing secrets |
| `OPENAI_API_KEY` / `GEMINI_API_KEY` | LLM Provider API keys |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe credentials |
| `RESEND_API_KEY` | Transactional email API key |
| `IMAGEKIT_PRIVATE_KEY` | Document upload private key |
| `GH_TOKEN` | GitHub Personal Access Token for profile ingestion |

### 4. Database Setup
Start local PostgreSQL and run database migrations:
```bash
# Start Postgres in Docker
docker compose -f docker-compose.dev.yaml up -d postgres

# Push schema to database
cd packages/db && bun run db:push && cd ../..
```

### 5. Start Development Server
```bash
bun run dev
```
- **Web Application**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000`

---

## 🚢 DevOps & Deployment

Introw is built for fully automated, zero-downtime continuous integration and continuous deployment (CI/CD):

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer
    participant GHA as GitHub Actions (CI/CD)
    participant DH as Docker Hub Registry
    participant VPS as Production Ubuntu VPS
    participant NGINX as Nginx (SSL Reverse Proxy)

    Dev->>GHA: Git Push (main branch)
    GHA->>GHA: Lint, Type Check & Build
    GHA->>DH: Build & Push Docker Images (server & web)
    GHA->>VPS: SSH connection via appleboy/ssh-action
    VPS->>VPS: git pull origin main
    VPS->>DH: docker compose pull
    VPS->>VPS: docker compose up -d
    NGINX->>VPS: Routes https://introw.tech -> 127.0.0.1:3000
    NGINX->>VPS: Routes https://api.introw.tech -> 127.0.0.1:8000
```

1. **Continuous Integration**: On every commit, GitHub Actions executes type checking (`tsc --noEmit`), linting (`eslint`), and multi-stage container builds.
2. **Container Registry**: Images (`introw-web` and `introw-server`) are tagged with `latest` and `${{ github.sha }}` and published to Docker Hub with GitHub Actions Layer Caching.
3. **Automated Deployment**: GitHub Actions connects via SSH to the production VPS, pulls updated configurations, fetches new Docker layers, and performs rolling updates without downtime.
4. **Edge Security**: Managed via Nginx reverse proxy with automated TLS/SSL renewals through Let's Encrypt / Certbot.

---

## 🔒 Security Best Practices Implemented

- **No Plaintext Passwords**: Hashed with salt rounds using `bcryptjs`.
- **Stateless Authentication with Sliding Refresh**: Refresh tokens securely stored in `HttpOnly`, `SameSite=Strict`, `Secure` cookies.
- **Input Validation**: 100% of user inputs sanitized and validated at compile and runtime using `Zod` schemas.
- **CORS & Rate Protection**: Explicit origin whitelist with pre-flight handling and reverse proxy header forwarding.
- **Isolated Docker Network**: Internal Postgres database is inaccessible to public traffic and binds strictly to the internal Docker network.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

<div align="center">

Made with ❤️ by [Abhradeep Barman](https://github.com/abhradeepbarman)

</div>
