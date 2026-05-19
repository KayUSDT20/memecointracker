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
    // Parse query params to authenticate passcode
    const parameters = url.parse(req.url, true).query;
    const passcode = parameters.passcode;
    const CREATOR_PASSCODE = process.env.CREATOR_PASSCODE || 'TheSunShine110123$$';

    if (passcode !== CREATOR_PASSCODE) {
        console.log('Unauthorized client connection attempt blocked.');
        ws.send(JSON.stringify({ type: 'AUTH_FAILED', message: 'Invalid creator passcode' }));
        ws.close();
        return;
    }

    console.log('Client connected and authenticated successfully');
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
        const passcode = req.headers['x-creator-passcode'] || req.query.passcode;
        const CREATOR_PASSCODE = process.env.CREATOR_PASSCODE || 'TheSunShine110123$$';

        if (passcode !== CREATOR_PASSCODE) {
            return res.status(401).json({ error: 'Unauthorized access' });
        }

        const { address } = req.params;
        console.log(`Authenticated scan request for address: ${address}`);
        const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
        if (!response.ok) {
            return res.status(500).json({ error: 'Failed to fetch token data from Dexscreener' });
        }
        const data = await response.json();

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
        const passcode = req.headers['x-creator-passcode'] || req.query.passcode;
        const CREATOR_PASSCODE = process.env.CREATOR_PASSCODE || 'TheSunShine110123$$';

        if (passcode !== CREATOR_PASSCODE) {
            return res.status(401).json({ error: 'Unauthorized access' });
        }

        console.log(`Authenticated request to fetch pump.fun metas`);
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
