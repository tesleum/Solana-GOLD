const fs = require('fs');
const content = fs.readFileSync('src/components/FuturesTrading.tsx', 'utf-8');
const lines = content.split('\n');

function checkBalance(startLine, endLine) {
  let depth = 0;
  for(let i=startLine-1; i<endLine; i++) {
    const line = lines[i];
    // skip comments maybe? well simple string is enough
    // let's actually just count tags
    const opens = (line.match(/</g) || []).length;
    const closes = (line.match(/>/g) || []).length;
  }
}
