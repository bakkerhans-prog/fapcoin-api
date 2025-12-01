import { Connection, PublicKey } from "@solana/web3.js";

const RPC = "https://api.mainnet-beta.solana.com";
const connection = new Connection(RPC, "confirmed");

const TOKEN_MINT = new PublicKey(
  "8vGr1eX9vfpootWiUPYa5kYoGx9bTuRy2Xc4dNMrpump"
);

export default async function handler(req, res) {
  try {
    // Fetch largest token accounts for the mint
    const resp = await connection.getTokenLargestAccounts(TOKEN_MINT);
    const accounts = resp.value;

    const holders = [];

    for (const acc of accounts) {
      const tokenAccountInfo = await connection.getParsedAccountInfo(acc.address);
      const owner = tokenAccountInfo.value.data.parsed.info.owner;
      const amount = Number(tokenAccountInfo.value.data.parsed.info.tokenAmount.amount);

      holders.push({
        wallet: owner,
        free: amount,
        locked: 0, // placeholder
        total: amount
      });
    }

    res.status(200).json({
      token: TOKEN_MINT.toString(),
      count: holders.length,
      holders
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.toString() });
  }
}
