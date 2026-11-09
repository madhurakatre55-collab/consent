import { getDb } from '../db/schema.js';
import { mockNegotiationTurn } from '../llm/mock.js';
import { appendLedgerEntry } from '../policy/ledgerHelper.js';

export interface NegotiationStepResult {
  round: number;
  agentOffer: number;
  merchantResponse: {
    action: 'accept' | 'counter' | 'reject';
    counter_price?: number;
    message: string;
  };
  status: 'active' | 'accepted' | 'rejected';
}

/**
 * Handles negotiation round between Agent and Merchant.
 * Hard invariant: Agent can NEVER propose an offer higher than maxAcceptablePrice.
 */
export async function stepNegotiation(params: {
  proposalId: string;
  maxAcceptablePrice: number;
  currentListedPrice: number;
  item: string;
}): Promise<NegotiationStepResult> {
  const db = getDb();
  const { proposalId, maxAcceptablePrice, currentListedPrice, item } = params;

  // Retrieve current rounds
  const existingRoundsRes = await db.execute({
    sql: 'SELECT * FROM negotiations WHERE proposal_id = ? ORDER BY round ASC',
    args: [proposalId],
  });
  const currentRound = existingRoundsRes.rows.length + 1;

  // Strict invariant: agent offer cannot exceed max acceptable price
  const agentOffer = Math.min(maxAcceptablePrice, currentListedPrice);

  const turn = mockNegotiationTurn(currentRound, currentListedPrice, agentOffer, item);

  const status = turn.merchantResponse.action === 'accept'
    ? 'accepted'
    : turn.merchantResponse.action === 'reject'
    ? 'rejected'
    : 'active';

  const negotiationId = `neg-${proposalId}-${currentRound}`;

  await db.execute({
    sql: `INSERT INTO negotiations (
      id, proposal_id, round, agent_offer, merchant_response, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      negotiationId,
      proposalId,
      currentRound,
      agentOffer,
      JSON.stringify(turn.merchantResponse),
      status,
      new Date().toISOString(),
    ],
  });

  // If accepted, update the proposal agreed_price
  if (status === 'accepted') {
    const finalPrice = turn.merchantResponse.counter_price || agentOffer;
    await db.execute({
      sql: "UPDATE payment_proposals SET agreed_price = ?, amount = ?, status = 'proposed', decision_reason = ? WHERE id = ?",
      args: [
        finalPrice,
        finalPrice,
        `Negotiation successful: Price agreed at ₹${finalPrice} (Down from ₹${currentListedPrice})`,
        proposalId,
      ],
    });

    const proposalRes = await db.execute({
      sql: 'SELECT circle_id FROM payment_proposals WHERE id = ?',
      args: [proposalId],
    });
    const circleId = (proposalRes.rows[0]?.circle_id as string) || '';

    await appendLedgerEntry({
      circle_id: circleId,
      proposal_id: proposalId,
      event_type: 'NEGOTIATION_ACCEPTED',
      actor: 'agent_negotiator',
      detail: `Agreed price ₹${finalPrice} on ${item} with merchant`,
      explanation: `Agent successfully negotiated price down from ₹${currentListedPrice} to ₹${finalPrice} within mandate limit.`,
    });
  }

  return {
    round: currentRound,
    agentOffer,
    merchantResponse: turn.merchantResponse,
    status,
  };
}
