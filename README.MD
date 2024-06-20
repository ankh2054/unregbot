![SVG logo](https://www.sentnl.io/sentnl.svg)
          ![License MIT](https://img.shields.io/badge/license-MIT-blue.svg)
🤖 
# UNREG BOT 

### Overview

This JavaScript tool continuously monitors your producer for missing blocks by querying the missingblocks API from Sentnl.io every minute. If missing blocks are detected, you will receive notifications, and your producer will be unregistered if blocks are missed. 


### Features

**Automated Monitoring:** Checks the Sentnl.io missingblocks API every minute.
**Alerts:** Optional notifications via Pushover to keep you informed.
**Producer Unreg:** Automatically unregisters the producer if missing blocks are detected.

## 1. Setup 

### Configure a unregprod key for your Mainnet and Testnet Producers.

BPs need to configure a key to unreg their producers on mainnet and testnet, the key should be the same on both testnet and mainnet.
NOTE: When you pass the key to your container you must pass the private key.

```
cleos set account permission sentnltestin unregprod EOS8M7yRKgP7Wh6QbHq66YiSJrondQvw2yYGqCEnDN67H6GwkoYtG active
cleos set action permission sentnltestin eosio unregprod unregprod
```


### (Optional) Configure a pushover User and token 

If you want to opt in to be send a notification when you producer has been unregistered, you will need to visit https://pushover.net
You will need the USER key and TOKEN assigned to your app.


## 2. Building and running the conainer 

### To Build the Docker container

```
docker build -f Dockerfile -t unreg .
```
### To Run the Docker container

```
docker run --name unreg  \
-d -e "UNREG_KEY=5K96gLHiz3QLB6Cw3Bn8DkPaqLXPXYqQEUCMeBysNFH6uvLwfLD" \
-e "TESTNET_NODE_NAME=sentnlagents" \
-e "MAINNET_NODE_NAME=sentnlagents" \
-e "PUSHOVER=true" \
-e "PUSHOVER_USER=xxxxxxxxxxxxxx" \
-e "PUSHOVER_TOKEN=xxxxxxxxxxxxx" \
unreg:latest

## ENV Variables

|ENV & ARG                 |Value                   |Description                                                                       |
|--------------------------|------------------------|----------------------------------------------------------------------------------|
|**UNREG_KEY**             |`xxxxxxxxxxxxxxxxxxxxx` | The unreg private key you created in step 1                                      |
|**TESTNET_NODE_NAME**     |`sentnlagents`          | Name of testnet producer                                                         |
|**MAINNET_NODE_NAME**     |`sentnlagents `         | Name of mainnet producer                                                         |
|**PUSHOVER**              |`true` or `false`       | This enables or disables Pushover notifications. Defaults to true.               |
|**PUSHOVER_USER=**        |`xxxxxxxxxxxxxxxxxxxxxx`| Pushover user if using notifications                                             |
|**PUSHOVER_TOKEN**        |`xxxxxxxxxxxxxxxxxxxxxx`| Pushover token if using notifications                                            |




### 4. Errors and Logs

To check the logs of your container you can run

```docker logs unreg``` 

