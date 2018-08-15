pragma solidity ^0.4.24;
import "oraclize-api/contracts/usingOraclize.sol";
import "jsmnsol-lib/contracts/JsmnSolLib.sol";

contract Tournament is usingOraclize {

  event SubmittedEntry(address entrant, string ipfsHash);
  event PaidWinner(address winner, uint amount);
  event ReceivedOraclizeResult(string result);
  event LogNewOraclizeQuery(string description);
  event TeamSelected(address picker, string message);

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

  string public homeTeamCode; // TODO: set these as events to reduce storage and save $$
  string public awayTeamCode;
  uint public gameDate;

  /** @dev Ensures only this contract's owner can execute this call
   */
  modifier onlyOwner() {
    require(msg.sender == owner, "User is not the contract owner.");
    _;
  }

  /** @dev Ensures the current message contains enough value to cover the wager amount
   */
  modifier hasSufficientFunds() {
    require(msg.value >= wagerAmount, "Insufficient funds sent.");
    _;
  }

  /** @dev Ensures the winner has not already been paid
   */
  modifier winnerUnpaid() {
    require(!isWinnerPaid, "Winner has already been paid.");
    _;
  }

  /** @dev Instantiates the contract with a wager on one of the teams
    * @param _url the Oraclize query url to be used to track this game's status
    * @param isHome represents if the wager is on the home team (true) or away team (false)
    * @param _homeTeamCode the home team's abbreviation code, eg 'DET' for Detroit
    * @param _awayTeamCode the away team's abbreviation code
    * @param _gameDate a Unix timestamp in seconds of the start time of the game, in EDT
   */
  constructor(string _url, bool isHome, string _homeTeamCode, string _awayTeamCode, uint _gameDate) payable public {
    assert(bytes(_url).length > 0);
    assert(msg.value > 0);

    // READ: When running tests or running locally, deploy ethereum bridge
    // and set the OAR here
    OAR = OraclizeAddrResolverI(0x6f485C8BF6fc43eA212E93BBF8ce046C7f1cb475);
    owner = msg.sender;
    oracleURL = _url;

    _logEntry(isHome);
    wagerAmount = msg.value;

    homeTeamCode = _homeTeamCode;
    awayTeamCode = _awayTeamCode;
    gameDate = _gameDate;

  }

  /** @dev When a wager has been set, this updates the contract state to reflect it
    * @param isHome represents if the wager is on the home team (true) or away team (false)
   */
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

  /** @dev Place a wager on one of the teams.
    * @param isHome represents if the wager is on the home team (true) or away team (false)
   */
  function submitEntry(bool isHome) public payable hasSufficientFunds {
    require(!isLocked, "Contract is locked.");
    _logEntry(isHome);
    if ((homePicker != address(0)) && (awayPicker != address(0))) {
      isLocked = true;
    }
  }

  /** @dev Simple helper to compare strings
    * @param a first string to compare
    * @param b second string to compare
    * @return true if the strings match; otherwise, false
   */
  function compareStrings (string a, string b) internal pure returns (bool){
    return keccak256(a) == keccak256(b);
  }

  /** @dev The callback that Oraclize calls with the query result.
    * Winners are paid out if the game has ended.
    * @param myid unique identifier of this callback
    * @param result a string representation of the JSON response
   */
  function __callback(bytes32 myid, string result) public winnerUnpaid {
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

  /** @dev Queries the oracle for this contest's result
   */
  function updateResults() public onlyOwner winnerUnpaid {
    if (oraclize_getPrice("URL") > address(this).balance) {
      emit LogNewOraclizeQuery("Oraclize query was NOT sent, please add some ETH to cover for the query fee");
    } else {
      emit LogNewOraclizeQuery("Oraclize query was sent, standing by for the answer..");
      oraclize_query("URL", oracleURL, 200000);
    }
  }

  /** @dev Terminates this contract and refunds any wagers that have been placed
   */
  function kill() public onlyOwner {
    if (homePicker != address(0) && awayPicker != address(0)) {
      uint payout = weiWeigered / 2;
      awayPicker.transfer(payout);
      homePicker.transfer(payout);
      emit PaidWinner(awayPicker, payout);
      emit PaidWinner(homePicker, payout);
    } else if (homePicker != address(0)) {
      homePicker.transfer(weiWeigered);
      emit PaidWinner(homePicker, weiWeigered);
    } else if (awayPicker != address(0)) {
      awayPicker.transfer(weiWeigered);
      emit PaidWinner(awayPicker, weiWeigered);
    }
    selfdestruct(owner);
  }

  function() public payable {}

}