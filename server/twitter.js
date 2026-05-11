import { targetAccounts } from './accounts.js';
import * as cheerio from 'cheerio';

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
                    
                    broadcast({
                        type: 'TWITTER_SIGNAL',
                        data: {
                            id: id || Math.random().toString(36).substring(7),
                            username: account,
                            text: tweetText,
                            timestamp: timestamp || new Date().toISOString(),
                            ticker: ticker,
                            isReal: true
                        }
                    });
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
    if (Math.random() > 0.7) {
        const mockTweets = [
            "Just found a gem on pump, looks primed. $WIF vibes.",
            "Solana season is back. Keep an eye on $BONK killers.",
            "dev looks based, CA: 7v... stealth launch soon.",
            "this new memecoin is going to billions. $TREMP",
            "Pump fun going crazy today. found a new one."
        ];
        const text = mockTweets[Math.floor(Math.random() * mockTweets.length)];
        const extractedTickers = extractTickers(text);
        
        broadcast({
            type: 'TWITTER_SIGNAL',
            data: {
                id: Math.random().toString(36).substring(7),
                username: account,
                text: text,
                timestamp: new Date().toISOString(),
                ticker: extractedTickers.length > 0 ? extractedTickers[0] : '$UNKNOWN',
                isReal: false
            }
        });
    }
}
