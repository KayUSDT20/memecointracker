import { agent } from './agent.js';

console.log("Initializing LIVE Dexscreener listener...");

const processedAddresses = new Set();
// Seed with some top known tokens to avoid spam-buying them
processedAddresses.add('EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm'); // WIF
processedAddresses.add('DezXAZ8z7PnrnRJjz3wX4mP4f25USDJmJzp2M5bSQjFi'); // BONK
processedAddresses.add('HZ1JQNWDVTJ7tJQcmvtYiwh87gLG6nabQb5SFaamPm5c'); // HPOS10I

export function startDexscreenerListener(broadcast) {
    let pairQueue = [];

    // Poller to fetch new pairs from Dexscreener using search queries
    async function fetchNewPairs() {
        try {
            const queryWords = ['solana', 'meme', 'pump', 'ai', 'dog', 'cat', 'sol'];
            const randomWord = queryWords[Math.floor(Math.random() * queryWords.length)];
            const res = await fetch(`https://api.dexscreener.com/latest/dex/search/?q=${randomWord}`);
            if (!res.ok) return;
            const data = await res.json();
            if (!data.pairs) return;

            const solanaPairs = data.pairs.filter(p => p.chainId === 'solana');
            for (const pair of solanaPairs) {
                const address = pair.baseToken.address;
                // Only queue if it's not already processed and has a valid market cap
                if (!processedAddresses.has(address) && pair.marketCap) {
                    pairQueue.push(pair);
                    processedAddresses.add(address);
                }
            }
        } catch (e) {
            console.error("[Dexscreener Poller Error]", e.message);
        }
    }

    // Initial fetch
    fetchNewPairs();
    // Poll for new pairs every 45 seconds
    setInterval(fetchNewPairs, 45000);

    // Stream a queued pair every 15 seconds to keep the dashboard active
    setInterval(() => {
        if (pairQueue.length === 0) return;

        const pair = pairQueue.shift();
        if (!pair) return;

        const token = {
            address: pair.baseToken.address,
            symbol: pair.baseToken.symbol,
            name: pair.baseToken.name,
            marketCap: parseFloat(pair.marketCap || 0),
            liquidity: `$${parseFloat(pair.liquidity?.usd || 0).toLocaleString()}`,
            volume24h: `$${parseFloat(pair.volume?.h24 || 0).toLocaleString()}`,
            source: pair.dexId === 'pump-fun' ? 'Pump.fun' : 'Dexscreener',
            timestamp: new Date().toISOString()
        };

        // Feed to client
        broadcast({
            type: 'DEX_NEW_PAIR',
            data: token
        });

        // Feed to AI Agent to scan
        agent.processNewToken(token);

    }, 15000);
}
