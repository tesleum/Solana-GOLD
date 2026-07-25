const fs = require('fs');
let content = fs.readFileSync('src/components/FuturesTrading.tsx', 'utf8');

const insertPos = content.indexOf(`{/* TAB 4: Assets (Detailed overview) */}`);
if (insertPos !== -1 && !content.includes("USDT Margin Account")) {
  const insertContent = `
          {currentTab === 'assets' && (
            <Stack spacing={3} sx={{ py: 1 }}>
              <Card sx={{ p: 3, bgcolor: alpha('#26a69a', 0.05), border: \`1px solid \${alpha('#26a69a', 0.3)}\`, borderRadius: '16px' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h6" fontWeight="900" color="#fff">USDT Margin Account</Typography>
                    <Typography variant="body2" color="text.secondary">Deposit SOL to top up your Futures USDT margin balance instantly.</Typography>
                  </Box>
                  <Button variant="contained" onClick={onTopUp} sx={{ bgcolor: '#26a69a', color: '#000', fontWeight: '900', borderRadius: '12px', '&:hover': { bgcolor: '#33c9bb' } }}>
                    TOP UP MARGIN
                  </Button>
                </Box>
              </Card>
`;
  content = content.replace(`{currentTab === 'assets' && (\n            <Stack spacing={3} sx={{ py: 1 }}>`, insertContent);
}

fs.writeFileSync('src/components/FuturesTrading.tsx', content);
