const fs = require('fs');

async function main() {
  const translationsFile = 'src/translations.ts';
  let tContent = fs.readFileSync(translationsFile, 'utf8');

  const newKeys = {
    "investInUsGold": "Invest in $usGOLD",
    "investDesc": "Use Solana (SOL) to acquire $usGOLD. Funds are distributed according to the Royal Network hierarchy.",
    "youPay": "You pay (Estimated)",
    "balance": "Balance",
    "youReceive": "You receive",
    "adjustAmount": "Adjust Amount",
    "exchangeRate": "Exchange Rate",
    "appPool8": "App Pool 8% (3000 volume/line)",
    "appPool6": "App Pool 6% (5000 volume/line)",
    "appPool4": "App Pool 4% (10000 volume/line)",
    "appPool2": "App Pool 2% (30000 volume/line)",
    "processing": "Processing...",
    "investDynamic": "Invest {{amount}} $usGOLD",
    "yourNetworkOverview": "Your Network Overview",
    "usGoldPrice": "$usGOLD Price",
    "totalLiquidity": "Total Liquidity",
    "priceHistory": "Price History (30D)",
    "directMembers": "Direct Members",
    "activeLevel": "Active Level",
    "totalNetwork": "Total Network",
    "networkVolume": "Network Volume",
    "totalCommissions": "Total Commissions",
    "availableToClaim": "Available to Claim",
    "yourOfficialId": "YOUR OFFICIAL ID",
    "walletNotLinked": "WALLET NOT LINKED",
    "joinViaUpline": "Join via Upline",
    "enterReferrer": "Enter your referrer's Official ID to begin building your network.",
    "referrerId": "Referrer ID",
    "yourConnectedWallet": "Your Connected Wallet",
    "verifyConnection": "Verify connection",
    "confirmJoin": "Confirm & Join"
  };

  const langs = ['EN', 'ES', 'FR', 'ZH', 'AR', 'RU', 'FA', 'CKB', 'AZ', 'DE', 'IT', 'PL', 'JA', 'KO', 'ID', 'MS', 'SV'];
  
  for (const lang of langs) {
    const langKey = \`"\${lang}": {\`;
    if (tContent.includes(langKey)) {
      let insertStr = '';
      for (const [k, v] of Object.entries(newKeys)) {
        if (!tContent.includes(\`"\${k}":\`) || tContent.indexOf(\`"\${k}":\`) > tContent.indexOf(langKey) + 5000) {
          // This is a naive way, better to just parse it or do a simple replace
        }
      }
    }
  }

  // To do it properly:
  // Using esbuild or babel is hard. Let's just do regex replacing.
}

main();
