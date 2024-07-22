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
const pushoverEnabled = process.env.PUSHOVER !== 'false'; // Check if Pushover is enabled

// Global object to track unregistration status
const producerUnregistered = {};
// Initialize an object to hold the unregistration status for each network type
let producerUnregStatus = {
  mainnet: false,
  testnet: false
};
// Variable to track whether monitoring process is already running to 
// prevent duplication when producer is pending removal
let isRunning = false;
//Set pushovercont for sending pending removal message
let pushoverCount = { mainnet: 0, testnet: 0 }; 



// Pushover loading
const push = new Pushover({
  user: process.env.PUSHOVER_USER,
  token: process.env.PUSHOVER_TOKEN
});

function sendPushoverNotification(message, title, sound, priority) {
  if (!pushoverEnabled) return; 

  const msg = {
    message: message,
    title: title,
    sound: sound,
    priority: priority
  };

  push.send(msg, function (err, result) {
    if (err) {
      console.log(`Error sending Pushover message for ${title}:`, err);
    } else {
      console.log(`Pushover message sent for ${title}:`, result);
    }
  });
}

// Sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


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


// Function to pause and resume BP
async function manageBlockProducers(networkType) {
  let primaryBP, backupBP;

  if (networkType === 'mainnet') {
    primaryBP = process.env.MAINNET_PRIMARY_BP;
    backupBP = process.env.MAINNET_BACKUP_BP;
  } else if (networkType === 'testnet') {
    primaryBP = process.env.TESTNET_PRIMARY_BP;
    backupBP = process.env.TESTNET_BACKUP_BP;
  }

  if (primaryBP === 'false' || backupBP === 'false') {
    console.log(`Skipping resuming and pausing of block producer on ${networkType} because one or more endpoints are set to 'false'.`);
    return;
  }

  const pauseUrl = `http://${primaryBP}/v1/producer/pause`;
  const resumeUrl = `http://${backupBP}/v1/producer/resume`;

  // Attempt to pause the primary block producer
  try {
    const pauseResponse = await fetch(pauseUrl, { method: 'GET' });
    console.log(`Paused primary block producer on ${networkType}:`, await pauseResponse.json());
  } catch (error) {
    console.log(`Error pausing primary block producer on ${networkType}:`, error);
  }

  // Attempt to resume the backup block producer
  try {
    const resumeResponse = await fetch(resumeUrl, { method: 'GET' });
    console.log(`Resumed backup block producer on ${networkType}:`, await resumeResponse.json());
    sendPushoverNotification(
      `Attempted pausing primary producer on WAX ${networkType} and resuming backup BP.`,
      "Attempted pausing and resuming BPs",
      'cosmic',
      0
    );
  } catch (error) {
    console.log(`Error resuming backup block producer on ${networkType}:`, error);
  }
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


async function checkUnregstatus(nodeName, networkType) {
   
  const mainnetUrl = 'https://missm.sentnl.io/unregging';
  const testnetUrl =  'https://misst.sentnl.io/unregging';
  const url = networkType === 'mainnet' ? mainnetUrl : testnetUrl;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const owner_name = data.owner_name;
    if (owner_name === null) {
      return false;
    } else if (nodeName === owner_name) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.log('Error checking unreg table:', error);
    throw error;
  }

}

async function monitorProducers() {
  if (isRunning) {
    console.log("Still running. Skipping this schedule.");
    return;
  }

  isRunning = true;
  try {
    const unregKey = process.env.UNREG_KEY; 
    const testnetNodeName = process.env.TESTNET_NODE_NAME;
    const missed_rounds = process.env.MISSED_ROUNDS || 1;
    //const pushoverEnabled = process.env.PUSHOVER !== 'false'; // Check if Pushover is enabled
    
    const currentDate = new Date();
    const endDate = new Date(currentDate.getTime() - 180000); //3 minutes ago
    const startDate = new Date(currentDate.getTime() - 240000);  //4 minutes ago

    

    const urls = {
      mainnet: `https://missm.sentnl.io/missing-blocks?ownerName=${mainnetNodeName}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
      testnet: `http://misst.sentnl.io/missing-blocks?ownerName=${testnetNodeName}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
    };

    for (const [networkType, url] of Object.entries(urls)) {
      const nodeName = networkType === 'mainnet' ? mainnetNodeName : testnetNodeName;
      const nodeKey = `${nodeName}-${networkType}`;
      const missedBlocks = await checkMissedBlocks(nodeName, url);
      const threshold = 12 * missed_rounds;
      producerUnregStatus[networkType] = await checkUnregstatus(nodeName, networkType);
      console.log(`Checking producer ${nodeName} on WAX ${networkType}`);

      if (missedBlocks >= threshold) {
        // Pause and Resume BPs
        try {
            await manageBlockProducers(networkType)
          } catch (error) {
            console.log(`Failed to pause and resume block producers on ${networkType}:`, error);
        }
        if (!producerUnregistered[nodeKey]) {
   
          // Unregister Producer
          try {
            await unregisterProducer(unregKey, nodeName, networkType);
            producerUnregistered[nodeKey] = true;
            sendPushoverNotification(
              `Your producer ${nodeName} on WAX ${networkType} has missed ${missedBlocks} blocks and has been unregistered.`,
              "Producer Unregistered",
              'magic',
              1
            );
            console.log(`Your producer ${nodeName} on WAX ${networkType} has missed ${missedBlocks} blocks and has been unregistered.`);
            let attempts = 0;
            while (attempts < 4) {
              console.log(`Checking for producer to show as pending for removal attempt ${attempts}`);
              producerUnregStatus[networkType] = await checkUnregstatus(nodeName, networkType);
              if (producerUnregStatus[networkType]) {
                break;
              }
              attempts++;
              await sleep(30000); // Wait for 30 seconds before the next check
            }
          } catch (error) {
            console.log(`Failed to unregister producer ${nodeName} on ${networkType}:`, error);
          }
        }
        if (producerUnregStatus[networkType]) {
          pushoverCount[networkType] += 1;
          console.log(`Producer ${nodeName} on ${networkType} has been unregistered and is pending removal.`);
          if (pushoverCount[networkType] <= 1) {
            sendPushoverNotification(
              `Your producer ${nodeName} on WAX ${networkType} is pending removal.`,
              "Producer pending removal",
              'cosmic',
              0
            );
          }
        } else {
          console.log(`Producer ${nodeName} on ${networkType} has been unregistered but new schedule has not been proposed`);
        }
      } else if (!producerUnregStatus[networkType]) {
        if (pushoverCount[networkType] > 1){
          sendPushoverNotification(
            `Your producer ${nodeName} on WAX ${networkType} is no longer in schedule.`,
            "Producer no longer in schedule",
            'magic',
            1
          );
        }
        pushoverCount[networkType] = 0; // Reset pushover count for the specific network type
        producerUnregistered[nodeKey] = false; // Set Producer unregistered to False after no longer being in schedule
        console.log(`${nodeName} on ${networkType} has missed ${missedBlocks} blocks between ${startDate.toTimeString().split(' ')[0]} - ${endDate.toTimeString().split(' ')[0]}`);
      }
    }
  } catch (error) {
    console.log('Error monitoring producers:', error);
  } finally {
    isRunning = false;
    console.log("Monitoring cycle complete, ready for next schedule.");
  }
}

function main() {
  // Schedule the monitoring function to run every 30 seconds
  schedule.scheduleJob('*/30 * * * * *', monitorProducers);
  console.log(`Monitoring has started for ${mainnetNodeName}, checking mainnet and testnet producers every minute.`);

}

main();

