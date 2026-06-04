import React from 'react';

const TokenScanner = ({ tokens, onManualBuy }) => {
  // Filter out BUY_REQUESTED tokens so they are sent to the sidebar instead of the live monitor
  const activeScannerTokens = tokens.filter(t => t.status !== 'BUY_REQUESTED');

  const copyToClipboard = (text, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'BOUGHT':
        return <span className="buy-badgebought">BOUGHT BY AGENT</span>;
      case 'BUY_REQUESTED':
        return <span className="buy-badgerequested">BUY REQUESTED</span>;
      case 'PENDING_MC':
        return <span className="buy-badgepending">AWAITING $70K MC</span>;
      case 'IGNORED':
        return <span className="buy-badgeignored">IGNORED</span>;
      case 'FLAGGED':
        return <span className="buy-badgeflagged">FLAGGED</span>;
      default:
        return <span className="buy-badgeanalyzing">ANALYZING</span>;
    }
  };

  const getScoreColor = (score) => {
    if (score >= 85) return '#00ff88'; // high
    if (score >= 70) return '#ffcc00'; // med
    return '#ff3366'; // low
  };

  return (
    <div className="glass-panel scanner-view-container">
      <h2 className="section-title">
        <span style={{ fontSize: '1.5rem', color: '#00ff88' }}>🔍</span> Live Solana & X.com Token Scanner
      </h2>

      {activeScannerTokens.length === 0 ? (
        <div className="empty-state">Listening to Solana mainnet logs and X timelines... waiting for launches...</div>
      ) : (
        <div className="scanner-grid">
          {activeScannerTokens.map((token, idx) => {
            const mcProgress = Math.min((token.marketCap / 70000) * 100, 100);
            
            return (
              <div key={token.address} className="scanned-token-card glass-panel">
                {/* Header */}
                <div className="card-top-row">
                  <div className="token-source-info">
                    <span className={`source-tag ${token.source.toLowerCase().replace('.', '')}`}>
                      {token.source}
                    </span>
                    <span className="timestamp-nano">{new Date(token.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div>{getStatusBadge(token.status)}</div>
                </div>

                {/* Identity */}
                <div className="token-info-identity">
                  <div>
                    <h3 className="token-symbol-display">{token.symbol}</h3>
                    <div className="token-name-subtext">{token.name}</div>
                  </div>
                  
                  {/* Score */}
                  <div className="score-container">
                    <span className="score-label">Relatability</span>
                    <span className="score-num" style={{ color: getScoreColor(token.relatabilityScore) }}>
                      {token.relatabilityScore}%
                    </span>
                  </div>
                </div>

                {/* Contract address */}
                <div className="ca-box-container">
                  <span className="ca-title">CA:</span>
                  <span className="ca-val">{token.address.substring(0, 10)}...{token.address.substring(token.address.length - 8)}</span>
                  <button className="copy-btn-ca" onClick={(e) => copyToClipboard(token.address, e)} title="Copy Address">
                    📋
                  </button>
                </div>

                {/* Market Cap & Buying Logic */}
                <div className="mc-checker-box">
                  <div className="mc-labels">
                    <span>Market Cap: <strong className="text-white">${token.marketCap.toLocaleString()}</strong></span>
                    <span>Target: <strong>$70,000</strong></span>
                  </div>
                  <div className="mc-bar-bg">
                    <div 
                      className="mc-bar-fill" 
                      style={{ 
                        width: `${mcProgress}%`,
                        backgroundColor: token.marketCap >= 70000 ? '#00ff88' : '#ffcc00'
                      }}
                    ></div>
                  </div>
                </div>

                {/* AI / Tweet Context */}
                <div className="ai-analysis-details">
                  <div className="ai-heading">🤖 AI Agent Scan Verdict:</div>
                  <p className="ai-text">{token.reason}</p>

                  {token.tweetContext && (
                    <div className="tweet-context-bubble">
                      <div className="tweet-user">
                        <span className="tw-avatar">🐦</span>
                        <strong>@{token.tweetContext.username}</strong>
                      </div>
                      <div className="tweet-text-content">"{token.tweetContext.text}"</div>
                    </div>
                  )}

                  {token.mentions && token.mentions.length > 0 && (
                    <div className="token-mentions-box" style={{ marginTop: '8px', padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="mentions-header" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>📢 Top X Mentions ({token.mentions.length}/5):</span>
                      </div>
                      <div className="mentions-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {token.mentions.map((user) => (
                          <span key={user} className="mention-badge" style={{ fontSize: '0.75rem', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.2)', fontWeight: '500' }}>
                            @{user}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="card-action-row">
                  {token.status === 'BUY_REQUESTED' ? (
                    <button 
                      className="btn-approve-buy" 
                      onClick={() => onManualBuy(token.address)}
                    >
                      ✅ Approve Buy Request (5 SOL)
                    </button>
                  ) : token.status !== 'BOUGHT' && (
                    <button 
                      className="btn-manual-buy" 
                      onClick={() => onManualBuy(token.address)}
                    >
                      🚀 Manual Buy Override
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TokenScanner;
