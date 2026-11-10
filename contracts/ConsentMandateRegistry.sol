// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ConsentMandateRegistry
 * @notice Anchors deterministic AI Spending Circle mandates and SHA-256 Merkle roots
 *         of Consent Receipts onto EVM blockchains (Base Sepolia / Polygon Amoy).
 * @dev Provides trustless cryptographic verification that off-chain PayPal authorization
 *      decisions and multi-human quorum approvals have not been altered retroactively.
 */
contract ConsentMandateRegistry {
    struct AnchorBatch {
        bytes32 merkleRoot;
        bytes32 circleIdHash;
        uint256 receiptCount;
        uint256 timestamp;
        uint256 blockNumber;
        address anchoredBy;
    }

    struct MandateCommitment {
        bytes32 policyHash;
        uint256 version;
        uint256 activatedAt;
        address owner;
    }

    /// @notice Mapping from anchor ID (bytes32) to anchored Merkle batch
    mapping(bytes32 => AnchorBatch) public batches;

    /// @notice Mapping from circleIdHash to active MandateCommitment
    mapping(bytes32 => MandateCommitment) public mandates;

    /// @notice List of all anchored Merkle roots for quick auditability
    bytes32[] public anchoredRoots;

    event MandateAnchored(
        bytes32 indexed circleIdHash,
        bytes32 indexed policyHash,
        uint256 version,
        address indexed owner,
        uint256 timestamp
    );

    event BatchAnchored(
        bytes32 indexed batchId,
        bytes32 indexed circleIdHash,
        bytes32 merkleRoot,
        uint256 receiptCount,
        uint256 blockNumber,
        uint256 timestamp
    );

    /**
     * @notice Commit a compiled, human-confirmed spending mandate hash on-chain.
     */
    function anchorMandate(
        bytes32 circleIdHash,
        bytes32 policyHash,
        uint256 version
    ) external {
        mandates[circleIdHash] = MandateCommitment({
            policyHash: policyHash,
            version: version,
            activatedAt: block.timestamp,
            owner: msg.sender
        });

        emit MandateAnchored(
            circleIdHash,
            policyHash,
            version,
            msg.sender,
            block.timestamp
        );
    }

    /**
     * @notice Anchor a Merkle root representing a batch of SHA-256 Consent Receipts.
     */
    function anchorBatch(
        bytes32 batchId,
        bytes32 circleIdHash,
        bytes32 merkleRoot,
        uint256 receiptCount
    ) external {
        require(merkleRoot != bytes32(0), "Invalid Merkle root");
        require(receiptCount > 0, "Empty batch");
        require(batches[batchId].timestamp == 0, "Batch already anchored");

        batches[batchId] = AnchorBatch({
            merkleRoot: merkleRoot,
            circleIdHash: circleIdHash,
            receiptCount: receiptCount,
            timestamp: block.timestamp,
            blockNumber: block.number,
            anchoredBy: msg.sender
        });

        anchoredRoots.push(merkleRoot);

        emit BatchAnchored(
            batchId,
            circleIdHash,
            merkleRoot,
            receiptCount,
            block.number,
            block.timestamp
        );
    }

    /**
     * @notice Trustlessly verify that a specific Consent Receipt hash belongs to an anchored batch.
     * @param batchId The anchored batch identifier
     * @param leaf The SHA-256 receipt hash (bytes32)
     * @param proof Sibling hashes along the Merkle path
     */
    function verifyReceiptProof(
        bytes32 batchId,
        bytes32 leaf,
        bytes32[] calldata proof
    ) external view returns (bool) {
        AnchorBatch memory batch = batches[batchId];
        if (batch.timestamp == 0) return false;

        bytes32 computedHash = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];
            if (computedHash <= proofElement) {
                computedHash = sha256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = sha256(abi.encodePacked(proofElement, computedHash));
            }
        }

        return computedHash == batch.merkleRoot;
    }

    function totalAnchoredBatches() external view returns (uint256) {
        return anchoredRoots.length;
    }
}
