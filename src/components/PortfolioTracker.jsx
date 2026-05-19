import React from 'react';

const PortfolioTracker = ({ portfolio, onManualSell }) => {
  const positions = portfolio?.positions || [];
  
  const activePositions = positions.filter(p => p.status === 'HOLDING');
  const closedPositions = positions.filter(p => p.status === 'SOLD');

  const getPnlColor = (pnl) => {
    if (pnl > 0) return 'text-green';
    if (pnl < 0) return 'text-red';
    return '';
  };

  const getPnlClass = (pnl) => {
    if (pnl > 0) return 'pnl-positive';
    if (pnl < 0) return 'pnl-negative';
    return '';
  };

  const formatDuration = (buyTimeStr, sellTimeStr) => {
    const buyTime = new Date(buyTimeStr).getTime();
    const endTime = sellTimeStr ? new Date(sellTimeStr).getTime() : Date.now();
    const diff = Math.max(0, endTime - buyTime);
    
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    return `${min}m ${sec % 60}s`;
  };

  return (
    <div className="portfolio-tracker-container">
      {/* Active Holdings */}
      <div className="glass-panel portfolio-panel">
        <h2 className="section-title">
          <span style={{ fontSize: '1.5rem', color: '#ffcc00' }}>💰</span> Active Portfolio Holdings ({activePositions.length})
        </h2>

        <div className="table-wrapper">
          {activePositions.length === 0 ? (
            <div className="empty-state">No active token holdings. Agent is scanning for entries...</div>
          ) : (
            <table className="portfolio-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Buy Cap</th>
                  <th>Current Cap</th>
                  <th>Investment</th>
                  <th>Current Value</th>
                  <th>P&L %</th>
                  <th>Net P&L</th>
                  <th>Held For</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activePositions.map((pos) => (
                  <tr key={pos.id}>
                    <td>
                      <div className="pos-token">
                        <strong className="text-white">{pos.symbol}</strong>
                        <span className="pos-name">{pos.name}</span>
                      </div>
                    </td>
                    <td>${pos.buyMc.toLocaleString()}</td>
                    <td>${pos.currentMc.toLocaleString()}</td>
                    <td>{pos.investedSol.toFixed(2)} SOL</td>
                    <td>{pos.currentValSol.toFixed(2)} SOL</td>
                    <td>
                      <span className={`pnl-badge ${getPnlClass(pos.pnlPercent)}`}>
                        {pos.pnlPercent >= 0 ? '+' : ''}{pos.pnlPercent.toFixed(2)}%
                      </span>
                    </td>
                    <td className={getPnlColor(pos.pnlSol)}>
                      {pos.pnlSol >= 0 ? '+' : ''}{pos.pnlSol.toFixed(2)} SOL
                    </td>
                    <td>{formatDuration(pos.buyTime)}</td>
                    <td>
                      <button 
                        className="btn-manual-sell" 
                        onClick={() => onManualSell(pos.id)}
                      >
                        ⚠️ Manual Sell
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Closed Positions History */}
      <div className="glass-panel portfolio-panel">
        <h2 className="section-title">
          <span style={{ fontSize: '1.5rem', color: '#94a3b8' }}>📜</span> Trade History ({closedPositions.length})
        </h2>

        <div className="table-wrapper">
          {closedPositions.length === 0 ? (
            <div className="empty-state">No closed trades yet. Historical transactions will appear here.</div>
          ) : (
            <table className="portfolio-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Buy Cap</th>
                  <th>Exit Cap</th>
                  <th>Invested</th>
                  <th>Value Out</th>
                  <th>Realized P&L</th>
                  <th>Hold Duration</th>
                  <th>Exit Condition</th>
                </tr>
              </thead>
              <tbody>
                {closedPositions.map((pos) => (
                  <tr key={pos.id}>
                    <td>
                      <div className="pos-token">
                        <strong className="text-white">{pos.symbol}</strong>
                        <span className="pos-name">{pos.name}</span>
                      </div>
                    </td>
                    <td>${pos.buyMc.toLocaleString()}</td>
                    <td>${pos.currentMc.toLocaleString()}</td>
                    <td>{pos.investedSol.toFixed(2)} SOL</td>
                    <td>{pos.currentValSol.toFixed(2)} SOL</td>
                    <td>
                      <span className={`pnl-badge ${getPnlClass(pos.pnlPercent)}`}>
                        {pos.pnlPercent >= 0 ? '+' : ''}{pos.pnlPercent.toFixed(2)}%
                      </span>
                    </td>
                    <td>{formatDuration(pos.buyTime, pos.exitTime)}</td>
                    <td>
                      <span className="exit-reason-tag">
                        {pos.pnlPercent > 0 ? '🎯 Take Profit' : '🛑 Stop Loss'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default PortfolioTracker;
