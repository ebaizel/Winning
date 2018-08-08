var Tournament = artifacts.require("./Tournament.sol");

function waitForOraclizeCallbackEvent(instance, cb) {
  const event = instance.ReceivedOraclizeResult();
  event.watch(cb);
}

contract('Tournament Result: completed', function(accounts) {

  let tournamentInstance;
  const oracleURL = "json(https://6f66a3d1-4b1e-4858-a1e6-6dd748:MYSPORTSFEEDS@api.mysportsfeeds.com/v2.0/pull/nfl/2017-2018-regular/games.json?team=det&date=20171231).games[0].score[currentIntermission, currentQuarter, awayScoreTotal, homeScoreTotal]";
  
  // Since we need to send constructor parameters, we can't use the migration-deployed instance; create the contract here instead
  beforeEach("create test contract", async function() {
    tournamentInstance = await Tournament.new(oracleURL, {value: web3.toWei(1, 'ether')});
  });

  it("should payout the winner", async function() {
    return tournamentInstance.updateResults().then(function() {
      return new Promise(function(resolve, reject) {
        waitForOraclizeCallbackEvent(tournamentInstance, function(error, result) {
          if (error) {
            return reject(error);
          } else {
            return resolve(result);
          }
        })
      })
    }).then(async result => {
      const homeScore = await tournamentInstance.homeTeamScore();
      const awayScore = await tournamentInstance.awayTeamScore();
      const completed = await tournamentInstance.isCompleted();
      assert.equal(homeScore.toNumber(), 35);
      assert.equal(awayScore.toNumber(), 11);
      assert.equal(completed, true);
    }).catch(err => {
      assert(false, err.toString());
    });
  });
});