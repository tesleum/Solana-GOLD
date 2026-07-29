export const t = (key: string, lang: string = 'EN') => {
  const translations: Record<string, Record<string, string>> = {
    EN: {
      welcome: "Welcome to Solana GOLD",
      myGoldenNetwork: "My Golden Network",
      investInGold: "Invest in GOLD",
      goldPrice: "GOLD Price",
      solPrice: "SOL Price",
      liquiditySol: "Liquidity (SOL)",
      earnings: "Total Earnings",
      membersRecruited: "Members Recruited",
      roiCalculator: "ROI Calculator",
      comingSoon: "Coming Soon...",
      vault: "The Vault",
      network: "Royal Network",
      staking: "Staking",
      walletNotLinked: "Wallet Not Linked",
      yourOfficialId: "Your Official ID"
    }
  };
  return translations[lang]?.[key] || key;
};
