import dotenv from 'dotenv';
dotenv.config();
import { Session } from "@wharfkit/session"
import { WalletPluginPrivateKey } from "@wharfkit/wallet-plugin-privatekey"
import fetch from 'node-fetch';
import schedule from 'node-schedule';
import fs from 'fs';
import Pushover from 'pushover-notifications';
const rpcEndpoints = JSON.parse(fs.readFileSync('rpc_endpoints.json', 'utf8'));

// Configuration
const mainnetNodeName = process.env.MAINNET_NODE_NAME;
// Global object to track unregistration status
const producerUnregistered = {};

// Pushover loading

const push = new Pushover({
  user: process.env.PUSHOVER_USER,
  token: process.env.PUSHOVER_TOKEN
});

// Function to unregister a producer
async function unregisterProducer(unregKey, producer, networkType) {
    const networkInfo = rpcEndpoints[networkType];
    const endpoints = networkInfo.endpoints;
    const chainId = networkInfo.chainId;  // Get the chainId from the JSON file


    const walletPlugin = new WalletPluginPrivateKey(unregKey);

    // Define the action to unregister the producer
    const unregprod = {
      account: 'eosio',
      name: 'unregprod',
      authorization: [{
        actor: producer,
        permission: 'unregprod',
      }],
      data: {
        producer: producer,
      },
    };

    // Attempt to execute the transaction on each endpoint
    for (const endpoint of endpoints) {
      try {
        // Update the chain object for each endpoint
        const chain = {
          id: chainId,
          url: endpoint
        };

        // Reinitialize the session with the updated chain object
        const session = new Session({
          actor: producer,
          permission: 'unregprod',
          chain,
          walletPlugin,
        });

        const result = await session.transact({ action: unregprod });
        console.log(`Transaction successful on ${endpoint}`);
        return result;
      } catch (error) {
        console.log(`Error unregistering producer on ${endpoint}:`, error);
        // Continue to the next endpoint
      }
    }

    throw new Error('All RPC endpoints failed');
}

// Function to check for missed blocks
async function checkMissedBlocks(producer, url) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.totalMissedBlocks;
  } catch (error) {
    console.log('Error checking missed blocks:', error);
    throw error;
  }
}


async function monitorProducers() {
  try {
    const unregKey = process.env.UNREG_KEY; 
    const testnetNodeName = process.env.TESTNET_NODE_NAME;
    const missed_rounds = process.env.MISSED_ROUNDS || 1;
    const pushoverEnabled = process.env.PUSHOVER !== 'false'; // Check if Pushover is enabled
    
    const currentDate = new Date();
    const endDate = new Date(currentDate.getTime() - 180000); //3 minutes ago
    const startDate = new Date(currentDate.getTime() - 240000);  //4 minutes ago

    const urls = {
      mainnet: `https://missm.sentnl.io/missing-blocks?ownerName=${mainnetNodeName}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
      testnet: `https://misst.sentnl.io/missing-blocks?ownerName=${testnetNodeName}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
    };

    for (const [networkType, url] of Object.entries(urls)) {
      const nodeName = networkType === 'mainnet' ? mainnetNodeName : testnetNodeName;
      const missedBlocks = await checkMissedBlocks(nodeName, url);
      const threshold = 12 * missed_rounds;

      if (missedBlocks >= threshold) {
        if (!producerUnregistered[nodeName]) {
          try {
            await unregisterProducer(unregKey, nodeName, networkType);
            // Set to true only if unregistration is successful
            producerUnregistered[nodeName] = true;
            if (pushoverEnabled) {
              const msg = {
                message: `Your producer ${nodeName} on WAX ${networkType} has missed ${missedBlocks} blocks and has been unregistered.`,
                title: "Producer Unregistered",
                sound: 'magic',
                priority: 1
              };
              push.send(msg, function (err, result) {
                if (err) {
                  console.log('Error sending Pushover message:', err);
                } else {
                  console.log('Pushover message sent:', result);
                }
              });
            }
            console.log(`Your producer ${nodeName} on WAX ${networkType} has missed ${missedBlocks} blocks and has been unregistered.`)
          } catch (error) {
            console.log(`Failed to unregister producer ${nodeName} on ${networkType}:`, error);
            // Do not update the unregistered status if the unregistration fails
          }
        } else {
          console.log(`Producer ${nodeName} on ${networkType} is already unregistered.`);
        }
      } else {
        producerUnregistered[nodeName] = false;
        console.log(`${nodeName} on ${networkType} has missed ${missedBlocks} blocks between ${startDate.toTimeString().split(' ')[0]} - ${endDate.toTimeString().split(' ')[0]}`)
      }
    }
  } catch (error) {
    console.log('Error monitoring producers:', error);
  }
}

// // Schedule the monitoring function to run every minute

function main() {
  // Schedule the monitoring function to run every 10 seconds
  schedule.scheduleJob('*/30 * * * * *', monitorProducers);
  console.log(`Monitoring has started for ${mainnetNodeName}, checking mainnet and testnet producers every minute.`);

}

main();



 //await unregisterProducer('5KCSJsUAyPwqVruBK6vrAapHhr9Uxu6zFQczsDbQCUYZeYZVoYV', 'sentnltesting', 'testnet');
