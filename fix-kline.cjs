const fs = require('fs');
let code = fs.readFileSync('src/components/FuturesTrading.tsx', 'utf8');

const targetKlineParse = `        const formattedData = response.data.data.map((item: any) => ({
          time: (item[0] / 1000) as any,
          open: parseFloat(item[1]),
          high: parseFloat(item[3]),
          low: parseFloat(item[4]),
          close: parseFloat(item[2]),
        })).sort((a: any, b: any) => a.time - b.time);`;

const replacementKlineParse = `        // lightweight-charts needs { time, open, high, low, close }
        const formattedData = response.data.data.map((item: any) => ({
          time: (item[0] / 1000) as any,
          open: parseFloat(item[1]),
          high: parseFloat(item[2]),
          low: parseFloat(item[3]),
          close: parseFloat(item[4]),
        })).sort((a: any, b: any) => a.time - b.time);`;

if(code.includes(targetKlineParse)) {
  code = code.replace(targetKlineParse, replacementKlineParse);
  fs.writeFileSync('src/components/FuturesTrading.tsx', code);
  console.log('Fixed kline parse');
} else {
  console.log('Target block not found');
}
