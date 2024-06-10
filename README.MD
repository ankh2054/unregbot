npm install ffastify pg @wharfkit/session @wharfkit/signing-request node-fetch util node-telegram-bot-api node-schedule


### Setup permissions for unreg

BPs need to configure a public to unreg their proucers on mainnet and testnet, the jey shold be the same on both testnet and mainnet.

```
cleos set account permission sentnlagents unregprod EOS586Pte47neaQAhGGBio5VHYujNW9JcKcFm46AQ95cyMwJGNBNx active`
cleos set action permission sentnlagents eosio unregprod unregprod
```



To remove permissions

`cleos.sh set account permission sentnlagents unregprod NULL active`