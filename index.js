const https = require('https');
const fs = require('fs');

const KRKN_REST_URL = 'api.kraken.com';
const symbols = [
  'BTC',
  'ETH',
  'XRP',
  'SOL',
  'DOGE',
  'ADA',
  'TRX',
  'LINK',
  'AVAX',
  'DOT',
  'MATIC',
  'UNI',
  'SHIB',
  'LTC'
];

// Delay function to space out requests
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Funksjon for å hente OHLC data fra Kraken REST API
function getOHLCData(symbol, interval = 1) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      hostname: KRKN_REST_URL,
      path: `/0/public/OHLC?pair=${symbol}/USD&interval=${interval}`
    };

    https.get(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          if (parsedData.error && parsedData.error.length > 0) {
            throw new Error('Error from Kraken API: ' + parsedData.error.join(', '));
          }
          const TimeOpenObject = Object.fromEntries(parsedData.result[[symbol + '/USD']].map(item => [item[0], Number(item[1])]));
          // console.log(TimeOpenObject);
          resolve(TimeOpenObject);
        } catch (error) {
          console.error('Error parsing OHLC data:', error);
        }
      });
    }).on('error', (err) => {
      console.error('Request error:', err);
    });
  });
}

// Modified start function with spaced out requests
async function start() {
  for (let i = 0; i < symbols.length; i++) {
    try {
      const TimeOpenObject = await getOHLCData(symbols[i], 15);
      await updateJsonFile(TimeOpenObject, `./data/${symbols[i]}.json`);
      console.log('File update complete for ' + symbols[i]);
      
      // Delay the next request by 10 seconds (adjustable)
      await delay(60*1000);  // 1 minute between each request
    } catch (error) {
      console.error('Error fetching OHLC data:', error);
    }
  }
}


start();

setInterval(start, 3*60*60*1000) // Call every 3 hours (10 800 000 milliseconds)

function dateToLocaleString(timestamp ){
  const date = new Date(timestamp * 1000);
  return date.toLocaleString()
}

function updateJsonFile(newData, path) {
  return fs.promises.readFile(path, 'utf8')
    .then(existingData => {
      const parsedData = JSON.parse(existingData);
      const updatedData = { ...parsedData, ...newData };
      const jsonString = JSON.stringify(updatedData, null, 2);

      // console.log('first: ', dateToLocaleString(Object.keys(updatedData)[0]).toLocaleString())
      // console.log('first: ', dateToLocaleString(Object.keys(updatedData)[Object.keys(updatedData).length - 1]).toLocaleString())

      return fs.promises.writeFile(path, jsonString);
    })
    .then(() => {
      // console.log('File updated successfully');
    })
    .catch(err => {
      console.error('Error reading or writing file:', err);
      throw err;
    });
}