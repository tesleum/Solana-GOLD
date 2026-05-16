const axios = require("axios");

async function check() {
  try {
    const res = await axios.get("https://api.geckoterminal.com/api/v2/networks/solana/tokens/CwFp9y4hpDDbiGAHPvHRNrCpiTtGm5C4xafwCYDSGoLd", {
      headers: {
        "x-cg-demo-api-key": "CG-KCwNLjPnDDSgnRsVzkjq6yUc"
      }
    });
    console.log("SUCCESS:", res.data.data.attributes.price_usd);
  } catch (e) {
    console.log("FAIL DEMO KEY", e.message);
  }

  try {
    const res2 = await axios.get("https://api.geckoterminal.com/api/v2/networks/solana/tokens/CwFp9y4hpDDbiGAHPvHRNrCpiTtGm5C4xafwCYDSGoLd", {
    });
    console.log("SUCCESS NO KEY:", res2.data.data.attributes.price_usd);
  } catch (e) {
    console.log("FAIL NO KEY", e.message);
  }
}
check();
