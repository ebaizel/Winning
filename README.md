## Cloning
If you are cloning this repo, add this flag `git clone --recursive` so it pulls in the `ethereum-bridge` submodule.

## Running Oraclize

Oraclize is already deployed on the mainnet and test networks.  However, you need to deploy it to your local blockchains (ganache).  To do this:

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

## Notes

Ideally we'd listen to emitted contract `events` and update the UI when certain events trigger.  However, Metamask doesn't currently support subscribing to events https://github.com/MetaMask/metamask-extension/issues/2350