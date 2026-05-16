const fs = require('fs');
let c = fs.readFileSync('src/translations.ts', 'utf8');
c = c.split('\\n').join('\n');
fs.writeFileSync('src/translations.ts', c);
