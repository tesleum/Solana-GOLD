const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const acquireCardOldContent = `            {/* Acquire $usGOLD Card */}
            <Card sx={{ border: \`1px solid \${alpha(theme.palette.primary.main, 0.3)}\`, boxShadow: \`0 8px 32px \${alpha(theme.palette.primary.main, 0.1)}\` }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Swap SOL to $usGOLD
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  Use Solana (SOL) to acquire $usGOLD directly to your connected wallet.
                </Typography>

                <Box sx={{ mb: 4 }}>
                  <Box sx={{ p: 2, bgcolor: alpha(theme.palette.background.paper, 0.5), borderRadius: 2, border: \`1px solid \${alpha(theme.palette.divider, 0.5)}\`, mb: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="caption" color="text.secondary">You pay (Estimated)</Typography>
                      <Typography variant="caption" color="text.secondary">Balance: {balance > 0 ? balance.toFixed(4) : '---'} SOL</Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Typography variant="h5" fontWeight="bold" sx={{ flex: 1 }}>
                        {solanaPrice ? ((investAmount * (tokenPrice || 1)) / solanaPrice).toFixed(4) : '---'}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: alpha(theme.palette.divider, 0.5), px: 1.5, py: 0.5, borderRadius: 4 }}>
                        <img src="https://solana.com/src/img/branding/solanaLogoMark.svg" alt="SOL" style={{ width: 18, height: 18 }} />
                        <Typography fontWeight="bold">SOL</Typography>
                      </Box>
                    </Stack>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'center', my: -2.5, position: 'relative', zIndex: 1 }}>
                    <Box sx={{ bgcolor: theme.palette.background.paper, p: 0.5, borderRadius: '50%', border: \`1px solid \${alpha(theme.palette.divider, 0.5)}\` }}>
                      <ArrowDownRight size={20} color={theme.palette.text.secondary} />
                    </Box>
                  </Box>

                  <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 2, border: \`1px solid \${alpha(theme.palette.primary.main, 0.2)}\`, mt: 1, mb: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="caption" color="text.secondary">You receive</Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box sx={{ flex: 1 }}>
                        <input 
                          type="number"
                          value={investAmount}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (val >= 0) setInvestAmount(val);
                          }}
                          style={{
                            width: '100%',
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: theme.palette.text.primary,
                            fontSize: '1.5rem',
                            fontWeight: 'bold',
                            fontFamily: 'inherit'
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: alpha(theme.palette.primary.main, 0.1), px: 1.5, py: 0.5, borderRadius: 4 }}>
                        <img src="https://usgold.us/wp-content/uploads/2025/08/usgold.svg" alt="$usGOLD" style={{ width: 18, height: 18 }} />
                        <Typography fontWeight="bold" color="primary.main">$usGOLD</Typography>
                      </Box>
                    </Stack>
                  </Box>

                  <Box sx={{ px: 1 }}>
                    <Typography variant="caption" color="text.secondary" gutterBottom display="block">Adjust Amount</Typography>
                    <Slider
                      value={investAmount}
                      onChange={(e, newValue) => setInvestAmount(newValue as number)}
                      min={10}
                      max={100}
                      step={1}
                      valueLabelDisplay="auto"
                      sx={{
                        color: 'primary.main',
                        '& .MuiSlider-thumb': {
                          '&:hover, &.Mui-focusVisible': {
                            boxShadow: \`0px 0px 0px 8px \${alpha('#D4AF37', 0.16)}\`,
                          },
                        },
                      }}
                    />
                  </Box>

                  <Box display="flex" justifyContent="space-between" mt={2} px={1}>
                    <Typography variant="caption" color="text.secondary">Exchange Rate</Typography>
                    <Typography variant="caption" color="text.primary" fontWeight="bold">1 SOL ≈ \${solanaPrice ? solanaPrice.toFixed(2) : '---'}</Typography>
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <Button 
                      size="small" 
                      variant="text" 
                      onClick={() => setShowDistribution(!showDistribution)}
                      endIcon={<ChevronDown size={14} style={{ transform: showDistribution ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />}
                      sx={{ fontSize: '0.65rem', p: 0, minWidth: 0, color: alpha(theme.palette.primary.main, 0.8) }}
                    >
                      {t('viewDistributionBreakdown', language)}
                    </Button>
                    <Collapse in={showDistribution}>
                      <Box sx={{ mt: 1, p: 1.5, borderRadius: 2, bgcolor: alpha('#000', 0.2), border: \`1px solid \${alpha(theme.palette.divider, 0.5)}\` }}>
                        <Stack spacing={1}>
                          <Box display="flex" justifyContent="space-between">
                            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>Royal Referrals (10 Levels)</Typography>
                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>60% Max</Typography>
                          </Box>
                          <Box display="flex" justifyContent="space-between">
                            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>Leadership (Admin 1)</Typography>
                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>20%</Typography>
                          </Box>
                          <Box display="flex" justifyContent="space-between">
                            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>App Pool 8% (3000 volume/line)</Typography>
                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>8%</Typography>
                          </Box>
                          <Box display="flex" justifyContent="space-between">
                            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>App Pool 6% (5000 volume/line)</Typography>
                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>6%</Typography>
                          </Box>
                          <Box display="flex" justifyContent="space-between">
                            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>App Pool 4% (10000 volume/line)</Typography>
                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>4%</Typography>
                          </Box>
                          <Box display="flex" justifyContent="space-between">
                            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>App Pool 2% (30000 volume/line)</Typography>
                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>2%</Typography>
                          </Box>
                          <Divider sx={{ opacity: 0.1 }} />
                          <Typography variant="caption" sx={{ fontSize: '0.6rem', color: alpha(theme.palette.text.secondary, 0.7), fontStyle: 'italic' }}>
                            *All 100% of SOL funds are distributed directly to qualifiers or system wallets.
                          </Typography>
                        </Stack>
                      </Box>
                    </Collapse>
                  </Box>
                </Box>

                <Button 
                  variant="contained" 
                  color="primary"
                  fullWidth 
                  size="large"
                  onClick={handleInvestment}
                  disabled={!isActuallyConnected || isInvesting}
                  startIcon={<Coins size={20} />}
                  sx={{ py: 1.5, fontSize: '1rem', fontWeight: 'bold' }}
                >
                  {isInvesting ? 'Swapping...' : 'Confirm Swap'}
                </Button>
              </CardContent>
            </Card>
`;

if (code.includes(acquireCardOldContent)) {
  code = code.replace(acquireCardOldContent, '');
  code = code.replace('\n\n\n', '\n\n'); 

  const newInvestCard = `            {/* Acquire $usGOLD Card */}
            <Card sx={{ border: \`1px solid \${alpha('#D4AF37', 0.5)}\`, boxShadow: \`0 8px 32px \${alpha('#D4AF37', 0.15)}\`, position: 'relative', overflow: 'hidden', mb: 3 }}>
              <Box sx={{ position: 'absolute', top: 0, right: 0, width: 200, height: 200, background: \`radial-gradient(circle, \${alpha('#D4AF37', 0.15)} 0%, transparent 70%)\`, transform: 'translate(30%, -30%)' }} />
              <CardContent sx={{ p: 4, position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1 }}>
                  <img src="https://usgold.us/wp-content/uploads/2025/08/usgold.svg" alt="$usGOLD" style={{ width: 24, height: 24 }} />
                  <Typography variant="h6" fontWeight="bold">
                    Invest in $usGOLD
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  Use Solana (SOL) to acquire $usGOLD. Funds are distributed according to the Royal Network hierarchy.
                </Typography>

                <Box sx={{ mb: 4 }}>
                  <Box sx={{ p: 2, bgcolor: alpha(theme.palette.background.paper, 0.5), borderRadius: 2, border: \`1px solid \${alpha(theme.palette.divider, 0.5)}\`, mb: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="caption" color="text.secondary">You pay (Estimated)</Typography>
                      <Typography variant="caption" color="text.secondary">Balance: {balance > 0 ? balance.toFixed(4) : '---'} SOL</Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Typography variant="h5" fontWeight="bold" sx={{ flex: 1 }}>
                        {solanaPrice ? (investAmount / solanaPrice).toFixed(4) : '---'}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: alpha(theme.palette.divider, 0.5), px: 1.5, py: 0.5, borderRadius: 4 }}>
                        <img src="https://solana.com/src/img/branding/solanaLogoMark.svg" alt="SOL" style={{ width: 18, height: 18 }} />
                        <Typography fontWeight="bold">SOL</Typography>
                      </Box>
                    </Stack>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'center', my: -2.5, position: 'relative', zIndex: 1 }}>
                    <Box sx={{ bgcolor: theme.palette.background.paper, p: 0.5, borderRadius: '50%', border: \`1px solid \${alpha('#D4AF37', 0.5)}\` }}>
                      <ArrowDownRight size={20} color="#D4AF37" />
                    </Box>
                  </Box>

                  <Box sx={{ p: 2, bgcolor: alpha('#D4AF37', 0.05), borderRadius: 2, border: \`1px solid \${alpha('#D4AF37', 0.2)}\`, mt: 1, mb: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="caption" color="text.secondary">You receive</Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box sx={{ flex: 1 }}>
                        <input 
                          type="number"
                          value={investAmount}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (val >= 0) setInvestAmount(val);
                          }}
                          style={{
                            width: '100%',
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: theme.palette.text.primary,
                            fontSize: '1.5rem',
                            fontWeight: 'bold',
                            fontFamily: 'inherit'
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: alpha('#D4AF37', 0.1), px: 1.5, py: 0.5, borderRadius: 4 }}>
                        <img src="https://usgold.us/wp-content/uploads/2025/08/usgold.svg" alt="$usGOLD" style={{ width: 18, height: 18 }} />
                        <Typography fontWeight="bold" sx={{ color: '#D4AF37' }}>$usGOLD</Typography>
                      </Box>
                    </Stack>
                  </Box>

                  <Box sx={{ px: 1 }}>
                    <Typography variant="caption" color="text.secondary" gutterBottom display="block">Adjust Amount</Typography>
                    <Slider
                      value={investAmount}
                      onChange={(e, newValue) => setInvestAmount(newValue as number)}
                      min={10}
                      max={100}
                      step={1}
                      valueLabelDisplay="auto"
                      sx={{
                        color: '#D4AF37',
                        '& .MuiSlider-thumb': {
                          '&:hover, &.Mui-focusVisible': {
                            boxShadow: \`0px 0px 0px 8px \${alpha('#D4AF37', 0.16)}\`,
                          },
                        },
                      }}
                    />
                  </Box>

                  <Box display="flex" justifyContent="space-between" mt={2} px={1}>
                    <Typography variant="caption" color="text.secondary">Exchange Rate</Typography>
                    <Typography variant="caption" color="text.primary" fontWeight="bold">1 SOL ≈ \${solanaPrice ? solanaPrice.toFixed(2) : '---'}</Typography>
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <Button 
                      size="small" 
                      variant="text" 
                      onClick={() => setShowDistribution(!showDistribution)}
                      endIcon={<ChevronDown size={14} style={{ transform: showDistribution ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />}
                      sx={{ fontSize: '0.65rem', p: 0, minWidth: 0, color: alpha('#D4AF37', 0.8) }}
                    >
                      {t('viewDistributionBreakdown', language)}
                    </Button>
                    <Collapse in={showDistribution}>
                      <Box sx={{ mt: 1, p: 1.5, borderRadius: 2, bgcolor: alpha('#000', 0.2), border: \`1px solid \${alpha('#D4AF37', 0.2)}\` }}>
                        <Stack spacing={1}>
                          <Box display="flex" justifyContent="space-between">
                            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>Royal Referrals (10 Levels)</Typography>
                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>60% Max</Typography>
                          </Box>
                          <Box display="flex" justifyContent="space-between">
                            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>Leadership (Admin 1)</Typography>
                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>20%</Typography>
                          </Box>
                          <Box display="flex" justifyContent="space-between">
                            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>App Pool 8% (3000 volume/line)</Typography>
                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>8%</Typography>
                          </Box>
                          <Box display="flex" justifyContent="space-between">
                            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>App Pool 6% (5000 volume/line)</Typography>
                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>6%</Typography>
                          </Box>
                          <Box display="flex" justifyContent="space-between">
                            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>App Pool 4% (10000 volume/line)</Typography>
                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>4%</Typography>
                          </Box>
                          <Box display="flex" justifyContent="space-between">
                            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>App Pool 2% (30000 volume/line)</Typography>
                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>2%</Typography>
                          </Box>
                          <Divider sx={{ opacity: 0.1 }} />
                          <Typography variant="caption" sx={{ fontSize: '0.6rem', color: alpha(theme.palette.text.secondary, 0.7), fontStyle: 'italic' }}>
                            *All 100% of SOL funds are distributed directly to qualifiers or system wallets.
                          </Typography>
                        </Stack>
                      </Box>
                    </Collapse>
                  </Box>
                </Box>

                <Button 
                  variant="contained" 
                  fullWidth 
                  size="large"
                  onClick={handleInvestment}
                  disabled={!isActuallyConnected || isInvesting}
                  startIcon={isInvesting ? <CircularProgress size={20} color="inherit" /> : <Coins size={20} />}
                  sx={{ 
                    py: 1.5, 
                    fontSize: '1rem', 
                    fontWeight: 'bold', 
                    bgcolor: '#D4AF37', 
                    color: '#000',
                    '&:hover': {
                      bgcolor: '#B5952F'
                    }
                  }}
                >
                  {isInvesting ? 'Processing...' : \`Invest \${investAmount} $usGOLD\`}
                </Button>
              </CardContent>
            </Card>

            {/* Investment Overview Card */}`;

  code = code.replace(`            {/* Investment Overview Card */}`, newInvestCard);

  fs.writeFileSync('src/App.tsx', code);
  console.log('Moved successfully!');
} else {
  console.log('Could not find exact text to replace.');
}

