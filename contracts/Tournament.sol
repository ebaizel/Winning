pragma solidity ^0.4.24;
import "installed_contracts/oraclize-api/contracts/usingOraclize.sol";

contract Tournament is usingOraclize {

  struct Entry {
    string ipfsHash;
    string name;
  }

  enum TOURNAMENT_STATE { Created, Completed }

  event SubmittedEntry(address entrant, string ipfsHash);
  event PaidWinner(address winner, uint amount);
  event ReceivedOraclizeResult(string result);
  event LogNewOraclizeQuery(string description);

  // This is ~$10 when ETH is ~$450 USD.
  uint constant WAGER_AMOUNT_WEI = 25000000000000000;

  address owner;
  mapping (address => Entry) public entries;
  address public winner;
  uint public numEntries;
  uint public poolValueWei;  // total wei wagered
  string public winningTeam;
  string public oracleURL;

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

  constructor(string _url) public {
    assert(bytes(_url).length > 0);
    // When running tests or running locally, set the OAR here
    // OAR = OraclizeAddrResolverI(0x6f485C8BF6fc43eA212E93BBF8ce046C7f1cb475);
    owner = msg.sender;
    oracleURL = _url;
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

  function __callback(bytes32 myid, string result) public {
    if (msg.sender != oraclize_cbAddress()) revert();

    emit ReceivedOraclizeResult(result);
    winningTeam = result;
  }

  function updateResults() public {
    if (oraclize_getPrice("URL") > this.balance) {
      emit LogNewOraclizeQuery("Oraclize query was NOT sent, please add some ETH to cover for the query fee");
    } else {
      emit LogNewOraclizeQuery("Oraclize query was sent, standing by for the answer..");
      oraclize_query("URL", oracleURL);
    }
  }

}