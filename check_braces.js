const fs = require('fs');
const content = fs.readFileSync('src/components/FuturesTrading.tsx', 'utf-8');
const lines = content.split('\n');

function checkBalance(startLine, endLine) {
  let depth = 0;
  for(let i=startLine-1; i<endLine; i++) {
    const line = lines[i];
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    depth += opens - closes;
  }
  return depth;
}

console.log("Braces 937-1095:", checkBalance(937, 1095));
