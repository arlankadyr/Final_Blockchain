// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRewardToken {
    function mint(address to, uint256 amount) external;
}


contract TokenizedCrowdfunding {
    struct Campaign {
        address payable creator;
        string title;
        uint256 goalWei;
        uint256 deadline;      
        uint256 raisedWei;
        bool finalized;
        bool successful;
    }

    IRewardToken public immutable rewardToken;


    uint256 public immutable rewardRate;

    Campaign[] private campaigns;

    
    mapping(uint256 => mapping(address => uint256)) public contributions;

    event CampaignCreated(uint256 indexed campaignId, address indexed creator, string title, uint256 goalWei, uint256 deadline);
    event Contributed(uint256 indexed campaignId, address indexed contributor, uint256 amountWei, uint256 mintedTokenAmount);
    event Finalized(uint256 indexed campaignId, bool successful, uint256 raisedWei);
    event Refunded(uint256 indexed campaignId, address indexed contributor, uint256 amountWei);

    constructor(address rewardTokenAddress, uint256 rewardRateTokensPerEth) {
        require(rewardTokenAddress != address(0), "token addr = 0");
        require(rewardRateTokensPerEth > 0, "rate = 0");
        rewardToken = IRewardToken(rewardTokenAddress);
        rewardRate = rewardRateTokensPerEth;
    }

    function createCampaign(
        string calldata title,
        uint256 goalWei,
        uint256 durationSeconds
    ) external returns (uint256 campaignId) {
        require(bytes(title).length > 0, "empty title");
        require(goalWei > 0, "goal = 0");
        require(durationSeconds >= 60, "min 60s");

        uint256 deadline = block.timestamp + durationSeconds;

        campaigns.push(Campaign({
            creator: payable(msg.sender),
            title: title,
            goalWei: goalWei,
            deadline: deadline,
            raisedWei: 0,
            finalized: false,
            successful: false
        }));

        campaignId = campaigns.length - 1;
        emit CampaignCreated(campaignId, msg.sender, title, goalWei, deadline);
    }

    function getCampaignCount() external view returns (uint256) {
        return campaigns.length;
    }

    function getCampaign(uint256 campaignId) external view returns (
        address creator,
        string memory title,
        uint256 goalWei,
        uint256 deadline,
        uint256 raisedWei,
        bool finalized,
        bool successful
    ) {
        require(campaignId < campaigns.length, "bad id");
        Campaign storage c = campaigns[campaignId];
        return (c.creator, c.title, c.goalWei, c.deadline, c.raisedWei, c.finalized, c.successful);
    }

    function contribute(uint256 campaignId) external payable {
        require(campaignId < campaigns.length, "bad id");
        Campaign storage c = campaigns[campaignId];

        require(block.timestamp < c.deadline, "ended");
        require(!c.finalized, "finalized");
        require(msg.value > 0, "0 value");

        c.raisedWei += msg.value;
        contributions[campaignId][msg.sender] += msg.value;

        
        uint256 minted = msg.value * rewardRate;
        rewardToken.mint(msg.sender, minted);

        emit Contributed(campaignId, msg.sender, msg.value, minted);
    }

    function finalize(uint256 campaignId) external {
        require(campaignId < campaigns.length, "bad id");
        Campaign storage c = campaigns[campaignId];

        require(!c.finalized, "already finalized");
        require(block.timestamp >= c.deadline || c.raisedWei >= c.goalWei, "too early");

        c.finalized = true;

        if (c.raisedWei >= c.goalWei) {
            c.successful = true;
            (bool ok,) = c.creator.call{value: c.raisedWei}("");
            require(ok, "transfer failed");
        } else {
            c.successful = false;
        }

        emit Finalized(campaignId, c.successful, c.raisedWei);
    }

    function claimRefund(uint256 campaignId) external {
        require(campaignId < campaigns.length, "bad id");
        Campaign storage c = campaigns[campaignId];

        require(c.finalized, "not finalized");
        require(!c.successful, "successful => no refunds");

        uint256 amount = contributions[campaignId][msg.sender];
        require(amount > 0, "nothing to refund");

        contributions[campaignId][msg.sender] = 0;

        (bool ok,) = payable(msg.sender).call{value: amount}("");
        require(ok, "refund failed");

        emit Refunded(campaignId, msg.sender, amount);
    }
}
