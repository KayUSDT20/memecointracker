import * as cheerio from 'cheerio';

async function testFetch() {
  const handle = 'Ansem';
  const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${handle}`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response text length:", text.length);
    
    // It's usually HTML. Let's see if we can find tweets
    const $ = cheerio.load(text);
    const tweets = [];
    
    // Timeline tweets in syndication are usually inside .timeline-Tweet
    $('.timeline-Tweet').each((i, el) => {
        const tweetText = $(el).find('.timeline-Tweet-text').text();
        const timestamp = $(el).find('.timeline-Tweet-timestamp time').attr('datetime');
        const id = $(el).attr('data-tweet-id');
        
        if (tweetText) {
            tweets.push({ id, tweetText, timestamp });
        }
    });
    
    console.log("Found tweets:", tweets.length);
    if (tweets.length > 0) {
        console.log("First tweet:", tweets[0]);
    } else {
        // If 0, let's look for any <script> tags containing JSON
        const jsonText = text.substring(0, 500);
        console.log("Snippet:", jsonText);
    }
  } catch(e) {
    console.error(e);
  }
}

testFetch();
