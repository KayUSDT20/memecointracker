import React, { useState, useEffect } from 'react';
import { recentMentions as initialMentions, topInfluencers } from '../data/mockData';

const RecentMentions = () => {
  const [mentions, setMentions] = useState(initialMentions);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001');

    ws.onopen = () => {
      console.log('Connected to AlphaTracker Live Feed');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'TWITTER_SIGNAL') {
          const { id, username, text, timestamp, ticker, isReal } = message.data;
          
          let influencer = topInfluencers.find(inf => 
            inf.handle.toLowerCase().includes(username.toLowerCase()) || 
            inf.name.toLowerCase().includes(username.toLowerCase())
          );
          
          if (!influencer) {
             influencer = { id: 999, avatar: `https://i.pravatar.cc/150?u=${username}`, name: username, handle: `@${username}` };
          }

          const newMention = {
            id: id,
            influencerId: influencer.id,
            influencerFallback: influencer,
            ticker: ticker,
            time: 'Just now',
            currentPump: isReal ? 'DETECTING...' : '+150%', 
            status: isReal ? 'NEW SIGNAL' : 'PUMPING',
            contract: 'Searching...'
          };

          setMentions(prev => [newMention, ...prev].slice(0, 50));
        }
      } catch (e) {
        console.error('Error parsing WS message', e);
      }
    };

    return () => ws.close();
  }, []);

  const getInfluencer = (mention) => {
    if (mention.influencerFallback && mention.influencerId === 999) return mention.influencerFallback;
    return topInfluencers.find(inf => inf.id === mention.influencerId) || { avatar: '', name: 'Unknown', handle: '' };
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'MOONING': return 'status-mooning';
      case 'PUMPING': return 'status-pumping';
      case 'NEW SIGNAL': return 'status-mooning';
      default: return 'status-stabilizing';
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="glass-panel" style={{ padding: '30px' }}>
      <h2 className="section-title">
        <span style={{ fontSize: '1.5rem', color: '#00ff88' }}>⚡</span> Live Memecoin Mentions
      </h2>
      
      <div className="feed-container">
        {mentions.map((mention) => {
          const influencer = getInfluencer(mention);
          return (
            <div key={mention.id} className="feed-item glass-panel">
              <div className="feed-header">
                <div className="feed-influencer">
                  <img src={influencer.avatar} alt={influencer.name} className="avatar" style={{ width: '36px', height: '36px' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{influencer.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{influencer.handle}</div>
                  </div>
                </div>
                <div className="time-badge">{mention.time}</div>
              </div>
              
              <div className="feed-content">
                <div className="ticker-info">
                  <div className="ticker">{mention.ticker}</div>
                  <div className="contract">
                    CA: {mention.contract.length > 20 ? `${mention.contract.substring(0, 8)}...${mention.contract.substring(mention.contract.length - 6)}` : mention.contract}
                    <span 
                      className="contract-copy" 
                      onClick={() => copyToClipboard(mention.contract)}
                      title="Copy Contract Address"
                    >
                      📋
                    </span>
                  </div>
                </div>
                
                <div className="pump-stats">
                  <div className="current-pump">{mention.currentPump}</div>
                  <div className={`pump-status ${getStatusClass(mention.status)}`}>
                    {mention.status}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecentMentions;
