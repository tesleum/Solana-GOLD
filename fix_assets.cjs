const fs = require('fs');
let content = fs.readFileSync('src/components/FuturesTrading.tsx', 'utf8');

// The closing tags are at the end of the Card.
content = content.replace(
  /<Typography variant="h5" fontWeight="900" color="#fff">\s*\$\{activeBalanceTotal.toLocaleString\(undefined, \{ minimumFractionDigits: 2, maximumFractionDigits: 2 \}\)\} USDT\s*<\/Typography>\s*<\/Box>/g,
  '<Typography variant="h5" fontWeight="900" color="#fff">\n                  ${activeBalanceTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT\n                </Typography>\n              </Card>'
);

content = content.replace(
  /<Typography variant="h5" fontWeight="900" sx=\{\{ color: '#4caf50' \}\}>\s*\$\{activeBalanceAvailable.toLocaleString\(undefined, \{ minimumFractionDigits: 2, maximumFractionDigits: 2 \}\)\} USDT\s*<\/Typography>\s*<\/Box>/g,
  '<Typography variant="h5" fontWeight="900" sx={{ color: \'#4caf50\' }}>\n                  ${activeBalanceAvailable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT\n                </Typography>\n              </Card>'
);

fs.writeFileSync('src/components/FuturesTrading.tsx', content);
