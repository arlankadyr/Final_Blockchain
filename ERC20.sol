//SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;


interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

contract ERC20 is IERC20 {

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    uint256 public override totalSupply;
    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public override allowance;

    string public name;
    string public symbol;
    uint8 public decimals;

    constructor(
        string memory _name,
        string memory _symbol
    ) {
        name = _name;
        symbol = _symbol;
        decimals = 18;
    }

    function transfer(address recipient, uint256 amount) public override returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Not enough balance");

        balanceOf[msg.sender] -= amount;
        balanceOf[recipient] += amount;
        
        emit Transfer(msg.sender, recipient, amount);
        return true;
    }


    function approve(address spender, uint256 amount) public override returns (bool) {
        allowance[msg.sender][spender] = amount;

        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public override returns (bool) {
        require(balanceOf[sender] >= amount, "Not enough balance");
        require(allowance[sender][msg.sender] >= amount, "Allowance exceeded");

        allowance[sender][msg.sender] -= amount;
        balanceOf[sender] -= amount;
        balanceOf[recipient] += amount;

        emit Transfer(sender, recipient, amount);
        return true;
    }

    function _mint(address to, uint256 amount) internal {
        totalSupply += amount;
        balanceOf[to] += amount;

        emit Transfer(address(0), to, amount);
    }
}

