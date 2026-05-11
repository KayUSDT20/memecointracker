import React, { useState, useEffect } from 'react';

const initialCreators = Array.from({ length: 20 }, (_, i) => ({
  id: `top-creator-${i + 1}`,
  name: `Top Creator ${i + 1}`,
  address: `CreatorWallet${i + 1}${Math.random().toString(36).substring(2, 8)}`,
  successRate: '100%',
  totalTokens: Math.floor(Math.random() * 100) + 10
}));

const PumpfunCreators = () => {
  const [creators, setCreators] = useState(initialCreators);
  const [selectedCreator, setSelectedCreator] = useState(null);
  const [liveGems, setLiveGems] = useState({}); // { creatorId: [tokens] }

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001');

    ws.onopen = () => {
      console.log('Connected to Pump.fun Creators Live Feed');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'PUMP_CREATOR_TOKEN') {
          const { creator, ...token } = message.data;
          
          setLiveGems(prev => {
            const currentGems = prev[creator.id] || [];
            return {
              ...prev,
              [creator.id]: [token, ...currentGems].slice(0, 50)
            };
          });
          
          setCreators(prev => {
            const exists = prev.find(c => c.id === creator.id);
            if (exists) return prev;
            return [creator, ...prev].slice(0, 100);
          });
        }
      } catch (e) {
        console.error('Error parsing WS message', e);
      }
    };

    return () => ws.close();
  }, []);

  const handleBack = () => setSelectedCreator(null);

  if (selectedCreator) {
    const creatorGems = liveGems[selectedCreator.id] || [];
    return (
      <div className="creator-subpage glass-panel">
        <div className="subpage-header">
          <button className="back-btn" onClick={handleBack}>← Back to Creators</button>
          <div className="subpage-title-row">
            <h2>{selectedCreator.name}</h2>
            <span className="success-badge">{selectedCreator.successRate} Win Rate</span>
          </div>
          <div className="creator-address">{selectedCreator.address}</div>
        </div>
        
        <div className="gems-container">
          <h3>Potential Gems (Live Feed)</h3>
          {creatorGems.length === 0 ? (
            <div className="empty-state">Monitoring mempool for new token launches...</div>
          ) : (
            <div className="gems-grid">
              {creatorGems.map((gem, idx) => (
                <div key={idx} className="gem-card glass-panel">
                  <div className="gem-ticker">{gem.symbol}</div>
                  <div className="gem-name">{gem.name}</div>
                  <div className="gem-liquidity">Liq: {gem.liquidity}</div>
                  <div className="gem-address">CA: {gem.address.substring(0, 8)}...{gem.address.substring(gem.address.length - 6)}</div>
                  <div className="gem-time">{new Date(gem.timestamp).toLocaleTimeString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="creators-master-view">
      <h2 className="section-title">
        <span style={{ fontSize: '1.5rem', color: '#ff00ff' }}>🎯</span> Top 20 Pump.fun Creators
      </h2>
      <div className="creators-grid">
        {creators.map(creator => {
          const recentGemsCount = (liveGems[creator.id] || []).length;
          return (
            <div 
              key={creator.id} 
              className={`creator-card glass-panel ${recentGemsCount > 0 ? 'active-creator' : ''}`}
              onClick={() => setSelectedCreator(creator)}
            >
              <div className="creator-card-header">
                <h3>{creator.name}</h3>
                <div className="success-badge">{creator.successRate}</div>
              </div>
              <div className="creator-card-stats">
                <div className="total-tokens">Tokens: {creator.totalTokens}</div>
                {recentGemsCount > 0 && (
                  <div className="live-indicator">
                    <span className="pulse-dot"></span>
                    {recentGemsCount} New Gems!
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PumpfunCreators;
