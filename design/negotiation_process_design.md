# Khidma: Task–Tasker Negotiation Process (Production Design)

**Version:** 1.0  
**Status:** Production-ready design with disclaimers and edge-case handling  
**Last updated:** 2026-02-07

---

## 1. Overview

After a **client** creates a task and selects one or more **taskers**, the platform supports a structured negotiation phase so that:

- The client can request **pricing** and **available times** from multiple taskers (especially when requested times are not available).
- Each tasker can **ask questions** (client is notified and can reply with **text**, **image**, or **video**).
- Each tasker can **share a quotation**; the client is notified and can accept or decline.

This document defines the flow, data model, notifications, disclaimers, and production handling.

---

## 2. High-Level Flow

```
[Client creates task] → [Client selects one or more taskers] → [Request quote sent to each]
        ↓
[Tasker receives quote request] → [Tasker may ask questions OR submit quotation]
        ↓
[Client receives notifications] → [Client replies to questions (text/image/video)] OR [Client reviews quotation]
        ↓
[Client accepts one quotation] → [Booking created] → [Conversation continues on booking]
```

---

## 3. Multi-Tasker Selection and Quote Requests

### 3.1 Behaviour

- The client can **select multiple taskers** for the same task.
- For each selected tasker, the client **requests a quote** (pricing and, if needed, **alternative available times** when the requested time is not available).
- Each request creates or updates a **task_bid** with status `requested` for that (task_id, tasker_id).
- The tasker is notified and sees the task in **Quote requests** (e.g. `GET /api/v1/taskers/me/quote-requests`).

### 3.2 Business Rules

| Rule | Description | Implementation note |
|------|-------------|---------------------|
| **Max taskers per task** | Cap number of taskers a client can ask for a quote (e.g. 5–10). | Enforce in `POST /tasks/:task_id/request-quote`: count `task_bids` with status in `('requested','pending','accepted')`; reject if at limit. |
| **Task state** | Quote can only be requested when task is `draft`, `posted`, or `matching`. | Already enforced in API. |
| **Duplicate request** | Same tasker twice: idempotent, return existing `requested` bid. | Already handled. |
| **Requested time vs availability** | Task has `starts_at` + `flexibility_minutes`. Tasker may propose `can_start_at` in their bid when requested time is not available. | Stored in `task_bids.can_start_at`; tasker sets it when submitting quote. |

### 3.3 Disclaimers (Client – Select Taskers / Request Quote)

- **Before “Request quote”:**  
  *“By requesting a quote, you allow the selected tasker(s) to see your task details and contact you through the platform. You may receive questions and quotations from each. Only one tasker can be accepted per task.”*

- **After selecting multiple taskers:**  
  *“You have selected [N] taskers. Each will be notified and may propose a price and available times. You will be notified when they reply or send a quotation.”*

---

## 4. Tasker Questions and Client Replies (Pre-Booking)

### 4.1 Behaviour

- For each **bid** (task + tasker), a **negotiation thread** exists (bid-level conversation).
- The **tasker** can send **questions** (messages) in this thread.
- The **client** is **notified** for each new message and can **reply** with:
  - **Text**
  - **Image** (e.g. photo of the job site)
  - **Video** (e.g. short clip)
- Messages are stored in a conversation linked to the **bid** (e.g. `bid_conversations` / `bid_messages` or `conversations.task_bid_id`). When the client accepts a bid, the same thread can be linked to the resulting **booking** so history is preserved.

### 4.2 Message Types and Notifications

| Sender | Content types | Recipient notification |
|--------|----------------|------------------------|
| Tasker | Text, image, (optional voice) | Client: “Tasker [Name] sent a message about your task” |
| Client | Text, image, video | Tasker: “Client replied to your question” |

- **Notification payload** must include `bid_id`, `task_id`, and deep link to the negotiation thread (or task detail with active bid chat).

### 4.3 Production Handling

| Case | Handling |
|------|----------|
| **Bid no longer open** | If bid status is not `requested` or `pending`, reject new messages with clear error; optionally allow read-only. |
| **Task canceled/expired** | Reject sending; show “This task is no longer available.” |
| **Abuse / spam** | Rate limit messages per user per bid (e.g. max N messages per minute); block or flag repeat offenders. |
| **Media size and type** | Enforce max size (e.g. image 10 MB, video 50 MB) and allowed MIME types; validate `media_url` or upload pipeline. |
| **Video storage** | Store video URLs (same as image); ensure CDN/storage policy for retention and privacy. |

### 4.4 Disclaimers (Messaging)

- **Tasker (first message):**  
  *“Messages are visible to the client. Ask only what you need to provide an accurate quote. Inappropriate content may result in account action.”*

- **Client (reply):**  
  *“Your reply will be sent to the tasker. Do not share payment details or personal contact outside the platform.”*

---

## 5. Tasker Quotation and Client Notification

### 5.1 Behaviour

- The tasker **submits a quotation** (bid) with: amount, currency, optional message, optional `can_start_at` (if requested time is not available), optional `minimum_minutes`.
- Bid status moves from `requested` to **`pending`**.
- The **client is notified** immediately: e.g. “Tasker [Name] sent you a quotation for [Task summary]” with amount and link to task/bids.

### 5.2 Implementation Requirement

- On **tasker submit/update quote** (e.g. `POST /api/v1/bids` setting status to `pending`), backend must:
  - Create a **notification** for the task **client** with kind `quotation_received` (or equivalent).
  - Payload: `task_id`, `bid_id`, `tasker_name`, `amount`, `currency`, optional `can_start_at`.

### 5.3 Client Actions on Quotation

- **Accept:** Client accepts one pending bid → create **booking** from bid, set bid to `accepted`, decline other pending bids for the same task. Client and tasker are notified.
- **Decline:** Client declines a bid → bid status `declined`; optional notification to tasker (“Client declined your quotation”).
- **Ignore:** Quotation remains pending until expiry or task state change; optional reminder notifications (policy-based).

### 5.4 Disclaimers (Quotation)

- **Tasker (before submit):**  
  *“Your quote is binding once the client accepts. Ensure amount and availability are correct. You can propose a different time if the client’s requested time doesn’t work.”*

- **Client (when quotation received):**  
  *“This quotation is valid as stated. Accepting it will create a booking and charge according to the platform’s payment policy. You can accept only one tasker per task.”*

---

## 6. State Model (Bid and Task)

### 6.1 Bid statuses

| Status | Meaning |
|--------|--------|
| `requested` | Client asked for a quote; tasker has not yet submitted. |
| `pending` | Tasker submitted a quote; waiting for client accept/decline. |
| `accepted` | Client accepted; booking created. |
| `declined` | Client or system declined. |
| `withdrawn` | Tasker withdrew. |
| `expired` | Not accepted before task/bid expiry. |

### 6.2 Allowed actions by state

| State | Tasker can | Client can |
|-------|------------|------------|
| `requested` | Send messages, submit quotation | Reply to messages, cancel quote request (optional) |
| `pending` | Send messages, update/withdraw quote (if policy allows) | Reply to messages, accept, decline |
| `accepted` | — | — (conversation continues on booking) |

### 6.3 Task state interaction

- Task in `posted` or `matching`: quote requests and negotiations allowed.
- Task `canceled` / `expired`: no new messages; existing bids can be auto-moved to `expired` or `declined`.
- When client accepts a bid: task moves to accepted/confirmed path; booking created.

---

## 7. Notifications Summary

| Event | Recipient | Kind / Title (example) | Data (payload) |
|-------|-----------|------------------------|-----------------|
| Client requests quote | Tasker | `quote_requested` / “New quote request for [Task]” | task_id, bid_id, client_id |
| Tasker sends message (question) | Client | `message_received` / “Tasker [Name] sent a message” | bid_id, conversation_id, message_id, sender_id |
| Client replies (text/image/video) | Tasker | `message_received` / “Client replied” | bid_id, conversation_id, message_id |
| Tasker submits quotation | Client | `quotation_received` / “Tasker [Name] sent a quotation” | task_id, bid_id, tasker_name, amount, currency, can_start_at |
| Client accepts bid | Tasker | `bid_accepted` / “Client accepted your quote” | booking_id, task_id |
| Client declines bid | Tasker | `bid_declined` / “Client declined your quotation” | task_id, bid_id |

All notifications must support **in-app**, and optionally **push** and **email**, according to user preferences.

---

## 8. Edge Cases and Production Safeguards

| Case | Mitigation |
|------|------------|
| **Too many quote requests** | Max N taskers per task (configurable); clear error and UI message. |
| **Tasker never replies** | Optional SLA (e.g. 24–48 h); auto-expire or remind; client can cancel request. |
| **Client never responds to quotation** | Optional quote expiry (e.g. 7 days); tasker can withdraw. |
| **Concurrent accept** | Only one booking per task; use DB constraint + transactional accept (already in place). |
| **Message after bid declined** | Reject send; show “This quote was declined.” |
| **Requested time unavailable** | Tasker sets `can_start_at` in quote; client sees it and accepts/declines. |
| **Content moderation** | Policy for text/image/video; report flow; block/disable account on violation. |
| **Data retention** | Retain bid and negotiation messages per legal/compliance; same as other user data. |

---

## 9. Implementation Checklist

- [x] **Max taskers per task:** Enforced in `POST /tasks/:task_id/request-quote` (default 10).
- [x] **Bid-level messages:** Table `bid_messages` and APIs: `GET /api/v1/bids/:bid_id/messages`, `POST /api/v1/bids/:bid_id/messages` (text/voice/image/video).
- [x] **Video in messages:** `bid_messages.kind` supports `video`; booking conversations API accepts `kind: 'video'`. For booking `messages` table, run once (outside transaction): `ALTER TYPE message_kind ADD VALUE IF NOT EXISTS 'video';`
- [x] **Notify client on quotation:** In `POST /api/v1/bids`, after setting bid to `pending`, create notification (`quotation_received`) for task client.
- [x] **Notify tasker on quote request:** In `POST /tasks/:task_id/request-quote`, create notification (`quote_requested`) for tasker.
- [x] **Disclaimers:** Copy for UI in §3.3, §4.4, §5.4; show at: select taskers, request quote, first message in thread, tasker submit quote, client accept quote.
- [x] **Rate limiting:** Bid messages: 30/min per user per bid in `POST /api/v1/bids/:bid_id/messages`.
- [ ] **Deep links:** Notifications link to task detail, bid thread, or quotation view.

---

## 10. Document History

| Version | Date | Changes |
|---------|------|--------|
| 1.0 | 2026-02-07 | Initial production design: multi-tasker, Q&A, quotation, disclaimers, edge cases. |
