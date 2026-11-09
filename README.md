<div align="center">

# 💎 CONSENT

### The Multi-Party Shared Spending Firewall for Autonomous AI Agents

**Built for the PayPal AI Hackathon 2026**

[![Tests](https://img.shields.io/badge/tests-42%2F42%20passing-success?style=for-the-badge&logo=vitest&logoColor=white)](https://github.com/madhurakatre55-collab/consent)
[![PayPal](https://img.shields.io/badge/PayPal-Sandbox%20Orders%20v2-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://developer.paypal.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20100%25-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/React%2018-Vite%20%2B%20Tailwind-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![License](https://img.shields.io/badge/License-MIT-gold?style=for-the-badge)](LICENSE)

<br/>

> **"Autonomous AI agents can research, propose, and negotiate purchases — but PayPal money moves ONLY when group consensus and verified release conditions are cryptographically satisfied."**

<br/>

[🌟 Key Innovations](#-key-innovations) • [⚡ 60-Second Quickstart](#-60-second-quickstart) • [🏛️ System Architecture](#️-system-architecture) • [🧪 Judges 2-Minute Demo](#-judges-2-minute-walkthrough) • [💳 PayPal Integration](#-paypal-sandbox-integration) • [🛡️ Security Audit](#️-security-invariants--audit)

---

</div>
 Deployed Link: https://consent-1-m983.onrender.com/
<br/>

## 📌 Executive Summary

Autonomous AI agents are rapidly evolving from chatbots into autonomous economic actors — booking flights, buying supplies, and paying cloud bills. However, every modern AI financial tool suffers from a critical flaw: **they are designed for a single user handing a credit card to an isolated bot**.

In reality, **financial decisions are collaborative**:
* 🏠 **Flatmates & Roommates** pooling grocery, wifi, and maintenance budgets.
* 👨‍👩‍👧 **Families & Care Circles** managing shared living expenses and elderly care.
* 🚀 **Startup Co-Founders & Small Teams** governing team SaaS subscriptions and API credits.

**Consent** introduces **Spending Circles**: multi-party, multi-human shared spending mandates for AI agents. Rather than one user blindly setting a prompt ceiling, a group defines a formal mandate. Agents can autonomously bargain and draft purchase proposals, but **have zero direct access to funds**. 

Every transaction is governed by a **deterministic Policy Engine**, evaluated through **k-of-n multi-party consensus**, pre-authorized under **PayPal Orders v2 (`intent=AUTHORIZE`)**, and captured only after **verifiable real-world triggers** (price drops, stock restock, or cooling-off milestones) are fulfilled.

Every decision produces an exportable, tamper-evident **Consent Receipt** chained with **SHA-256 cryptographic hashes**.

---

## 🌟 Key Innovations

| Feature | Traditional AI Spending Tools | **Consent (Shared Spending Mandate)** |
|---|---|---|
| **Governance Model** | 1 User $\to$ 1 Agent allowance | **Multi-Human Spending Circle** (Owner, Member, Guardian, Observer) |
| **Policy Validation** | Loose prompt checks or static limit | **Deterministic Engine** with pure TypeScript functions & Zod validation |
| **Approval Flow** | Single human click | **$k$-of-$n$ Quorum Consensus** + Guardian veto on sensitive categories |
| **Payment Execution** | Immediate, irreversible capture | **PayPal Sandbox Conditional Hold (`intent=AUTHORIZE`)** until release conditions trigger |
| **Agent Autonomy** | Passive bot proposes, user accepts | **Autonomous Negotiation Room**: Agent bargains counteroffers bounded by mandate ceiling |
| **Auditability** | Ephemeral chat logs | **Tamper-Evident Ledger**: Cryptographic SHA-256 chained receipts with live tamper detector |
| **Live Simulation** | Static paper prototype | **Interactive Live Feeds**: One-click price drops, inventory restocks, and time-travel controls |
| **User Experience** | Cluttered developer dashboards | **Bespoke Dark Obsidian & Champagne Gold** luxury fintech interface |

---

## 🏛️ System Architecture

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
                                  |    (Pure TypeScript, Zero-Privilege Sandbox)    |
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

### Core Safety Invariants
1. 🔒 **Zero-Privilege LLM Boundary**: The AI agent has **zero authority** to execute payments. It can analyze, propose, bargain, and explain — but the execution bridge requires programmatic policy clearance and human multi-sig signatures.
2. ⚡ **Deterministic Policy Engine**: 100% pure TypeScript functions (`server/src/policy/engine.ts`). No stochastic hallucination risks in the authorization path.
3. 👥 **Role-Based Access Control (RBAC)**:
   - **Owner**: Compiles and activates circle mandates.
   - **Member**: Proposes purchases and votes toward quorum.
   - **Guardian**: Mandatory approver for high-risk categories (Electronics, Travel, Medical).
   - **Observer**: Read-only ledger audit access; strictly barred from voting (enforces `403 Forbidden`).
4. ⏳ **PayPal Hold & Release**: Funds are reserved under `intent: "AUTHORIZE"` during cooling-off, ensuring capital protection before capture.

---

## ⚡ 60-Second Quickstart

### Prerequisites
- **Node.js** v18+ or v20+
- **npm** v9+

### 1. Clone & Install
```bash
git clone https://github.com/madhurakatre55-collab/consent.git
cd consent

# Install root, backend, and frontend dependencies
cd server && npm install
cd ../web && npm install
cd ..
```

### 2. Seed Demo Data & Launch
Consent includes a pre-seeded SQLite database with 4 realistic group scenarios ready for immediate evaluation:

```bash
# Seed standard hackathon scenarios
npm run seed

# Run Backend Server (http://localhost:4000)
npm run dev:server

# In a second terminal, run Frontend (http://localhost:3000)
npm run dev:web
```

👉 **Open your browser to [http://localhost:3000](http://localhost:3000)**

*(Note: Zero configuration required! The app ships with zero-config mock fallbacks for PayPal Sandbox and LLMs so judges can test immediately without setting up external API keys).*

---

## 🧪 Judges' 2-Minute Walkthrough

Experience the core user journeys in 5 simple clicks:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  STEP 1: The AI Proposes a Purchase (Auto-Approve Under Threshold)               │
│  • Navigate to Dashboard.                                                        │
│  • Click "Scenario A: Auto-Approve" in the Hero Card.                            │
│  • Agent proposes ₹450 Grocery restock (Under ₹1,500 limit).                     │
│  • Result: Engine approves instantly → PayPal Authorization created.             │
└──────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  STEP 2: Large Purchase Triggers Multi-Party Quorum (k-of-n)                     │
│  • Click "Scenario B: Needs Quorum".                                             │
│  • Agent proposes ₹4,200 Wifi Mesh upgrade (> ₹1,500 limit).                     │
│  • Status changes to `NEEDS_APPROVAL` in the Consent Queue.                      │
│  • Use the top-right Persona Switcher to switch between Alice and Bob:           │
│    - Alice approves → "1 of 2 approvals received".                               │
│    - Bob approves → Quorum reached (2/2) → PayPal Authorization held!            │
└──────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  STEP 3: Sensitive Category Enforces Guardian Veto                              │
│  • Click "Scenario C: Blocked / Guardian Veto".                                  │
│  • Agent attempts an unauthorized Electronics or Gambling purchase.              │
│  • Result: Blocked immediately by deterministic rule engine before touching funds│
└──────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  STEP 4: Test the Live Condition Simulator                                      │
│  • Go to Consent Queue → Click on any HELD proposal.                             │
│  • Use the Conditions Simulator widget to simulate a Price Drop or Stock Restock │
│  • Click "Check Release Conditions" → Watch status transition:                   │
│    HELD ───────────────► CAPTURED via PayPal Payments v2                         │
└──────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  STEP 5: Cryptographic Ledger & Tamper Detection                                 │
│  • Navigate to Ledger. View the SHA-256 hash-chained Consent Receipts.           │
│  • Open the Tamper Inspector. Click "Simulate Malicious Payload Tamper".         │
│  • System instantly detects hash collision mismatch and flags the breach!        │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 💳 PayPal Sandbox Integration

Consent natively leverages **PayPal REST APIs (Orders v2 & Payments v2)** to implement conditional authorized holds.

### Endpoints Implemented in `server/src/paypal/client.ts`:

| Flow | PayPal REST Endpoint | Purpose in Consent |
|---|---|---|
| **Auth** | `POST /v1/oauth2/token` | Generates secure OAuth 2.0 Bearer tokens |
| **Order Create** | `POST /v2/checkout/orders` | Creates order with `intent: "AUTHORIZE"` |
| **Authorize** | `POST /v2/checkout/orders/{id}/authorize` | Locks funds under a conditional holding state |
| **Capture** | `POST /v2/payments/authorizations/{id}/capture` | Captures funds when cooling-off & conditions pass |
| **Void** | `POST /v2/payments/authorizations/{id}/void` | Cancels hold if conditions expire or proposal is rejected |

### Optional: Connect Live PayPal Developer Sandbox
To test with your own PayPal Sandbox developer credentials, simply create a `.env` file in the root:

```env
PAYPAL_CLIENT_ID=your_sandbox_client_id_here
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret_here
PAYPAL_ENV=sandbox
DEMO_MODE=true
```

> **Zero-Config Resiliency**: If credentials are not provided, Consent seamlessly falls back to high-fidelity simulated sandbox identifiers (`ORD-SANDBOX-xxx`, `AUTH-SANDBOX-xxx`), allowing judges to inspect the complete authorization lifecycle with zero friction.

---

## 🛡️ Security Invariants & Audit

Consent was designed under rigorous defense-in-depth security principles:

| Vector | Protection Mechanism | Status |
|---|---|---|
| **Prompt Injection / Jailbreaks** | Zero-Privilege LLM: The model is physically separated from transaction execution APIs. | ✅ Audited & Isolated |
| **Budget Overruns** | Strict rolling monthly cap calculations in SQLite with parameterized queries. | ✅ 100% Deterministic |
| **Unauthorized Approvals** | RBAC validation ensures Observers and non-members receive `403 Forbidden` on voting. | ✅ Unit & E2E Tested |
| **Audit Log Tampering** | Cryptographic hash chaining: $\text{Hash}_n = \text{SHA256}(\text{Hash}_{n-1} + \text{CanonicalJSON}_n)$. | ✅ Mathematically Verified |
| **Denial of Service** | Express body parser hard-limited to `1mb`; strict Zod schema validation. | ✅ Hardened |
| **Transport Security** | Automated headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`. | ✅ Enforced |

---

## 🧪 Comprehensive Test Suite

Consent includes a comprehensive suite of **42 automated tests** verifying policy math, quorum rules, state machines, and cryptographic integrity:

```bash
# Run all 42 automated tests
npm run test:all
```

```
✓ server/tests/policy.test.ts (30 tests)
  ✓ Policy Engine - Auto-Approve Boundaries (6 tests)
  ✓ Policy Engine - Threshold & Quorum Calculations (8 tests)
  ✓ Policy Engine - Guardian Veto for Sensitive Categories (5 tests)
  ✓ Cryptographic Receipts - SHA-256 Hash Chain Integrity (6 tests)
  ✓ Tamper Detection - Rejects modified payload hashes (5 tests)

✓ server/tests/e2e.test.ts (12 tests)
  ✓ REST API - 403 Forbidden on Observer voting attempts
  ✓ REST API - Strict Zod validation on malformed mandates
  ✓ REST API - PayPal intent=AUTHORIZE lifecycle transitions
  ✓ Security - Security headers and DoS limit enforcement

Test Files  2 passed (2)
Tests       42 passed (42)
Duration    1.42s
```

---

## 📂 Project Directory Structure

```
consent/
├── server/                      # Node.js + Express + TypeScript Backend
│   ├── src/
│   │   ├── policy/              # Deterministic Policy Engine & Zod Schemas
│   │   │   ├── engine.ts        # Pure evaluation function (thresholds, quorum, vetoes)
│   │   │   └── schema.ts        # Mandate, Proposal, & Receipt Zod schemas
│   │   ├── paypal/              # PayPal Orders v2 & Payments v2 client
│   │   │   └── client.ts        # Intent=AUTHORIZE, capture, and void flows
│   │   ├── ledger/              # Cryptographic SHA-256 tamper-evident chain
│   │   │   └── hashChain.ts     # Canonical JSON serialization & hash verification
│   │   ├── workers/             # Background conditional release worker
│   │   ├── db/                  # SQLite schema & database connection
│   │   └── index.ts             # REST API server & security middleware
│   └── tests/                   # Vitest unit & integration test suites
│
├── web/                         # React 18 + Vite + Tailwind CSS Frontend
│   ├── src/
│   │   ├── components/          # Luxury Obsidian & Gold UI components
│   │   │   ├── ConsentLogo.tsx  # Bespoke interlocking vector brand mark
│   │   │   ├── HeroShowcase.tsx # 3D metallic card showcase with live scenarios
│   │   │   ├── ConditionsSimulatorWidget.tsx # Live mock condition trigger
│   │   │   └── BudgetAnalyticsWidget.tsx     # Real-time utilization gauges
│   │   ├── pages/               # Application views
│   │   │   ├── AgentDashboard.tsx # Autonomous agent feed & scenario launcher
│   │   │   ├── ConsentQueue.tsx   # k-of-n consensus approval queue
│   │   │   ├── MandateBuilder.tsx # Natural language mandate compiler
│   │   │   ├── Ledger.tsx         # Tamper-evident receipts & hash inspector
│   │   │   └── Circles.tsx        # Spending circle member & role management
│   │   └── api/                 # Typed API client
│   └── tailwind.config.js       # Custom dark obsidian & champagne gold theme
│
├── DEMO.md                      # Detailed step-by-step judge presentation script
├── package.json                 # Unified monorepo scripts
└── README.md                    # Project documentation
```

---

## 🏆 Why Consent Wins

1. **Solves a Genuine Unaddressed Problem**: Every AI spending tool is single-player. Consent is the **first multi-human, collaborative spending firewall** for the coming era of autonomous commerce.
2. **True PayPal Integration**: Deeply utilizes PayPal's unique `intent: "AUTHORIZE"` architecture for conditional cooling-off escrow — not just a generic checkout button.
3. **Safety First**: Implements an unshakeable **Zero-Privilege LLM Boundary** and mathematical SHA-256 tamper-evident guarantees.
4. **Production-Grade Craftsmanship**: 42 passing tests, 100% TypeScript strict types, and a breathtaking **Dark Obsidian & Champagne Gold** user experience.

---

<div align="center">

**Built with ❤️ for the PayPal AI Hackathon 2026**

*Empowering collaborative human intelligence to safely govern autonomous agents.*

</div>
