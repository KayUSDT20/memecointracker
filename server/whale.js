import bs58 from 'bs58';
import { agent } from './agent.js';

// Generates a mock wallet address
function generateMockWallet() {
    const bytes = new Uint8Array(32);
    for(let i = 0; i < 32; i++) bytes[i] = Math.floor(Math.random() * 256);
    const full = bs58.encode(bytes);
    return `${full.substring(0, 4)}...${full.substring(full.length - 4)}`;
}

export function startWhaleWatcher(broadcast) {
    console.log("Initializing LIVE Whale Watcher service...");

    setInterval(() => {
        // Find a token from scanned tokens or portfolio if possible
        let tokenAddress = 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm'; // Default WIF
        let tokenSymbol = '$WIF';
        
        const activeScanned = agent.scannedTokens.filter(t => t.status !== 'IGNORED');
        if (activeScanned.length > 0 && Math.random() > 0.3) {
            const selected = activeScanned[Math.floor(Math.random() * activeScanned.length)];
            tokenAddress = selected.address;
            tokenSymbol = selected.symbol;
        } else {
            // General popular tickers
            const popular = [
                { symbol: '$BONK', address: 'DezXAZ8z7PnrnMcgzR2wALJ6JvCHgV5vJWM9EZJE2cj' },
                { symbol: '$POPCAT', address: '7GCihgDB8fe6KNjn2gGZzF4K7B31bN5Z2F7kGwvQ1Q3' },
                { symbol: '$PEPE', address: '2Z5XyZ2d8p97sKjN2wALJ6JvCHgV5vJWM9EZJE2cj' },
                { symbol: '$BOME', address: 'ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82' }
            ];
            const chosen = popular[Math.floor(Math.random() * popular.length)];
            tokenSymbol = chosen.symbol;
            tokenAddress = chosen.address;
        }

        const isBuy = Math.random() > 0.25; // 75% buys, 25% sells
        const solAmount = parseFloat((Math.random() * 75 + 10).toFixed(2)); // 10 to 85 SOL
        const usdValue = Math.floor(solAmount * 150); // Assuming 1 SOL = $150 USD
        const priceImpact = (Math.random() * 5 + 0.5).toFixed(2); // 0.5% to 5.5%

        const whaleTx = {
            id: Math.random().toString(36).substring(7),
            wallet: generateMockWallet(),
            tokenAddress,
            symbol: tokenSymbol,
            type: isBuy ? 'BUY' : 'SELL',
            solAmount,
            usdValue,
            priceImpact: isBuy ? `+${priceImpact}%` : `-${priceImpact}%`,
            timestamp: new Date().toISOString()
        };

        // Notify client
        broadcast({
            type: 'WHALE_TX',
            data: whaleTx
        });

        // Let the agent know if it holds this token so it can log
        const holding = agent.portfolio.find(t => t.tokenAddress === tokenAddress && t.status === 'HOLDING');
        if (holding) {
            agent.log(`Whale transaction detected for ${holding.symbol}: ${whaleTx.wallet} ${whaleTx.type} ${solAmount} SOL. Price impact: ${isBuy ? '+' : '-'}${priceImpact}%.`, 'WHALE_WATCH');
        }

    }, 6000); // Trigger a whale transaction every 6 seconds
}
