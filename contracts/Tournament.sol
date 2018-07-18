pragma solidity ^0.4.24;

contract Tournament {

  struct Entry {
    string ipfsHash;
    string name;
  }

  enum TOURNAMENT_STATE { Created, Completed }

  event SubmittedEntry(address entrant, string ipfsHash);
  event PaidWinner(address winner, uint amount);

  // This is ~$10 when ETH is ~$450 USD.
  uint constant WAGER_AMOUNT_WEI = 25000000000000000;

  address owner;
  mapping (address => Entry) public entries;
  address public winner;
  uint public numEntries;
  uint public poolValueWei;  // total wei wagered

  modifier onlyOwner() {
    require(msg.sender == owner);
    _;
  }

  modifier isWinner() {
    require(msg.sender == winner);
    _;
  }

  modifier hasSufficientFunds() {
    require(msg.value >= WAGER_AMOUNT_WEI);
    _;
  }

  constructor() public {
    owner = msg.sender;
  }

  function submitEntry(string ipfsHash, string name) public payable hasSufficientFunds {
    entries[msg.sender] = Entry(ipfsHash, name);
    poolValueWei += msg.value;
    numEntries++;
  }

  function setWinner(address _winner) public onlyOwner {
    require(winner == address(0));
    winner = _winner;
  }

  function getWinner() public view returns (address, string) {
    require(winner != address(0));
    return(winner, entries[winner].name);
  }

  function withdraw() public isWinner {
    uint winnings = address(this).balance;
    msg.sender.transfer(winnings);
    emit PaidWinner(msg.sender, winnings);
  }
}