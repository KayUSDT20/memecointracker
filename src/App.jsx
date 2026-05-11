import React, { useState } from 'react';
import Leaderboard from './components/Leaderboard';
import RecentMentions from './components/RecentMentions';
import PumpfunCreators from './components/PumpfunCreators';
import { topInfluencers } from './data/mockData';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');

  return (
    <>
      <header className="app-header">
        <div className="logo-container">
          <span className="logo-icon">🚀</span>
          <span className="logo-text">AlphaTracker</span>
        </div>
        
        <nav className="main-nav">
          <button 
            className={`nav-btn ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentView('dashboard')}
          >
            Twitter Tracker
          </button>
          <button 
            className={`nav-btn ${currentView === 'creators' ? 'active' : ''}`}
            onClick={() => setCurrentView('creators')}
          >
            Pump.fun Creators
          </button>
        </nav>

        <div className="status-badge">
          <div className="status-dot"></div>
          Monitoring {topInfluencers.length}/{topInfluencers.length} Top Influencers
        </div>
      </header>

      <main className="dashboard-container" style={{ gridTemplateColumns: currentView === 'dashboard' ? '350px 1fr' : '1fr' }}>
        {currentView === 'dashboard' ? (
          <>
            <aside>
              <Leaderboard />
            </aside>
            <section>
              <RecentMentions />
            </section>
          </>
        ) : (
          <section className="full-width">
            <PumpfunCreators />
          </section>
        )}
      </main>
    </>
  );
}

export default App;
