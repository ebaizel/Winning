## Avoiding Reentrancy

To avoid reentrancy attacks, the participants are paid out using the `.transfer` instead of `.send`.

## Bad Actor Behavior

There are a few scenarios that are handled.

* The contract owner can not withdraw all the funds to their account.  They can only `kill` the contract which will refund the money to both parties.  As an added security feature, we could require both participants to trigger the `kill` to avoid the case where the contrat owner kills it just because they know their bet is going to lose.

## Logic Bugs
There are tests covering all the critical functionality, in particular where money is transferred.  Also, the logic of the smart contract itself is thoroughly vetted, ensuring each team can only be bet on once, and that both parties involved place the identical waver.