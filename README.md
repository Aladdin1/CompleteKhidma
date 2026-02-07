# KHIDMA Platform

KHIDMA is an on-demand services marketplace platform, designed for emerging markets with support for hybrid cash and digital payments.

## 🏗️ Project Structure

```
khidma/
├── backend/              # Backend API services
│   ├── src/
│   │   ├── api/         # API routes and controllers
│   │   ├── services/    # Core business logic services
│   │   │   ├── auth/    # Authentication & Identity
│   │   │   ├── task/    # Task Management
│   │   │   ├── matching/# Matching & Ranking Engine
│   │   │   ├── pricing/ # Pricing Engine
│   │   │   ├── messaging/# Messaging Service (WebSocket)
│   │   │   ├── payment/ # Payment & Ledger Service
│   │   │   ├── review/  # Review & Reputation Service
│   │   │   └── trust-safety/ # Trust & Safety Service
│   │   ├── db/          # Database migrations, seeds, models
│   │   ├── config/      # Configuration files
│   │   ├── middleware/  # Express middleware
│   │   ├── utils/       # Utility functions
│   │   └── types/       # Type definitions
│   ├── tests/           # Test files
│   └── package.json
├── frontend/            # Web client application
│   └── src/
│       ├── components/  # React/Vue components
│       ├── pages/       # Page components
│       ├── services/    # API client services
│       ├── hooks/       # Custom hooks
│       ├── store/       # State management
│       └── utils/       # Utility functions
├── mobile/              # Mobile applications
│   ├── client/          # Client (task poster) mobile app
│   ├── provider/        # Provider mobile app
│   └── admin/           # Admin mobile app (optional)
├── design/              # Technical design documents
│   └── negotiation_process_design.md  # Task–tasker negotiation (multi-tasker, Q&A, quotations, disclaimers)
├── specifications/      # Business, financial, market, and regulatory specifications
│   ├── business/       # Business specifications & pitch deck
│   ├── financial/       # Financial models & projections
│   ├── market/          # Market analysis & competitive landscape
│   └── regulatory/      # Regulatory risk & compliance
└── docker-compose.yml   # Local development environment

```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ 
- Docker and Docker Compose
- PostgreSQL 15+ (or use Docker)
- Redis 7+ (or use Docker)

### Local Development Setup

1. **Clone and navigate to the project:**
   ```bash
   cd lahlouba
   ```

2. **Start infrastructure services (PostgreSQL, Redis):**
   ```bash
   docker-compose up -d postgres redis
   ```

3. **Set up backend:**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run database migrations:**
   ```bash
   npm run migrate
   ```

5. **Start the backend server:**
   ```bash
   npm run dev
   ```

   The API will be available at `http://localhost:3000`
   WebSocket server at `ws://localhost:3001`

### Using Docker Compose (Full Stack)

```bash
docker-compose up
```

This will start:
- PostgreSQL on port 5432
- Redis on port 6379
- Backend API on port 3000
- WebSocket server on port 3001

## 📋 Core Services

### Backend Services

1. **Auth & Identity Service** - Phone-based authentication, user management
2. **Task Management Service** - Task CRUD, state machine, lifecycle management
3. **Matching & Ranking Service** - Geo-based matching, availability checks, ranking
4. **Pricing Service** - Category-based pricing, surge pricing, duration estimation
5. **Messaging Service** - WebSocket-based real-time chat, voice notes
6. **Payment & Ledger Service** - Escrow, cash confirmation, wallet integration
7. **Review & Reputation Service** - Ratings, reviews, reputation scoring
8. **Trust & Safety Service** - Flagging, reporting, incident management

## 🗄️ Database

The platform uses PostgreSQL as the primary database. Database schemas and migrations are defined in:
- `design/database_schemas_khidma_platform_postgre_sql.md` - Full schema documentation
- `backend/src/db/` - Migration scripts and models

## 📡 API

API contracts are defined using OpenAPI 3.0. See:
- `design/api_contracts_open_api_khidma_platform.md` - Complete API specification

Base URL: `http://localhost:3000/api/v1`

## 🔐 Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure:

- Database connection
- JWT secrets
- API keys (SMS, Maps, Payment Gateway)
- CORS origins
- Rate limiting settings

## 🧪 Testing

**Backend** (Jest + Supertest, API integration):

```bash
cd backend
npm test
```

**Frontend** (Vitest + React Testing Library):

```bash
cd frontend
npm test
```

See `VERIFICATION_STRATEGY.md` and `USER_STORY_TRACEABILITY_MATRIX.md` for user-story verification.

## 📚 Documentation

### Technical Design Documents
Located in `design/`:
- **Architecture**: `design/khidma_system_architecture.md`
- **Detailed Design**: `design/khidma_platform_detailed_design_implementation_document.md`
- **API Contracts (Original)**: `design/api_contracts_open_api_khidma_platform.md`
- **API Contracts (Updated)**: `design/api_contracts_open_api_khidma_platform_updated.md` ⭐ **Complete API Reference**
- **API Endpoints Reference**: `design/API_ENDPOINTS_REFERENCE.md` ⭐ **Quick Reference Guide**
- **Database Schema**: `design/database_schemas_khidma_platform_postgre_sql.md`
- **Security**: `design/security_threat_model_khidma_platform.md`
- **Design Gaps Analysis**: `design/DESIGN_GAPS_ANALYSIS.md`

### Business Specifications
Located in `specifications/`:
- **Business**: `specifications/business/` - Product & business specifications, pitch deck
- **Financial**: `specifications/financial/` - Financial models and projections
- **Market**: `specifications/market/` - Market analysis and competitive landscape
- **Regulatory**: `specifications/regulatory/` - Regulatory risk and compliance

See `specifications/README.md` for complete list.

### Implementation Status
- **Implementation Status**: `backend/IMPLEMENTATION_STATUS.md`
- **Completion Summary**: `backend/COMPLETION_SUMMARY.md`

## 🛠️ Technology Stack

- **Backend**: Node.js (ES Modules), Express.js
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Real-time**: WebSockets (ws)
- **Authentication**: JWT
- **Validation**: Zod

## 📝 Development Roadmap

### Phase 1: MVP (0-3 months)
- Core authentication (phone-based)
- Task creation and management
- Basic matching algorithm
- Payment integration (cash + wallet)
- Admin dashboard

### Phase 2: Scale (3-6 months)
- Service extraction (modular monolith → microservices)
- Event streaming
- Advanced matching with ML
- Mobile apps

### Phase 3: Optimization (6-12 months)
- ML-powered ranking models
- Fraud detection automation
- Enterprise APIs
- Multi-city expansion

## 🤝 Contributing

This is a private project. Follow the coding standards and architecture defined in the design documents.

## 📄 License

Proprietary - All rights reserved

---

**Note**: This platform is designed with Egypt and similar emerging markets in mind, supporting:
- Phone-first authentication
- Hybrid cash + digital payments
- Arabic-first UX
- Offline-tolerant mobile apps
