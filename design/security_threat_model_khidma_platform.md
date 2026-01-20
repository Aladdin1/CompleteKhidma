# Security & Threat Model – KHIDMA Platform

## 1. Overview

This document defines a **security posture** and **threat model** for KHIDMA marketplace platform. It covers:
- Assets and trust boundaries
- Threats using STRIDE categories
- Abuse/fraud scenarios typical for marketplaces
- Required controls (prevent, detect, respond)
- Egypt-specific considerations (cash, low trust, SIM swap)

---

## 2. Security Goals

### 2.1 Primary Goals
1. Protect user accounts from takeover
2. Protect PII (phone, ID metadata, addresses)
3. Protect payment flows and ledger integrity
4. Prevent marketplace fraud and abuse
5. Maintain auditability for disputes and safety incidents

### 2.2 Non-Goals
- Perfect prevention of offline scams (aim to reduce and detect)
- Eliminating all disintermediation (aim to minimize)

---

## 3. System Assets

### 3.1 High-Value Assets
- Authentication secrets/tokens (JWTs, refresh tokens)
- PII: phone numbers, addresses, national ID metadata
- Payment data: wallet references, card tokens (never store PAN)
- Ledger integrity: immutable accounting records
- Reputation system: reviews, ratings, badges
- Messaging content (including voice notes, images)
- Admin tooling access and audit logs

### 3.2 Attackers & Motivations
- Fraudsters: steal money (refund fraud, payout fraud)
- Scammers: off-platform payments, fake identities
- Account thieves: SIM swap, credential stuffing
- Malicious insiders: data access, privilege abuse
- Competitive abuse: review bombing, false reports

---

## 4. Trust Boundaries & Data Flows

### 4.1 Boundaries
- Mobile devices ↔ API Gateway
- API Gateway ↔ Backend services
- Backend ↔ External providers (SMS, wallets, maps, storage)
- Ops/Admin dashboard ↔ Admin service
- Event stream ↔ analytics warehouse

### 4.2 Key Flows
- OTP login and token issuance
- Task creation and location sharing
- Matching and Tasker notifications
- Booking and chat creation
- Payment authorization/cash confirmation and ledger posting
- Reviews and reputation updates
- Disputes, refunds, and admin interventions

---

## 5. Threat Modeling (STRIDE)

### 5.1 Spoofing (Identity)

**Threats**
- SIM swap to receive OTP
- Fake IDs or stolen national IDs
- Device spoofing (emulator farms)

**Controls**
- OTP rate limiting and anomaly detection
- Device binding + risk scoring (new device challenges)
- Optional step-up verification for payouts (KYC)
- Store and compare device fingerprints
- Detect SIM swap signals (telco/3rd-party if available)

---

### 5.2 Tampering (Data Integrity)

**Threats**
- Manipulating booking status changes
- Forging payment capture confirmations (cash)
- Altering ledger records

**Controls**
- Strict state machine validation (allowed transitions only)
- Role-based authorization on every transition
- Signed server-side receipts for cash confirmation
- Immutable ledger entries + append-only policy
- Database constraints + audit trail
- Admin actions require reason codes + dual control for high-risk actions

---

### 5.3 Repudiation (Non-repudiation)

**Threats**
- “I never accepted the booking.”
- “I never confirmed cash payment.”
- “Support changed my payout.”

**Controls**
- Audit logs for every critical event (actor, IP, device, timestamp)
- Booking/task state event tables
- Message retention with integrity (hashing optional)
- Ops tools require ticket references

---

### 5.4 Information Disclosure (Privacy)

**Threats**
- Leaking phone numbers and addresses
- Exposing national ID metadata
- Admin dashboard data exfiltration
- Public URLs for private media

**Controls**
- Encrypt PII at rest (field-level encryption for ID-related data)
- Mask phone numbers until booking confirmed (where feasible)
- Private media URLs with short-lived signed URLs
- Least privilege IAM for ops and engineers
- Secrets management (KMS/Vault)
- Logging redaction (no tokens/PII)

---

### 5.5 Denial of Service (Availability)

**Threats**
- OTP request flooding
- Search/matching endpoint abuse
- WebSocket chat floods

**Controls**
- WAF + rate limits per IP/phone/device
- Challenge/lockouts for suspicious patterns
- Queue-based matching (backpressure)
- Separate chat infrastructure + quotas
- Circuit breakers for external providers

---

### 5.6 Elevation of Privilege

**Threats**
- Client acting as Tasker
- Tasker accessing other clients’ tasks
- Ops privilege escalation

**Controls**
- Strong RBAC and policy engine
- Resource-level authorization (owner checks)
- Separate admin domain + SSO + MFA
- Just-in-time admin access, session recording
- Periodic access reviews

---

## 6. Marketplace-Specific Abuse & Fraud Scenarios

### 6.1 Off-Platform Payment (Disintermediation)
**Threat:** Users exchange phone numbers in chat and pay cash to bypass fees.

**Mitigations**
- In-chat phone/email detection + warnings
- Incentives: platform guarantees, dispute support, damage coverage
- Partial masking of contact info
- Account penalties for repeated violations

### 6.2 Refund Fraud
**Threat:** Client claims task not done; seeks refund after completion.

**Mitigations**
- Photo/geo/time proof at completion
- Two-sided completion confirmation
- Dispute queues and evidence collection
- Reputation-weighted dispute resolution

### 6.3 Payout Fraud
**Threat:** Tasker creates fake bookings to collect payouts.

**Mitigations**
- Require client payment authorization before job starts
- KYC thresholds for payouts
- Velocity limits (new Taskers)
- Graph-based fraud detection on accounts/devices

### 6.4 Review Manipulation
**Threat:** Fake reviews, review bombing, coercion.

**Mitigations**
- Only verified bookings can review
- Abuse detection on review patterns
- Optional private feedback channel
- Penalties for coercion reports

### 6.5 Safety Incidents
**Threat:** Harassment, theft, violence.

**Mitigations**
- Safety reporting with escalation SLAs
- Emergency contacts and “panic” feature (later)
- Task category risk tiers and stricter verification
- Ops runbooks + local law liaison plan

---

## 7. Security Controls by Layer

### 7.1 Client Apps
- Secure token storage (Keychain/Keystore)
- Certificate pinning (optional, risk-based)
- Root/jailbreak detection (best-effort)

### 7.2 API Gateway
- JWT validation
- Schema validation
- Rate limiting
- Bot detection and WAF rules

### 7.3 Backend
- RBAC policy checks at service boundaries
- Idempotency enforcement on money-moving endpoints
- Input validation + output encoding
- Anti-CSRF for web (if cookies used)

### 7.4 Data Layer
- Encryption at rest (disk + selective field encryption)
- Backups encrypted and access-controlled
- Row-level security for admin reads (optional)

### 7.5 Admin/Ops
- MFA mandatory
- Role separation (support vs finance vs safety)
- High-risk actions require approvals (two-person rule)
- Full audit logging + alerts

---

## 8. Logging, Monitoring, and Alerting

### 8.1 Security Telemetry
- Auth anomalies (new device, impossible travel, OTP retries)
- Payment anomalies (refund spikes, payout velocity)
- Abuse signals (chat phone leakage, report spikes)

### 8.2 Alerts
- Ledger imbalance (sum(lines) != 0)
- Suspicious admin activity
- Spikes in OTP requests by region

---

## 9. Incident Response (IR)

### 9.1 Severity Levels
- SEV0: funds at risk / major data breach
- SEV1: account takeover wave
- SEV2: localized abuse spike

### 9.2 Playbooks
- Compromised admin account
- Wallet provider outage
- Refund fraud campaign
- Safety incident escalation

---

## 10. Egypt-Specific Risk Notes

- **SIM swap risk** is higher → stronger device binding, step-up checks
- **Cash disputes** are common → cash receipts + ops verification
- **Low trust** → emphasize platform guarantees and clear receipts
- **Regulatory ambiguity** → be conservative in data retention for ID fields

---

## 11. Security Requirements Checklist (Build-Blocking)

- [ ] RBAC + resource ownership checks
- [ ] Rate limits for OTP, matching, messaging
- [ ] Idempotency keys on money endpoints
- [ ] Immutable ledger + audit events
- [ ] Encrypted PII fields + signed media URLs
- [ ] Admin MFA + audit logs + approval workflow
- [ ] Fraud telemetry and basic rules engine

---

## 12. Summary

KHIDMA marketplace platform is primarily threatened by **account takeover, payment/ledger abuse, off-platform leakage, and operational safety incidents**. This threat model prioritizes strong identity controls, immutable financial records, privacy-by-design data handling, and well-instrumented ops tooling—especially critical for cash-heavy markets like Egypt.

