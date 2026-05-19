import { targetAccounts } from './accounts.js';
import * as cheerio from 'cheerio';
import { agent } from './agent.js';

const MEMECOIN_KEYWORDS = ['pump', 'solana', 'sol', 'memecoin', 'token', 'ca', 'contract', 'launch', 'stealth'];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function startTwitterScraper(broadcast) {
    console.log("Initializing Real Twitter Scraper (via Syndication API)...");
    
    // Poll accounts one by one to avoid instant rate limiting
    let accountIndex = 0;
    
    setInterval(async () => {
        const account = targetAccounts[accountIndex];
        accountIndex = (accountIndex + 1) % targetAccounts.length;
        
        try {
            const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${account}`;
            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            if (res.status === 429) {
                console.warn(`[Rate Limit] 429 Too Many Requests for @${account}. Falling back to mock data...`);
                // Fallback to keep dashboard alive during IP bans
                fallbackToMock(account, broadcast);
                return;
            }

            if (!res.ok) {
                console.warn(`[Error] Failed to fetch @${account}: ${res.statusText}`);
                return;
            }

            const html = await res.text();
            const $ = cheerio.load(html);
            
            // Syndication timeline tweets are usually inside .timeline-Tweet
            $('.timeline-Tweet').each((i, el) => {
                // Only process the most recent tweet to avoid spamming the UI on first load
                if (i > 0) return; 

                const tweetText = $(el).find('.timeline-Tweet-text').text();
                const timestamp = $(el).find('.timeline-Tweet-timestamp time').attr('datetime');
                const id = $(el).attr('data-tweet-id');
                
                if (tweetText && isMemecoinSignal(tweetText)) {
                    const extractedTickers = extractTickers(tweetText);
                    const ticker = extractedTickers.length > 0 ? extractedTickers[0] : '$UNKNOWN';
                    
                    console.log(`[REAL Signal] @${account}: ${tweetText.substring(0, 50)}...`);
                    
                    const tweetData = {
                        id: id || Math.random().toString(36).substring(7),
                        username: account,
                        text: tweetText,
                        timestamp: timestamp || new Date().toISOString(),
                        ticker: ticker,
                        isReal: true
                    };

                    broadcast({
                        type: 'TWITTER_SIGNAL',
                        data: tweetData
                    });

                    // Scan with agent
                    agent.processXScan(tweetData);
                }
            });

        } catch (error) {
            console.error(`[Scraper Error] @${account}:`, error.message);
        }
    }, 15000); // 15 seconds per account to be extremely gentle on rate limits
}

function extractTickers(text) {
    const matches = text.match(/\$[A-Za-z0-9]+/g);
    return matches ? matches : [];
}

function isMemecoinSignal(text) {
    const lowercaseText = text.toLowerCase();
    const hasTicker = /\$[a-zA-Z]{2,6}/.test(text);
    const hasKeyword = MEMECOIN_KEYWORDS.some(keyword => lowercaseText.includes(keyword));
    return hasTicker || hasKeyword;
}

function fallbackToMock(account, broadcast) {
    if (Math.random() > 0.6) {
        const mockTweets = [
            "Just found a gem on pump, looks primed. CA: ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82 $BOME vibes.",
            "Solana season is back. Keep an eye on $BONK killers. CA: DezXAZ8z7PnrnMcgzR2wALJ6JvCHgV5vJWM9EZJE2cj",
            "dev looks based, CA: 7GCihgDB8fe6KNjn2gGZzF4K7B31bN5Z2F7kGwvQ1Q3 stealth launch soon. $POPCAT",
            "this new memecoin is going to billions. $CHILL CA: 3psH1Mj1f7yUfaD5gh6Zj7epE3hZ1M2dHKw3G3P7E1v2",
            "Pump fun going crazy today. found a new one. CA: EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm $WIF"
        ];
        const text = mockTweets[Math.floor(Math.random() * mockTweets.length)];
        const extractedTickers = extractTickers(text);
        
        const tweetData = {
            id: Math.random().toString(36).substring(7),
            username: account,
            text: text,
            timestamp: new Date().toISOString(),
            ticker: extractedTickers.length > 0 ? extractedTickers[0] : '$UNKNOWN',
            isReal: false
        };

        broadcast({
            type: 'TWITTER_SIGNAL',
            data: tweetData
        });

        // Scan with agent
        agent.processXScan(tweetData);
    }
}
