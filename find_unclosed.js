const fs = require('fs');
const content = fs.readFileSync('src/components/FuturesTrading.tsx', 'utf-8');
const lines = content.split('\n');
let depth = 0;
let tags = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Replace <Box ... /> so it doesn't count
  const cleanLine = line.replace(/<Box[^>]*\/>/g, '');
  
  const opens = (cleanLine.match(/<Box/g) || []).length;
  const closes = (cleanLine.match(/<\/Box>/g) || []).length;
  
  for(let o=0; o<opens; o++) {
    depth++;
    tags.push({line: i+1, type: 'open', depth});
  }
  for(let c=0; c<closes; c++) {
    tags.push({line: i+1, type: 'close', depth});
    depth--;
  }
}
console.log("Final depth:", depth);
if (depth > 0) {
  // Print unmatched opens
  let currentDepth = 0;
  let unclosed = [];
  tags.forEach(t => {
    if (t.type === 'open') {
      unclosed.push(t);
    } else {
      unclosed.pop();
    }
  });
  console.log("Unclosed tags:", unclosed);
}
