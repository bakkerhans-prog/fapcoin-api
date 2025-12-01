import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";

const RPC = "https://api.mainnet-beta.solana.com";
const connection = new Connection(RPC, "confirmed");

const LOCK_PROGRAM_ID = new PublicKey(
  "LocpQgucEQHbqNABEYvBvwoxCPsSbG91A1QaQhQQqjn"
);
const TOKEN_MINT = new PublicKey(
  "8vGr1eX9vfpootWiUPYa5kYoGx9bTuRy2Xc4dNMrpump"
);

export default async function handler(req, res) {
  try {
    // 1️⃣ Fetch all lock PDAs
    const lockAccounts = await connection.getProgramAccounts(LOCK_PROGRAM_ID);

    // 2️⃣ Aggregate locked amounts per owner
    const aggregated = {};
    for (const acc of lockAccounts) {
      try {
        const owner = new PublicKey(acc.account.data.slice(0, 32)).toString();
        const mint = new PublicKey(acc.account.data.slice(32, 64)).toString();
        const locked = Number(acc.account.data.readBigUInt64LE(64));

        if (mint !== TOKEN_MINT.toString()) continue;

        if (!aggregated[owner]) aggregated[owner] = 0;
        aggregated[owner] += locked;
      } catch (err) {
        // skip invalid accounts
      }
    }

    const owners = Object.keys(aggregated);
    const holders = [];

    // 3️⃣ Batch fetch free balances
    for (const owner of owners) {
      let free = 0;
      try {
        const ata = await getAssociatedTokenAddress(TOKEN_MINT, new PublicKey(owner));
        const accountInfo = await getAccount(connection, ata);
        free = Number(accountInfo.amount);
      } catch {
        free = 0; // no free tokens
      }

      holders.push({
        wallet: owner,
        locked: aggregated[owner],
        free,
        total: aggregated[owner] + free
      });
    }

    res.status(200).json({ token: TOKEN_MINT.toString(), count: holders.length, holders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.toString() });
  }
}
