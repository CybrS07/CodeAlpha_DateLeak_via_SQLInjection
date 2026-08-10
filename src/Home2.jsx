// Admin home page. Fetches the admin flag from /get-admin-flag. The
// server checks whether the token really has "home:admin" in its
// signed capabilities - if not, it returns a 403 and we show an
// access-denied message instead of a flag. Nothing about this page
// itself decides who's an admin; it just asks the server and shows
// whatever it says.

import React, { useEffect, useState } from 'react';
import { fetchAdminFlag } from './js-script/login-secure';

function Home2(props) {
  const [flag, setFlag] = useState(null);
  const [username, setUsername] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAdminFlag() {
      const result = await fetchAdminFlag();

      if (result.success) {
        setFlag(result.flag);
        setUsername(result.username);
      } else {
        setErrorMessage(result.error);
      }

      setLoading(false);
    }

    loadAdminFlag();
  }, []);

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Admin Panel</h1>

        {loading && <p style={subtitleStyle}>Checking your admin capability...</p>}

        {!loading && flag && (
          <div style={flagBoxStyle}>
            <p style={flagLabelStyle}>ADMIN FLAG:</p>
            <code style={flagStyle}>{flag}</code>
          </div>
        )}

        {!loading && errorMessage && (
          <div style={deniedBoxStyle}>
            <p style={deniedTextStyle}>Access denied</p>
            <p style={errorStyle}>{errorMessage}</p>
          </div>
        )}

        <button style={buttonStyle} onClick={props.onBack}>
          Back to Home
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
const flagBoxStyle = { backgroundColor: '#111827', border: '1px solid #a855f7', borderRadius: '8px', padding: '0.75rem', marginBottom: '1.25rem' };
const flagLabelStyle = { color: '#a855f7', fontSize: '0.75rem', margin: 0, marginBottom: '0.35rem' };
const flagStyle = { color: 'white', fontSize: '0.9rem', wordBreak: 'break-all' };

const deniedBoxStyle = { backgroundColor: '#111827', border: '1px solid #f87171', borderRadius: '8px', padding: '0.75rem', marginBottom: '1.25rem' };
const deniedTextStyle = { color: '#f87171', fontWeight: 'bold', margin: 0, marginBottom: '0.35rem' };
const errorStyle = { color: '#9ca3af', fontSize: '0.85rem', margin: 0 };

const buttonStyle = {
  padding: '0.5rem 1.25rem',
  borderRadius: '5px',
  border: '1px solid #374151',
  backgroundColor: 'transparent',
  color: 'white',
  cursor: 'pointer',
};

export default Home2;