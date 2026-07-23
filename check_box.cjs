const fs = require('fs');
const content = fs.readFileSync('src/components/FuturesTrading.tsx', 'utf-8');
const lines = content.split('\n');

let depth = 0;
let stack = [];
for (let i = 936; i < 1095; i++) {
  const line = lines[i];
  
  const cleanLine = line.replace(/<Box[^>]*\/>/g, '');
  
  const opens = (cleanLine.match(/<Box/g) || []).length;
  const closes = (cleanLine.match(/<\/Box>/g) || []).length;
  
  for(let o=0; o<opens; o++) {
    depth++;
    stack.push(i+1);
  }
  for(let c=0; c<closes; c++) {
    depth--;
    stack.pop();
  }
}
console.log("Box depth:", depth);
console.log("Unclosed at lines:", stack);
