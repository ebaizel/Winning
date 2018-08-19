## This project is live at [https://ebaizel.github.com/Winning](https://ebaizel.github.com/Winning)

## Overview

Welcome to the `Winning` project!  This project let two people to wager on any NFL football game.  Participants bet on either the `home` or the `away` team, and when the game has completed, an oracle is used to determine the games outcome and subsequently the winner is paid.  This project was built for the Consensys Academy final project.

## Course Notes
Please refer to [these notes](./course_notes.md) for items specific to the Consensys Academy final project guidelines.

## Cloning
If you are cloning this repo, add this flag `git clone --recursive` so it pulls in the `ethereum-bridge` submodule.

## Running Oraclize

Oraclize is already deployed on the mainnet and test networks.  However, when running and testing locally, you need to deploy it to your local blockchain (ganache).  To do this:

Start up Ganache:
```
ganache-cli
```

In another window, start the bridge from ganache to Oraclize:
```
cd ethereum-bridge
node bridge -a -9 -H 127.0.0.1 -p 8545 --dev
```

Take the outputted `OAR` value and add it to the `Tournament.sol` constructor.

## UX Notes

When interfacing with Metamask to place a bet and check the results, you will need to manually refresh to see the results.  Ideally this would be automatic, eg, we'd listen to emitted contract `events` and update the UI when certain events trigger.  However, Metamask doesn't currently support [subscribing to events](https://github.com/MetaMask/metamask-extension/issues/2350).
