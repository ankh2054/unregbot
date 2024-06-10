import Fastify from 'fastify';
const fastify = Fastify({ logger: true });
import { Session } from "@wharfkit/session"
import { WalletPluginPrivateKey } from "@wharfkit/wallet-plugin-privatekey"
const WalletPluginPublicKey = require('./utils/WalletPluginPublicKey');
const jwt = require('jsonwebtoken');
import fetch from 'node-fetch';
import pg from 'pg';
const { Client } = pg;
import TelegramBot from 'node-telegram-bot-api';
import schedule from 'node-schedule';
import fs from 'fs';
const rpcEndpoints = JSON.parse(fs.readFileSync('rpc_endpoints.json', 'utf8'));


const JWT_SECRET = '32498asdflkjhaslkdfasldfladsfl£$$$DDLDLLLL'; 

// Configuration
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://unreguser:Nightshade900!@localhost:5432/unreg';
const TELEGRAM_TOKEN = '7354851679:AAF_itKyLQeIB8QWpxrQR6UUDGcU_MjGIoY';



// Initialize PostgreSQL
const dbClient = new Client({
  connectionString: DATABASE_URL,
});
dbClient.connect();

// Initialize Telegram Bot
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// Utility function to send a Telegram message
async function sendTelegramMessage(telegramUser, message) {
  try {
    await bot.sendMessage(telegramUser, message);
  } catch (error) {
    fastify.log.error('Error sending Telegram message:', error);
  }
}



// Function to unregister a producer
async function unregisterProducer(unregKey, producer, networkType) {
    const networkInfo = rpcEndpoints[networkType];
    const endpoints = networkInfo.endpoints;
    const chainId = networkInfo.chainId;  // Get the chainId from the JSON file

    const accountName = producer; // The producer's blockchain account name
    const permissionName = 'active'; // Typically 'active' or 'owner' are used for such operations

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
          actor: accountName,
          permission: permissionName,
          chain,
          walletPlugin,
        });

        const result = await session.transact({ action: unregprod });
        fastify.log.info(`Transaction successful on ${endpoint}`);
        return result;
      } catch (error) {
        fastify.log.error(`Error unregistering producer on ${endpoint}:`, error);
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
    console.log(data.totalMissedBlocks)
    return data.totalMissedBlocks;
  } catch (error) {
    fastify.log.error('Error checking missed blocks:', error);
    throw error;
  }
}

// Monitoring function
async function monitorProducers() {
  try {
    const res = await dbClient.query('SELECT * FROM unreg.producers WHERE enabled = TRUE');;
    const producers = res.rows;

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 60000);  // 1 minute ago
    console.log(`Monitoring period starts at ${startDate.toISOString()} and ends at ${endDate.toISOString()}`);

    for (const producer of producers) {
      console.log(producers)
      const urls = {
        mainnet: `https://missm.sentnl.io/missing-blocks?ownerName=${producer.mainnet}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        testnet: `https://misst.sentnl.io/missing-blocks?ownerName=${producer.testnet}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
      };

      for (const [network, url] of Object.entries(urls)) {
        const missedBlocks = await checkMissedBlocks(producer[network], url);
        const threshold = 12 * producer.rounds_threshold; // Calculate the threshold based on the rounds_threshold value
        if (missedBlocks >= threshold) {
          await unregisterProducer(producer.unreg_key, producer[network], network);
          await sendTelegramMessage(producer.telegram_user, `Your producer ${producer[network]} on WAX ${network} has missed ${missedBlocks} blocks and has been unregistered.`);
        }
      }
    }
  } catch (error) {
    fastify.log.error('Error monitoring producers:', error);
  }
}

// // Schedule the monitoring function to run every minute
schedule.scheduleJob('* * * * *', monitorProducers);

//http://localhost:3000/test?unregKey=yourKey&producer=yourProducer&networkType=mainnet
fastify.route({
  method: 'GET',
  url: '/test',
  handler: async (request, reply) => {
    const { unregKey, producer, networkType } = request.query; // Assuming these are passed as query parameters

    try {
      const result = await unregisterProducer(unregKey, producer, networkType);
      reply.send({ success: true, message: 'Producer unregistered successfully', result });
    } catch (error) {
      reply.status(500).send({ success: false, message: 'Failed to unregister producer', error: error.message });
    }
  }
});

// Login Endpoint
fastify.post('/login', async (request, reply) => {
  const { signature, transaction, chainId } = request.body;

  try {
    const isSignatureValid = WalletPluginPublicKey.verifySignature(signature, transaction, chainId);
    if (!isSignatureValid) {
      throw new Error('Signature verification failed');
    }

    const { authorization } = transaction.actions[0];
    const authorizer = authorization[0].actor;

    const userQuery = await dbClient.query('SELECT * FROM unreg.producers WHERE owner_name = $1', [authorizer]);
    let user = userQuery.rows[0];

    if (!user) {
      const insertQuery = await dbClient.query(
        'INSERT INTO unreg.producers (owner_name, enabled, rounds_threshold) VALUES ($1, FALSE, 1) RETURNING *',
        [authorizer]
      );
      user = insertQuery.rows[0];
    }

    // Create a JWT token
    const token = jwt.sign({
      username: user.owner_name,
      role: 'user' // You can add more user-specific claims here
    }, JWT_SECRET, { expiresIn: '1h' }); // Token expires in 1 hour

    reply.send({ success: true, message: 'Login successful.', token });
  } catch (error) {
    fastify.log.error('Login error:', error);
    reply.status(500).send({ success: false, message: 'Login failed. An error occurred.', error: error.message });
  }
});




// // Start the server
const start = async () => {
   try {
     await fastify.listen(PORT);
     fastify.log.info(`Server is running on port ${PORT}`);
   } catch (err) {
     fastify.log.error(err);
     process.exit(1);
   }
 }
 start();


 //await unregisterProducer('5KCSJsUAyPwqVruBK6vrAapHhr9Uxu6zFQczsDbQCUYZeYZVoYV', 'sentnlagents', 'mainnet');
 //await sendTelegramMessage('ankh2054', `Your producer ${producer[network]} on WAX ${network} has missed ${missedBlocks} blocks and has been unregistered.`);