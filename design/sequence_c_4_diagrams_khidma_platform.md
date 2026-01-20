# Sequence & C4 Diagrams – KHIDMA Platform

> This document provides **diagram-ready** definitions using **Mermaid** so teams can paste into docs/tools that render Mermaid.

---

## 1. C4 – Context Diagram

```mermaid
flowchart LR
  Client[Client App\n(iOS/Android/Web)] -->|HTTP/WebSocket| API[API Gateway]
  Tasker[Tasker App\n(iOS/Android)] -->|HTTP/WebSocket| API
  Ops[Ops/Admin Dashboard] -->|HTTP| API

  API --> Core[Marketplace Backend]

  Core --> Pay[Payment Processor / Wallet Providers]
  Core --> Maps[Maps & Geocoding]
  Core --> SMS[SMS/OTP Provider]
  Core --> KYC[ID / Verification Provider]
  Core --> Media[Media Storage CDN]

  subgraph Marketplace Backend
    Core
  end
```

---

## 2. C4 – Container Diagram

```mermaid
flowchart TB
  subgraph Clients
    C1[Client App]
    C2[Tasker App]
    C3[Ops Dashboard]
  end

  C1 --> G[API Gateway]
  C2 --> G
  C3 --> G

  subgraph Backend[Backend Containers]
    Auth[Auth & Identity Service]
    Task[Task Orchestration Service]
    Match[Matching & Ranking Service]
    Price[Pricing Service]
    Msg[Messaging Service]
    PaySvc[Payments & Ledger Service]
    Rep[Reviews & Reputation Service]
    Safe[Trust & Safety Service]
    Notif[Notification Service]
    Admin[Admin/Ops Service]
  end

  G --> Auth
  G --> Task
  G --> Match
  G --> Price
  G --> Msg
  G --> PaySvc
  G --> Rep
  G --> Safe
  G --> Notif
  G --> Admin

  subgraph Data[Data Stores]
    PG[(PostgreSQL)]
    R[(Redis Cache)]
    ES[(Search Index)]
    Bus[(Event Stream)]
    WH[(Analytics Warehouse)]
    FS[(Feature Store)]
  end

  Auth --> PG
  Task --> PG
  Match --> PG
  Price --> PG
  Msg --> PG
  PaySvc --> PG
  Rep --> PG
  Safe --> PG
  Admin --> PG

  Task --> Bus
  Match --> Bus
  PaySvc --> Bus
  Rep --> Bus
  Safe --> Bus
  Bus --> WH
  Bus --> FS

  Notif --> SMS[SMS Provider]
  Msg --> Media[Media Storage/CDN]
  PaySvc --> Wallet[Wallet Providers]
  PaySvc --> Card[Card Processor]
  Task --> Maps[Maps/Geo]
```

---

## 3. Sequence Diagram – OTP Login

```mermaid
sequenceDiagram
  participant U as User
  participant App as Mobile App
  participant API as API Gateway
  participant Auth as Auth Service
  participant SMS as SMS Provider

  U->>App: Enter phone number
  App->>API: POST /auth/otp/request
  API->>Auth: requestOtp(phone)
  Auth->>SMS: sendOtp(phone)
  SMS-->>Auth: sent
  Auth-->>API: ok
  API-->>App: 200

  U->>App: Enter OTP
  App->>API: POST /auth/otp/verify
  API->>Auth: verifyOtp(phone, otp, device)
  Auth-->>API: access_token, refresh_token
  API-->>App: 200 tokens
```

---

## 4. Sequence Diagram – Task Posting & Candidate Ranking

```mermaid
sequenceDiagram
  participant Client as Client App
  participant API as API Gateway
  participant Task as Task Service
  participant Price as Pricing Service
  participant Match as Matching Service
  participant Notif as Notification

  Client->>API: POST /tasks (draft)
  API->>Task: createTask()
  Task-->>API: task(draft)
  API-->>Client: 201 task

  Client->>API: POST /tasks/{id}/post
  API->>Price: estimate(task)
  Price-->>API: price band + estimate
  API->>Task: postTask()
  Task->>Match: enqueueMatching(task)
  Match->>Match: geo filter + availability + scoring
  Match->>Task: store candidates snapshot
  Match->>Notif: notify top Taskers
  Task-->>API: task(posted/matching)
  API-->>Client: 200
```

---

## 5. Sequence Diagram – Booking, Payment Authorization, Completion, Settlement

```mermaid
sequenceDiagram
  participant Client as Client App
  participant Tasker as Tasker App
  participant API as API Gateway
  participant Book as Booking Service
  participant Pay as Payments/Ledger
  participant Msg as Messaging
  participant Ops as Ops Dashboard

  Client->>API: POST /bookings {task_id, tasker_id}
  API->>Book: createBooking()
  Book-->>API: booking(offered)
  API-->>Client: 201 booking

  Tasker->>API: POST /bookings/{id}/status {accepted}
  API->>Book: accept()
  Book-->>API: booking(accepted)
  API-->>Tasker: 200

  Client->>API: POST /payments/intents {booking_id, method}
  API->>Pay: authorize(method)
  Pay-->>API: intent(authorized OR requires_action)
  API-->>Client: 201 intent

  Tasker->>API: POST /bookings/{id}/status {in_progress}
  API->>Book: start()
  Book-->>API: booking(in_progress)

  Tasker->>API: POST /bookings/{id}/status {completed}
  API->>Book: complete()
  Book-->>API: booking(completed)

  Client->>API: POST /payments/intents/{id}/capture
  API->>Pay: capture() OR confirmCash()
  Pay->>Pay: create ledger entry + platform fee + tasker payable
  Pay-->>API: captured
  API-->>Client: 200

  Pay->>Pay: schedule payout
  Pay-->>Ops: payout status visible
```

---

## 6. Sequence Diagram – Dispute & Refund

```mermaid
sequenceDiagram
  participant Client as Client
  participant API as API
  participant Dis as Disputes/Trust
  participant Pay as Payments/Ledger
  participant Ops as Ops

  Client->>API: Open dispute (booking_id, reason)
  API->>Dis: createDispute()
  Dis-->>API: dispute(open)
  API-->>Client: 201

  Ops->>API: Review evidence, decide refund
  API->>Dis: resolveDispute(refund=partial)
  Dis->>Pay: refund(amount)
  Pay->>Pay: ledger refund entry
  Pay-->>Dis: refund complete
  Dis-->>API: dispute(resolved)
  API-->>Ops: 200
```

---

## 7. Notes for Implementation

- These diagrams assume **service boundaries**; in an MVP monolith, modules map 1:1 to these services.
- Payment settlement is modeled via the ledger; payouts are asynchronous.
- Candidate snapshots improve explainability, fairness audits, and dispute investigations.

