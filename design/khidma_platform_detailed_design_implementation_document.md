# KHIDMA Platform – Detailed Design & Implementation Document

## 1. Purpose of This Document

This document provides a **detailed, implementation-level design** for building KHIDMA, an on‑demand services marketplace, with explicit consideration for **emerging markets such as Egypt**. It is written for **engineering leads, architects, and product owners**, and is suitable for use as a master technical design document (TDD).

---

## 2. Design Goals & Constraints

### 2.1 Primary Goals
- Fast task discovery and fulfillment
- High trust with minimal friction
- Scalability city-by-city
- Support for hybrid cash + digital payments
- Strong operational control in early phases

### 2.2 Non-Goals
- Full-time employment management
- Licensed professional services
- Fully automated operations from day one

### 2.3 Key Constraints
- Price-sensitive users
- Partial digital payments adoption
- Inconsistent regulatory enforcement
- Ops-heavy early rollout

---

## 3. High-Level System Architecture

### 3.1 Architecture Pattern
- **Service-oriented architecture** (modular monolith → microservices)
- API-first design
- Event-driven task lifecycle

### 3.2 Core Components

- Client Applications (Web, iOS, Android)
- Admin & Ops Dashboard
- Backend Platform
- External Integrations

---

## 4. Client Applications

### 4.1 Client (Task Poster) App

**Core Features**
- Authentication (phone-first)
- Task creation wizard
- Pricing preview
- Tasker selection
- Chat & voice notes
- Task tracking
- Ratings & reviews

**UX Notes (Egypt)**
- Arabic-first UI
- Minimal text input
- Voice + image support

---

### 4.2 Tasker App

**Core Features**
- Identity onboarding
- Availability management
- Job discovery
- Accept / decline flow
- Navigation support
- Earnings dashboard
- Payout management

**Offline Tolerance**
- Cached task details
- SMS fallback notifications

---

## 5. Backend Platform Design

### 5.1 API Gateway

- Auth token validation
- Rate limiting
- Device fingerprinting

---

### 5.2 Core Services

#### 5.2.1 Identity & User Service
- Phone-based auth
- National ID metadata
- Role management (client / tasker / ops)

#### 5.2.2 Task Management Service
- Task CRUD
- Task state machine
- Cancellation rules

#### 5.2.3 Matching & Ranking Service
- Geo-radius filtering
- Availability checks
- Ranking scoring
- New-task broadcast

#### 5.2.4 Pricing Service
- Category-based pricing bands
- Duration estimation
- Surge dampening

#### 5.2.5 Messaging Service
- WebSocket-based chat
- Voice note support
- Attachment handling

#### 5.2.6 Payment & Ledger Service
- Escrow-like accounting
- Cash confirmation flow
- Wallet integration
- Payout scheduling

#### 5.2.7 Review & Reputation Service
- Rating ingestion
- Bayesian score calculation
- De-ranking rules

#### 5.2.8 Trust & Safety Service
- Flagging & reporting
- Incident workflows
- Suspension logic

---

## 6. Task Lifecycle (Detailed)

```
DRAFT → POSTED → MATCHING → ACCEPTED → CONFIRMED
→ IN_PROGRESS → COMPLETED → SETTLED → REVIEWED
```

### Failure States
- EXPIRED
- CANCELED_BY_CLIENT
- CANCELED_BY_TASKER
- DISPUTED

---

## 7. Data Model (Core Entities)

### Users
- id
- role
- phone
- verification_status

### Task
- id
- category
- location
- price_band
- state

### TaskerProfile
- skills
- rating
- availability

### Booking
- task_id
- tasker_id
- timestamps

### LedgerEntry
- debit
- credit
- reference_id

---

## 8. Matching & Ranking Logic

### Scoring Inputs
- Distance
- Availability
- Acceptance rate
- Rating (weighted)
- Price alignment

### Controls
- Exposure caps
- Fairness rotation
- Cold-start boost

---

## 9. Payments & Financial Flows

### Payment Modes
- Cash-on-completion
- Mobile wallets
- Cards (optional)

### Ledger Design
- Double-entry accounting
- Immutable transaction records

### Disputes
- Funds held until resolution

---

## 10. Admin & Operations Tools

### Ops Dashboard
- Task monitoring
- Manual assignment
- Dispute resolution
- User suspension

### Trust Operations
- Incident queues
- Performance flags

---

## 11. Security & Privacy

- Encrypted PII
- Role-based access
- Audit logs
- Data retention policies

---

## 12. Observability & Reliability

### Metrics
- Task fill time
- Acceptance latency
- Payment failures

### Alerts
- Matching degradation
- Payment outages

---

## 13. Deployment Strategy

### Phase 1: Pilot
- Single city
- Manual ops
- Monolithic backend

### Phase 2: Scale
- Service extraction
- Event streaming
- Caching layer

### Phase 3: Optimization
- ML ranking models
- Fraud automation

---

## 14. Technology Stack (Suggested)

- Backend: Node.js / Python
- DB: PostgreSQL + Redis
- Messaging: WebSockets
- Cloud: AWS / GCP (regional)
- Payments: Wallet APIs

---

## 15. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Cash disputes | Ops mediation |
| Worker churn | Earnings smoothing |
| Fraud | Manual + ML |
| Scale issues | City isolation |

---

## 16. Implementation Roadmap

### 0–3 Months
- MVP build
- Ops workflows

### 3–6 Months
- Automation
- Payments expansion

### 6–12 Months
- ML optimization
- Enterprise APIs

---

## 17. Conclusion

KHIDMA platform is **technically straightforward but operationally complex**. Success depends on disciplined system design, strong ops tooling, and gradual automation. This document provides a concrete blueprint to move from zero to a scalable, trusted marketplace in markets like Egypt.

