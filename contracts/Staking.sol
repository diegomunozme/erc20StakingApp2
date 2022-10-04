// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Staking {
    address public owner;

    //Giving the values to the total tokens available on our staking app
    uint public currentTokenId = 1; // starting at 1

    struct Token {
        uint tokenId;
        string name;
        string symbol;
        address tokenAddress;
        uint usdPrice;
        uint ethPrice; //Paying out intrerest in ether for this application
        uint apy; //hardcoding the APY
    }

    struct Position {
        //Staked tokens by a particular user are positions
        uint positionId;
        address walletAddress;
        string symbol;
        string name;
        uint createdDate;
        uint apy;
        uint tokenQuantity;
        uint usdValue;
        uint ethValue;
        bool open;
    }

    uint public ethUsdPrice;

    string[] public tokenSymbols; //string of all tokens stored on this platform

    mapping(string => Token) public tokens;

    uint public currentPositionId = 1;

    mapping(uint => Position) public positions;

    mapping(address => uint[]) public positionIdsByAddress;

    mapping(string => uint) public stakedTokens; //Total Staked tokens to be displayed in the UI

    constructor(uint currentEthPrice) payable {
        ethUsdPrice = currentEthPrice;
        owner = msg.sender;
    }

    function addToken(
        //This allows for only the whitelisted tokens to be listed on this website
        string calldata name,
        string calldata symbol,
        address tokenAddress,
        uint usdPrice,
        uint apy
    ) external onlyOwner {
        tokenSymbols.push(symbol);
        tokens[symbol] = Token(
            currentTokenId,
            name,
            symbol,
            tokenAddress,
            usdPrice,
            usdPrice / ethUsdPrice,
            apy
        );
        currentTokenId += 1;
    }

    modifier onlyOwner() {
        require(owner == msg.sender, "only owner can run this contract");
        _;
    }

    function getTokenSymbols() public view returns (string[] memory) {
        return tokenSymbols; //returns an array of the token symbols added to the front end
    }

    function getToken(string calldata tokenSymbol)
        public
        view
        returns (Token memory)
    {
        return tokens[tokenSymbol];
    }

    function stakeTokens(string calldata symbol, uint tokenQuantity) external {
        //Since the default index position in solidity is 0,
        // if there is a token staked that is not found in the mapping which began at ID 1
        // its rejected
        require(tokens[symbol].tokenId != 0, "This token cannot be staked");

        IERC20(tokens[symbol].tokenAddress).transferFrom(
            msg.sender,
            address(this),
            tokenQuantity
        );

        positions[currentPositionId] = Position(
            currentPositionId,
            msg.sender,
            tokens[symbol].name,
            symbol,
            block.timestamp,
            tokens[symbol].apy,
            tokenQuantity,
            tokens[symbol].usdPrice * tokenQuantity,
            (tokens[symbol].usdPrice * tokenQuantity) / ethUsdPrice,
            true
        );
        positionIdsByAddress[msg.sender].push(currentPositionId);
        currentPositionId += 1;
        stakedTokens[symbol] += tokenQuantity;
    }

    function getPositionIdsForAddress() external view returns (uint[] memory) {
        return positionIdsByAddress[msg.sender];
    }

    function getPositionById(uint positionId)
        external
        view
        returns (Position memory)
    {
        return positions[positionId];
    }

    function calculateInterest(
        uint apy,
        uint value,
        uint numberDays
    ) public pure returns (uint) {
        return (apy * value * numberDays) / 1000 / 365;
    }

    function closePosition(uint positionId) external {
        require(
            positions[positionId].walletAddress == msg.sender,
            "Not the owner of this position"
        );
        require(positions[positionId].open == true, "Position Already closed");

        positions[positionId].open = false; // changing the boolean struct value

        IERC20(tokens[positions[positionId].symbol].tokenAddress).transfer(
            msg.sender,
            positions[positionId].tokenQuantity
        );

        uint numberDays = calculateNumberDays(
            positions[positionId].createdDate
        );

        uint weiAmount = calculateInterest(
            positions[positionId].apy,
            positions[positionId].ethValue,
            numberDays
        );

        payable(msg.sender).call{value: weiAmount};
    }

    function calculateNumberDays(uint createdDate) public view returns (uint) {
        return (block.timestamp - createdDate) / 60 / 60 / 24;
    }

    function modifyCreatedDate(uint positionId, uint newCreatedDate)
        external
        onlyOwner
    {
        positions[positionId].createdDate = newCreatedDate;
    }
}
