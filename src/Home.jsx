// User home page. Fetches the user flag from /get-flag using our
// JWT token. If the token also carries admin capability, we show
// a link to the admin panel - but Home2.jsx still asks the server
// to verify, we never trust that hint alone.

import React, { useEffect, useState } from 'react';
import {
  logoutUser,
  fetchFlag,
  hasAdminCapabilityHint,
  getCapabilitiesHint,
} from './js-script/login';

function Home(props) {
  const [flag, setFlag] = useState(null);
  const [username, setUsername] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [capabilities, setCapabilities] = useState([]);

  useEffect(() => {
    async function loadFlag() {
      const result = await fetchFlag();

      if (result.success) {
        setFlag(result.flag);
        setUsername(result.username);
      } else {
        setErrorMessage(result.error);
      }

      setCapabilities(getCapabilitiesHint());
      setLoading(false);
    }

    loadFlag();
  }, []);

  function handleLogoutClick() {
    logoutUser();
    props.onLogout();
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Welcome{username ? ', ' + username : ''}!</h1>

        <div style={securityBadgeStyle}>
          <span style={dotStyle} />
          RSA-OAEP + AES-256 active
        </div>

        {loading && <p style={subtitleStyle}>Checking your token...</p>}

        {!loading && flag && (
          <div style={flagBoxStyle}>
            <p style={flagLabelStyle}>USER FLAG:</p>
            <code style={flagStyle}>{flag}</code>
          </div>
        )}

        {!loading && errorMessage && <p style={errorStyle}>{errorMessage}</p>}

        {!loading && capabilities.length > 0 && (
          <div style={capBoxStyle}>
            <p style={capLabelStyle}>Your capabilities</p>
            <div style={capListStyle}>
              {capabilities.map((c) => (
                <span key={c} style={capChipStyle}>
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {hasAdminCapabilityHint() && (
          <button style={adminButtonStyle} onClick={props.onGoAdmin}>
            Go to Admin Panel
          </button>
        )}

        <button style={buttonStyle} onClick={handleLogoutClick}>
          Log Out
        </button>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#111827',
  fontFamily: 'Arial, sans-serif',
};

const cardStyle = {
  backgroundColor: '#1f2937',
  padding: '2rem',
  borderRadius: '10px',
  width: '340px',
  textAlign: 'center',
};
const titleStyle = { color: 'white', marginBottom: '0.5rem' };
const subtitleStyle = { color: '#9ca3af', marginBottom: '1.25rem' };

const securityBadgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
  fontSize: '0.7rem',
  color: '#22c55e',
  backgroundColor: 'rgba(34,197,94,0.08)',
  border: '1px solid rgba(34,197,94,0.25)',
  padding: '0.25rem 0.6rem',
  borderRadius: '999px',
  marginBottom: '1rem',
};
const dotStyle = {
  width: '6px',
  height: '6px',
  borderRadius: '999px',
  backgroundColor: '#22c55e',
};

const flagBoxStyle = {
  backgroundColor: '#111827',
  border: '1px solid #22c55e',
  borderRadius: '8px',
  padding: '0.75rem',
  marginBottom: '1rem',
};
const flagLabelStyle = { color: '#22c55e', fontSize: '0.75rem', margin: 0, marginBottom: '0.35rem' };
const flagStyle = { color: 'white', fontSize: '0.9rem', wordBreak: 'break-all' };

const capBoxStyle = {
  backgroundColor: '#111827',
  border: '1px solid #374151',
  borderRadius: '8px',
  padding: '0.6rem 0.75rem',
  marginBottom: '1rem',
  textAlign: 'left',
};
const capLabelStyle = {
  color: '#9ca3af',
  fontSize: '0.7rem',
  margin: 0,
  marginBottom: '0.4rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};
const capListStyle = { display: 'flex', flexWrap: 'wrap', gap: '0.35rem' };
const capChipStyle = {
  fontSize: '0.72rem',
  color: '#e5e7eb',
  backgroundColor: '#1f2937',
  border: '1px solid #374151',
  padding: '0.15rem 0.5rem',
  borderRadius: '4px',
  fontFamily: 'monospace',
};

const errorStyle = { color: '#f87171', marginBottom: '1rem', fontSize: '0.85rem' };

const buttonStyle = {
  padding: '0.5rem 1.25rem',
  borderRadius: '5px',
  border: '1px solid #374151',
  backgroundColor: 'transparent',
  color: 'white',
  cursor: 'pointer',
  marginTop: '0.5rem',
};

const adminButtonStyle = {
  display: 'block',
  width: '100%',
  padding: '0.5rem',
  borderRadius: '5px',
  border: 'none',
  backgroundColor: '#a855f7',
  color: 'white',
  cursor: 'pointer',
  marginBottom: '0.5rem',
};

export default Home;