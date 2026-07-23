const fs = require('fs');
const content = fs.readFileSync('src/components/FuturesTrading.tsx', 'utf-8');
const lines = content.split('\n');

let depth = 0;
for (let i = 1098; i < lines.length; i++) {
  const line = lines[i];
  const cleanLine = line.replace(/<Box[^>]*\/>/g, '');
  depth += (cleanLine.match(/<Box/g) || []).length;
  depth -= (cleanLine.match(/<\/Box>/g) || []).length;
}
console.log("Box depth at bottom:", depth);
