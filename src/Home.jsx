// User home page. Fetches the user flag from /get-flag, sending our
// token. If the token also happens to carry admin capability, we
// show a link to the admin panel - but Home2.jsx doesn't trust that
// hint, it asks the server again for real.

import React, { useEffect, useState } from 'react';
import { logoutUser, fetchFlag, hasAdminCapabilityHint } from './js-script/login';

function Home(props) {
  const [flag, setFlag] = useState(null);
  const [username, setUsername] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFlag() {
      const result = await fetchFlag();

      if (result.success) {
        setFlag(result.flag);
        setUsername(result.username);
      } else {
        setErrorMessage(result.error);
      }

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

        {loading && <p style={subtitleStyle}>Checking your token...</p>}

        {!loading && flag && (
          <div style={flagBoxStyle}>
            <p style={flagLabelStyle}>USER FLAG:</p>
            <code style={flagStyle}>{flag}</code>
          </div>
        )}

        {!loading && errorMessage && <p style={errorStyle}>{errorMessage}</p>}

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

const cardStyle = { backgroundColor: '#1f2937', padding: '2rem', borderRadius: '10px', width: '340px', textAlign: 'center' };
const titleStyle = { color: 'white', marginBottom: '0.25rem' };
const subtitleStyle = { color: '#9ca3af', marginBottom: '1.25rem' };
const flagBoxStyle = { backgroundColor: '#111827', border: '1px solid #22c55e', borderRadius: '8px', padding: '0.75rem', marginBottom: '1.25rem' };
const flagLabelStyle = { color: '#22c55e', fontSize: '0.75rem', margin: 0, marginBottom: '0.35rem' };
const flagStyle = { color: 'white', fontSize: '0.9rem', wordBreak: 'break-all' };
const errorStyle = { color: '#f87171', marginBottom: '1.25rem', fontSize: '0.85rem' };

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