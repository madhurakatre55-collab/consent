# Consent (Consent Pay)
### PayPal-Native Shared Spending Mandates for Autonomous AI Agents

> **Built for the PayPal AI Hackathon**  
> A shared spending firewall for households, flatmates, small teams, and care circles — where AI agents can research and propose purchases, but PayPal money moves **only** after group consensus and verified release conditions.

---

## 1. Project Summary

Autonomous AI agents are increasingly tasked with buying goods, booking travel, and provisioning supplies. However, existing AI budget tools are built for single users granting individual agents fixed spending allowances. In real life, spending is often collaborative: roommates split groceries, families manage collective funds, and teams govern shared budgets.

**Consent** introduces **Spending Circles**: shared, multi-human spending mandates for AI agents. Rather than one user setting rules for one bot, a group defines a collaborative mandate. AI agents can negotiate and propose purchases, but cannot move money directly. Every transaction is governed by a **deterministic Policy Engine**, evaluated by **k-of-n multi-party consensus**, held under **PayPal Sandbox Authorization**, and released only when **verifiable conditions** (price drop, inventory stock, milestone date) are satisfied.

Every decision produces an exportable, tamper-evident **Consent Receipt** chained with SHA-256 hashes.

---

## 2. Key Differentiators & Advanced Features

| Traditional AI Spending Wallets | Consent (Group Mandate) |
|---|---|
| Single user granting single agent budget | Shared Spending Circle with roles (Owner, Member, Guardian, Observer) |
| Binary prompt check or static spending limit | Deterministic Policy Engine with k-of-n quorum & unanimous consensus |
| Direct immediate capture on approval | Conditional Release: `intent=AUTHORIZE` held until real conditions met |
| Passive agent proposes, human accepts | Agent Negotiation Room: LLM negotiates counteroffers bounded by mandate ceiling |
| Basic log or unverified text | Tamper-evident Consent Receipt with sequential cryptographic SHA-256 hash chain |
| Generic single bot | Specialized Agent Roster (Groceries, Utilities, Tech, Travel) with individual limits & revoke toggles |
| Waiting on external triggers | Live Condition Simulator: one-click price drop feeds, stock restock, and fast-forward cooling off |
| Static budget text | Real-Time Budget Analytics: visual gauges, percent utilization, and category distribution |
| Presets only | Natural Language Purchase Proposer: tell the agent to buy anything; bounded strictly by policy |
| Unverified security claim | Cryptographic Chain Inspector & Tamper Simulator: proves tamper detection in real-time |

---

## 3. Architecture & Safety Invariants

```
               +-------------------------------------------------+
               |              Autonomous AI Agent                |
               | (Researches deals, negotiates within cap)       |
               +-----------------------+-------------------------+
                                       |
                             [Proposes Purchase]
                                       |
                                       v
               +-------------------------------------------------+
               |          Deterministic Policy Engine            |
               | (Pure TypeScript functions, Zod-validated)       |
               +-----------------------+-------------------------+
                                       |
               +-----------------------+-------------------------+
               |                       |                         |
               v                       v                         v
        [Block Rule]         [Auto-Approve Rule]          [Threshold Exceeded]
      (Merchant/Category)   (<= ₹1,500 threshold)         (> ₹1,500 or Guardian)
               |                       |                         |
               v                       v                         v
          [BLOCKED]             [Engine Approved]         [Consent Queue]
                                       |                         |
                                       |                 [k-of-n Approvals]
                                       |               (Human consensus only)
                                       +------------+------------+
                                                    |
                                                    v
                                  +------------------------------------+
                                  |      PayPal Sandbox Client         |
                                  |     (Orders v2 intent=AUTHORIZE)   |
                                  +-----------------+------------------+
                                                    |
                                             [Status: HELD]
                                                    |
                                    +---------------+---------------+
                                    |                               |
                              [Condition Met]             [Cancelled/Expired]
                                    |                               |
                                    v                               v
                              [CAPTURE AUTH]                   [VOID AUTH]
                                    |                               |
                                    v                               v
                               [CAPTURED]                        [VOIDED]
                                    |                               |
                                    +---------------+---------------+
                                                    |
                                                    v
                                  +------------------------------------+
                                  |     Tamper-Evident Ledger          |
                                  |  SHA-256 Chained Consent Receipts  |
                                  +------------------------------------+
```

### Safety Invariants
1. **The LLM never has spending authority**: The model may research, propose, negotiate within policy, explain, and answer questions. The model can never authorize, capture, void, or bypass policy.
2. **Deterministic Evaluation**: Every money-moving path passes through the pure-function Policy Engine (`server/src/policy/engine.ts`).
3. **Multi-Party Consensus**: When a proposal exceeds the auto-approve threshold or touches sensitive categories, it enters the consent queue requiring k-of-n approval. Observers have read-only access and cannot vote.
4. **Conditional Release**: Authorizations are held in PayPal sandbox and released only when cooling-off expires and conditions are met.

---

## 4. Setup & Running Locally

### Prerequisites
- Node.js v18+ or v20+
- npm v9+

### Quick Start (Zero Config Demo Mode)
Consent comes with deterministic mock modes and a pre-seeded dataset so judges can run and test everything offline without needing PayPal or LLM API keys:

```bash
# 1. Clone or open the repository
cd "Mandate Pay"

# 2. Install dependencies
cd server && npm install
cd ../web && npm install
cd ..

# 3. Seed database with standard hackathon demo scenarios
npm run seed

# 4. Start the application
# Terminal 1: Backend Server (runs on http://localhost:4000)
npm run dev:server

# Terminal 2: Web Frontend (runs on http://localhost:3000)
npm run dev:web
```

Open your browser to **http://localhost:3000**.

---

### Docker & Cloud Deployment (Hackathon Ready)

Consent is fully packaged for one-command container deployment or production hosting on Render, Railway, or Fly.io:

#### Run via Docker Compose:
```bash
docker compose up --build
```
This builds both the frontend and backend, seeds the SQLite database, and serves the entire full-stack application on `http://localhost:4000`.

#### Production Build & Run (Single Process):
```bash
# Builds React frontend to web/dist and compiles TypeScript backend to server/dist
npm run build

# Seed database and start unified server
npm run seed
npm run start
```
The Express server automatically detects `web/dist` and serves both the API endpoints and the React single-page app from `http://localhost:4000`.

---

## 5. Connecting PayPal Developer Sandbox

Consent connects directly to the **PayPal REST APIs (Orders v2 & Payments v2)**:

### How to get Sandbox Credentials:
1. Log in to the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/).
2. Navigate to **Apps & Credentials** > **Sandbox**.
3. Create a sandbox REST App or click your default application.
4. Copy your **Client ID** and **Secret**.

### Configure in `.env`:
Edit `.env` in the project root:

```env
PAYPAL_CLIENT_ID=your_sandbox_client_id_here
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret_here
PAYPAL_ENV=sandbox
DEMO_MODE=true
```

### Verified Sandbox Endpoints Used in `server/src/paypal/client.ts`:
- **OAuth 2.0 Token**: `POST https://api-m.sandbox.paypal.com/v1/oauth2/token`
- **Orders v2 Creation**: `POST https://api-m.sandbox.paypal.com/v2/checkout/orders` with `intent: "AUTHORIZE"`
- **Orders v2 Authorize**: `POST https://api-m.sandbox.paypal.com/v2/checkout/orders/{id}/authorize`
- **Payments Capture**: `POST https://api-m.sandbox.paypal.com/v2/payments/authorizations/{authorization_id}/capture`
- **Payments Void**: `POST https://api-m.sandbox.paypal.com/v2/payments/authorizations/{authorization_id}/void`

> **Note on Sandbox Fallback**: When `PAYPAL_CLIENT_ID` is left empty, Consent operates in simulated sandbox mode returning structured sandbox IDs (`ORD-SANDBOX-xxx`, `AUTH-SANDBOX-xxx`), allowing judges to inspect the full workflow instantly. When sandbox credentials are provided, live HTTP requests are dispatched to `api-m.sandbox.paypal.com`.

---

## 6. How the 5 Core Features Work

### Feature 1: Spending Circles & Mandate Compiler
- A circle has members with distinct roles:
  - **Owner**: Creates, compiles, and activates the circle mandate.
  - **Member**: Can propose purchases and vote towards quorum.
  - **Guardian**: Mandatory approver for high-risk categories (e.g., Electronics, Travel, Medical).
  - **Observer**: Read-only ledger audit access; cannot vote or propose.
- Users write policy in plain English. The AI compiles this into a typed Zod schema (`MandateSchema`).
- **Human Confirmation**: The user must explicitly inspect the compiled policy and click "Confirm and Activate" before it goes live.

### Feature 2: Consent Queue & k-of-n Approval
- Proposals exceeding the auto-approve threshold (e.g. ₹1,500) enter the consent queue.
- Members vote via the Persona Switcher in the top bar.
- Shows live progress (e.g., "1 of 2 approvals received").
- When consensus is satisfied, the system creates the PayPal Sandbox Authorization. If a required member rejects, the proposal is blocked.

### Feature 3: Conditional PayPal Release
- PayPal Order is created with `intent: "AUTHORIZE"` and stored as `held`.
- A background worker (`releaseJob.ts`) polls every 30 seconds (or on-demand via the "Check Release Conditions" button).
- Conditions evaluated:
  - `manual_approval`: Member clicks "Release & Capture".
  - `price_target`: Price drops to target threshold.
  - `stock_available`: Stock feed confirms availability.
  - `delivery_date`: Milestone date is reached.
- Once the cooling-off period (1 min in Demo Mode) passes and the condition is satisfied, the authorization is captured. If the deadline passes or a member cancels, the authorization is voided.

### Feature 4: Agent Negotiation Room
- When an item exceeds policy threshold but is within acceptable limits, the agent enters negotiation.
- The agent proposes structured counteroffers. The mock merchant endpoint accepts, rejects, or counters.
- **Safety Boundary**: The agent offer can never exceed the mandate limit. Only after mutual agreement does the Policy Engine evaluate the final price.

### Feature 5: Consent Receipt & Grounded Ledger Q&A
- Every decision is recorded with a cryptographic hash chain:
  $$\text{receipt\_hash} = \text{SHA256}(\text{previous\_receipt\_hash} + \text{canonical\_receipt\_json})$$
- Users can view and download tamper-evident Consent Receipts detailing matched clauses, votes, and PayPal references.
- **Ask the Ledger**: An AI assistant answers questions strictly using historical ledger logs, acknowledging when data is not recorded.

---

## 7. AI Tools Used & Safety Boundaries

| Tool | Usage in Consent | Safety Boundary / Guardrail |
|---|---|---|
| **Mandate Compiler** | Translates natural language into typed policy JSON | Validated against Zod schema; requires human confirmation to activate |
| **Agent Negotiator** | Simulates conversational bargaining within budget limits | Hard-capped at mandate ceiling; cannot authorize payments |
| **Ledger Q&A Assistant** | Explains transaction history and approvals | Grounded strictly in ledger data; no external action permissions |

---

## 8. What is Real vs. Simulated

- **Real & Deterministic**:
  - Pure TypeScript Policy Engine and Zod validation
  - k-of-n quorum and Guardian voting mechanics
  - Cooling-off period countdown timers
  - Cryptographic SHA-256 hash chaining on all transactions
  - SQLite database persistence with `@libsql/client`
  - Real PayPal Sandbox API client (`intent: "AUTHORIZE"`, capture, void) when credentials are provided
- **Simulated for Demo Reliability**:
  - In `LLM_PROVIDER=mock`, mandate compiler and negotiation turns return deterministic responses so judges can test offline without API keys.
  - In `DEMO_MODE=true`, cooling-off defaults to 1 minute (instead of 24 hours) for quick evaluation.
  - When PayPal credentials are empty, client generates realistic sandbox payloads (`ORD-SANDBOX-xxx`, `AUTH-SANDBOX-xxx`) to ensure seamless evaluation.

---

## 9. Verification & Testing

Consent includes a complete test suite in Vitest verifying all engine branches, quorum math, conditional release timers, cryptographic hash integrity, and security invariants:

```bash
cd server
# Run pure deterministic unit tests (30 tests)
npm test

# Run HTTP integration and security parameter tests (12 tests)
npm run test:e2e

# Run all test suites combined (42 tests)
npm run test:all
```

### Tests Covered (42 tests passing):
- Exact auto-approve threshold boundaries (<= limit auto-approves; > limit requires quorum)
- Exact monthly budget ceiling enforcement (prevents any budget overruns)
- Price deviation vs. historical median calculations (prevents price surging)
- Quorum (k-of-n) reaching consensus and failing
- Unanimous consent with single-member rejection
- Guardian requirement overrides for sensitive categories (Electronics, Travel, Medical)
- Verification that LLM cannot bypass consent or authorize PayPal
- Tamper-evident SHA-256 hash chaining verification with canonical JSON serialization
- Simulated tamper attack detection in the ledger
- Cooling-off countdown and deadline expiration logic
- Observer role permission checks (`403 Forbidden` on voting attempts)
- Non-member security boundary (`403 Forbidden` on outsider voting attempts)
- Strict Zod schema rejection on invalid or corrupted policy configurations (`422 Unprocessable Entity`)
- Automated security headers enforcement (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection: 1; mode=block`)

---

## 10. Security Parameters & Production Hardening Audit

Consent is architected with defense-in-depth across the entire stack:

| Security Parameter | Implementation Details | Status |
|---|---|---|
| **Zero-Privilege LLM Boundary** | LLM can propose, negotiate, and answer questions, but **never** has payment, capture, or authorization authority. | Verified |
| **Deterministic Policy Firewall** | All proposals pass through pure TypeScript functions in `policy/engine.ts` with 10 strict sequential checks. | Verified |
| **Role-Based Consent RBAC** | Strict role separation: Owner, Member, Guardian (mandatory approver), and Observer (read-only audit). Observers cannot approve. | Verified (403 enforced) |
| **Tamper-Evident Hash Chain** | SHA-256 sequential hash chaining linking each receipt with its predecessor via canonical key-sorted JSON. | Verified |
| **PayPal Authorize Separation** | Orders v2 created with `intent: "AUTHORIZE"`. Money does not move until verified release conditions pass. | Verified |
| **HTTP Security Headers** | `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`. | Verified |
| **DoS Body Limits** | Strict `1mb` body parser limit preventing memory exhaustion. | Enforced |
| **Secret Sanitization** | `.env` excluded in `.gitignore`. Secrets never returned in API payloads or client bundles. | Verified |

---

## License
MIT License. See [LICENSE](LICENSE) for details.
