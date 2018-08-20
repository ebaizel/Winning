## EthPM
The course suggested incorporating EthPM, and this project imports the [jsmnsol-lib](https://www.ethpm.com/registry/packages/26) package from EthPM.

## Oraclize
The course suggested incorporating an oracle, and this project utilizes [Oraclize](http://www.oraclize.it/).

## Testing
Since the 2018 NFL season has not begun, the best way to test this end to end is to wager on a game from last season that has already completed.  There is a hardcoded game which you can test with, which will allow you to wager on both teams, and then verify the result with the oracle, which will then trigger paying out the winner.

To test that, visit this [link](https://ebaizel.github.io/Winning/#/tournament?home=DET&away=GB&date=2017-12-31).  Try to run it on your local `ganache` instance because Oraclize is having issues with Rinkeby at the time I'm writing this, where the Oraclize query callbacks are not being triggered.

## Test Networks

An instance of this contract is created for each wager.  An example of this when run on the Rinkeby test network is this contract:
[https://rinkeby.etherscan.io/address/0x45e02a203d27463c95bdbffdc60c0ea3e85de24d](https://rinkeby.etherscan.io/address/0x45e02a203d27463c95bdbffdc60c0ea3e85de24d)