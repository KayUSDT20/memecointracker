import { targetAccounts } from './accounts.js';

// Helper to fetch live GeckoTerminal data for Solana tokens
async function fetchGeckoTerminalData(address) {
    try {
        const res = await fetch(`https://api.geckoterminal.com/api/v2/networks/solana/tokens/${address}`, {
            headers: { 'Accept': 'application/json;version=20230203' }
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (!data.data || !data.data.attributes) return null;
        
        const attr = data.data.attributes;
        const topPool = data.data.relationships?.top_pools?.data?.[0];
        const poolAddress = topPool ? topPool.id.split('solana_')[1] : '';

        let poolAttr = null;
        if (poolAddress) {
            try {
                // Short wait to respect rate limit
                await new Promise(resolve => setTimeout(resolve, 1000));
                const poolRes = await fetch(`https://api.geckoterminal.com/api/v2/networks/solana/pools/${poolAddress}`, {
                    headers: { 'Accept': 'application/json;version=20230203' }
                });
                if (poolRes.ok) {
                    const poolData = await poolRes.json();
                    if (poolData.data && poolData.data.attributes) {
                        poolAttr = poolData.data.attributes;
                    }
                }
            } catch (err) {
                // Ignore pool fetch errors
            }
        }

        const priceUsd = poolAttr ? parseFloat(poolAttr.base_token_price_usd) : parseFloat(attr.price_usd || 0);
        const marketCap = parseFloat(attr.market_cap_usd || attr.fdv_usd || (poolAttr ? poolAttr.fdv_usd : 0));
        const liquidity = poolAttr ? parseFloat(poolAttr.reserve_in_usd || 0) : parseFloat(attr.total_reserve_in_usd || 0);
        const volume24h = poolAttr ? parseFloat(poolAttr.volume_usd?.h24 || 0) : parseFloat(attr.volume_usd?.h24 || 0);

        return {
            address: attr.address,
            symbol: attr.symbol,
            name: attr.name,
            priceUsd: priceUsd,
            marketCap: marketCap,
            liquidity: liquidity,
            volume24h: volume24h,
            dexId: 'geckoterminal',
            poolAddress: poolAddress,
            url: `https://www.geckoterminal.com/solana/pools/${poolAddress || attr.address}`
        };
    } catch (e) {
        return null;
    }
}

// Helper to fetch live Dexscreener data for Solana tokens
async function fetchDexscreenerData(address) {
    try {
        const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
        if (res.ok) {
            const data = await res.json();
            if (data.pairs && data.pairs.length > 0) {
                // Filter for Solana chain
                const solanaPairs = data.pairs.filter(p => p.chainId === 'solana');
                if (solanaPairs.length > 0) {
                    // Use the highest liquidity pair
                    solanaPairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
                    const pair = solanaPairs[0];
                    return {
                        address: pair.baseToken.address,
                        symbol: pair.baseToken.symbol,
                        name: pair.baseToken.name,
                        priceUsd: parseFloat(pair.priceUsd || 0),
                        marketCap: parseFloat(pair.marketCap || 0),
                        liquidity: parseFloat(pair.liquidity?.usd || 0),
                        volume24h: parseFloat(pair.volume?.h24 || 0),
                        dexId: pair.dexId,
                        url: pair.url
                    };
                }
            }
        }
    } catch (e) {
        // Fall through
    }

    // Fall back to GeckoTerminal
    return await fetchGeckoTerminalData(address);
}

// Dictionary of relatable / common meme names and keywords
const MEME_DICTIONARY = {
    dog: 'High relatability: Dogs are the most successful memecoin breed (Doge, Shiba, Wif, Floki).',
    cat: 'High relatability: Cats represent the second-largest meme cohort on Solana (Popcat, Mew).',
    pepe: 'Max relatability: Cult-classic internet frog meme, highly viral.',
    wif: 'Max relatability: "With Hat" culture is deeply embedded in the Solana ecosystem.',
    chill: 'High relatability: Calm, relatable vibe representing internet meme culture.',
    goat: 'Max relatability: Related to AI agents and Truth Terminal cult memes.',
    elon: 'High relatability: High influence from Tesla/SpaceX CEO tweets and references.',
    trump: 'High relatability: PolitiFi / political memes are highly volatile and viral.',
    biden: 'High relatability: PolitiFi / political memes.',
    moon: 'Medium relatability: Classic crypto target but slightly generic.',
    ai: 'Max relatability: Hot narrative focusing on autonomous agents and LLMs.',
    agent: 'Max relatability: Part of the AI agent meta.',
    terminal: 'Max relatability: Command line / AI agent terminal narrative.',
    frog: 'High relatability: Internet frog memes (Pepe, Slerf).',
    chad: 'High relatability: Internet slang for alpha/successful male.',
    based: 'High relatability: Crypto-native slang for cool or correct.',
    sol: 'Medium relatability: Solana network references.',
    pump: 'Medium relatability: Launchpad native term.',
    mego: 'Medium relatability: Niche anime/meme reference.',
    mew: 'High relatability: Cat in a dogs world meta.',
    bonk: 'High relatability: OG Solana community dog mascot.',
    popcat: 'Max relatability: Clicky-cat meme, massive internet audience.',
    harambe: 'High relatability: Historical internet gorilla meme.'
};

class AIAgent {
    constructor() {
        this.portfolio = []; // { id, tokenAddress, symbol, name, buyMc, currentMc, investedSol, currentValSol, buyTime, exitTime, status, pnlPercent, pnlSol, reason }
        this.scannedTokens = []; // { address, symbol, name, marketCap, source, timestamp, relatabilityScore, reason, tweetContext, status }
        this.thoughts = []; // String logs
        this.broadcastFn = null;
        this.walletBalance = 100.0; // Starting simulated wallet balance in SOL
        this.trackedTweets = []; // Array of processed tweets

        // Start internal loop to update prices/marketcaps, log agent thoughts, and process P&L
        this.initAgentLoop();
    }

    setBroadcast(broadcast) {
        this.broadcastFn = broadcast;
    }

    log(message, type = 'INFO') {
        const timestamp = new Date().toISOString();
        const formattedLog = `[${timestamp.substring(11, 19)}] [${type}] ${message}`;
        this.thoughts.unshift(formattedLog);
        if (this.thoughts.length > 100) this.thoughts.pop();

        if (this.broadcastFn) {
            this.broadcastFn({
                type: 'AGENT_LOG',
                data: formattedLog
            });
        }
    }

    // Process new tokens scanned from Pump.fun / Dexscreener
    processNewToken(token) {
        // Avoid duplicate scanning
        if (this.scannedTokens.some(t => t.address === token.address)) return;

        // Calculate initial market cap (if not provided, default to $15k-$35k for pump launches)
        const initialMc = token.marketCap || Math.floor(Math.random() * 20000) + 15000;

        if (initialMc >= 10000000) {
            return;
        }

        this.log(`Detected new token: ${token.symbol} (${token.name}) on Solana.`, 'SCANNER');

        // Check if there is an X.com tweet matching or if we scan its details
        const tweetContext = this.findMatchingTweetForToken(token);
        
        // Analyze relatability of the name
        const { score, reason } = this.analyzeNameRelatability(token.name, token.symbol);

        let status = 'SCANNING';
        if (score >= 70 && tweetContext) {
            status = 'FLAGGED';
            this.log(`Flagged ${token.symbol} for potential buy. Relatability: ${score}%. Reason: ${reason}`, 'ANALYZER');
        } else if (score >= 70) {
            status = 'FLAGGED';
            this.log(`Flagged ${token.symbol} due to relatable name: "${token.name}". Score: ${score}%`, 'ANALYZER');
        } else {
            status = 'IGNORED';
            this.log(`Ignored ${token.symbol}. Relatability too low (${score}%).`, 'DECISION');
        }

        const scannedToken = {
            address: token.address,
            symbol: token.symbol,
            name: token.name,
            marketCap: initialMc,
            volume24h: token.volume24h || Math.floor(Math.random() * 40000) + 10000,
            source: token.source || 'Pump.fun',
            timestamp: new Date().toISOString(),
            relatabilityScore: score,
            reason: reason,
            tweetContext: tweetContext || null,
            status: status
        };

        this.scannedTokens.unshift(scannedToken);
        if (this.scannedTokens.length > 50) this.scannedTokens.pop();

        this.broadcastScannedTokens();

        // If flagged, check buying rules
        if (status === 'FLAGGED') {
            this.checkBuyRule(scannedToken);
        }
    }

    // Process tweet containing contract addresses scanned from X.com
    async processXScan(tweet) {
        this.trackedTweets.unshift(tweet);
        if (this.trackedTweets.length > 50) this.trackedTweets.pop();

        const caRegex = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;
        const matches = tweet.text.match(caRegex);
        
        if (matches) {
            const contractAddress = matches[0];
            this.log(`Scanned tweet from @${tweet.username} containing contract address: ${contractAddress}`, 'X_SCAN');
            
            // Check if we are already tracking this token
            let existingToken = this.scannedTokens.find(t => t.address === contractAddress);
            
            if (!existingToken) {
                // Fetch real metrics from Dexscreener
                const liveData = await fetchDexscreenerData(contractAddress);
                
                const tickers = tweet.text.match(/\$[A-Za-z0-9]+/g) || [];
                const symbol = liveData ? liveData.symbol : (tickers.length > 0 ? tickers[0] : '$TWEET_MINT');
                const name = liveData ? liveData.name : (symbol.replace('$', '') + ' Meme');
                const mc = liveData ? liveData.marketCap : 15000;

                this.processNewToken({
                    address: contractAddress,
                    symbol: symbol,
                    name: name,
                    marketCap: mc,
                    source: 'X.com Scan',
                    tweetContext: {
                        username: tweet.username,
                        text: tweet.text,
                        timestamp: tweet.timestamp
                    }
                });
            } else {
                // Update existing token with tweet context
                existingToken.tweetContext = {
                    username: tweet.username,
                    text: tweet.text,
                    timestamp: tweet.timestamp
                };
                if (existingToken.status === 'IGNORED' || existingToken.status === 'SCANNING') {
                    existingToken.status = 'FLAGGED';
                    this.log(`Token ${existingToken.symbol} has been upgraded to FLAGGED because top influencer @${tweet.username} mentioned it.`, 'DECISION');
                    this.checkBuyRule(existingToken);
                }
                this.broadcastScannedTokens();
            }
        } else {
            // If tweet has no CA, check if it mentions a name that we can correlate to a future token launch
            this.log(`Scanned tweet from @${tweet.username}: "${tweet.text.substring(0, 45)}...". Checking for memecoin name cues.`, 'X_SCAN');
        }
    }

    // Connects a token launch to a tweet mention if it occurred recently
    findMatchingTweetForToken(token) {
        const lowercaseName = token.name.toLowerCase();
        const lowercaseSymbol = token.symbol.toLowerCase().replace('$', '');

        // Search recent tweets (last 10 minutes) for matching terms
        const match = this.trackedTweets.find(tweet => {
            const text = tweet.text.toLowerCase();
            return text.includes(lowercaseName) || text.includes(lowercaseSymbol);
        });

        if (match) {
            return {
                username: match.username,
                text: match.text,
                timestamp: match.timestamp
            };
        }
        return null;
    }

    // Evaluates a memecoin's name & symbol for viral commonality
    analyzeNameRelatability(name, symbol) {
        const combined = `${name} ${symbol}`.toLowerCase();
        let highestScore = 20; // Default baseline score
        let matchedKeyword = '';

        for (const [key, reason] of Object.entries(MEME_DICTIONARY)) {
            if (combined.includes(key)) {
                let score = 50;
                if (combined.includes('dog') || combined.includes('cat') || combined.includes('pepe') || combined.includes('wif')) {
                    score = 90 + Math.floor(Math.random() * 10);
                } else if (combined.includes('ai') || combined.includes('agent') || combined.includes('terminal')) {
                    score = 85 + Math.floor(Math.random() * 10);
                } else {
                    score = 70 + Math.floor(Math.random() * 15);
                }
                
                if (score > highestScore) {
                    highestScore = score;
                    matchedKeyword = key;
                }
            }
        }

        if (highestScore > 20) {
            return {
                score: highestScore,
                reason: MEME_DICTIONARY[matchedKeyword]
            };
        }

        // Generate a random relatable check if it doesn't match dictionary to keep things dynamic
        if (Math.random() > 0.6) {
            const dynamicScores = [55, 62, 71, 74, 82];
            const chosenScore = dynamicScores[Math.floor(Math.random() * dynamicScores.length)];
            return {
                score: chosenScore,
                reason: chosenScore >= 70 
                    ? 'Medium-High relatability: The ticker aligns with trending crypto humor/culture.' 
                    : 'Low relatability: Generic name, lacks cultural viral anchor.'
            };
        }

        return {
            score: 35,
            reason: 'Low relatability: Typical spam token or low-effort name combination.'
        };
    }

    requestBuy(token) {
        // Collect all currently requested tokens
        const currentRequests = this.scannedTokens.filter(t => t.status === 'BUY_REQUESTED');
        
        // Check if token is already in the requested list
        const alreadyIn = currentRequests.some(t => t.address === token.address);
        
        if (alreadyIn) {
            token.status = 'BUY_REQUESTED';
            this.broadcastScannedTokens();
            return;
        }

        if (currentRequests.length < 10) {
            token.status = 'BUY_REQUESTED';
            this.log(`[★ BUY REQUEST] ${token.symbol} meets $70k market cap (current MC: $${token.marketCap.toLocaleString()}). Vol: $${(token.volume24h || 0).toLocaleString()}. Sent to Buy Requests sidebar.`, 'DECISION');
            this.broadcastScannedTokens();
        } else {
            // Priority Queue Logic: keep top 10 by trading volume
            const allCandidates = [...currentRequests, token];
            allCandidates.sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0));
            
            const kept = allCandidates.slice(0, 10);
            const demoted = allCandidates.slice(10);
            
            // Assign statuses
            for (const t of this.scannedTokens) {
                if (kept.some(k => k.address === t.address)) {
                    if (t.status !== 'BUY_REQUESTED') {
                        t.status = 'BUY_REQUESTED';
                        this.log(`[★ BUY REQUEST] ${t.symbol} pushed to sidebar (Vol: $${(t.volume24h || 0).toLocaleString()}), prioritizing over lower volume assets.`, 'DECISION');
                    }
                }
                if (demoted.some(d => d.address === t.address)) {
                    if (t.status === 'BUY_REQUESTED' || t.address === token.address) {
                        t.status = 'IGNORED';
                        this.log(`[★ BUY REQUEST REJECTED] Demoted ${t.symbol} due to lower trading volume ($${(t.volume24h || 0).toLocaleString()}) compared to other buy requests.`, 'DECISION');
                    }
                }
            }
            this.broadcastScannedTokens();
        }
    }

    forceBuyRequest(data) {
        let token = this.scannedTokens.find(t => t.address === data.address);
        if (!token) {
            token = {
                address: data.address,
                symbol: data.symbol,
                name: data.name,
                marketCap: data.marketCap || 0,
                volume24h: data.volume24h || 0,
                source: 'Manual Scanner Scan',
                reason: `User scanned and force-requested buy for $${data.symbol}.`,
                status: 'FLAGGED',
                detectedAt: new Date().toISOString()
            };
            this.scannedTokens.unshift(token);
        } else {
            token.status = 'FLAGGED';
            token.reason = `User scanned and force-requested buy for $${data.symbol}.`;
            token.marketCap = data.marketCap || token.marketCap;
            token.volume24h = data.volume24h || token.volume24h;
        }

        this.log(`User force-requested buy for scanned token ${token.symbol}.`, 'DECISION');
        this.requestBuy(token);
    }

    // Handles the $70k minimum marketcap buy rule and $10M maximum marketcap tracker limit
    checkBuyRule(token) {
        // Only buy if status is FLAGGED
        if (token.status !== 'FLAGGED') return;

        const MIN_MARKETCAP_BUY = 70000;
        const MAX_MARKETCAP_BUY = 10000000;
        this.log(`Checking buying conditions for ${token.symbol}. Market Cap: $${token.marketCap.toLocaleString()} vs Range: $${MIN_MARKETCAP_BUY.toLocaleString()} - $${MAX_MARKETCAP_BUY.toLocaleString()}`, 'DECISION');

        if (token.marketCap >= MIN_MARKETCAP_BUY && token.marketCap < MAX_MARKETCAP_BUY) {
            this.requestBuy(token);
        } else if (token.marketCap >= MAX_MARKETCAP_BUY) {
            token.status = 'IGNORED';
            this.log(`Ignored ${token.symbol} for buy request - Market Cap ($${token.marketCap.toLocaleString()}) exceeds the 10M tracking threshold.`, 'DECISION');
            this.broadcastScannedTokens();
        } else {
            token.status = 'PENDING_MC';
            this.log(`Market cap for ${token.symbol} ($${token.marketCap.toLocaleString()}) is below $70k threshold. Queueing for buy request once target met.`, 'DECISION');
            this.broadcastScannedTokens();
        }
    }

    executeSimulatedBuy(token) {
        // Prevent duplicate buys
        if (this.portfolio.some(p => p.tokenAddress === token.address && p.status === 'HOLDING')) return;

        const BUY_AMOUNT_SOL = 5.0; // Invest 5 SOL per trade
        if (this.walletBalance < BUY_AMOUNT_SOL) {
            this.log(`Insufficient balance to buy ${token.symbol}. Balance: ${this.walletBalance.toFixed(2)} SOL.`, 'DECISION');
            return;
        }

        this.walletBalance -= BUY_AMOUNT_SOL;
        
        const newTrade = {
            id: Math.random().toString(36).substring(7),
            tokenAddress: token.address,
            symbol: token.symbol,
            name: token.name,
            buyMc: token.marketCap,
            currentMc: token.marketCap,
            investedSol: BUY_AMOUNT_SOL,
            currentValSol: BUY_AMOUNT_SOL,
            buyTime: new Date().toISOString(),
            exitTime: null,
            status: 'HOLDING',
            pnlPercent: 0.0,
            pnlSol: 0.0,
            reason: token.reason || 'Flagged relatable memecoin call',
            targetTakeProfit: 100 + Math.floor(Math.random() * 150), // 100% to 250%
            targetStopLoss: -30 - Math.floor(Math.random() * 10) // -30% to -40%
        };

        this.portfolio.unshift(newTrade);
        token.status = 'BOUGHT';
        this.log(`[★ BUY TRIGGERED] Bought 5.00 SOL ($750) of ${token.symbol} at marketcap $${token.marketCap.toLocaleString()}!`, 'PORTFOLIO');
        
        this.broadcastPortfolio();
        this.broadcastScannedTokens();
    }

    executeSimulatedSell(trade, reason) {
        if (trade.status !== 'HOLDING') return;

        trade.status = 'SOLD';
        trade.exitTime = new Date().toISOString();
        this.walletBalance += trade.currentValSol;

        const pnlSol = trade.pnlSol;
        const sign = pnlSol >= 0 ? '+' : '';
        this.log(`[★ SELL TRIGGERED] Sold ${trade.symbol} due to ${reason}. Exit MC: $${trade.currentMc.toLocaleString()}. Realized P&L: ${sign}${trade.pnlPercent.toFixed(2)}% (${sign}${pnlSol.toFixed(2)} SOL)`, 'PORTFOLIO');

        this.broadcastPortfolio();
    }

    // Force buy or sell from frontend override
    handleManualTrade(action, data) {
        if (action === 'BUY') {
            const token = this.scannedTokens.find(t => t.address === data.address);
            if (token) {
                const wasRequested = token.status === 'BUY_REQUESTED';
                this.log(`${wasRequested ? 'User approved BUY request' : 'Manual BUY override requested'} for ${token.symbol}.`, 'DECISION');
                this.executeSimulatedBuy(token);
            }
        } else if (action === 'CANCEL_BUY') {
            const token = this.scannedTokens.find(t => t.address === data.address);
            if (token) {
                token.status = 'IGNORED';
                this.log(`User rejected/cancelled BUY request for ${token.symbol}.`, 'DECISION');
                this.broadcastScannedTokens();
            }
        } else if (action === 'SELL') {
            const trade = this.portfolio.find(t => t.id === data.id);
            if (trade && trade.status === 'HOLDING') {
                this.log(`Manual SELL override requested for ${trade.symbol}.`, 'DECISION');
                this.executeSimulatedSell(trade, 'Manual User Override');
            }
        }
    }

    // Periodically update token prices and simulate market changes
    initAgentLoop() {
        setInterval(async () => {
            // 1. Update pending market cap tokens, push them to buy requests if they hit $70k
            for (const token of this.scannedTokens) {
                if (token.status === 'PENDING_MC') {
                    const liveData = await fetchDexscreenerData(token.address);
                    if (liveData) {
                        token.marketCap = liveData.marketCap;
                        token.symbol = liveData.symbol;
                        token.name = liveData.name;
                        token.volume24h = liveData.volume24h || token.volume24h;
                        this.log(`Live Update: ${token.symbol} market cap is $${token.marketCap.toLocaleString()} on ${liveData.dexId}`, 'SCANNER');

                        if (token.marketCap >= 70000 && token.marketCap < 10000000) {
                            this.log(`Target met! Live token ${token.symbol} reached $${token.marketCap.toLocaleString()} marketcap.`, 'DECISION');
                            this.requestBuy(token);
                        } else if (token.marketCap >= 10000000) {
                            token.status = 'IGNORED';
                            this.log(`Ignored ${token.symbol} - Market Cap ($${token.marketCap.toLocaleString()}) grew beyond 10M limit.`, 'DECISION');
                        }
                    } else {
                        // Drift fallback if it's a simulated mock token
                        if (token.address.length < 40 || token.symbol.startsWith('$LIVE_') || token.address.startsWith('Creator')) {
                            const growth = Math.floor(Math.random() * 8000) + 2000;
                            token.marketCap += growth;
                            token.volume24h = (token.volume24h || 10000) + Math.floor(Math.random() * 5000);
                            this.log(`Monitoring ${token.symbol} (simulated): Market cap grew to $${token.marketCap.toLocaleString()}...`, 'SCANNER');

                            if (token.marketCap >= 70000 && token.marketCap < 10000000) {
                                this.log(`Target met! Simulated token ${token.symbol} reached $${token.marketCap.toLocaleString()} marketcap.`, 'DECISION');
                                this.requestBuy(token);
                            } else if (token.marketCap >= 10000000) {
                                token.status = 'IGNORED';
                                this.log(`Ignored simulated token ${token.symbol} - Market Cap ($${token.marketCap.toLocaleString()}) grew beyond 10M limit.`, 'DECISION');
                            }
                        }
                    }
                }
            }

            // 2. Update active portfolio positions (Holding P&L)
            let updatedPortfolio = false;
            for (const trade of this.portfolio) {
                if (trade.status === 'HOLDING') {
                    const liveData = await fetchDexscreenerData(trade.tokenAddress);
                    if (liveData) {
                        trade.currentMc = liveData.marketCap;
                        
                        // Calculate P&L
                        const pnlRatio = (trade.currentMc - trade.buyMc) / trade.buyMc;
                        trade.pnlPercent = pnlRatio * 100;
                        trade.currentValSol = trade.investedSol * (1 + pnlRatio);
                        trade.pnlSol = trade.currentValSol - trade.investedSol;

                        updatedPortfolio = true;

                        // Evaluate automatic exits
                        if (trade.pnlPercent >= trade.targetTakeProfit) {
                            this.executeSimulatedSell(trade, `Take Profit target reached (+${trade.pnlPercent.toFixed(1)}%)`);
                        } else if (trade.pnlPercent <= trade.targetStopLoss) {
                            this.executeSimulatedSell(trade, `Stop Loss triggered (${trade.pnlPercent.toFixed(1)}%)`);
                        }
                    } else {
                        // Fallback drift if simulated
                        if (trade.tokenAddress.length < 40) {
                            const volatility = (Math.random() * 0.4) - 0.18; 
                            trade.currentMc = Math.floor(trade.currentMc * (1 + volatility));
                            if (trade.currentMc < 2000) trade.currentMc = 2000; // Floor

                            // Calculate P&L
                            const pnlRatio = (trade.currentMc - trade.buyMc) / trade.buyMc;
                            trade.pnlPercent = pnlRatio * 100;
                            trade.currentValSol = trade.investedSol * (1 + pnlRatio);
                            trade.pnlSol = trade.currentValSol - trade.investedSol;

                            updatedPortfolio = true;

                            // Evaluate automatic exits
                            if (trade.pnlPercent >= trade.targetTakeProfit) {
                                this.executeSimulatedSell(trade, `Take Profit target reached (+${trade.pnlPercent.toFixed(1)}%)`);
                            } else if (trade.pnlPercent <= trade.targetStopLoss) {
                                this.executeSimulatedSell(trade, `Stop Loss triggered (${trade.pnlPercent.toFixed(1)}%)`);
                            }
                        }
                    }
                }
            }

            if (updatedPortfolio) {
                this.broadcastPortfolio();
            }
        }, 5000);

        // Keep a periodic heartbeat thought to simulate agent consciousness
        setInterval(() => {
            if (this.portfolio.filter(t => t.status === 'HOLDING').length === 0) {
                const monologues = [
                    "Liquidity pools on Solana are highly volatile. Keeping scanner active...",
                    "Scanning X.com timelines for new ticker listings and smart contracts.",
                    "Filtering spam contracts. Searching for cultural anchors (dogs, cats, AI tech).",
                    "Ready to execute paper trades with minimum $70,000 marketcap threshold.",
                    "Reviewing whale transactions to map market volume density."
                ];
                this.log(monologues[Math.floor(Math.random() * monologues.length)], 'THOUGHT');
            } else {
                const activeTrade = this.portfolio.find(t => t.status === 'HOLDING');
                this.log(`Monitoring active position: ${activeTrade.symbol}. Current P&L: ${activeTrade.pnlPercent.toFixed(2)}% (Current MC: $${activeTrade.currentMc.toLocaleString()})`, 'THOUGHT');
            }
        }, 12000);
    }

    broadcastScannedTokens() {
        if (this.broadcastFn) {
            this.broadcastFn({
                type: 'SCANNED_TOKENS',
                data: this.scannedTokens
            });
        }
    }

    broadcastPortfolio() {
        if (this.broadcastFn) {
            // Compute total statistics
            const totalTrades = this.portfolio.length;
            const activeTrades = this.portfolio.filter(t => t.status === 'HOLDING').length;
            const closedTrades = this.portfolio.filter(t => t.status === 'SOLD');
            
            const winningTrades = closedTrades.filter(t => t.pnlSol > 0).length;
            const winRate = closedTrades.length > 0 
                ? ((winningTrades / closedTrades.length) * 100).toFixed(1) + '%' 
                : '100%';

            const totalPnlSol = this.portfolio.reduce((sum, t) => sum + t.pnlSol, 0);
            
            this.broadcastFn({
                type: 'PORTFOLIO_UPDATE',
                data: {
                    walletBalance: this.walletBalance,
                    totalPnlSol: totalPnlSol,
                    winRate: winRate,
                    totalTrades: totalTrades,
                    activeTrades: activeTrades,
                    positions: this.portfolio
                }
            });
        }
    }

    // Helper to send initial data payload to newly connected WS client
    sendInitialState(clientWs) {
        const totalTrades = this.portfolio.length;
        const activeTrades = this.portfolio.filter(t => t.status === 'HOLDING').length;
        const closedTrades = this.portfolio.filter(t => t.status === 'SOLD');
        const winningTrades = closedTrades.filter(t => t.pnlSol > 0).length;
        const winRate = closedTrades.length > 0 
            ? ((winningTrades / closedTrades.length) * 100).toFixed(1) + '%' 
            : '100%';
        const totalPnlSol = this.portfolio.reduce((sum, t) => sum + t.pnlSol, 0);

        clientWs.send(JSON.stringify({
            type: 'INITIAL_STATE',
            data: {
                scannedTokens: this.scannedTokens,
                thoughts: this.thoughts,
                portfolio: {
                    walletBalance: this.walletBalance,
                    totalPnlSol: totalPnlSol,
                    winRate: winRate,
                    totalTrades: totalTrades,
                    activeTrades: activeTrades,
                    positions: this.portfolio
                }
            }
        }));
    }
}

export const agent = new AIAgent();
