import { getDb, initDb } from './schema.js';
import { generateReceiptHash } from '../policy/receipt.js';
import { buildMerkleTree, BLOCKCHAIN_CONFIG, toBytes32 } from '../blockchain/anchorService.js';
import crypto from 'crypto';

export async function runSeed(): Promise<void> {
  await initDb();
  const db = getDb();

  // Clear existing records
  await db.executeMultiple(`
    DELETE FROM blockchain_anchors;
    DELETE FROM agents;
    DELETE FROM negotiations;
    DELETE FROM ledger_entries;
    DELETE FROM consent_decisions;
    DELETE FROM payment_proposals;
    DELETE FROM merchants;
    DELETE FROM mandates;
    DELETE FROM circle_members;
    DELETE FROM circles;
    DELETE FROM users;
  `);

  console.log('Seeding users...');
  const users = [
    { id: 'user-aisha', name: 'Aisha Sharma', email: 'aisha@flat12.internal', role: 'owner' },
    { id: 'user-rohan', name: 'Rohan Verma', email: 'rohan@flat12.internal', role: 'member' },
    { id: 'user-priya', name: 'Priya Patel', email: 'priya@flat12.internal', role: 'guardian' },
    { id: 'user-kunal', name: 'Kunal Sen', email: 'kunal@flat12.internal', role: 'observer' },
  ];

  for (const u of users) {
    await db.execute({
      sql: 'INSERT INTO users (id, name, email, role) VALUES (?, ?, ?, ?)',
      args: [u.id, u.name, u.email, u.role],
    });
  }

  console.log('Seeding spending circle...');
  const circleId = 'circle-flat12';
  await db.execute({
    sql: `INSERT INTO circles (id, name, owner_id, monthly_budget, currency, active, expires_at)
          VALUES (?, ?, ?, ?, ?, 1, NULL)`,
    args: [circleId, 'Flat 12 Grocery & Living Circle', 'user-aisha', 8000, 'INR'],
  });

  const circleMembers = [
    { id: 'cm-1', circle_id: circleId, user_id: 'user-aisha', role: 'owner', approval_weight: 1, can_propose: 1, can_approve: 1 },
    { id: 'cm-2', circle_id: circleId, user_id: 'user-rohan', role: 'member', approval_weight: 1, can_propose: 1, can_approve: 1 },
    { id: 'cm-3', circle_id: circleId, user_id: 'user-priya', role: 'guardian', approval_weight: 1, can_propose: 1, can_approve: 1 },
    { id: 'cm-4', circle_id: circleId, user_id: 'user-kunal', role: 'observer', approval_weight: 0, can_propose: 0, can_approve: 0 },
  ];

  for (const cm of circleMembers) {
    await db.execute({
      sql: `INSERT INTO circle_members (id, circle_id, user_id, role, approval_weight, can_propose, can_approve)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [cm.id, cm.circle_id, cm.user_id, cm.role, cm.approval_weight, cm.can_propose, cm.can_approve],
    });
  }

  console.log('Seeding specialized AI agents...');
  const agents = [
    {
      id: 'grocery-agent-v1',
      circle_id: circleId,
      name: 'Pantry & Grocery Bot',
      description: 'Monitors staple foods, milk, and vegetables. Auto-restocks below safety margins.',
      category: 'Groceries',
      daily_limit: 2000,
      active: 1,
      lifetime_spent: 2250,
      avatar_icon: 'shopping-cart',
    },
    {
      id: 'utilities-bot-v2',
      circle_id: circleId,
      name: 'Utilities & Subscriptions Agent',
      description: 'Automates household Wi-Fi, electricity, and recurring maintenance bills.',
      category: 'Household',
      daily_limit: 3000,
      active: 1,
      lifetime_spent: 1400,
      avatar_icon: 'zap',
    },
    {
      id: 'tech-procurement-v1',
      circle_id: circleId,
      name: 'Tech & Hardware Buyer',
      description: 'Finds deals on cables, smart plugs, and appliances. Strictly requires Guardian consent.',
      category: 'Electronics',
      daily_limit: 10000,
      active: 1,
      lifetime_spent: 0,
      avatar_icon: 'cpu',
    },
    {
      id: 'travel-concierge-v1',
      circle_id: circleId,
      name: 'Travel & Shared Outings Concierge',
      description: 'Coordinates weekend flat trips and cab rides. High amounts require unanimous approval.',
      category: 'Travel',
      daily_limit: 15000,
      active: 1,
      lifetime_spent: 0,
      avatar_icon: 'plane',
    },
  ];

  for (const ag of agents) {
    await db.execute({
      sql: `INSERT INTO agents (id, circle_id, name, description, category, daily_limit, active, lifetime_spent, avatar_icon, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        ag.id,
        ag.circle_id,
        ag.name,
        ag.description,
        ag.category,
        ag.daily_limit,
        ag.active,
        ag.lifetime_spent,
        ag.avatar_icon,
        new Date().toISOString(),
      ],
    });
  }

  console.log('Seeding active mandate...');
  const mandateId = 'mandate-flat12-v1';
  const compiledMandate = {
    monthly_budget: { amount: 8000, currency: 'INR' },
    per_purchase_auto_approve_limit: 1500,
    required_approvers: {
      mode: 'quorum',
      count: 2,
      roles: ['owner', 'member', 'guardian'],
    },
    allowed_categories: ['Groceries', 'Household', 'Food', 'Electronics'],
    blocked_categories: ['Gambling', 'Weapons', 'Alcohol'],
    blocked_merchants: ['Suspicious Deals Ltd', 'CryptoOutlet'],
    max_price_deviation_percent: 25,
    cooling_off_minutes: 1,
    release_condition: {
      type: 'manual_approval',
      target_amount: 1500,
    },
    expires_at: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString(),
  };

  const rawMandateText =
    'Our flat has a ₹8,000 monthly grocery budget. The grocery agent can buy food and household items. Purchases under ₹1,500 are automatic. Anything from ₹1,500 to ₹5,000 needs 2 of 3 members. Anything above ₹5,000 needs all members. Electronics always require Priya (Guardian). Do not buy from Suspicious Deals Ltd or unknown merchants.';

  await db.execute({
    sql: `INSERT INTO mandates (id, circle_id, raw_text, compiled_json, version, confirmed_at, active, expires_at)
          VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
    args: [
      mandateId,
      circleId,
      rawMandateText,
      JSON.stringify(compiledMandate),
      1,
      new Date().toISOString(),
      compiledMandate.expires_at,
    ],
  });

  console.log('Seeding merchants...');
  const merchants = [
    {
      id: 'm-1',
      name: 'FreshMart Organics',
      category: 'Groceries',
      is_blocked: 0,
      price_history: JSON.stringify([750, 850, 950, 1100, 1250]),
      is_subscription_merchant: 0,
    },
    {
      id: 'm-2',
      name: 'MegaBazaar Wholesalers',
      category: 'Groceries',
      is_blocked: 0,
      price_history: JSON.stringify([2800, 3100, 3200, 3400]),
      is_subscription_merchant: 0,
    },
    {
      id: 'm-3',
      name: 'Croma Electronics',
      category: 'Electronics',
      is_blocked: 0,
      price_history: JSON.stringify([1800, 2200, 2500]),
      is_subscription_merchant: 0,
    },
    {
      id: 'm-4',
      name: 'Suspicious Deals Ltd',
      category: 'Household',
      is_blocked: 1,
      price_history: JSON.stringify([99, 149]),
      is_subscription_merchant: 0,
    },
  ];

  for (const m of merchants) {
    await db.execute({
      sql: `INSERT INTO merchants (id, name, category, is_blocked, price_history, is_subscription_merchant)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [m.id, m.name, m.category, m.is_blocked, m.price_history, m.is_subscription_merchant],
    });
  }

  console.log('Seeding proposals demonstrating all required scenarios...');
  let prevHash = 'GENESIS_HASH_0000000000000000000000000000000000000000000000000000000000000000';

  // Helper to record proposal & ledger entry
  const createProposalWithLedger = async (data: {
    id: string;
    item: string;
    amount: number;
    category: string;
    merchant: string;
    status: string;
    reason: string;
    matchedClause: string;
    authId?: string;
    orderId?: string;
    releaseCondition: any;
    decisions?: Array<{ userId: string; decision: string; comment?: string }>;
    timestampMinutesAgo: number;
  }) => {
    const timestamp = new Date(Date.now() - data.timestampMinutesAgo * 60000).toISOString();

    await db.execute({
      sql: `INSERT INTO payment_proposals (
        id, circle_id, mandate_id, agent_id, proposed_by_user_id,
        merchant, item, amount, currency, category, proposed_at,
        status, decision_reason, matched_clause, paypal_order_id,
        paypal_authorization_id, release_condition, release_deadline, agreed_price
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        data.id,
        circleId,
        mandateId,
        'grocery-agent-v1',
        'user-aisha',
        data.merchant,
        data.item,
        data.amount,
        'INR',
        data.category,
        timestamp,
        data.status,
        data.reason,
        data.matchedClause,
        data.orderId || null,
        data.authId || null,
        JSON.stringify(data.releaseCondition),
        new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        data.amount,
      ],
    });

    if (data.decisions) {
      for (const d of data.decisions) {
        await db.execute({
          sql: `INSERT INTO consent_decisions (id, proposal_id, user_id, decision, comment, created_at)
                VALUES (?, ?, ?, ?, ?, ?)`,
          args: [`cd-${data.id}-${d.userId}`, data.id, d.userId, d.decision, d.comment || null, timestamp],
        });
      }
    }

    const { receipt_hash } = generateReceiptHash(prevHash, {
      proposal_id: data.id,
      circle_id: circleId,
      circle_name: 'Flat 12 Grocery & Living Circle',
      mandate_version: 1,
      agent_id: 'grocery-agent-v1',
      merchant: data.merchant,
      item: data.item,
      amount: data.amount,
      currency: 'INR',
      category: data.category,
      matched_clause: data.matchedClause,
      decision_reason: data.reason,
      approvals: (data.decisions || []).map((d) => ({
        user_id: d.userId,
        user_name: users.find((u) => u.id === d.userId)?.name || d.userId,
        role: users.find((u) => u.id === d.userId)?.role || 'member',
        decision: d.decision,
        comment: d.comment,
        created_at: timestamp,
      })),
      paypal_order_id: data.orderId || null,
      paypal_authorization_id: data.authId || null,
      final_outcome: data.status,
      timestamp,
      previous_receipt_hash: prevHash,
    });

    await db.execute({
      sql: `INSERT INTO ledger_entries (
        id, circle_id, proposal_id, timestamp, event_type, actor, detail, explanation, receipt_hash, previous_receipt_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `ledg-${data.id}`,
        circleId,
        data.id,
        timestamp,
        data.status.toUpperCase(),
        'policy_engine',
        `Proposal for ${data.item} (${data.amount} INR) -> ${data.status}`,
        data.reason,
        receipt_hash,
        prevHash,
      ],
    });

    prevHash = receipt_hash;
  };

  // 1. Auto-approved purchase (Amount 850 <= 1500 limit) -> Held for release
  await createProposalWithLedger({
    id: 'prop-demo-auto-approved',
    item: 'Daily Essentials (Milk, Whole Wheat Bread, Farm Eggs)',
    amount: 850,
    category: 'Groceries',
    merchant: 'FreshMart Organics',
    status: 'held',
    reason: 'Amount 850 INR is within per-purchase auto-approve threshold of 1500 INR',
    matchedClause: 'mandate.per_purchase_auto_approve_limit',
    orderId: 'ORD-SANDBOX-850-AUTO',
    authId: 'AUTH-SANDBOX-850-AUTO',
    releaseCondition: { type: 'manual_approval' },
    timestampMinutesAgo: 15,
  });

  // 2. Purchase requiring 2-of-3 approval (Amount 3,200) -> 1 of 2 approved, in queue!
  await createProposalWithLedger({
    id: 'prop-demo-needs-quorum',
    item: 'Bulk Monthly Pantry Provisions (Rice, Lentils, Spices, Ghee)',
    amount: 3200,
    category: 'Groceries',
    merchant: 'MegaBazaar Wholesalers',
    status: 'awaiting_consent',
    reason: 'Amount exceeds auto-approve threshold (1500 INR). Policy requires quorum (2 of 3 members).',
    matchedClause: 'mandate.required_approvers.quorum',
    releaseCondition: { type: 'price_target', target_amount: 3000 },
    decisions: [
      { userId: 'user-aisha', decision: 'approved', comment: 'Approved for flat pantry restock' },
    ],
    timestampMinutesAgo: 45,
  });

  // 3. Blocked purchase (Blocked merchant: "Suspicious Deals Ltd")
  await createProposalWithLedger({
    id: 'prop-demo-blocked',
    item: 'Clearance Kitchen Blender with No Warranty',
    amount: 1499,
    category: 'Household',
    merchant: 'Suspicious Deals Ltd',
    status: 'blocked',
    reason: 'Merchant "Suspicious Deals Ltd" is on the circle\'s blocked merchants list',
    matchedClause: 'mandate.blocked_merchants',
    releaseCondition: { type: 'manual_approval' },
    timestampMinutesAgo: 60,
  });

  // 4. Held authorization released after condition satisfaction -> CAPTURED
  await createProposalWithLedger({
    id: 'prop-demo-captured',
    item: 'Monthly Water Purifier Replacement Cartridge',
    amount: 1400,
    category: 'Household',
    merchant: 'FreshMart Organics',
    status: 'captured',
    reason: 'Condition fulfilled: Delivery date milestone reached. PayPal authorization captured successfully.',
    matchedClause: 'mandate.release_condition.delivery_date',
    orderId: 'ORD-SANDBOX-1400-CAPT',
    authId: 'AUTH-SANDBOX-1400-CAPT',
    releaseCondition: { type: 'delivery_date', date: new Date(Date.now() - 3600000).toISOString() },
    timestampMinutesAgo: 120,
  });

  // 5. Voided authorization (User cancelled before release)
  await createProposalWithLedger({
    id: 'prop-demo-voided',
    item: 'Extra Party Snack Boxes',
    amount: 1100,
    category: 'Food',
    merchant: 'FreshMart Organics',
    status: 'voided',
    reason: 'User cancelled transaction during cooling-off period; PayPal authorization voided',
    matchedClause: 'mandate.cooling_off_period',
    orderId: 'ORD-SANDBOX-1100-VOID',
    authId: 'AUTH-SANDBOX-1100-VOID',
    releaseCondition: { type: 'manual_approval' },
    timestampMinutesAgo: 180,
  });

  // Anchor the initial historical receipts on-chain in a Genesis Merkle Batch
  const historicalIds = ['ledg-prop-demo-blocked', 'ledg-prop-demo-captured', 'ledg-prop-demo-voided'];
  const histRes = await db.execute(
    `SELECT * FROM ledger_entries WHERE id IN ('ledg-prop-demo-blocked', 'ledg-prop-demo-captured', 'ledg-prop-demo-voided') ORDER BY timestamp ASC`
  );
  if (histRes.rows.length > 0) {
    const leaves = histRes.rows.map((r) => toBytes32(r.receipt_hash as string));
    const { root: merkleRoot } = buildMerkleTree(leaves);
    const genesisBlock = 19482104;
    const genesisTime = new Date(Date.now() - 50 * 60000).toISOString();
    const txHash =
      '0x' +
      crypto
        .createHash('sha256')
        .update(`${merkleRoot}:${BLOCKCHAIN_CONFIG.contractAddress}:${genesisBlock}:GENESIS`)
        .digest('hex');

    await db.execute({
      sql: `INSERT INTO blockchain_anchors (
        id, circle_id, merkle_root, tx_hash, block_number, network, chain_id,
        contract_address, receipt_count, gas_used, status, anchored_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        'anc-genesis-flat12',
        circleId,
        merkleRoot,
        txHash,
        genesisBlock,
        BLOCKCHAIN_CONFIG.network,
        BLOCKCHAIN_CONFIG.chainId,
        BLOCKCHAIN_CONFIG.contractAddress,
        histRes.rows.length,
        50550,
        'CONFIRMED',
        genesisTime,
      ],
    });

    for (const row of histRes.rows) {
      await db.execute({
        sql: `UPDATE ledger_entries SET blockchain_tx_hash = ?, blockchain_block_number = ?, merkle_root = ? WHERE id = ?`,
        args: [txHash, genesisBlock, merkleRoot, row.id],
      });
    }
  }

  console.log('Seed completed successfully!');
}

if (process.argv[1] && (process.argv[1].endsWith('seed.ts') || process.argv[1].endsWith('seed.js'))) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
