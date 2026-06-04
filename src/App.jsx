import React, { useState, useEffect, useRef } from 'react';
import AgentDashboard from './components/AgentDashboard';
import TokenScanner from './components/TokenScanner';
import WhaleWatch from './components/WhaleWatch';
import PortfolioTracker from './components/PortfolioTracker';
import BuyRequestSidebar from './components/BuyRequestSidebar';
import ContractScanner from './components/ContractScanner';

function App() {
  const [currentView, setCurrentView] = useState('agent_dashboard');
  const [scannedTokens, setScannedTokens] = useState([]);
  const [thoughts, setThoughts] = useState([]);
  const [portfolio, setPortfolio] = useState({
    walletBalance: 100,
    totalPnlSol: 0,
    winRate: '100%',
    totalTrades: 0,
    activeTrades: 0,
    positions: []
  });
  const [latestWhaleTx, setLatestWhaleTx] = useState(null);
  const [connected, setConnected] = useState(false);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState(localStorage.getItem('creator_password') || '');
  const [authError, setAuthError] = useState('');
  const [bypassActive, setBypassActive] = useState(false);

  const wsRef = useRef(null);

  useEffect(() => {
    // Check if device is whitelisted for bypass
    fetch('http://localhost:3001/api/auth-status')
      .then(res => res.json())
      .then(data => {
        if (data.bypass) {
          setBypassActive(true);
          setIsAuthenticated(true);
          connectWS(true);
        } else {
          const savedPass = localStorage.getItem('creator_password');
          if (savedPass) {
            connectWS(false, savedPass);
          }
        }
      })
      .catch(err => {
        console.warn("Could not check auth status:", err.message);
        const savedPass = localStorage.getItem('creator_password');
        if (savedPass) {
          connectWS(false, savedPass);
        }
      });

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const connectWS = (bypass, passwordToUse) => {
    const activePass = passwordToUse || password;
    const url = bypass 
      ? `ws://localhost:3001`
      : `ws://localhost:3001?password=${encodeURIComponent(activePass)}`;

    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('Connected to Antigravity Live Broker');
      setConnected(true);
      setIsAuthenticated(true);
      setAuthError('');
      if (!bypass && activePass) {
        localStorage.setItem('creator_password', activePass);
      }
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'AUTH_FAILED') {
          setAuthError(message.message);
          setIsAuthenticated(false);
          localStorage.removeItem('creator_password');
          return;
        }

        switch (message.type) {
          case 'INITIAL_STATE':
            setScannedTokens(message.data.scannedTokens || []);
            setThoughts(message.data.thoughts || []);
            if (message.data.portfolio) {
              setPortfolio(message.data.portfolio);
            }
            break;
            
          case 'AGENT_LOG':
            setThoughts(prev => [message.data, ...prev].slice(0, 100));
            break;
            
          case 'SCANNED_TOKENS':
            setScannedTokens(message.data || []);
            break;
            
          case 'PORTFOLIO_UPDATE':
            setPortfolio(message.data);
            break;
            
          case 'WHALE_TX':
            setLatestWhaleTx(message.data);
            break;

          default:
            break;
        }
      } catch (e) {
        console.error('Error parsing broker websocket message:', e);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket closed.');
      setConnected(false);
      // Auto-reconnect
      setTimeout(() => {
        const savedPass = localStorage.getItem('creator_password');
        connectWS(bypass, savedPass);
      }, 3000);
    };

    wsRef.current = ws;
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (password.trim() === '') {
      setAuthError('Password cannot be empty');
      return;
    }
    connectWS(false, password);
  };

  const handleManualBuy = (tokenAddress) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'MANUAL_TRADE',
        action: 'BUY',
        data: { address: tokenAddress }
      }));
    }
  };

  const handleCancelBuy = (tokenAddress) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'MANUAL_TRADE',
        action: 'CANCEL_BUY',
        data: { address: tokenAddress }
      }));
    }
  };

  const handleForceBuyRequest = (tokenData) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'FORCE_BUY_REQUEST',
        data: tokenData
      }));
    }
  };

  const handleManualSell = (tradeId) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'MANUAL_TRADE',
        action: 'SELL',
        data: { id: tradeId }
      }));
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="auth-overlay-container">
        <div className="auth-card glass-panel">
          <div className="auth-logo-icon">🛰️</div>
          <h2>Creator Portal</h2>
          <p>Access is restricted. Please enter the creator passcode to decrypt the console.</p>
          
          <form onSubmit={handleAuthSubmit} className="auth-form">
            <div className="auth-input-group">
              <input 
                type="password" 
                placeholder="Enter Password..." 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input"
              />
              <span className="auth-input-lock">🔒</span>
            </div>
            
            {authError && (
              <div className="auth-error-message">
                ❌ {authError}
              </div>
            )}
            
            <button type="submit" className="auth-submit-btn">
              Authenticate Creator
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="app-header">
        <div className="logo-container">
          <span className="logo-icon">🛰️</span>
          <span className="logo-text">Antigravity Terminal</span>
        </div>
        
        <nav className="main-nav">
          <button 
            className={`nav-btn ${currentView === 'agent_dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentView('agent_dashboard')}
          >
            AI Agent Core
          </button>
          <button 
            className={`nav-btn ${currentView === 'scanner' ? 'active' : ''}`}
            onClick={() => setCurrentView('scanner')}
          >
            Solana & X Scanner
          </button>
          <button 
            className={`nav-btn ${currentView === 'whale_watch' ? 'active' : ''}`}
            onClick={() => setCurrentView('whale_watch')}
          >
            Whale Watcher
          </button>
          <button 
            className={`nav-btn ${currentView === 'portfolio' ? 'active' : ''}`}
            onClick={() => setCurrentView('portfolio')}
          >
            P&L Portfolio
          </button>
          <button 
            className={`nav-btn ${currentView === 'contract_scanner' ? 'active' : ''}`}
            onClick={() => setCurrentView('contract_scanner')}
          >
            Contract Scanner
          </button>
        </nav>

        <div className={`status-badge ${connected ? 'connected' : 'disconnected'}`}>
          <div className="status-dot"></div>
          {connected ? 'BROKER ONLINE' : 'BROKER OFFLINE'}
        </div>
      </header>

      <div className="app-workspace-layout">
        <main className="app-main-content">
          {currentView === 'agent_dashboard' && (
            <AgentDashboard 
              portfolio={portfolio} 
              thoughts={thoughts} 
            />
          )}
          {currentView === 'scanner' && (
            <TokenScanner 
              tokens={scannedTokens} 
              onManualBuy={handleManualBuy} 
            />
          )}
          {currentView === 'whale_watch' && (
            <WhaleWatch 
              transactions={latestWhaleTx} 
            />
          )}
          {currentView === 'portfolio' && (
            <PortfolioTracker 
              portfolio={portfolio} 
              onManualSell={handleManualSell} 
            />
          )}
          {currentView === 'contract_scanner' && (
            <ContractScanner 
              onForceBuyRequest={handleForceBuyRequest} 
            />
          )}
        </main>

        <BuyRequestSidebar 
          tokens={scannedTokens} 
          onApproveBuy={handleManualBuy} 
          onCancelBuy={handleCancelBuy}
        />
      </div>
    </>
  );
}

export default App;
