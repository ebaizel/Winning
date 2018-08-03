var Tournament = artifacts.require("./Tournament.sol");

function waitForOraclizeCallbackEvent(instance, cb) {
  const event = instance.ReceivedOraclizeResult();
  event.watch(cb);
}

contract('Tournament Result', function(accounts) {

  let tournamentInstance;
  const oracleURL = "json(http://httpbin.org/get?winner=detroit).args.winner";

  // Since we have constructor parameters, we can't use the migration-deployed instance
  beforeEach("create test contract", async function() {
    tournamentInstance = await Tournament.new(oracleURL);
  });

  it("should fetch a result", function() {
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
      const winner = await tournamentInstance.winningTeam();
      assert.equal(winner, "detroit");
    }).catch(assert);
  });

});
