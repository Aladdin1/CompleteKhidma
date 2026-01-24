# KHIDMA – Complete Product & Business Specification

## 1. Executive Summary

KHIDMA is a two-sided, on-demand services marketplace that connects consumers who need everyday tasks completed with vetted local freelancers ("Providers"). The platform focuses on speed, trust, flexibility, and local density, enabling efficient outsourcing of short-term physical and digital tasks while providing flexible income opportunities for independent workers.

This document consolidates the **full product specification**, **system design**, and **complete business model** into a single, cohesive reference suitable for executives, product leaders, engineers, investors, and operators.

---

## 2. Product Vision & Strategy

### Vision
To become the default operating system for local, on-demand human labor.

### Strategic Pillars
1. Liquidity first – tasks get filled quickly
2. Trust by design – safety, insurance, transparency
3. Local density – hyper-local marketplace optimization
4. Flexibility – task-level customization instead of rigid SKUs

---

## 3. User Segmentation

### 3.1 Clients (Demand Side)

**Segments**
- One-time users (e.g., furniture assembly, moving help)
- Repeat households (cleaning, mounting)
- Small offices and property managers
- Enterprise partners (retailers, real estate)

**Core Needs**
- Fast availability
- Predictable pricing
- Trust and safety
- Simple booking and payment

---

### 3.2 Taskers (Supply Side)

**Segments**
- Casual Taskers (few hours/week)
- Full-time Taskers
- Specialists (high-skill, high-rate)
- New Taskers (cold start)

**Core Needs**
- Flexible schedules
- Control over pricing
- Fair access to work
- Reliable payouts

---

## 4. User Stories

### 4.1 Client (Demand Side) User Stories

#### Authentication & Onboarding
- **US-C-001**: As a new client, I want to register using my phone number, so that I can quickly create an account without email verification.
- **US-C-002**: As a client, I want to verify my phone number via SMS, so that my account is secure and I can receive task updates.
- **US-C-003**: As a client, I want to complete my profile with my name and address, so that taskers can find and complete tasks at my location.

#### Profile & Account Management
- **US-C-038**: As a client, I want to edit my profile information (name, address), so that I can keep my account details up to date.
- **US-C-039**: As a client, I want to manage multiple saved addresses, so that I can post tasks for different locations (home, office, rental property).
- **US-C-040**: As a client, I want to change my phone number, so that I can update my contact information when needed.
- **US-C-041**: As a client, I want to set my language preference (Arabic/English), so that I can use the platform in my preferred language.
- **US-C-042**: As a client, I want to manage my notification preferences, so that I can control what updates I receive and how.
- **US-C-043**: As a client, I want to deactivate or delete my account, so that I can manage my account lifecycle.
- **US-C-044**: As a client, I want to accept terms of service and privacy policy, so that I understand the platform rules and my rights.

#### Task Creation & Posting
- **US-C-004**: As a client, I want to create a task using a step-by-step wizard, so that I can easily describe what I need done.
- **US-C-005**: As a client, I want to select a task category (e.g., cleaning, mounting, moving), so that the system can match me with qualified taskers.
- **US-C-006**: As a client, I want to add task details like number of items, floor level, and parking constraints, so that pricing is accurate and taskers are prepared.
- **US-C-007**: As a client, I want to see a pricing preview before posting, so that I know the estimated cost upfront.
- **US-C-008**: As a client, I want to upload photos of the task, so that taskers can better understand what needs to be done.
- **US-C-009**: As a client, I want to specify my preferred time window, so that taskers can accept tasks that fit their schedule.
- **US-C-010**: As a client, I want to post a task and see it go live immediately, so that I can get help quickly.

#### Task Management Enhancements
- **US-C-045**: As a client, I want to edit my task details before it's accepted, so that I can correct mistakes or add information.
- **US-C-046**: As a client, I want to search and filter my task history, so that I can find specific past tasks quickly.
- **US-C-047**: As a client, I want to save task templates for recurring tasks, so that I can quickly recreate similar tasks without re-entering all details.
- **US-C-048**: As a client, I want to schedule tasks in advance, so that I can plan ahead for future service needs.
- **US-C-049**: As a client, I want to set up recurring tasks (e.g., weekly cleaning), so that I don't have to manually post them each time.
- **US-C-050**: As a client, I want to duplicate a previous task, so that I can quickly recreate similar tasks.
- **US-C-052**: As a client, I want to select a saved address from a dropdown when creating a task, so that I can quickly use addresses I've saved before without re-entering them.

#### Tasker Selection & Matching
- **US-C-011**: As a client, I want to see a list of available taskers ranked by relevance, so that I can choose the best match for my task.
- **US-C-012**: As a client, I want to view tasker profiles with ratings, reviews, and skills, so that I can make an informed decision.
- **US-C-013**: As a client, I want to see tasker distance from my location, so that I know how quickly they can arrive.
- **US-C-014**: As a client, I want to see tasker pricing for my task category, so that I can compare options.
- **US-C-015**: As a client, I want to manually select a tasker from recommendations, so that I have control over who completes my task.
- **US-C-016**: As a client, I want the system to automatically match me with the best tasker if I don't choose, so that my task gets filled quickly.
- **US-C-085**: As a client, I want to select a tasker for my task and wait for their acceptance, so that I know the tasker has confirmed they can complete the work.

#### Tasker Relationship Management
- **US-C-051**: As a client, I want to mark taskers as favorites, so that I can easily request them for future tasks.
- **US-C-053**: As a client, I want to see my favorite taskers prioritized in recommendations, so that I can work with trusted providers.
- **US-C-054**: As a client, I want to request a specific tasker I've worked with before, so that I can maintain consistent service quality.

#### Communication
- **US-C-017**: As a client, I want to chat with my assigned tasker via in-app messaging, so that I can provide additional details or ask questions.
- **US-C-018**: As a client, I want to send voice notes to taskers, so that I can communicate easily without typing (especially useful for Arabic speakers).
- **US-C-019**: As a client, I want to receive notifications when a tasker accepts my task, so that I know my task is confirmed.
- **US-C-020**: As a client, I want to receive updates when the tasker is on the way, so that I can prepare for their arrival.

#### Task Tracking & Management
- **US-C-021**: As a client, I want to track my task status in real-time (posted, accepted, in progress, completed), so that I know what's happening.
- **US-C-022**: As a client, I want to cancel my task before it's accepted, so that I'm not charged for tasks I no longer need.
- **US-C-023**: As a client, I want to see the tasker's location on a map when they're en route, so that I know when to expect them.
- **US-C-024**: As a client, I want to confirm when the task is completed, so that payment can be processed.

#### Payment & Billing
- **US-C-025**: As a client, I want to add a payment method (card or mobile wallet), so that I can pay for tasks seamlessly.
- **US-C-026**: As a client, I want my payment to be pre-authorized when a tasker accepts, so that funds are secured but not charged until completion.
- **US-C-027**: As a client, I want to pay via cash on completion, so that I have flexibility in payment methods (especially in emerging markets).
- **US-C-028**: As a client, I want to see a breakdown of costs (tasker rate, platform fee), so that I understand what I'm paying for.
- **US-C-029**: As a client, I want to add a tip after task completion, so that I can reward excellent service.
- **US-C-030**: As a client, I want to dispute charges if the task wasn't completed as expected, so that I'm protected from poor service.
- **US-C-055**: As a client, I want to manage multiple payment methods (add, edit, remove), so that I have flexibility in how I pay.
- **US-C-056**: As a client, I want to set a default payment method, so that payments are processed quickly without selecting each time.
- **US-C-057**: As a client, I want to view my payment history and transaction details, so that I can track my spending.
- **US-C-058**: As a client, I want to download receipts/invoices for completed tasks, so that I can keep records for accounting or tax purposes.
- **US-C-059**: As a client, I want to see the status of my dispute resolution, so that I know when issues are being addressed.
- **US-C-060**: As a client, I want to track my refund status, so that I know when refunded amounts will be returned.
- **US-C-061**: As a client, I want to see spending summaries (monthly/yearly), so that I can track my service expenses.

#### Reviews & Feedback
- **US-C-031**: As a client, I want to rate my tasker after completion (1-5 stars), so that I can share my experience and help other clients.
- **US-C-032**: As a client, I want to write a review with tags (e.g., "punctual", "professional", "clean work"), so that I can provide specific feedback.
- **US-C-033**: As a client, I want to provide private feedback to the platform, so that I can report issues without affecting the tasker's public rating.
- **US-C-034**: As a client, I want to see my past tasks and reviews, so that I can reference previous experiences.

#### Trust & Safety
- **US-C-035**: As a client, I want to see that taskers are verified and background-checked, so that I feel safe inviting them to my home.
- **US-C-036**: As a client, I want to report a tasker for inappropriate behavior, so that the platform can take action.
- **US-C-037**: As a client, I want to know that my property is covered by insurance, so that I'm protected from damage.

---

### 4.2 Tasker (Supply Side) User Stories

#### Onboarding & Verification
- **US-T-001**: As a new tasker, I want to register using my phone number, so that I can quickly join the platform.
- **US-T-002**: As a tasker, I want to complete identity verification with my national ID, so that I can be trusted by clients.
- **US-T-003**: As a tasker, I want to pass a criminal background check, so that I'm eligible to work on the platform.
- **US-T-004**: As a tasker, I want to set up my profile with skills, experience, and photos, so that clients can see my qualifications.
- **US-T-005**: As a tasker, I want to select which task categories I can perform, so that I only see relevant tasks.

#### Availability & Scheduling
- **US-T-006**: As a tasker, I want to set my weekly availability schedule, so that I only receive task offers when I'm free.
- **US-T-007**: As a tasker, I want to toggle my availability on/off instantly, so that I can take breaks or work extra hours flexibly.
- **US-T-008**: As a tasker, I want to set different availability for different days, so that I can work around my personal schedule.
- **US-T-009**: As a tasker, I want to block out specific time slots, so that I can reserve time for personal commitments.

#### Task Discovery & Selection
- **US-T-010**: As a tasker, I want to see new tasks posted near my location, so that I can find work opportunities.
- **US-T-011**: As a tasker, I want to see task details (category, location, estimated duration, price), so that I can decide if I want to accept.
- **US-T-012**: As a tasker, I want to see task requirements (skills, tools, heavy lifting), so that I know if I'm qualified.
- **US-T-013**: As a tasker, I want to receive push notifications for new tasks matching my skills, so that I don't miss opportunities.
- **US-T-014**: As a tasker, I want to see tasks ranked by relevance to me (distance, skills, earnings potential), so that I can prioritize the best opportunities.
- **US-T-015**: As a tasker, I want to accept or decline task offers, so that I have control over which jobs I take.
- **US-T-101**: As a tasker, I want to receive task offers when a client selects me, so that I can review and decide whether to accept or reject based on my availability and preferences.
- **US-T-102**: As a tasker, I want to see all my pending offers in one place, so that I can efficiently manage and respond to multiple task opportunities.

#### Pricing & Earnings
- **US-T-016**: As a tasker, I want to set my hourly rate per task category, so that I can price my services competitively.
- **US-T-017**: As a tasker, I want to set minimum hours for certain tasks, so that short tasks are still worth my time.
- **US-T-018**: As a tasker, I want to add travel fees for tasks far from my location, so that I'm compensated for travel time.
- **US-T-019**: As a tasker, I want to see my estimated earnings before accepting a task, so that I can make informed decisions.
- **US-T-020**: As a tasker, I want to see my total earnings dashboard, so that I can track my income.
- **US-T-021**: As a tasker, I want to see earnings breakdown by task, date, and category, so that I can understand my income sources.

#### Task Execution
- **US-T-022**: As a tasker, I want to navigate to the task location using integrated maps, so that I can arrive efficiently.
- **US-T-023**: As a tasker, I want to mark when I've arrived at the location, so that the client knows I'm there.
- **US-T-024**: As a tasker, I want to start the task timer when I begin work, so that my hours are tracked accurately.
- **US-T-025**: As a tasker, I want to communicate with the client during the task, so that I can ask questions or provide updates.
- **US-T-026**: As a tasker, I want to submit my completed hours, so that I can get paid for the work I did.
- **US-T-027**: As a tasker, I want to upload photos of completed work, so that I can prove the task was done properly.

#### Payments & Payouts
- **US-T-028**: As a tasker, I want to receive payment after task completion, so that I'm compensated for my work.
- **US-T-029**: As a tasker, I want to set up my payout method (bank account or mobile wallet), so that I can receive my earnings.
- **US-T-030**: As a tasker, I want to see when payouts are scheduled (T+X days), so that I know when to expect payment.
- **US-T-031**: As a tasker, I want to see my pending and completed payouts, so that I can track my cash flow.
- **US-T-032**: As a tasker, I want to receive payment even if the client disputes, pending platform review, so that I'm protected from unfair disputes.

#### Reviews & Reputation
- **US-T-033**: As a tasker, I want to see my overall rating and recent reviews, so that I can understand how clients perceive my work.
- **US-T-034**: As a tasker, I want to respond to client reviews, so that I can address feedback or thank clients.
- **US-T-035**: As a tasker, I want to see my acceptance rate and completion rate, so that I can improve my performance.
- **US-T-036**: As a tasker, I want higher ratings to help me get more task offers, so that good performance is rewarded.

#### Trust & Safety
- **US-T-037**: As a tasker, I want to report unsafe or inappropriate client behavior, so that the platform can protect me.
- **US-T-038**: As a tasker, I want to know that I'm covered by liability insurance, so that I'm protected from accidents.
- **US-T-039**: As a tasker, I want to cancel a task if I feel unsafe, so that I can protect myself without penalty in emergencies.

#### Cold Start Support
- **US-T-040**: As a new tasker with no reviews, I want to receive initial task offers, so that I can build my reputation.
- **US-T-041**: As a new tasker, I want pricing guidance for my first tasks, so that I can set competitive rates.
- **US-T-042**: As a new tasker, I want to see tips and best practices, so that I can succeed on the platform.

---

### 4.3 Admin & Operations User Stories

#### Task Monitoring & Management
- **US-A-001**: As an operations admin, I want to see all active tasks in real-time, so that I can monitor marketplace health.
- **US-A-002**: As an operations admin, I want to see tasks that haven't been accepted after X minutes, so that I can intervene if needed.
- **US-A-003**: As an operations admin, I want to manually assign a tasker to a task, so that I can ensure tasks get filled.
- **US-A-004**: As an operations admin, I want to see task fill rates and time-to-accept metrics, so that I can optimize matching.
- **US-A-005**: As an operations admin, I want to cancel tasks on behalf of clients, so that I can handle edge cases.

#### User Management
- **US-A-006**: As an admin, I want to suspend or ban users who violate platform rules, so that I can maintain platform safety.
- **US-A-007**: As an admin, I want to see user activity and behavior flags, so that I can identify problematic users.
- **US-A-008**: As an admin, I want to verify or reject tasker background checks, so that I can control platform quality.
- **US-A-009**: As an admin, I want to view user profiles and history, so that I can make informed moderation decisions.

#### Dispute Resolution
- **US-A-010**: As a support agent, I want to see disputed tasks in a queue, so that I can resolve conflicts efficiently.
- **US-A-011**: As a support agent, I want to review task details, messages, and evidence, so that I can make fair decisions.
- **US-A-012**: As a support agent, I want to issue partial or full refunds, so that I can resolve payment disputes.
- **US-A-013**: As a support agent, I want to release or hold payments based on dispute resolution, so that funds are handled correctly.

#### Trust & Safety Operations
- **US-A-014**: As a trust & safety agent, I want to review flagged incidents, so that I can investigate safety concerns.
- **US-A-015**: As a trust & safety agent, I want to escalate serious incidents, so that appropriate action is taken.
- **US-A-016**: As a trust & safety agent, I want to see fraud detection alerts, so that I can prevent abuse.
- **US-A-017**: As a trust & safety agent, I want to review GPS location mismatches, so that I can detect off-platform payments.

#### Analytics & Reporting
- **US-A-018**: As an operations manager, I want to see marketplace metrics (GMV, task volume, fill rates), so that I can track business performance.
- **US-A-019**: As an operations manager, I want to see city-level performance, so that I can optimize by location.
- **US-A-020**: As an operations manager, I want to see tasker and client retention metrics, so that I can improve engagement.

---

### 4.4 System-Level User Stories

#### Matching & Ranking
- **US-S-001**: As the system, I want to match tasks with taskers based on location, skills, and availability, so that tasks get filled quickly.
- **US-S-002**: As the system, I want to rank taskers using distance, ratings, acceptance rate, and price, so that clients see the best matches first.
- **US-S-003**: As the system, I want to apply exposure caps to prevent tasker overload, so that work is distributed fairly.
- **US-S-004**: As the system, I want to boost new taskers in rankings, so that they can get their first tasks and build reputation.
- **US-S-005**: As the system, I want to adjust rankings based on real-time availability, so that only available taskers are shown.

#### Pricing
- **US-S-006**: As the system, I want to calculate task pricing based on category, duration, and complexity, so that pricing is fair and predictable.
- **US-S-007**: As the system, I want to apply dynamic pricing based on supply and demand, so that marketplace liquidity is maintained.
- **US-S-008**: As the system, I want to include platform service fees in pricing, so that the business model is sustainable.
- **US-S-009**: As the system, I want to provide pricing guidance to new taskers, so that they set competitive rates.

#### Payments & Financial Flows
- **US-S-010**: As the system, I want to pre-authorize client payments when tasks are accepted, so that funds are secured.
- **US-S-011**: As the system, I want to hold payments in escrow until task completion, so that both parties are protected.
- **US-S-012**: As the system, I want to process payouts to taskers on a scheduled basis (T+X days), so that cash flow is managed.
- **US-S-013**: As the system, I want to support multiple payment methods (cash, cards, mobile wallets), so that users have flexibility.
- **US-S-014**: As the system, I want to maintain a double-entry ledger, so that all financial transactions are accurately recorded.

#### Notifications & Communication
- **US-S-015**: As the system, I want to send push notifications for task updates, so that users stay informed.
- **US-S-016**: As the system, I want to send SMS fallback notifications, so that users without app access are notified.
- **US-S-017**: As the system, I want to enable real-time messaging between clients and taskers, so that they can coordinate effectively.

#### Trust & Safety Automation
- **US-S-018**: As the system, I want to detect potential fraud patterns (off-platform payments, review manipulation), so that the platform remains trustworthy.
- **US-S-019**: As the system, I want to automatically flag suspicious behavior, so that human reviewers can investigate.
- **US-S-020**: As the system, I want to de-rank taskers with poor performance, so that quality is maintained.

---

## 5. Task Taxonomy & Structure

Each task is defined by:
- Category and sub-category
- Required skills
- Tool and equipment requirements
- Estimated duration
- Pricing model (hourly or fixed)
- Risk class

### Structured Task Inputs
- Number of items
- Floor level and elevator access
- Parking constraints
- Heavy lifting flag
- Pets on site

These inputs inform pricing guidance, ranking, insurance eligibility, and dispute handling.

---

## 6. End-to-End Task Lifecycle

### State Machine
- Draft
- Posted
- Matching
- Offered
- Accepted
- Confirmed
- In progress
- Completed
- Reviewed

### Failure & Exception States
- Expired
- Client cancellation
- Tasker cancellation
- Disputed
- Refunded (partial or full)

---

## 7. Matching, Ranking & Machine Learning

### Matching Pipeline

**Step 1 – Hard Filters**
- Location radius
- Availability
- Skill match
- Verification and background check status

**Step 2 – Ranking Model**
- Distance decay
- Acceptance probability
- Completion probability
- Ratings (Bayesian adjusted)
- Price competitiveness
- Recent activity boost

**Step 3 – Marketplace Controls**
- Exposure caps
- New Tasker boosts
- Diversity constraints
- Anti-gaming heuristics

### Cold Start Mitigation
- Initial pricing caps
- Manual review
- Limited instant booking
- Early task incentives

---

## 8. Pricing System

### Pricing Inputs
- Historical task duration
- Task complexity
- Regional supply/demand
- Time-of-day and seasonality

### Client Pricing
- Tasker base rate
- Platform service fee (dynamic)
- Optional tips

### Tasker Controls
- Per-category rates
- Minimum hours
- Travel fees (region dependent)

---

## 9. Payments, Billing & Financial Flows

### Payment Flow
1. Client payment method pre-authorized
2. Task completed
3. Tasker submits hours
4. Client review window
5. Payment captured
6. Tasker payout (T+X days)

### Edge Cases
- Disputed hours
- No-shows
- Partial completion
- Damage claims

### Compliance
- Tax reporting
- Regional withholding rules

---

## 10. Trust, Safety & Risk Management

### Safety Systems
- Identity verification
- Criminal background checks
- Periodic re-checks

### Insurance
- Tasker liability insurance
- Property damage coverage
- Clearly defined exclusions

### Fraud Detection
- Off-platform payment detection
- Review manipulation
- Multi-account abuse
- GPS and location mismatch

---

## 11. Reputation & Review System

### Review Model
- 5-star rating
- Task-specific tags
- Free-text feedback
- Private feedback channel

### Reputation Weighting
- Recent tasks weighted higher
- Task complexity adjusted
- Outlier suppression

### Enforcement Actions
- De-ranking
- Category suspension
- Account termination

---

## 12. Platform Architecture

### Client Platforms
- iOS
- Android
- Web

### Core Backend Services
- Authentication & Identity
- Task Orchestration
- Matching Engine
- Pricing Engine
- Messaging Service
- Payment Ledger
- Reviews & Reputation
- Trust & Safety
- Analytics

### Data Infrastructure
- OLTP databases for core entities
- OLAP systems for reporting
- Event streaming for lifecycle tracking
- Feature stores for ML models

---

## 13. API Surface (Illustrative)

### Partner APIs
- Create task (single or bulk)
- Pricing estimates
- Availability lookup
- Task status webhooks

### Internal APIs
- MatchCandidates
- ScoreTasker
- ReleasePayment

---

## 14. Observability & Operations

### Monitoring
- Task fill rate
- Time-to-accept
- Payment success rate
- Messaging latency

### Incident Playbooks
- Payment outages
- Matching degradation
- Safety escalations

---

## 15. Business Model Overview

### Business Type
Two-sided on-demand services marketplace

### Value Exchange
- Clients pay for convenience and trust
- Taskers earn flexible income
- Platform monetizes transactions and partnerships

---

## 16. Revenue Streams

### Core Marketplace Revenue
- Client-paid service fee (typically 15–30% of GMV)

### Partner & Enterprise Revenue
- Retail integrations
- Property management contracts
- White-labeled booking

### Ancillary Revenue
- Featured Tasker placements
- Subscriptions (future)
- Insurance upsells
- Training and certification programs

---

## 17. Cost Structure

### Variable Costs
- Payment processing
- Insurance
- Background checks
- Customer support
- Fraud operations

### Fixed Costs
- Engineering and product
- Trust and safety operations
- Legal and compliance
- Sales and partnerships
- General and administrative

---


## 18. Regulatory & Legal Considerations

- Independent contractor classification
- Regional labor law compliance
- Insurance exclusions
- Data privacy (GDPR, CCPA)

---

## 19. Risks & Mitigations

- Labor reclassification risk
- Supply churn
- Quality variance
- Disintermediation
- Competition from large platforms

Mitigated through density, trust systems, and enterprise partnerships.

---

## 20. Long-Term Strategy & Vision

- Expansion into B2B recurring labor
- Subscription households
- AI-assisted task scoping
- Embedded labor APIs
- Human + automation hybrid workflows

---

## 21. Conclusion

KHIDMA's model succeeds through an asset-light structure, strong local network effects, diversified revenue streams, and deep operational playbooks. Its long-term defensibility is rooted in marketplace density, trust infrastructure, and embedded enterprise integrations.

---

