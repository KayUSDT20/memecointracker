import React, { useState, useEffect, useRef } from 'react';

const AgentDashboard = ({ portfolio, thoughts }) => {
  const terminalEndRef = useRef(null);
  const [pnlHistory, setPnlHistory] = useState([0]);

  // Keep track of P&L history to draw the chart
  useEffect(() => {
    if (portfolio) {
      setPnlHistory(prev => {
        const nextVal = parseFloat(portfolio.totalPnlSol || 0);
        // Avoid adding duplicate values if nothing changed
        if (prev[prev.length - 1] === nextVal && prev.length > 1) return prev;
        const updated = [...prev, nextVal];
        return updated.slice(-20); // Keep last 20 data points
      });
    }
  }, [portfolio]);

  // Scroll to bottom of terminal
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [thoughts]);

  const getPnlColor = (val) => {
    if (val > 0) return '#00ff88';
    if (val < 0) return '#ff3366';
    return '#94a3b8';
  };

  // Helper to generate SVG path for the chart
  const renderChartPath = () => {
    if (pnlHistory.length < 2) return '';
    const width = 500;
    const height = 150;
    const padding = 20;

    const min = Math.min(...pnlHistory, -1);
    const max = Math.max(...pnlHistory, 1);
    const range = max - min;

    const points = pnlHistory.map((val, idx) => {
      const x = padding + (idx * (width - 2 * padding)) / (pnlHistory.length - 1);
      const y = height - padding - ((val - min) * (height - 2 * padding)) / range;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  };

  const renderChartFill = () => {
    if (pnlHistory.length < 2) return '';
    const width = 500;
    const height = 150;
    const padding = 20;

    const min = Math.min(...pnlHistory, -1);
    const max = Math.max(...pnlHistory, 1);
    const range = max - min;

    const points = pnlHistory.map((val, idx) => {
      const x = padding + (idx * (width - 2 * padding)) / (pnlHistory.length - 1);
      const y = height - padding - ((val - min) * (height - 2 * padding)) / range;
      return `${x},${y}`;
    });

    const startX = padding;
    const startY = height - padding;
    const endX = padding + ((pnlHistory.length - 1) * (width - 2 * padding)) / (pnlHistory.length - 1);

    return `M ${startX},${startY} L ${points.join(' L ')} L ${endX},${startY} Z`;
  };

  const wallet = portfolio || { walletBalance: 100, totalPnlSol: 0, winRate: '100%', totalTrades: 0, activeTrades: 0 };

  return (
    <div className="agent-dashboard-grid">
      {/* Left Column: Stats & Configuration */}
      <div className="agent-left-panel">
        {/* Agent Status Panel */}
        <div className="glass-panel stat-card-main">
          <div className="agent-profile">
            <div className="agent-avatar-container">
              <span className="agent-avatar">🤖</span>
              <span className="pulse-ring"></span>
            </div>
            <div>
              <h2 className="agent-name">Antigravity Trading Agent</h2>
              <p className="agent-mode">Status: <span className="status-live">Scanning Mempool</span></p>
            </div>
          </div>

          <div className="agent-stats-grid">
            <div className="agent-stat-box">
              <span className="stat-label">Wallet Balance</span>
              <span className="stat-value">{parseFloat(wallet.walletBalance).toFixed(2)} SOL</span>
            </div>
            <div className="agent-stat-box">
              <span className="stat-label">Net Profit</span>
              <span className="stat-value" style={{ color: getPnlColor(wallet.totalPnlSol) }}>
                {wallet.totalPnlSol >= 0 ? '+' : ''}{parseFloat(wallet.totalPnlSol).toFixed(2)} SOL
              </span>
            </div>
            <div className="agent-stat-box">
              <span className="stat-label">Win Rate</span>
              <span className="stat-value text-accent">{wallet.winRate}</span>
            </div>
            <div className="agent-stat-box">
              <span className="stat-label">Active / Total</span>
              <span className="stat-value">{wallet.activeTrades} / {wallet.totalTrades}</span>
            </div>
          </div>
        </div>

        {/* Configuration Panel */}
        <div className="glass-panel config-panel">
          <h3 className="section-title">⚙️ Agent Parameters</h3>
          <div className="config-item">
            <span className="config-label">Minimum Market Cap to Buy</span>
            <span className="config-value highlight-green">$70,000</span>
          </div>
          <div className="config-item">
            <span className="config-label">Meme Relatability Threshold</span>
            <span className="config-value">70%</span>
          </div>
          <div className="config-item">
            <span className="config-label">Standard Order Size</span>
            <span className="config-value">5.0 SOL</span>
          </div>
          <div className="config-item">
            <span className="config-label">Target Take Profit</span>
            <span className="config-value text-accent">+100% to +250%</span>
          </div>
          <div className="config-item">
            <span className="config-label">Target Stop Loss</span>
            <span className="config-value text-danger">-30% to -40%</span>
          </div>
        </div>
      </div>

      {/* Right Column: Chart & Terminal */}
      <div className="agent-right-panel">
        {/* P&L Curve Chart */}
        <div className="glass-panel chart-panel">
          <h3 className="section-title">📈 Real-time P&L Curve (SOL)</h3>
          <div className="svg-chart-container">
            <svg viewBox="0 0 500 150" className="pnl-svg-chart">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00ff88" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#00ff88" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line x1="20" y1="20" x2="480" y2="20" stroke="rgba(255,255,255,0.03)" />
              <line x1="20" y1="75" x2="480" y2="75" stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
              <line x1="20" y1="130" x2="480" y2="130" stroke="rgba(255,255,255,0.03)" />
              
              {/* Zero line */}
              <line x1="20" y1="75" x2="480" y2="75" stroke="rgba(255,255,255,0.1)" />

              {pnlHistory.length >= 2 && (
                <>
                  {/* Fill Area */}
                  <path d={renderChartFill()} fill="url(#chartGrad)" />
                  {/* Line */}
                  <path d={renderChartPath()} fill="none" stroke="#00ff88" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  {/* Last value dot */}
                  {(() => {
                    const width = 500;
                    const height = 150;
                    const padding = 20;
                    const min = Math.min(...pnlHistory, -1);
                    const max = Math.max(...pnlHistory, 1);
                    const range = max - min;
                    const lastIdx = pnlHistory.length - 1;
                    const lastVal = pnlHistory[lastIdx];
                    const cx = padding + (lastIdx * (width - 2 * padding)) / lastIdx;
                    const cy = height - padding - ((lastVal - min) * (height - 2 * padding)) / range;
                    return <circle cx={cx} cy={cy} r="5" fill="#00ff88" stroke="#ffffff" strokeWidth="1.5" />;
                  })()}
                </>
              )}
            </svg>
          </div>
        </div>

        {/* Live Terminal Thoughts */}
        <div className="glass-panel terminal-panel">
          <h3 className="section-title">💻 Agent Cognitive Terminal Logs</h3>
          <div className="terminal-screen">
            <div className="terminal-header">
              <span className="term-dot red"></span>
              <span className="term-dot yellow"></span>
              <span className="term-dot green"></span>
              <span className="term-title">antigravity_agent_core.log</span>
            </div>
            <div className="terminal-logs">
              {thoughts.length === 0 ? (
                <div className="terminal-row placeholder">Initializing telemetry logs... ready.</div>
              ) : (
                thoughts.map((log, idx) => (
                  <div key={idx} className="terminal-row">
                    <span className="log-arrow">&gt;</span> {log}
                  </div>
                ))
              )}
              <div ref={terminalEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentDashboard;
