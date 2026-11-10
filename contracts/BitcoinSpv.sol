// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Stateless Bitcoin header and Merkle-proof verifier for EVM settlement contracts.
/// @dev This verifies supplied proof material only. A caller must separately enforce
/// confirmations, cumulative chain work, retarget rules, and reorg/checkpoint policy.
library BitcoinSpv {
    error InvalidHeaderLength();
    error InvalidBits();
    error InvalidProof();
    error UnexpectedPreviousHash();
    error InsufficientWork();

    function verifyHeader(
        bytes calldata header,
        bytes32 expectedPreviousHash,
        uint32 minimumBits
    ) internal pure returns (bytes32 blockHash, uint32 bits) {
        if (header.length != 80) revert InvalidHeaderLength();

        bytes32 previousHash;
        assembly {
            previousHash := calldataload(add(header.offset, 4))
            bits := shr(224, calldataload(add(header.offset, 72)))
        }
        if (previousHash != expectedPreviousHash) revert UnexpectedPreviousHash();
        if (bits < minimumBits) revert InsufficientWork();

        uint256 target = compactTarget(bits);
        blockHash = doubleSha256Calldata(header);
        if (uint256(reverseBytes(blockHash)) > target) revert InsufficientWork();
    }

    function verifyMerkleProof(
        bytes32 transactionHash,
        bytes32 merkleRoot,
        bytes32[] calldata branch,
        uint256 transactionIndex
    ) internal pure returns (bool) {
        bytes32 current = transactionHash;
        for (uint256 i = 0; i < branch.length; i++) {
            current = transactionIndex & 1 == 0
                ? doubleSha256(abi.encodePacked(current, branch[i]))
                : doubleSha256(abi.encodePacked(branch[i], current));
            transactionIndex >>= 1;
        }
        return current == merkleRoot;
    }

    function compactTarget(uint32 bits) internal pure returns (uint256 target) {
        uint256 exponent = bits >> 24;
        uint256 mantissa = bits & 0x007fffff;
        if (mantissa == 0 || bits & 0x00800000 != 0 || exponent > 34) revert InvalidBits();

        if (exponent <= 3) {
            target = mantissa >> (8 * (3 - exponent));
        } else {
            target = mantissa << (8 * (exponent - 3));
        }
        if (target == 0) revert InvalidBits();
    }

    function doubleSha256(bytes memory payload) internal pure returns (bytes32) {
        return sha256(abi.encodePacked(sha256(payload)));
    }

    function doubleSha256Calldata(bytes calldata payload) internal pure returns (bytes32 result) {
        return sha256(abi.encodePacked(sha256(payload)));
    }

    function reverseBytes(bytes32 value) internal pure returns (bytes32 reversed) {
        for (uint256 i = 0; i < 32; i++) {
            reversed |= bytes32(uint256(uint8(value[i])) << (8 * (31 - i)));
        }
    }
}
