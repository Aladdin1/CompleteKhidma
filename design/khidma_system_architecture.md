# KHIDMA System Architecture

## 1. C4 Context Diagram (Textual)

Actors:
- Client (Web / iOS / Android)
- Tasker (Mobile)

External Systems:
- Payment Processor
- Maps & Geolocation
- Background Check Provider

Core Platform:
- KHIDMA Backend Platform

---

## 2. Container Architecture

### API Gateway
- Authentication
- Rate limiting

### Core Services
- Auth & Identity Service
- Task Orchestration Service
- Matching & Ranking Engine
- Pricing Engine
- Messaging Service (WebSocket)
- Payment & Ledger Service
- Review & Reputation Service
- Trust & Safety Service

### Data Layer
- OLTP databases (tasks, users)
- Event streaming (task lifecycle)
- Analytics warehouse
- ML feature store

---

## 3. Key Sequence: Task Booking

1. Client posts task
2. Task Service validates task
3. Matching Engine ranks Taskers
4. Tasker accepts
5. Payment pre‑authorization
6. Task execution
7. Completion confirmation
8. Payment capture & payout

---

## 4. Non‑Functional Requirements
- 99.9% uptime
- Sub‑second matching latency
- City‑level scalability

