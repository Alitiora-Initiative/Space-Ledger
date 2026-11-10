// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal Base settlement gate for releases attested by a Bitcoin-aware relayer.
/// @dev The relayer must verify Bitcoin PoW and the Solana epoch state off-chain before signing.
contract BitcoinAnchoredRelease {
    address public owner;
    address public attestor;
    uint256 public immutable baseChainId;
    mapping(uint256 => bytes32) public releasedRoots;

    event AttestorUpdated(address indexed attestor);
    event EpochReleased(uint256 indexed epoch, uint256 bitcoinHeight, bytes32 bitcoinHash, bytes32 solanaRoot, uint256 amount);

    error NotOwner();
    error NotAttestor();
    error InvalidSignature();
    error EpochAlreadyReleased();
    error WrongChain();

    constructor(address initialAttestor) {
        owner = msg.sender;
        attestor = initialAttestor;
        baseChainId = block.chainid;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function setAttestor(address nextAttestor) external onlyOwner {
        attestor = nextAttestor;
        emit AttestorUpdated(nextAttestor);
    }

    function release(
        uint256 epoch,
        uint256 bitcoinHeight,
        bytes32 bitcoinHash,
        bytes32 solanaRoot,
        uint256 amount,
        bytes calldata signature
    ) external {
        if (block.chainid != baseChainId) revert WrongChain();
        if (releasedRoots[epoch] != bytes32(0)) revert EpochAlreadyReleased();
        bytes32 digest = keccak256(abi.encode(address(this), baseChainId, epoch, bitcoinHeight, bitcoinHash, solanaRoot, amount));
        if (_recover(digest, signature) != attestor) revert InvalidSignature();
        releasedRoots[epoch] = solanaRoot;
        emit EpochReleased(epoch, bitcoinHeight, bitcoinHash, solanaRoot, amount);
    }

    function _recover(bytes32 digest, bytes calldata signature) private pure returns (address) {
        if (signature.length != 65) revert InvalidSignature();
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        if (v < 27) v += 27;
        if (v != 27 && v != 28) revert InvalidSignature();
        return ecrecover(keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest)), v, r, s);
    }
}
