// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title SpiceLedger
 * @dev A trillion-pixel blockchain canvas with bonding curve pricing
 * 10 billion blocks, each containing 100 pixels (10x10 grid)
 */
contract SpiceLedger is Ownable, ReentrancyGuard {
    // Constants
    uint256 public constant TOTAL_BLOCKS = 10_000_000_000; // 10 billion
    uint256 public constant PIXELS_PER_BLOCK = 100; // 10x10 grid
    uint256 public constant TOTAL_PIXELS = TOTAL_BLOCKS * PIXELS_PER_BLOCK; // 1 trillion
    uint256 public constant STARTING_PRICE = 0.001 ether; // $0.001 in wei (scaled)
    uint256 public constant TARGET_PRICE = 10 ether; // $10 in wei (scaled)
    uint256 public constant SLOPE = (TARGET_PRICE - STARTING_PRICE) / TOTAL_BLOCKS;
    uint256 public constant FEE_AMOUNT = 0.10 ether; // $0.10 flat fee
    
    // Treasury allocation
    uint256 public constant TREASURY_ALLOCATION = 1_000_000_000; // 1 billion blocks (10%)
    uint256 public constant CLIFF_PERIOD = 365 days; // 12 months
    uint256 public constant VESTING_DURATION = 1095 days; // 36 months after cliff
    
    // State variables
    uint256 public launchTime;
    uint256 public currentBlockId;
    uint256 public totalFeesCollected;
    uint256 public treasuryReleased;
    
    // Mappings
    mapping(uint256 => address) public blockOwner; // blockId => owner
    mapping(address => uint256[]) public ownedBlocks; // owner => blockIds
    mapping(address => uint256) public ownershipCount; // owner => count
    
    // Treasury
    address public treasuryAddress;
    mapping(address => uint256) public vestedBalances;
    
    // Events
    event BlockPurchased(address indexed buyer, uint256 blockId, uint256 price, uint256 fee);
    event FeeCollected(uint256 amount, uint256 totalCollected);
    event TreasuryReleased(address indexed recipient, uint256 amount);
    event TreasuryAddressUpdated(address indexed oldAddress, address indexed newAddress);
    
    constructor(address _treasuryAddress) Ownable(msg.sender) {
        require(_treasuryAddress != address(0), "Treasury address cannot be zero");
        launchTime = block.timestamp;
        treasuryAddress = _treasuryAddress;
        
        // Treasury owns blocks 0 .. TREASURY_ALLOCATION-1 implicitly (tracked by currentBlockId).
        // We do NOT loop — a 1-billion iteration loop would exceed any block gas limit.
        // isTreasuryBlock() provides the ownership check for the reserved range.
        ownershipCount[treasuryAddress] = TREASURY_ALLOCATION;
        currentBlockId = TREASURY_ALLOCATION;
    }
    
    /**
     * @dev Returns true for blocks in the treasury-reserved range [0, TREASURY_ALLOCATION).
     */
    function isTreasuryBlock(uint256 blockId) public view returns (bool) {
        return blockId < TREASURY_ALLOCATION;
    }
    
    /**
     * @dev Calculate price for a block using bonding curve
     * P(x) = slope * x + startingPrice
     */
    function calculatePrice(uint256 blockId) public pure returns (uint256) {
        if (blockId >= TOTAL_BLOCKS) blockId = TOTAL_BLOCKS - 1;
        return SLOPE * blockId + STARTING_PRICE;
    }
    
    /**
     * @dev Purchase a block
     */
    function purchaseBlock(uint256 blockId) external payable nonReentrant {
        require(blockId >= currentBlockId && blockId < TOTAL_BLOCKS, "Invalid block ID");
        require(!isTreasuryBlock(blockId), "Block reserved for treasury");
        require(blockOwner[blockId] == address(0), "Block already owned");
        require(msg.value >= calculatePrice(blockId) + FEE_AMOUNT, "Insufficient payment");
        
        uint256 price = calculatePrice(blockId);
        uint256 fee = FEE_AMOUNT;
        
        // Transfer ownership
        blockOwner[blockId] = msg.sender;
        ownedBlocks[msg.sender].push(blockId);
        ownershipCount[msg.sender]++;
        currentBlockId = blockId + 1;
        
        // Collect fee
        totalFeesCollected += fee;
        
        // Emit events
        emit BlockPurchased(msg.sender, blockId, price, fee);
        emit FeeCollected(fee, totalFeesCollected);
        
        // Refund excess payment
        if (msg.value > price + fee) {
            payable(msg.sender).transfer(msg.value - price - fee);
        }
    }
    
    /**
     * @dev Purchase multiple consecutive blocks
     */
    function purchaseBlocks(uint256 startBlockId, uint256 count) external payable nonReentrant {
        require(startBlockId >= currentBlockId, "Start block not available");
        require(!isTreasuryBlock(startBlockId), "Range overlaps treasury");
        require(startBlockId + count <= TOTAL_BLOCKS, "Exceeds total supply");
        require(count > 0 && count <= 1000, "Invalid count");
        
        uint256 totalPrice = 0;
        
        for (uint256 i = 0; i < count; i++) {
            uint256 blockId = startBlockId + i;
            require(blockOwner[blockId] == address(0), "Block already owned");
            totalPrice += calculatePrice(blockId);
        }
        
        uint256 fee = FEE_AMOUNT * count;
        require(msg.value >= totalPrice + fee, "Insufficient payment");
        
        // Transfer ownership
        for (uint256 i = 0; i < count; i++) {
            uint256 blockId = startBlockId + i;
            blockOwner[blockId] = msg.sender;
            ownedBlocks[msg.sender].push(blockId);
            ownershipCount[msg.sender]++;
        }
        
        currentBlockId = startBlockId + count;
        totalFeesCollected += fee;
        
        emit FeeCollected(fee, totalFeesCollected);
        
        // Refund excess
        if (msg.value > totalPrice + fee) {
            payable(msg.sender).transfer(msg.value - totalPrice - fee);
        }
    }
    
    /**
     * @dev Get blocks owned by an address.
     *      For the treasury address, returns the full reserved range [0, TREASURY_ALLOCATION)
     *      virtually rather than from storage (since the constructor no longer populates the mapping).
     *      For all other addresses the mapping is the source of truth.
     */
    function getOwnedBlocks(address owner) external view returns (uint256[] memory) {
        if (owner == treasuryAddress) {
            uint256[] memory blocks = new uint256[](TREASURY_ALLOCATION);
            for (uint256 i = 0; i < TREASURY_ALLOCATION; i++) {
                blocks[i] = i;
            }
            return blocks;
        }
        return ownedBlocks[owner];
    }
    
    /**
     * @dev Resolve the owner of any block, respecting the implicit treasury range.
     */
    function ownerOf(uint256 blockId) external view returns (address) {
        require(blockId < TOTAL_BLOCKS, "Invalid block ID");
        if (isTreasuryBlock(blockId)) return treasuryAddress;
        return blockOwner[blockId];
    }
    
    /**
     * @dev Check if vesting has started (after cliff period)
     */
    function isVestingActive() public view returns (bool) {
        return block.timestamp >= launchTime + CLIFF_PERIOD;
    }
    
    /**
     * @dev Calculate vesting progress (0-100%)
     */
    function vestingProgress() public view returns (uint256) {
        if (!isVestingActive()) return 0;
        
        uint256 timeSinceCliff = block.timestamp - (launchTime + CLIFF_PERIOD);
        uint256 progress = (timeSinceCliff * 100) / VESTING_DURATION;
        return progress > 100 ? 100 : progress;
    }
    
    /**
     * @dev Get releasable treasury amount
     */
    function getReleasableTreasury() public view returns (uint256) {
        uint256 progress = vestingProgress();
        return (TREASURY_ALLOCATION * progress) / 100 - treasuryReleased;
    }
    
    /**
     * @dev Release vested treasury tokens (only owner)
     */
    function releaseTreasury(address recipient, uint256 amount) external onlyOwner {
        require(isVestingActive(), "Vesting not active");
        uint256 releasable = getReleasableTreasury();
        require(amount <= releasable, "Amount exceeds releasable");
        
        treasuryReleased += amount;
        vestedBalances[recipient] += amount;
        
        emit TreasuryReleased(recipient, amount);
    }
    
    /**
     * @dev Update treasury address (only owner)
     */
    function updateTreasuryAddress(address newAddress) external onlyOwner {
        address oldAddress = treasuryAddress;
        treasuryAddress = newAddress;
        emit TreasuryAddressUpdated(oldAddress, newAddress);
    }
    
    /**
     * @dev Withdraw collected fees (only owner)
     */
    function withdrawFees(address recipient) external onlyOwner {
        uint256 amount = totalFeesCollected;
        require(amount > 0, "No fees to withdraw");
        
        totalFeesCollected = 0;
        payable(recipient).transfer(amount);
    }
    
    /**
     * @dev Get contract stats
     */
    function getStats() external view returns (
        uint256 _currentBlockId,
        uint256 _blocksSold,
        uint256 _blocksAvailable,
        uint256 _totalFees,
        uint256 _vestingProgress,
        bool _vestingActive
    ) {
        _currentBlockId = currentBlockId;
        _blocksSold = currentBlockId;
        _blocksAvailable = TOTAL_BLOCKS - currentBlockId;
        _totalFees = totalFeesCollected;
        _vestingProgress = vestingProgress();
        _vestingActive = isVestingActive();
    }
}
