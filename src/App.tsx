import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useState } from 'react';
import { WatchlistScreen } from './features/watchlist/WatchlistScreen';
import { ChartPanel } from './features/chart/ChartPanel';
import { SettingsScreen } from './features/settings/SettingsScreen';
import './App.css';

function App() {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  return (
    <Router>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {/* Navigation Bar */}
        <nav
          style={{
            padding: '10px 20px',
            backgroundColor: '#f0f0f0',
            borderBottom: '1px solid #ccc',
          }}
        >
          <ul style={{ listStyle: 'none', display: 'flex', gap: '20px', margin: 0, padding: 0 }}>
            <li>
              <Link
                to="/"
                data-testid="nav-watchlist-link"
                style={{ textDecoration: 'none', color: '#333', fontWeight: 'bold' }}
              >
                Watchlist
              </Link>
            </li>
            <li>
              <Link
                to="/settings"
                data-testid="nav-settings-link"
                style={{ textDecoration: 'none', color: '#333', fontWeight: 'bold' }}
              >
                Settings
              </Link>
            </li>
          </ul>
        </nav>

        {/* Main Content Area */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    <WatchlistScreen
                      selectedSymbol={selectedSymbol}
                      onSelectSymbol={(symbol) => setSelectedSymbol(symbol)}
                    />
                  </div>
                  <div style={{ flex: 2, overflowY: 'auto' }}>
                    <ChartPanel selectedSymbol={selectedSymbol} />
                  </div>
                </>
              }
            />
            <Route
              path="/settings"
              element={
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  <SettingsScreen />
                </div>
              }
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
