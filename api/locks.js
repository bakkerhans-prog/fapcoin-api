import { Connection, PublicKey } from "@solana/web3.js";
import { getAccount, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";

const RPC = "https://api.mainnet-beta.solana.com";
const connection = new Connection(RPC, "confirmed");

const LOCK_PROGRAM_ID = new PublicKey(
  "lockJUpy13zy7yWDeG5HqiLcczPFu1HRP3kYq9MdwW"
);

const TOKEN_MINT = new PublicKey(
  "8vGr1eX9vfpootWiUPYa5kYoGx9bTuRy2Xc4dNMrpump"
);

// Decode lock account layout (based on Jupiter Lock program)
function decodeLockAccount(buffer) {
  return {
    owner: new PublicKey(buffer.slice(0, 32)).toString(),
    mint: new PublicKey(buffer.slice(32, 64)).toString(),
    amountLocked: Number(buffer.readBigUInt64LE(64)),
    releaseTime: Number(buffer.readBigUInt64LE(72)),
  };
}

export default async function handler(req, res) {
  try {
    // 1. Fetch all accounts for the Jupiter Lock program
    const accounts = await connection.getProgramAccounts(LOCK_PROGRAM_ID);

    // 2. Filter accounts for our TOKEN_MINT
    const locks = [];
    for (const acc of accounts) {
      try {
        const decoded = decodeLockAccount(acc.account.data);
        if (decoded.mint === TOKEN_MINT.toString()) {
          locks.push(decoded);
        }
      } catch (err) {
        // skip invalid accounts
      }
    }

    // 3. Get unique owners
    const owners = [...new Set(locks.map((l) => l.owner))];

    // 4. Fetch free token balances
    const freeBalances = {};
    for (const owner of owners) {
      let totalFree = 0;
      try {
        const tokenAccounts = await connection.getTokenAccountsByOwner(
          new PublicKey(owner),
          { mint: TOKEN_MINT }
        );

        for (const t of tokenAccounts.value) {
          // decode amount
          const amount = Number(t.account.data.readBigUInt64LE(64));
          totalFree += amount;
        }
      } catch (err) {
        totalFree = 0;
      }
      freeBalances[owner] = totalFree;
    }

    // 5. Combine locked + free for response
    const holders = owners.map((owner) => {
      const locked = locks
        .filter((l) => l.owner === owner)
        .reduce((sum, l) => sum + l.amountLocked, 0);

      const free = freeBalances[owner] || 0;

      return {
        wallet: owner,
        free,
        locked,
        total: free + locked,
      };
    });

    res.status(200).json({
      token: TOKEN_MINT.toString(),
      count: holders.length,
      holders,
    });
  } catch (err) {
    console.error("API error:", err);
    res.status(500).json({ error: err.toString() });
  }
}
