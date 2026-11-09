import { createClient, Client } from '@libsql/client';
import { config } from '../config/env.js';

let dbInstance: Client | null = null;

export function getDb(): Client {
  if (!dbInstance) {
    dbInstance = createClient({
      url: config.databaseUrl,
    });
  }
  return dbInstance;
}

export async function initDb(): Promise<void> {
  const db = getDb();

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL -- 'owner', 'member', 'guardian', 'observer'
    );

    CREATE TABLE IF NOT EXISTS circles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      monthly_budget REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      active INTEGER NOT NULL DEFAULT 1,
      expires_at TEXT,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS circle_members (
      id TEXT PRIMARY KEY,
      circle_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL, -- 'owner', 'member', 'guardian', 'observer'
      approval_weight INTEGER NOT NULL DEFAULT 1,
      can_propose INTEGER NOT NULL DEFAULT 1,
      can_approve INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (circle_id) REFERENCES circles(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS mandates (
      id TEXT PRIMARY KEY,
      circle_id TEXT NOT NULL,
      raw_text TEXT NOT NULL,
      compiled_json TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      confirmed_at TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      expires_at TEXT,
      FOREIGN KEY (circle_id) REFERENCES circles(id)
    );

    CREATE TABLE IF NOT EXISTS merchants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      is_blocked INTEGER NOT NULL DEFAULT 0,
      price_history TEXT NOT NULL, -- JSON string array of numbers or objects
      is_subscription_merchant INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS payment_proposals (
      id TEXT PRIMARY KEY,
      circle_id TEXT NOT NULL,
      mandate_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      proposed_by_user_id TEXT,
      merchant TEXT NOT NULL,
      item TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      category TEXT NOT NULL,
      proposed_at TEXT NOT NULL,
      status TEXT NOT NULL, -- 'proposed', 'awaiting_consent', 'approved', 'blocked', 'held', 'ready_to_release', 'captured', 'voided', 'failed', 'expired', 'negotiating'
      decision_reason TEXT,
      matched_clause TEXT,
      paypal_order_id TEXT,
      paypal_authorization_id TEXT,
      release_condition TEXT, -- JSON string
      release_deadline TEXT,
      agreed_price REAL,
      FOREIGN KEY (circle_id) REFERENCES circles(id),
      FOREIGN KEY (mandate_id) REFERENCES mandates(id)
    );

    CREATE TABLE IF NOT EXISTS consent_decisions (
      id TEXT PRIMARY KEY,
      proposal_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      decision TEXT NOT NULL, -- 'approved', 'rejected'
      comment TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (proposal_id) REFERENCES payment_proposals(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS ledger_entries (
      id TEXT PRIMARY KEY,
      circle_id TEXT NOT NULL,
      proposal_id TEXT,
      timestamp TEXT NOT NULL,
      event_type TEXT NOT NULL,
      actor TEXT NOT NULL,
      detail TEXT NOT NULL,
      explanation TEXT,
      receipt_hash TEXT NOT NULL,
      previous_receipt_hash TEXT NOT NULL,
      FOREIGN KEY (circle_id) REFERENCES circles(id)
    );

    CREATE TABLE IF NOT EXISTS negotiations (
      id TEXT PRIMARY KEY,
      proposal_id TEXT NOT NULL,
      round INTEGER NOT NULL,
      agent_offer REAL NOT NULL,
      merchant_response TEXT NOT NULL, -- JSON object: { action: 'accept'|'counter'|'reject', counter_price?: number, message: string }
      status TEXT NOT NULL, -- 'active', 'accepted', 'rejected'
      created_at TEXT NOT NULL,
      FOREIGN KEY (proposal_id) REFERENCES payment_proposals(id)
    );

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      circle_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      daily_limit REAL NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      lifetime_spent REAL NOT NULL DEFAULT 0,
      avatar_icon TEXT NOT NULL DEFAULT 'bot',
      created_at TEXT NOT NULL,
      FOREIGN KEY (circle_id) REFERENCES circles(id)
    );
  `);
}
