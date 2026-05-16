const fs = require('fs');

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

let content = fs.readFileSync('src/translations.ts', 'utf8');

const regex = /"[A-Z]{2,3}":\s*\{/g;
const matches = [...content.matchAll(regex)];

let offset = 0;
for (const match of matches) {
  const insertIndex = match.index + match[0].length + offset;
  let insertStr = '\n';
  for (const [k, v] of Object.entries(newKeys)) {
    insertStr += '    "' + k + '": "' + v + '",\\n';
  }
  content = content.slice(0, insertIndex) + insertStr + content.slice(insertIndex);
  offset += insertStr.length;
}

fs.writeFileSync('src/translations.ts', content);

let appContent = fs.readFileSync('src/App.tsx', 'utf8');

// Replace strings in App.tsx
appContent = appContent.replace(/>Invest in \$usGOLD</g, ">{t('investInUsGold', language)}<");
appContent = appContent.replace(/>Use Solana \(SOL\) to acquire \$usGOLD. Funds are distributed according to the Royal Network hierarchy.</g, ">{t('investDesc', language)}<");
appContent = appContent.replace(/>You pay \(Estimated\)</g, ">{t('youPay', language)}<");
appContent = appContent.replace(/>Balance:\s*\{/g, ">{t('balance', language)}: {");
appContent = appContent.replace(/>You receive</g, ">{t('youReceive', language)}<");
appContent = appContent.replace(/>Adjust Amount</g, ">{t('adjustAmount', language)}<");
appContent = appContent.replace(/>Exchange Rate</g, ">{t('exchangeRate', language)}<");
appContent = appContent.replace(/>App Pool 8% \(3000 volume\/line\)</g, ">{t('appPool8', language)}<");
appContent = appContent.replace(/>App Pool 6% \(5000 volume\/line\)</g, ">{t('appPool6', language)}<");
appContent = appContent.replace(/>App Pool 4% \(10000 volume\/line\)</g, ">{t('appPool4', language)}<");
appContent = appContent.replace(/>App Pool 2% \(30000 volume\/line\)</g, ">{t('appPool2', language)}<");
appContent = appContent.replace(/>\{isInvesting \? 'Processing\.\.\.' : `Invest \$\{investAmount\} \$usGOLD`\}</g, ">\{isInvesting ? t('processing', language) : `${t('invest', language)} ${investAmount} $usGOLD`\}<");
appContent = appContent.replace(/>\s*Your Network Overview\s*</g, ">{t('yourNetworkOverview', language)}<");
appContent = appContent.replace(/>\$usGOLD Price</g, ">{t('usGoldPrice', language)}<");
appContent = appContent.replace(/>Total Liquidity</g, ">{t('totalLiquidity', language)}<");
appContent = appContent.replace(/>Price History \(30D\)</g, ">{t('priceHistory', language)}<");
appContent = appContent.replace(/>Direct Members</g, ">{t('directMembers', language)}<");
appContent = appContent.replace(/>Active Level</g, ">{t('activeLevel', language)}<");
appContent = appContent.replace(/>Total Network</g, ">{t('totalNetwork', language)}<");
appContent = appContent.replace(/>Network Volume</g, ">{t('networkVolume', language)}<");
appContent = appContent.replace(/>Total Commissions</g, ">{t('totalCommissions', language)}<");
appContent = appContent.replace(/>Available to Claim</g, ">{t('availableToClaim', language)}<");
appContent = appContent.replace(/>\s*YOUR OFFICIAL ID\s*</g, ">{t('yourOfficialId', language)}<");
appContent = appContent.replace(/'WALLET NOT LINKED'/g, "t('walletNotLinked', language)");
appContent = appContent.replace(/>\s*Join via Upline\s*</g, ">{t('joinViaUpline', language)}<");
appContent = appContent.replace(/>Enter your referrer's Official ID to begin building your network.</g, ">{t('enterReferrer', language)}<");
appContent = appContent.replace(/label="Referrer ID"/g, 'label={t("referrerId", language)}');
appContent = appContent.replace(/>Your Connected Wallet</g, ">{t('yourConnectedWallet', language)}<");
appContent = appContent.replace(/>Verify connection</g, ">{t('verifyConnection', language)}<");
appContent = appContent.replace(/>Confirm & Join</g, ">{t('confirmJoin', language)}<");

fs.writeFileSync('src/App.tsx', appContent);
console.log('Done!');
