import fs from 'fs';
const code = fs.readFileSync('src/App.tsx', 'utf-8');
const matches = [...code.matchAll(/>([^<{]+)</g)].map(m => m[1].trim()).filter(x => x.length > 2);
const counts = {};
for(const m of matches) counts[m] = (counts[m] || 0) + 1;
console.log(counts);
