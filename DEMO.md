# Consent — 3-Minute Hackathon Demo Storyboard

This step-by-step storyboard guides judges and evaluators through demonstrating **Consent** in under 3 minutes.

---

### Step 1: Open the Application & View Spending Circles (0:00 - 0:20)
1. Start the server (`npm run dev:server`) and web client (`npm run dev:web`).
2. Open **http://localhost:3000** in your browser.
3. Navigate to **Spending Circles**.
4. Point out the pre-configured **"Flat 12 Grocery & Living Circle"** with ₹8,000 budget and active members (**Aisha** - Owner, **Rohan** - Member, **Priya** - Guardian, **Kunal** - Observer).
5. Highlight the core concept: *“Instead of one user giving an agent an allowance, flatmates share a collaborative spending mandate.”*

---

### Step 2: Compile a Plain-English Mandate (0:20 - 0:45)
1. Click the **Mandate Builder** tab in the top navigation.
2. Observe the natural language policy text:
   > *"Our flat has a ₹8,000 monthly grocery budget. The grocery agent can buy food and household items. Purchases under ₹1,500 are automatic. Anything from ₹1,500 to ₹5,000 needs 2 of 3 members. Anything above ₹5,000 needs all members. Electronics always require Priya (Guardian). Do not buy from Suspicious Deals Ltd or unknown merchants."*
3. Click **"Compile with AI"**.
4. Show the Zod-validated structured policy on the right: auto-approve limit of ₹1,500, quorum of 2-of-3, Guardian rules for Electronics, and blocked merchants.
5. Emphasize human safety: *“The AI drafts the policy, but the owner must explicitly click ‘Confirm and Activate’ before it becomes active.”*

---

### Step 3: Run the Autonomous Agent (0:45 - 1:15)
1. Switch to the **Agent Dashboard** tab.
2. Review the pre-seeded proposals illustrating all core scenarios:
   - **Scenario A (Auto-Approved)**: ₹850 Daily Essentials from FreshMart. Because ₹850 ≤ ₹1,500, the Policy Engine approved it immediately, creating a PayPal Sandbox Authorization and placing it into **Held** status.
   - **Scenario B (Quorum Required)**: ₹3,200 Pantry Provisions from MegaBazaar. Because ₹3,200 > ₹1,500, the engine routed it to the **Consent Queue** requiring 2-of-3 approvals.
   - **Scenario C (Policy Blocked)**: Kitchen Blender from **Suspicious Deals Ltd**. The engine blocked this immediately, citing `mandate.blocked_merchants`.

---

### Step 4: Multi-Human Consensus in Action (1:15 - 1:45)
1. Click the **Consent Queue** tab (notice the notification badge showing pending proposals).
2. Look at the ₹3,200 Pantry Provisions proposal. Notice Aisha has already approved it (1 of 2 received).
3. Switch the persona in the top navigation bar from **Aisha (Owner)** to **Rohan (Member)**.
4. As Rohan, enter an optional note (e.g., *"Approved for flat pantry"*) and click **Approve**.
5. Instantly demonstrate consensus: The 2nd vote satisfies the 2-of-3 quorum! The system calls PayPal Sandbox with `intent: AUTHORIZE`, moving the proposal to **Held** status.

---

### Step 5: Conditional PayPal Release & Void (1:45 - 2:15)
1. Return to the **Agent Dashboard**.
2. Find the held proposal with a live cooling-off countdown timer.
3. Show **Conditional Release**: When the cooling-off period elapses or the condition is verified, click **"Release & Capture"**. The PayPal sandbox authorization is captured into **Captured (Paid)** status.
4. Next, show the **Void** path on another proposal: click **"Void Auth"**. The PayPal sandbox authorization is released/voided, proving funds are never locked up if conditions fail or a user cancels.

---

### Step 6: Interactive Agent Negotiation Room (2:15 - 2:35)
1. On the Agent Dashboard, click the preset **"4. Negotiation Room"** (Smart Vacuum listed at ₹4,999, above the mandate limit).
2. Open the Negotiation Room:
   - The AI agent sends a counteroffer of ₹4,200 (strictly constrained by the mandate ceiling).
   - Click **"Send AI Counteroffer"** to advance the turn.
   - The simulated merchant accepts the deal at ₹4,200.
3. Highlight the safety invariant: *“The agent can bargain on our behalf, but cannot exceed the policy cap or approve its own spending.”*

---

### Step 7: Consent Receipt & Grounded Ledger Q&A (2:35 - 3:00)
1. Click **"Consent Receipt"** on any proposal card.
2. Inspect the official certificate:
   - Matched policy clause and decision rationale.
   - Table of human votes and comments.
   - PayPal Sandbox Order and Authorization IDs.
   - **Tamper-Evident SHA-256 Hash Chain** linking parent block hash to current block hash.
   - Click **"Download Receipt"** to export the audit JSON.
3. Click the **Ledger & Receipts** tab.
4. Scroll to the **"Ask the Ledger"** box and ask:
   > *"How much total money was spent this month?"*
5. The assistant computes the exact total from verified ledger transactions, confirming zero hallucinations.

---

### End of Demo Summary
> *“Consent proves that autonomous AI agents can be given real purchasing agency without giving them a blank check. By combining shared spending circles, deterministic policy boundaries, conditional PayPal authorizations, and cryptographic consent receipts, households and teams stay in full control.”*
