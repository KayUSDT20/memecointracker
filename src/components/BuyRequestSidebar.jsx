import React from 'react';

const BuyRequestSidebar = ({ tokens, onApproveBuy, onCancelBuy }) => {
  const buyRequests = tokens.filter(t => t.status === 'BUY_REQUESTED');
  // Sort requests by volume descending for display clarity
  buyRequests.sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0));

  return (
    <aside className="buy-requests-sidebar glass-panel">
      <div className="sidebar-header">
        <div className="sidebar-title-row">
          <span className="sidebar-icon">🔔</span>
          <h3>Buy Requests</h3>
        </div>
        <span className="requests-counter-badge">
          {buyRequests.length}/10 Active
        </span>
      </div>

      <div className="sidebar-content-scroll">
        {buyRequests.length === 0 ? (
          <div className="sidebar-empty-state">
            <span className="sleepy-icon">💤</span>
            <p>No active buy requests. Scanned tokens meeting requirements will appear here for approval.</p>
          </div>
        ) : (
          <div className="sidebar-requests-list">
            {buyRequests.map(token => (
              <div key={token.address} className="sidebar-request-card glass-panel">
                <div className="sidebar-card-header">
                  <span className="sidebar-source-badge">{token.source}</span>
                  <span className="sidebar-vol-badge">
                    Vol: ${(token.volume24h || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>

                <div className="sidebar-card-identity">
                  <div>
                    <h4 className="sidebar-token-symbol">{token.symbol}</h4>
                    <span className="sidebar-token-name">{token.name}</span>
                  </div>
                  <div className="sidebar-token-mc">
                    MC: <strong>${token.marketCap.toLocaleString()}</strong>
                  </div>
                </div>

                <p className="sidebar-reason-text" title={token.reason}>
                  {token.reason.substring(0, 75)}{token.reason.length > 75 ? '...' : ''}
                </p>

                <div className="sidebar-action-buttons">
                  <button 
                    className="btn-approve-buy" 
                    onClick={() => onApproveBuy(token.address)}
                  >
                    ✅ Approve (5 SOL)
                  </button>
                  <button 
                    className="btn-cancel-buy" 
                    onClick={() => onCancelBuy(token.address)}
                  >
                    ❌ Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};

export default BuyRequestSidebar;
