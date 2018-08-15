## Design pattern decisions

The design patterns that were implemented include:

* Emergency stop - this is implemented in the `kill` function.  The reason this is needed is to provide a safety in case something goes awry with Oraclize before this contract has completed.  Without this, the funds could get locked up indefinitely if we are unable to query Oraclize.

* Trust with an oracle - this was designed to be open for anyone to create a wager (an instance of the Tournament.sol contract) and share that with anyone else.  There does not need to be any implicit trust as the payouts of the contract is handled by querying the Oraclize service to pull in the real world game results.