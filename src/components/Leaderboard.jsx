import React, { useState } from 'react';
import { topInfluencers } from '../data/mockData';

const Leaderboard = () => {
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="glass-panel" style={{ padding: '20px' }}>
      <h2 className="section-title">
        <span style={{ fontSize: '1.5rem' }}>👑</span> Top Influencers
      </h2>
      <div className="leaderboard">
        {topInfluencers.map((influencer, index) => (
          <div key={influencer.id} className="leaderboard-row">
            <div 
              className="leaderboard-item glass-panel" 
              onClick={() => toggleExpand(influencer.id)}
            >
              <div className={`rank rank-${index + 1}`}>{index + 1}</div>
              <div className="influencer-info">
                <img src={influencer.avatar} alt={influencer.name} className="avatar" />
                <div className="influencer-details">
                  <span className="influencer-name">{influencer.name}</span>
                  <span className="influencer-handle">{influencer.handle} • {influencer.followers}</span>
                </div>
              </div>
              <div className="influencer-stats">
                <span className="success-rate">{influencer.successRate} Win</span>
                <span className="avg-pump">Avg {influencer.avgPump}</span>
              </div>
            </div>
            
            {expandedId === influencer.id && (
              <div className="recent-trades glass-panel">
                <h4 className="trades-title">Latest Memecoin Calls</h4>
                <div className="trades-list">
                  {influencer.recentTrades.map((trade) => (
                    <div key={trade.id} className="trade-pill">
                      <span className="trade-ticker">{trade.ticker}</span>
                      <span className="trade-pnl">{trade.pnl}</span>
                      <span className="trade-time">{trade.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Leaderboard;
