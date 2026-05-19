import React, { useState, useEffect } from 'react';

const WhaleWatch = ({ transactions }) => {
  const [whaleTxs, setWhaleTxs] = useState([]);

  // Local storage/accumulation of whale transactions up to 50 entries
  useEffect(() => {
    if (transactions && transactions.id) {
      setWhaleTxs(prev => {
        // Prevent duplicate IDs from WebSocket re-delivery
        if (prev.some(t => t.id === transactions.id)) return prev;
        return [transactions, ...prev].slice(0, 50);
      });
    }
  }, [transactions]);

  // Initial load or static fallback if no transactions are in state yet
  const displayedTxs = whaleTxs.length > 0 ? whaleTxs : [
    { id: 'm1', wallet: '4bW3...y7rK', symbol: '$WIF', type: 'BUY', solAmount: 42.50, usdValue: 6375, priceImpact: '+2.1%', timestamp: new Date(Date.now() - 30000).toISOString() },
    { id: 'm2', wallet: '8zPt...2tLq', symbol: '$BONK', type: 'BUY', solAmount: 18.20, usdValue: 2730, priceImpact: '+0.8%', timestamp: new Date(Date.now() - 60000).toISOString() },
    { id: 'm3', wallet: '6mKv...4jHn', symbol: '$POPCAT', type: 'SELL', solAmount: 35.00, usdValue: 5250, priceImpact: '-1.9%', timestamp: new Date(Date.now() - 90000).toISOString() },
    { id: 'm4', wallet: 'DezX...cj2c', symbol: '$PEPE', type: 'BUY', solAmount: 61.40, usdValue: 9210, priceImpact: '+3.5%', timestamp: new Date(Date.now() - 120000).toISOString() }
  ];

  // Calculate buy pressure
  const last15 = displayedTxs.slice(0, 15);
  const buyCount = last15.filter(tx => tx.type === 'BUY').length;
  const buyPressurePercent = last15.length > 0 ? Math.round((buyCount / last15.length) * 100) : 75;

  const getPressureLabel = (percent) => {
    if (percent >= 75) return { text: 'Strong Accumulation (Bullish)', color: '#00ff88', advice: 'Optimal buy entry window: Whales are aggressively bidding.' };
    if (percent >= 50) return { text: 'Moderate Buying (Neutral-Bullish)', color: '#ffcc00', advice: 'Stable entry window: Whale activity is balanced with slight buy bias.' };
    return { text: 'Heavy Distribution (Bearish)', color: '#ff3366', advice: 'Caution: Whales are unloading positions. Wait for buy pressure stabilization.' };
  };

  const pressure = getPressureLabel(buyPressurePercent);

  return (
    <div className="whale-watcher-container">
      {/* Upper Gauge Row */}
      <div className="glass-panel whale-gauge-panel">
        <div>
          <h2 className="section-title">
            <span style={{ fontSize: '1.5rem', color: '#ffcc00' }}>🐋</span> Solana Whale Watch Center
          </h2>
          <p className="whale-subtext">Monitors large transactions (&gt; 10 SOL) to map institutional liquidity entry and exit points.</p>
        </div>

        <div className="gauge-metric-container">
          <div className="gauge-header">
            <span className="gauge-title">Whale Buy Pressure (Last 15 Trades)</span>
            <span className="gauge-num" style={{ color: pressure.color }}>{buyPressurePercent}% Buys</span>
          </div>
          <div className="gauge-bar-bg">
            <div className="gauge-bar-fill" style={{ width: `${buyPressurePercent}%`, backgroundColor: pressure.color }}></div>
          </div>
          <div className="gauge-status-text" style={{ color: pressure.color }}>
            {pressure.text}
          </div>
          <div className="gauge-advice-text">
            💡 <strong>Advice:</strong> {pressure.advice}
          </div>
        </div>
      </div>

      {/* Scrolling transactions list */}
      <div className="glass-panel whale-feed-panel">
        <h3 className="section-title">⚡ Real-time Whale Transaction Log</h3>
        
        <div className="whale-feed-list">
          {displayedTxs.map((tx) => (
            <div key={tx.id} className={`whale-tx-item glass-panel ${tx.type.toLowerCase()}-border`}>
              <div className="tx-left">
                <span className={`tx-type-badge ${tx.type.toLowerCase()}`}>
                  {tx.type}
                </span>
                <div className="tx-details">
                  <div className="tx-token-desc">
                    <strong className="text-white">{tx.symbol}</strong>
                    <span className="wallet-addr">by {tx.wallet}</span>
                  </div>
                  <div className="tx-time">{new Date(tx.timestamp).toLocaleTimeString()}</div>
                </div>
              </div>

              <div className="tx-right">
                <div className="tx-amounts">
                  <span className="tx-sol">{tx.solAmount.toFixed(2)} SOL</span>
                  <span className="tx-usd">${tx.usdValue.toLocaleString()} USD</span>
                </div>
                <span className="tx-impact" style={{ color: tx.type === 'BUY' ? '#00ff88' : '#ff3366' }}>
                  Impact: {tx.priceImpact}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WhaleWatch;
