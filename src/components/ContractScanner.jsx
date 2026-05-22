import React, { useState } from 'react';

const ContractScanner = ({ onForceBuyRequest }) => {
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [tokenData, setTokenData] = useState(null);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!address.trim()) {
      setError('Please enter a contract address.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setTokenData(null);

    try {
      const passcode = localStorage.getItem('creator_passcode') || '';
      const response = await fetch(`http://localhost:3001/api/scan-token/${address.trim()}?passcode=${encodeURIComponent(passcode)}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized scan. Please refresh and log in again.');
        }
        throw new Error('Token not found or API error. Verify it is a valid Solana token address.');
      }
      
      const data = await response.json();
      
      if (!data.pairs || data.pairs.length === 0) {
        throw new Error('No active Dexscreener trading pairs found for this token address on Solana.');
      }
      
      // Filter for Solana pairs, default to the one with highest liquidity or volume
      const solanaPairs = data.pairs.filter(p => p.chainId === 'solana');
      if (solanaPairs.length === 0) {
        throw new Error('This token exists but has no active liquidity pools on Solana.');
      }

      // Sort by liquidity USD descending
      solanaPairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
      const bestPair = solanaPairs[0];

      // Format clean token info
      const formatted = {
        address: bestPair.baseToken.address,
        name: bestPair.baseToken.name,
        symbol: bestPair.baseToken.symbol,
        dexId: bestPair.dexId,
        url: bestPair.url,
        poolAddress: bestPair.poolAddress, // Pass pool address for GeckoTerminal embeds
        priceUsd: parseFloat(bestPair.priceUsd || 0),
        priceNative: parseFloat(bestPair.priceNative || 0),
        volume24h: bestPair.volume?.h24 || 0,
        volume6h: bestPair.volume?.h6 || 0,
        marketCap: bestPair.marketCap || 0,
        liquidityUsd: bestPair.liquidity?.usd || 0,
        priceChange5m: bestPair.priceChange?.m5 || 0,
        priceChange1h: bestPair.priceChange?.h1 || 0,
        priceChange6h: bestPair.priceChange?.h6 || 0,
        priceChange24h: bestPair.priceChange?.h24 || 0,
        txns24h: bestPair.txns?.h24 || { buys: 0, sells: 0 },
        info: bestPair.info || {},
        holders: data.holders || []
      };

      setTokenData(formatted);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getSafetyScore = (data) => {
    let checks = [];
    let score = 100;

    // Check Liquidity
    if (data.liquidityUsd < 5000) {
      checks.push({ type: 'danger', text: 'Critical: Liquidity is extremely low (< $5,000)' });
      score -= 30;
    } else if (data.liquidityUsd < 20000) {
      checks.push({ type: 'warning', text: 'Caution: Moderate liquidity ($5,000 - $20,000)' });
      score -= 15;
    } else {
      checks.push({ type: 'success', text: `Healthy Liquidity: $${data.liquidityUsd.toLocaleString()}` });
    }

    // Check Volume
    if (data.volume24h < 1000) {
      checks.push({ type: 'danger', text: 'No recent volume (< $1,000 in 24h)' });
      score -= 20;
    } else {
      checks.push({ type: 'success', text: `Healthy Volume: $${data.volume24h.toLocaleString()} (24h)` });
    }

    // Check Social Links
    const socials = data.info.socials || [];
    const hasTwitter = socials.some(s => s.type === 'twitter');
    const hasTelegram = socials.some(s => s.type === 'telegram');
    const hasWebsite = data.info.websites && data.info.websites.length > 0;

    if (!hasTwitter && !hasTelegram && !hasWebsite) {
      checks.push({ type: 'danger', text: 'Risk: No website or social links found' });
      score -= 25;
    } else {
      let socialText = 'Found socials: ';
      let found = [];
      if (hasWebsite) found.push('Website');
      if (hasTwitter) found.push('Twitter');
      if (hasTelegram) found.push('Telegram');
      checks.push({ type: 'success', text: socialText + found.join(', ') });
    }

    // Buy/Sell pressure
    const buys = data.txns24h.buys || 0;
    const sells = data.txns24h.sells || 0;
    const totalTx = buys + sells;
    if (totalTx > 10) {
      const buyRatio = buys / totalTx;
      if (buyRatio > 0.85) {
        checks.push({ type: 'warning', text: 'Extreme buy ratio: potential honeypot/pump check needed' });
        score -= 15;
      } else if (buyRatio < 0.15) {
        checks.push({ type: 'danger', text: 'Heavy selling: price is dumping rapidly' });
        score -= 20;
      }
    }

    return {
      score: Math.max(0, score),
      checks
    };
  };

  const handleCopy = (txt) => {
    navigator.clipboard.writeText(txt);
    alert('Address copied to clipboard!');
  };

  const renderScanResult = () => {
    if (!tokenData) return null;

    const { score, checks } = getSafetyScore(tokenData);
    let ratingColor = '#00ff88'; // green
    if (score < 40) ratingColor = '#ff3366'; // red
    else if (score < 75) ratingColor = '#ffaa00'; // orange

    return (
      <div className="scanner-result-container animate-fade-in">
        {/* Token Card Header */}
        <div className="scanner-result-header glass-panel">
          <div className="result-header-left">
            {tokenData.info.imageUrl ? (
              <img src={tokenData.info.imageUrl} alt="logo" className="scanner-token-logo" />
            ) : (
              <div className="scanner-token-logo-fallback">
                {tokenData.symbol.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="scanner-result-title">
                {tokenData.name} <span className="scanner-symbol">({tokenData.symbol})</span>
              </h2>
              <div className="scanner-address-row">
                <code className="scanner-result-address">{tokenData.address}</code>
                <button className="btn-copy-address" onClick={() => handleCopy(tokenData.address)}>
                  📋 Copy
                </button>
              </div>
            </div>
          </div>

          <div className="result-header-right">
            <div className="safety-rating-dial" style={{ borderColor: ratingColor }}>
              <span className="safety-score-number" style={{ color: ratingColor }}>{score}</span>
              <span className="safety-score-label">Safety</span>
            </div>
          </div>
        </div>

        <div className="scanner-metrics-layout">
          {/* Metrics Grid */}
          <div className="scanner-metrics-grid">
            <div className="scanner-metric-card glass-panel">
              <span className="metric-label">USD Price</span>
              <span className="metric-value">${tokenData.priceUsd.toLocaleString(undefined, { maximumFractionDigits: 9 })}</span>
              <span className="metric-sub">{tokenData.priceNative.toFixed(6)} SOL</span>
            </div>

            <div className="scanner-metric-card glass-panel">
              <span className="metric-label">Market Capitalization</span>
              <span className="metric-value">${tokenData.marketCap.toLocaleString()}</span>
              <span className="metric-sub">Pool: {tokenData.dexId.toUpperCase()}</span>
            </div>

            <div className="scanner-metric-card glass-panel">
              <span className="metric-label">24h Trading Volume</span>
              <span className="metric-value">${tokenData.volume24h.toLocaleString()}</span>
              <span className="metric-sub">6h Volume: ${tokenData.volume6h.toLocaleString()}</span>
            </div>

            <div className="scanner-metric-card glass-panel">
              <span className="metric-label">Liquidity Pool</span>
              <span className="metric-value">${tokenData.liquidityUsd.toLocaleString()}</span>
              <span className="metric-sub">Total locked/pooled value</span>
            </div>
          </div>

          {/* Performance trends */}
          <div className="scanner-perf-trends glass-panel">
            <h4>Price Movements</h4>
            <div className="perf-grid">
              <div className={`perf-item ${tokenData.priceChange5m >= 0 ? 'up' : 'down'}`}>
                <span className="perf-label">5m</span>
                <span className="perf-value">{tokenData.priceChange5m >= 0 ? '+' : ''}{tokenData.priceChange5m}%</span>
              </div>
              <div className={`perf-item ${tokenData.priceChange1h >= 0 ? 'up' : 'down'}`}>
                <span className="perf-label">1h</span>
                <span className="perf-value">{tokenData.priceChange1h >= 0 ? '+' : ''}{tokenData.priceChange1h}%</span>
              </div>
              <div className={`perf-item ${tokenData.priceChange6h >= 0 ? 'up' : 'down'}`}>
                <span className="perf-label">6h</span>
                <span className="perf-value">{tokenData.priceChange6h >= 0 ? '+' : ''}{tokenData.priceChange6h}%</span>
              </div>
              <div className={`perf-item ${tokenData.priceChange24h >= 0 ? 'up' : 'down'}`}>
                <span className="perf-label">24h</span>
                <span className="perf-value">{tokenData.priceChange24h >= 0 ? '+' : ''}{tokenData.priceChange24h}%</span>
              </div>
            </div>
            
            <div className="tx-ratio-bar">
              <div className="tx-bar-header">
                <span>Buys: {tokenData.txns24h.buys}</span>
                <span>Sells: {tokenData.txns24h.sells}</span>
              </div>
              <div className="bar-track">
                <div 
                  className="bar-fill-buy" 
                  style={{ width: `${(tokenData.txns24h.buys / (tokenData.txns24h.buys + tokenData.txns24h.sells || 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Live Trading Chart */}
        <div className="scanner-chart-container glass-panel">
          <div className="chart-header">
            <h4>📈 Live Trading Chart</h4>
            <span className="chart-subtitle">
              Powered by {tokenData.dexId === 'geckoterminal' ? 'GeckoTerminal Embed' : 'Dexscreener Live SDK'}
            </span>
          </div>
          <div className="chart-iframe-wrapper">
            <iframe 
              src={tokenData.dexId === 'geckoterminal' 
                ? `https://www.geckoterminal.com/solana/pools/${tokenData.poolAddress || tokenData.address}?embed=1&info=0&swaps=0&light_chart=0&bg_color=111827`
                : `https://dexscreener.com/solana/${tokenData.address}?embed=1&theme=dark&trades=0&info=0`
              }
              title="Live Trading Chart"
              width="100%"
              height="450px"
              frameBorder="0"
              allow="clipboard-write"
              allowFullScreen
            ></iframe>
          </div>
        </div>

        {/* Safety report checklist */}
        <div className="scanner-checklist-layout">
          <div className="scanner-checklist-card glass-panel">
            <h4>Contract Risk Assessment</h4>
            <div className="checklist-items">
              {checks.map((check, i) => (
                <div key={i} className={`checklist-item-row ${check.type}`}>
                  <span className="status-bullet"></span>
                  <p>{check.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="scanner-holders-card glass-panel">
            <h4>👥 Top 5 Token Holders</h4>
            <div className="holders-list">
              {tokenData.holders && tokenData.holders.length > 0 ? (
                tokenData.holders.map((holder, idx) => (
                  <div key={idx} className="holder-row">
                    <div className="holder-rank-address">
                      <span className="holder-rank">#{idx + 1}</span>
                      <code className="holder-address" title={holder.address}>
                        {holder.address.substring(0, 6)}...{holder.address.substring(holder.address.length - 6)}
                      </code>
                      <button className="btn-copy-mini" onClick={() => handleCopy(holder.address)}>
                        📋
                      </button>
                    </div>
                    <div className="holder-amount-percent">
                      <span className="holder-amount">
                        {holder.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                      <span className="holder-percent">{holder.percentage.toFixed(2)}%</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-holders-text">No holder information retrieved.</p>
              )}
            </div>
          </div>

          <div className="scanner-actions-card glass-panel">
            <h4>Simulate Action Integration</h4>
            <p>Directly route this token to the Buy Approval sidebar to process transaction simulation instantly.</p>
            <button 
              className="btn-trigger-force-buy" 
              onClick={() => {
                onForceBuyRequest({
                  address: tokenData.address,
                  symbol: tokenData.symbol,
                  name: tokenData.name,
                  marketCap: tokenData.marketCap,
                  volume24h: tokenData.volume24h
                });
                alert(`Requested simulated buy for ${tokenData.symbol}! Check the sidebar.`);
              }}
            >
              📥 Force Add to Buy Requests
            </button>
            {tokenData.url && (
              <a href={tokenData.url} target="_blank" rel="noopener noreferrer" className="btn-view-dex">
                📈 View Pair on {tokenData.dexId === 'geckoterminal' ? 'GeckoTerminal' : 'Dexscreener'}
              </a>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="contract-scanner-container">
      <div className="scanner-search-panel glass-panel">
        <h2>🛰️ Contract Address Scanner</h2>
        <p>Scan any Solana memecoin or token address to retrieve metadata, pricing trends, and assess risks instantly.</p>

        <form onSubmit={handleScan} className="scanner-search-form">
          <input 
            type="text" 
            placeholder="Enter Solana Token Mint Address (e.g. EKpQGS...)" 
            value={address} 
            onChange={(e) => setAddress(e.target.value)}
            className="scanner-address-input"
            disabled={isLoading}
          />
          <button type="submit" className="btn-scanner-submit" disabled={isLoading}>
            {isLoading ? 'Scanning Radar...' : 'Scan Address'}
          </button>
        </form>

        {error && (
          <div className="scanner-error-panel">
            ❌ {error}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="scanner-loading-radar glass-panel">
          <div className="radar-ping-ring"></div>
          <div className="radar-sweep-hand"></div>
          <p>Decrypting contract bytecode & querying live DEX pools...</p>
        </div>
      )}

      {renderScanResult()}
    </div>
  );
};

export default ContractScanner;
