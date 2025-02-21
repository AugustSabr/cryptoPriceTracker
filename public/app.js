const overviewSelect = document.getElementById('overviewSelect');
const intervalSelect = document.getElementById('intervalSelect');
const investmentInput = document.getElementById('investmentInput');
const makerFeeInput = document.getElementById('makerFeeInput');

const analysisOptions = [
  { value: 'holding', text: 'Holding' },
  { value: 'sma', text: 'SMA' },
  { value: 'ema', text: 'EMA' },
  { value: "markov's chain", text: "Markov's Chain" }
];

analysisOptions.forEach(option => {
  const newOption = document.createElement('option');
  newOption.value = option.value;
  newOption.textContent = option.text;
  overviewSelect.appendChild(newOption);
});

overviewSelect.addEventListener('change', createOverviewTable);
intervalSelect.addEventListener('change', createOverviewTable);
investmentInput.addEventListener('change', createOverviewTable);

async function createOverviewTable() {
  const overviewValue = overviewSelect.value;
  const selectedText = overviewSelect.options[overviewSelect.selectedIndex].text;
  const intervalValue = intervalSelect.value;
  const intervalText = intervalSelect.options[intervalSelect.selectedIndex].text;
  const investmentValue = investmentInput.value;


  const resultContainer = document.getElementById('overviewResultContainer');
  resultContainer.innerHTML = selectedText + ' - ' + intervalText + ' datapoints';

  if (overviewValue) {
    const table = document.createElement('table');
    table.style.borderCollapse = 'collapse';
    table.style.marginTop = '20px';

    const symbols = await getSymbols();

    let tableData = [[selectedText, ...symbols]];

    switch (overviewValue) {
      case 'holding':
        let row = ['End value']
        for (let i = 0; i < symbols.length; i++) {
          let number = await calculateHoldingChange(symbols[i], intervalValue, investmentValue)          
          row.push(number)
        }
        tableData.push(row);
        break;
      case 'sma':
        tableData.push(["1", investmentValue]); // Example data for SMA
        break;
      case 'ema':
        tableData.push(["1", "102"]); // Example data for EMA
        break;
      case "markov's chain":
        tableData.push(["1", "300"]); // Example data for Markov's Chain
        break;
    }

    let newRow = ['Change'];
    for (let i = 1; i < tableData[1].length; i++) {
        let cellValue = tableData[1][i];
        if (typeof cellValue === 'number') {
          newRow.push(`${(Math.round((cellValue / investmentValue - 1) * 1000) / 1000).toFixed(3)}%`);
        } else {
            // If the cell value is not a number, you can handle it accordingly
            newRow.push('N/A');
        }
    }
    tableData.push(newRow);

    tableData.forEach((rowData) => {
      const row = document.createElement('tr');
      rowData.forEach((cellData) => {
        const cell = document.createElement(row === tableData[0] ? 'th' : 'td');
        cell.textContent = cellData;
        cell.style.border = '1px solid black';
        cell.style.padding = '8px';
        row.appendChild(cell);
      });
      table.appendChild(row);
    });
  
    resultContainer.appendChild(table);
  }
}

async function getSymbols() {
  const response = await fetch('/api/symbols');
  const symbols = await response.json();
  return symbols
}

async function loadData(symbol, interval) {
  if (!symbol) return;
  try {
      const response = await fetch(`/api/data/${symbol}/${interval}`);
      const data = await response.json();
      
      return data;
  } catch (error) {
    console.log(error);
  }
}

async function calculateHoldingChange(symbol, interval, investment) {
  const symbolData = await loadData(symbol, interval)
  
  const dataKeys = Object.keys(symbolData.data);
  

  const fee = parseFloat(makerFeeInput.value) / 100;
  const firstValue = symbolData.data[dataKeys[0]];
  const lastValue = symbolData.data[dataKeys[dataKeys.length - 1]];
  const finalValue = Math.round((investment * (1 - fee) / firstValue) * lastValue * (1 - fee) * 100) / 100;

  return finalValue
}








// // Initialize dropdown with symbols
// async function initSymbols() {
//   const response = await fetch('/api/symbols');
//   const symbols = await response.json();
  
//   const select = document.getElementById('symbolSelect');
//   symbols.forEach(symbol => {
//       const option = document.createElement('option');
//       option.value = symbol;
//       option.textContent = symbol;
//       select.appendChild(option);
//   });
// }

// // Load data when selections change
// async function loadData(symbol, interval) {
  
//   if (!symbol) return;

//   try {
//       const response = await fetch(`/api/data/${symbol}/${interval}`);
//       const data = await response.json();
      
//       return JSON.stringify(data, null, 2);
//   } catch (error) {
//     console.log(error);
//   }
// }

// // Event listeners
// document.getElementById('symbolSelect').addEventListener('change', loadData);
// document.getElementById('intervalSelect').addEventListener('change', loadData);

// // Initial setup
// initSymbols();