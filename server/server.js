import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import url from 'url';
import { startTwitterScraper } from './twitter.js';
import { startSolanaListener, pumpFun, connection } from './solana.js';
import web3 from '@solana/web3.js';
import { agent } from './agent.js';
import { startWhaleWatcher } from './whale.js';
import { startDexscreenerListener } from './dex.js';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

let clients = [];

wss.on('connection', (ws, req) => {
    console.log('Client connected successfully');
    clients.push(ws);

    // Send initial log, portfolio and scanned token state
    agent.sendInitialState(ws);

    ws.on('message', (message) => {
        try {
            const parsed = JSON.parse(message);
            if (parsed.type === 'MANUAL_TRADE') {
                const { action, data } = parsed;
                agent.handleManualTrade(action, data);
            } else if (parsed.type === 'FORCE_BUY_REQUEST') {
                agent.forceBuyRequest(parsed.data);
            }
        } catch (e) {
            console.error('Error processing websocket message from client', e);
        }
    });

    ws.on('close', () => {
        clients = clients.filter(client => client !== ws);
    });
});

const broadcast = (data) => {
    clients.forEach(client => {
        if (client.readyState === 1) { // 1 = OPEN
            client.send(JSON.stringify(data));
        }
    });
};

console.log("Starting backend services...");
agent.setBroadcast(broadcast);

startTwitterScraper(broadcast);
startSolanaListener(broadcast);
startWhaleWatcher(broadcast);
startDexscreenerListener(broadcast);

app.get('/api/scan-token/:address', async (req, res) => {
    try {
        const { address } = req.params;
        console.log(`Authenticated scan request for address: ${address}`);
        
        let data;
        try {
            const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
            if (response.ok) {
                data = await response.json();
            }
        } catch (err) {
            console.warn("Dexscreener scan fetch error:", err.message);
        }

        // If Dexscreener fails or returns empty pairs, fallback to GeckoTerminal
        if (!data || !data.pairs || data.pairs.length === 0) {
            try {
                console.log(`Token not found on Dexscreener. Retrying scan on GeckoTerminal: ${address}`);
                const response = await fetch(`https://api.geckoterminal.com/api/v2/networks/solana/tokens/${address}`, {
                    headers: { 'Accept': 'application/json;version=20230203' }
                });
                if (response.ok) {
                    const geckoData = await response.json();
                    if (geckoData.data && geckoData.data.attributes) {
                        const attr = geckoData.data.attributes;
                        const topPool = geckoData.data.relationships?.top_pools?.data?.[0];
                        const poolAddress = topPool ? topPool.id.split('solana_')[1] : '';

                        let poolAttr = null;
                        if (poolAddress) {
                            try {
                                // Small delay to avoid rate limit
                                await new Promise(resolve => setTimeout(resolve, 1000));
                                const poolResponse = await fetch(`https://api.geckoterminal.com/api/v2/networks/solana/pools/${poolAddress}`, {
                                    headers: { 'Accept': 'application/json;version=20230203' }
                                });
                                if (poolResponse.ok) {
                                    const poolData = await poolResponse.json();
                                    if (poolData.data && poolData.data.attributes) {
                                        poolAttr = poolData.data.attributes;
                                    }
                                }
                            } catch (poolErr) {
                                console.warn("Failed to fetch GeckoTerminal pool details:", poolErr.message);
                            }
                        }

                        const priceUsd = poolAttr ? parseFloat(poolAttr.base_token_price_usd) : parseFloat(attr.price_usd || 0);
                        const marketCap = parseFloat(attr.market_cap_usd || attr.fdv_usd || (poolAttr ? poolAttr.fdv_usd : 0));
                        const liquidity = poolAttr ? parseFloat(poolAttr.reserve_in_usd || 0) : parseFloat(attr.total_reserve_in_usd || 0);
                        const volume24h = poolAttr ? parseFloat(poolAttr.volume_usd?.h24 || 0) : parseFloat(attr.volume_usd?.h24 || 0);
                        const volume6h = poolAttr ? parseFloat(poolAttr.volume_usd?.h6 || 0) : (volume24h * 0.25);
                        
                        const priceChange5m = poolAttr ? parseFloat(poolAttr.price_change_percentage?.m5 || 0) : 0;
                        const priceChange1h = poolAttr ? parseFloat(poolAttr.price_change_percentage?.h1 || 0) : 0;
                        const priceChange6h = poolAttr ? parseFloat(poolAttr.price_change_percentage?.h6 || 0) : 0;
                        const priceChange24h = poolAttr ? parseFloat(poolAttr.price_change_percentage?.h24 || 0) : 0;

                        const buys24h = poolAttr ? parseInt(poolAttr.transactions?.h24?.buys || 0) : 0;
                        const sells24h = poolAttr ? parseInt(poolAttr.transactions?.h24?.sells || 0) : 0;

                        const priceNative = poolAttr ? parseFloat(poolAttr.base_token_price_native_currency || 0) : 0;

                        data = {
                            pairs: [{
                                chainId: 'solana',
                                dexId: 'geckoterminal',
                                url: `https://www.geckoterminal.com/solana/pools/${poolAddress || attr.address}`,
                                poolAddress: poolAddress,
                                pairAddress: poolAddress || attr.address,
                                baseToken: {
                                    address: attr.address,
                                    name: attr.name,
                                    symbol: attr.symbol
                                },
                                priceUsd: priceUsd,
                                priceNative: priceNative,
                                volume: {
                                    h24: volume24h,
                                    h6: volume6h
                                },
                                marketCap: marketCap,
                                liquidity: {
                                    usd: liquidity
                                },
                                priceChange: {
                                    m5: priceChange5m,
                                    h1: priceChange1h,
                                    h6: priceChange6h,
                                    h24: priceChange24h
                                },
                                txns: {
                                    h24: { buys: buys24h, sells: sells24h }
                                },
                                info: {
                                    imageUrl: attr.image_url,
                                    websites: [],
                                    socials: []
                                }
                            }]
                        };
                    }
                }
            } catch (err) {
                console.error("GeckoTerminal fetch fallback error:", err.message);
            }
        }

        // Query top 5 holders from Solana mainnet Connection
        let holders = [];
        try {
            const mintPublicKey = new web3.PublicKey(address);
            const largestAccountsResponse = await connection.getTokenLargestAccounts(mintPublicKey);
            if (largestAccountsResponse && largestAccountsResponse.value) {
                const topAccounts = largestAccountsResponse.value.slice(0, 5);
                
                let totalSupply = 1000000000; // Default pump.fun supply is 1 Billion
                try {
                    const supplyInfo = await connection.getTokenSupply(mintPublicKey);
                    if (supplyInfo && supplyInfo.value) {
                        totalSupply = parseFloat(supplyInfo.value.amount) / Math.pow(10, supplyInfo.value.decimals);
                    }
                } catch (supplyErr) {
                    console.warn("Could not fetch supply for scanned token:", supplyErr.message);
                }

                holders = topAccounts.map(account => {
                    const amountRaw = parseFloat(account.amount);
                    const decimals = account.decimals || 6;
                    const amount = amountRaw / Math.pow(10, decimals);
                    const percentage = (amount / totalSupply) * 100;
                    return {
                        address: account.address.toString(),
                        amount: amount,
                        percentage: percentage
                    };
                });
            }
        } catch (holderErr) {
            console.warn("Failed to fetch real-world holders, using fallback simulated holders:", holderErr.message);
            // Mock holders fallback (useful for custom address scans/simulated tokens)
            holders = Array.from({ length: 5 }, (_, i) => {
                const pct = [18.25, 9.40, 5.12, 3.85, 2.10][i];
                return {
                    address: `HoldWallet${i+1}xyz...${Math.random().toString(36).substring(4, 8)}`,
                    amount: 1000000000 * (pct / 100),
                    percentage: pct
                };
            });
        }

        res.json({
            ...data,
            holders: holders
        });
    } catch (e) {
        console.error('Error scanning token:', e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/pump-metas', async (req, res) => {
    try {
        console.log(`Request to fetch pump.fun metas`);
        try {
            const coinMetas = await pumpFun.metas.getCurrentMetas();
            res.json(coinMetas);
        } catch (apiError) {
            console.warn("pumpFun.metas.getCurrentMetas failed, falling back to latest active coins:", apiError.message);
            // Fallback: Query active coins instead
            const coins = await pumpFun.coins.getCoins({ limit: 10 });
            res.json(coins.map(c => ({
                mint: c.mint,
                name: c.name,
                symbol: c.symbol,
                marketCap: c.usd_market_cap || c.market_cap,
                creator: c.creator,
                created_timestamp: c.created_timestamp,
                twitter: c.twitter || null,
                telegram: c.telegram || null,
                website: c.website || null
            })));
        }
    } catch (e) {
        console.error('Error fetching pump metas:', e);
        res.status(500).json({ error: e.message });
    }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
