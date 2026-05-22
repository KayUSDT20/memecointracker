import { agent } from './agent.js';

console.log("Initializing LIVE Dexscreener & GeckoTerminal listener...");

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

    // Poller to fetch trending and new pools from GeckoTerminal
    async function fetchGeckoTerminalPools() {
        try {
            // Fetch trending pools
            const trendingRes = await fetch(`https://api.geckoterminal.com/api/v2/networks/solana/trending_pools`, {
                headers: { 'Accept': 'application/json;version=20230203' }
            });
            if (trendingRes.ok) {
                const data = await trendingRes.json();
                if (data.data) {
                    processGeckoPools(data.data);
                }
            }

            // Small delay to prevent hitting rate limit aggressively
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Fetch new pools
            const newRes = await fetch(`https://api.geckoterminal.com/api/v2/networks/solana/new_pools`, {
                headers: { 'Accept': 'application/json;version=20230203' }
            });
            if (newRes.ok) {
                const data = await newRes.json();
                if (data.data) {
                    processGeckoPools(data.data);
                }
            }
        } catch (e) {
            console.error("[GeckoTerminal Poller Error]", e.message);
        }
    }

    function processGeckoPools(pools) {
        for (const pool of pools) {
            const baseTokenId = pool.relationships?.base_token?.data?.id;
            const quoteTokenId = pool.relationships?.quote_token?.data?.id;
            
            const baseAddress = baseTokenId ? baseTokenId.split('solana_')[1] : null;
            const quoteAddress = quoteTokenId ? quoteTokenId.split('solana_')[1] : null;
            
            if (!baseAddress) continue;
            
            const isBaseSol = baseAddress === 'So11111111111111111111111111111111111111112';
            const tokenAddress = isBaseSol ? quoteAddress : baseAddress;
            
            if (!tokenAddress || processedAddresses.has(tokenAddress)) continue;
            
            const parts = pool.attributes.name.split(' / ');
            const symbol = isBaseSol ? (parts[1] || 'UNKNOWN') : (parts[0] || 'UNKNOWN');
            const name = symbol;
            const marketCap = parseFloat(pool.attributes.market_cap_usd || pool.attributes.fdv_usd || 0);
            
            if (marketCap > 0) {
                // Synthesize Dexscreener pair structure
                const syntheticPair = {
                    baseToken: {
                        address: tokenAddress,
                        symbol: symbol,
                        name: name
                    },
                    marketCap: marketCap,
                    liquidity: { usd: parseFloat(pool.attributes.reserve_in_usd || 0) },
                    volume: { h24: parseFloat(pool.attributes.volume_usd?.h24 || 0) },
                    dexId: pool.relationships?.dex?.data?.id || 'geckoterminal',
                    isGecko: true,
                    poolAddress: pool.attributes.address,
                    url: `https://www.geckoterminal.com/solana/pools/${pool.attributes.address}`
                };
                
                pairQueue.push(syntheticPair);
                processedAddresses.add(tokenAddress);
            }
        }
    }

    // Initial fetch
    fetchNewPairs();
    fetchGeckoTerminalPools();
    
    // Poll for new pairs every 45 seconds (Dexscreener)
    setInterval(fetchNewPairs, 45000);
    // Poll for trending/new pools every 60 seconds (GeckoTerminal)
    setInterval(fetchGeckoTerminalPools, 60000);

    // Stream a queued pair every 15 seconds to keep the dashboard active
    setInterval(() => {
        if (pairQueue.length === 0) return;

        const pair = pairQueue.shift();
        if (!pair) return;

        let source = 'Dexscreener';
        if (pair.dexId === 'pump-fun') {
            source = 'Pump.fun';
        } else if (pair.isGecko) {
            source = 'GeckoTerminal';
        }

        const token = {
            address: pair.baseToken.address,
            symbol: pair.baseToken.symbol,
            name: pair.baseToken.name,
            marketCap: parseFloat(pair.marketCap || 0),
            liquidity: `$${parseFloat(pair.liquidity?.usd || 0).toLocaleString()}`,
            volume24h: `$${parseFloat(pair.volume?.h24 || 0).toLocaleString()}`,
            source: source,
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
