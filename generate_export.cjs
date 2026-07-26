const fs = require('fs');

const futuresCode = fs.readFileSync('src/components/FuturesTrading.tsx', 'utf-8');
const serverCode = fs.readFileSync('server.ts', 'utf-8');

// Extract Kucoin part from serverCode
const kucoinStart = serverCode.indexOf('// KuCoin Futures API signing helper');
const kucoinEnd = serverCode.indexOf('// Vite middleware for development');

const kucoinSnippet = serverCode.substring(kucoinStart, kucoinEnd).trim();

const promptContent = `
Please implement the KuCoin Futures Trading page in this app with the following specifications:

### 1. Install Dependencies
Make sure the following dependencies are installed:
\`\`\`bash
npm install lightweight-charts lucide-react axios @mui/material @emotion/react @emotion/styled
\`\`\`

### 2. Environment Variables
Add these to your \`.env\` or \`.env.example\`:
\`\`\`env
KUCOIN_API_KEY=
KUCOIN_API_SECRET=
KUCOIN_API_PASSPHRASE=
\`\`\`

### 3. Backend Proxy Routes
Add the following KuCoin API proxy routes to your \`server.ts\` (before the Vite middleware section):

\`\`\`typescript
${kucoinSnippet}
\`\`\`

### 4. Frontend Component
Create a new file at \`src/components/FuturesTrading.tsx\` and paste the following code entirely:

\`\`\`tsx
${futuresCode}
\`\`\`

### 5. Integration
Import \`FuturesTrading\` into your \`App.tsx\` or router, and render it where appropriate:
\`\`\`tsx
import { FuturesTrading } from './components/FuturesTrading';

// Inside your component
<FuturesTrading />
\`\`\`
`;

fs.writeFileSync('export_prompt.md', promptContent);
console.log('Successfully created export_prompt.md');
