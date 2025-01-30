const https = require('https');
const fs = require('fs');
const path = require('path');

// Add global error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const KRKN_REST_URL = 'api.kraken.com';
const dataDir = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const pairMap = {
  'BTC': 'XXBTZUSD',  // Bitcoin
  'ETH': 'XETHZUSD',  // Ethereum
  'XRP': 'XXRPZUSD',  // Ripple
  'SOL': 'SOLUSD',    // Solana
  'DOGE': 'XDGUSD',   // Dogecoin
  'ADA': 'ADAUSD',    // Cardano
  'TRX': 'TRXUSD',    // Tron
  'LINK': 'LINKUSD',  // Chainlink
  'AVAX': 'AVAXUSD',  // Avalanche
  'DOT': 'DOTUSD',    // Polkadot
  'MATIC': 'MATICUSD',// Polygon
  'UNI': 'UNIUSD',    // Uniswap
  'SHIB': 'SHIBUSD',  // Shiba Inu
  'LTC': 'XLTCZUSD'   // Litecoin
};

const symbols = Object.keys(pairMap);

// Delay function to space out requests
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to fetch OHLC data from Kraken REST API
function getOHLCData(symbol, interval = 1) {
  return new Promise((resolve, reject) => {
    const pair = pairMap[symbol];
    if (!pair) {
      reject(new Error(`No pair mapping found for symbol: ${symbol}`));
      return;
    }

    const options = {
      method: 'GET',
      hostname: KRKN_REST_URL,
      path: `/0/public/OHLC?pair=${pair}&interval=${interval}`
    };

    const req = https.get(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          if (parsedData.error && parsedData.error.length > 0) {
            reject(new Error(`Kraken API Error: ${parsedData.error.join(', ')}`));
            return;
          }
          const pairKey = Object.keys(parsedData.result)[0];
          const ohlcData = parsedData.result[pairKey];
          if (!ohlcData) {
            reject(new Error('No OHLC data found in response'));
            return;
          }
          const TimeOpenObject = Object.fromEntries(
            ohlcData.map(item => [item[0], Number(item[1])])
          );
          resolve(TimeOpenObject);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

async function updateJsonFile(newData, filePath) {
  try {
    let existingData = {};
    try {
      const data = await fs.promises.readFile(filePath, 'utf8');
      try {
        existingData = JSON.parse(data);
      } catch (parseError) {
        // Handle empty/corrupted files by resetting the data
        existingData = {};
      }
    } catch (readErr) {
      if (readErr.code !== 'ENOENT') throw readErr;
    }

    const updatedData = { ...existingData, ...newData };
    await fs.promises.writeFile(filePath, JSON.stringify(updatedData, null, 2));
  } catch (err) {
    console.error('Error updating JSON file:', err);
    throw err;
  }
}

// Main function to process all symbols
async function processSymbols() {
  for (const symbol of symbols) {
    try {
      // Fetch 5-minute interval data
      const ohlc5 = await getOHLCData(symbol, 5);
      await delay(60*1000); // Respect rate limit

      // Fetch 15-minute interval data
      const ohlc15 = await getOHLCData(symbol, 15);

      // Update JSON files
      const basePath = path.join(dataDir, symbol.toLowerCase());
      await updateJsonFile(ohlc5, `${basePath}5.json`);
      await updateJsonFile(ohlc15, `${basePath}15.json`);

    } catch (error) {
      console.error(`Error processing ${symbol}:`, error.message);
    }
    await delay(60*1000); // Delay before next symbol
  }
}

function getFormattedTimestamp() {
  const now = new Date();
  return now.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(',', ' -');
}

// Start initial processing and schedule subsequent runs
async function start() {
  try {
    console.log(`${getFormattedTimestamp()} - Starting data updates.`);
    await processSymbols();
    console.log(`${getFormattedTimestamp()} - Completed all data updates.`);
  } catch (error) {
    console.error('Error during data update cycle:', error);
  }
}

// Initial run
start();

// Schedule runs every 6 hours - the time it takes to get all data
setInterval(start, (6 * 60 * 60 * 1000) - (28 * 60 * 1000));