pragma solidity ^0.4.24;
import "installed_contracts/oraclize-api/contracts/usingOraclize.sol";
import "installed_contracts/jsmnsol-lib/contracts/JsmnSolLib.sol";

contract Tournament is usingOraclize {

  event SubmittedEntry(address entrant, string ipfsHash);
  event PaidWinner(address winner, uint amount);
  event ReceivedOraclizeResult(string result);
  event LogNewOraclizeQuery(string description);
  event TeamSelected(address picker, string message);

  // This is ~$10 when ETH is ~$450 USD.
  //uint constant WAGER_AMOUNT_WEI = 25000000000000000;

  address owner;
  string oracleURL;

  bool public isLocked = false;
  bool public isCompleted = false;
  bool public isWinnerPaid = false;

  uint public weiWeigered;
  uint public wagerAmount;

  address public homePicker;  // chose the home team
  address public awayPicker;  // chose the away team

  uint public homeTeamScore;  // home team points
  uint public awayTeamScore;  // away team points

  string public homeTeamName; // can set these as events to reduce storage and save $$
  string public awayTeamName;

  modifier onlyOwner() {
    require(msg.sender == owner, "User is not the contract owner.");
    _;
  }

  modifier hasSufficientFunds() {
    require(msg.value >= wagerAmount, "Insufficient funds sent.");
    _;
  }

  modifier winnerUnpaid() {
    require(!isWinnerPaid, "Winner has already been paid.");
    _;
  }

  constructor(string _url, bool isHome, string _homeTeamName, string _awayTeamName) payable public {
    assert(bytes(_url).length > 0);
    assert(msg.value > 0);

    // READ: When running tests or running locally, deploy ethereum bridge
    // and set the OAR here
    OAR = OraclizeAddrResolverI(0x6f485C8BF6fc43eA212E93BBF8ce046C7f1cb475);
    owner = msg.sender;
    oracleURL = _url;

    _logEntry(isHome);
    wagerAmount = msg.value;

    homeTeamName = _homeTeamName;
    awayTeamName = _awayTeamName;

  }

  function _logEntry(bool isHome) internal {
    if (isHome) {
      require(homePicker == address(0), "Home team has already been chosen.");
      homePicker = msg.sender;
      emit TeamSelected(msg.sender, "Home");
    } else {
      require(awayPicker == address(0), "Away team has already been chosen.");
      awayPicker = msg.sender;
      emit TeamSelected(msg.sender, "Away"); 
    }
    weiWeigered += msg.value;
  }

  function submitEntry(bool isHome) public payable hasSufficientFunds {
    require(!isLocked, "Contract is locked.");
    _logEntry(isHome);
    if ((homePicker != address(0)) && (awayPicker != address(0))) {
      isLocked = true;
    }
  }

  // function withdraw() public {
  //   require(isCompleted || (!isCompleted && !isLocked), "Contract is locked or has not yet completed.");
  //   uint winnings = address(this).balance;
  //   msg.sender.transfer(winnings);
  //   emit PaidWinner(msg.sender, winnings);
  // }

  function compareStrings (string a, string b) internal pure returns (bool){
    return keccak256(a) == keccak256(b);
  }

  function __callback(bytes32 myid, string result) winnerUnpaid public {
    if (msg.sender != oraclize_cbAddress()) revert();

    emit ReceivedOraclizeResult(result);

    // Parse the oraclize query results
    // https://medium.com/maibornwolff/a-json-parser-for-solidity-9cc73b4b42
    uint returnValue;
    JsmnSolLib.Token[] memory tokens;
    uint actualNum;

    (returnValue, tokens, actualNum) = JsmnSolLib.parse(result, 5);

    // First, make sure the game is not still being played
    JsmnSolLib.Token memory token = tokens[1];
    string memory currentIntermission = JsmnSolLib.getBytes(result, token.start, token.end);

    token = tokens[2];
    string memory currentQuarter = JsmnSolLib.getBytes(result, token.start, token.end);

    if (!compareStrings(currentIntermission, "null") || !compareStrings(currentQuarter, "null")) {
      revert("Game is still in progress.");
    } else {
      isCompleted = true;
    }

    // Second, get the team's scores and make sure they're not empty
    token = tokens[3];
    string memory awayScoreStr = JsmnSolLib.getBytes(result, token.start, token.end);

    token = tokens[4];
    string memory homeScoreStr = JsmnSolLib.getBytes(result, token.start, token.end);

    if(compareStrings(awayScoreStr, "null") || compareStrings(homeScoreStr, "null")) {
      revert("Game has not started.");
    } else {
      awayTeamScore = parseInt(awayScoreStr);
      homeTeamScore = parseInt(homeScoreStr);
    }

    // Transfer the contract's balance to the winner;
    // divide across both in the event of a tie
    uint winnings = weiWeigered;
    if (awayTeamScore > homeTeamScore) {
      // transfer to the awayPicker
      awayPicker.transfer(winnings);
      emit PaidWinner(awayPicker, winnings);
    } else if (awayTeamScore < homeTeamScore) {
      // transfer to the homePicker
      emit PaidWinner(homePicker, this.balance);
      homePicker.transfer(winnings);
      emit PaidWinner(homePicker, winnings);
      emit PaidWinner(homePicker, this.balance);
    } else {
      // transfer to both
      uint payout = winnings / 2;
      awayPicker.transfer(payout);
      homePicker.transfer(payout);
      emit PaidWinner(awayPicker, payout);
      emit PaidWinner(homePicker, payout);
    }
    isWinnerPaid = true;
  }

  function updateResults() public onlyOwner winnerUnpaid {
    if (oraclize_getPrice("URL") > address(this).balance) {
      emit LogNewOraclizeQuery("Oraclize query was NOT sent, please add some ETH to cover for the query fee");
    } else {
      emit LogNewOraclizeQuery("Oraclize query was sent, standing by for the answer..");
      oraclize_query("URL", oracleURL, 150000);
    }
  }

  function() public payable {}

}