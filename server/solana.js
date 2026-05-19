import web3 from '@solana/web3.js';
import bs58 from 'bs58';
import { agent } from './agent.js';
import PumpFun from 'pumpfun-api';

const pumpFun = new PumpFun();

const PUMP_FUN_PROGRAM_ID = new web3.PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfV9CUZTnzbA1g8Uu6A');
const connection = new web3.Connection('https://api.mainnet-beta.solana.com', 'confirmed');

// Helper to fetch live Dexscreener data
async function fetchTokenMetadata(address) {
    try {
        const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
        if (!res.ok) return null;
        const data = await res.json();
        if (!data.pairs || data.pairs.length === 0) return null;
        
        const pair = data.pairs.find(p => p.chainId === 'solana') || data.pairs[0];
        return {
            symbol: pair.baseToken.symbol,
            name: pair.baseToken.name,
            marketCap: parseFloat(pair.marketCap || 0),
            priceUsd: parseFloat(pair.priceUsd || 0),
            liquidity: `$${parseFloat(pair.liquidity?.usd || 0).toLocaleString()}`
        };
    } catch (e) {
        return null;
    }
}

export async function startSolanaListener(broadcast) {
    console.log("Initializing LIVE Solana Listener for pump.fun...");
    
    // Periodically fetch active tokens from pump.fun API to stream real creator actions
    setInterval(async () => {
        try {
            const coins = await pumpFun.coins.getCoins({ 
                limit: 10, 
                offset: 0, 
                sort: 'last_trade_timestamp', 
                order: 'DESC' 
            });
            if (!coins || coins.length === 0) return;

            // Pick a random active coin from the latest list
            const coin = coins[Math.floor(Math.random() * coins.length)];
            
            const creator = {
                id: coin.creator,
                name: `Live 0x${coin.creator.substring(0, 4)}`,
                address: coin.creator,
                successRate: 'Active',
                totalTokens: 'Tracking'
            };

            const token = {
                address: coin.mint,
                symbol: coin.symbol || `$LIVE_${coin.mint.substring(0, 4).toUpperCase()}`,
                name: coin.name || `On-Chain Mint ${coin.mint.substring(0, 4)}`,
                marketCap: parseFloat(coin.usd_market_cap || coin.market_cap || 15000),
                liquidity: coin.real_sol_reserves ? `$${(coin.real_sol_reserves / 1e9 * 140).toLocaleString()}` : 'TBD',
                timestamp: new Date(coin.created_timestamp || Date.now()).toISOString(),
                source: 'Pump.fun',
                creator: creator
            };

            broadcast({
                type: 'PUMP_CREATOR_TOKEN',
                data: token
            });

            // Send to agent for scanning if not already scanned
            agent.processNewToken(token);
        } catch (e) {
            console.error("[PumpFun API Poller Error]", e.message);
        }
    }, 15000); // 15 seconds

    try {
        connection.onLogs(
            PUMP_FUN_PROGRAM_ID,
            async (logs, ctx) => {
                if (logs.err) return;
                
                const isCreation = logs.logs.some(log => log.includes("InitializeMint") || log.includes("Create"));
                if (!isCreation) return;

                console.log(`[Pump.fun Live Signal] New creation detected: ${logs.signature.substring(0, 15)}...`);

                try {
                    // Delay 5 seconds to let the mint settle and get indexed by Dexscreener
                    setTimeout(async () => {
                        try {
                            const tx = await connection.getParsedTransaction(logs.signature, {
                                maxSupportedTransactionVersion: 0,
                                commitment: 'confirmed'
                            });

                            if (!tx) return;

                            const creatorAccount = tx.transaction.message.accountKeys.find(acc => acc.signer);
                            const creatorAddress = creatorAccount ? creatorAccount.pubkey.toString() : null;

                            const mintAccounts = tx.meta?.postTokenBalances?.map(b => b.mint) || [];
                            const tokenAddress = mintAccounts.length > 0 ? mintAccounts[0] : null;

                            if (creatorAddress && tokenAddress) {
                                // Try fetching real metadata from Dexscreener
                                const metadata = await fetchTokenMetadata(tokenAddress);

                                const creator = {
                                    id: creatorAddress,
                                    name: `Live 0x${creatorAddress.substring(0, 4)}`,
                                    address: creatorAddress,
                                    successRate: 'Active',
                                    totalTokens: 'Tracking'
                                };

                                const token = {
                                    address: tokenAddress,
                                    symbol: metadata ? metadata.symbol : `$LIVE_${tokenAddress.substring(0, 4).toUpperCase()}`,
                                    name: metadata ? metadata.name : `On-Chain Mint ${tokenAddress.substring(0, 4)}`,
                                    marketCap: metadata ? metadata.marketCap : 15000,
                                    liquidity: metadata ? metadata.liquidity : 'TBD',
                                    timestamp: new Date().toISOString(),
                                    source: 'Pump.fun',
                                    creator: creator
                                };

                                console.log(`[LIVE Broadcast] Creator ${creator.name} launched ${token.symbol} (${token.address.substring(0, 8)}...)`);
                                broadcast({
                                    type: 'PUMP_CREATOR_TOKEN',
                                    data: token
                                });

                                agent.processNewToken(token);
                            }
                        } catch (e) {
                            // Ignored (rate limits, etc.)
                        }
                    }, 5000);
                } catch (e) {
                    // Ignored
                }
            },
            'confirmed'
        );
        console.log("Subscribed to pump.fun mainnet logs successfully.");
    } catch (error) {
        console.error("Failed to subscribe to Solana logs.", error);
    }
}
