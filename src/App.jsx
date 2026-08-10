import React, { useState } from 'react';
import Home from './Home';
import Home2 from './Home2';
import { loginUser, signupUser, hasSavedToken } from './js-script/login';

function App() {
  const [mode, setMode] = useState('login');
  const [page, setPage] = useState('home'); // 'home' or 'home2', once logged in

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [loggedIn, setLoggedIn] = useState(hasSavedToken());

  async function handleLogin(event) {
    event.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    const result = await loginUser(username, password);

    setIsLoading(false);

    if (result.success) {
      setLoggedIn(true);
    } else {
      setErrorMessage(result.error);
    }
  }

  async function handleSignup(event) {
    event.preventDefault();
    setErrorMessage('');
    setInfoMessage('');
    setIsLoading(true);

    const result = await signupUser(username, phone, email, password);

    setIsLoading(false);

    if (result.success) {
      setInfoMessage('Account created! You can log in now.');
      setMode('login');
    } else {
      setErrorMessage(result.error);
    }
  }

  function handleLogoutFromHome() {
    setLoggedIn(false);
    setPage('home');
  }

  if (loggedIn) {
    if (page === 'home2') {
      return <Home2 onLogout={handleLogoutFromHome} onBack={() => setPage('home')} />;
    }
    return <Home onLogout={handleLogoutFromHome} onGoAdmin={() => setPage('home2')} />;
  }

  return (
    <div style={pageStyle}>
      <form style={cardStyle} onSubmit={mode === 'login' ? handleLogin : handleSignup}>
        <h1 style={titleStyle}>{mode === 'login' ? 'Secure Login' : 'Create Account'}</h1>

        <label style={labelStyle}>Username</label>
        <input
          style={inputStyle}
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />

        {mode === 'signup' && (
          <>
            <label style={labelStyle}>Email</label>
            <input
              style={inputStyle}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <label style={labelStyle}>Phone</label>
            <input
              style={inputStyle}
              type="text"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </>
        )}

        <label style={labelStyle}>Password</label>
        <input
          style={inputStyle}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {errorMessage ? <p style={errorStyle}>{errorMessage}</p> : null}
        {infoMessage ? <p style={infoStyle}>{infoMessage}</p> : null}

        <button style={buttonStyle} type="submit" disabled={isLoading}>
          {isLoading ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Sign Up'}
        </button>

        <p style={switchTextStyle}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <span
            style={switchLinkStyle}
            onClick={() => {
              setErrorMessage('');
              setInfoMessage('');
              setMode(mode === 'login' ? 'signup' : 'login');
            }}
          >
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </span>
        </p>
      </form>
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

const cardStyle = { backgroundColor: '#1f2937', padding: '2rem', borderRadius: '10px', width: '300px' };
const titleStyle = { color: 'white', marginBottom: '1rem' };
const labelStyle = { color: '#9ca3af', fontSize: '0.85rem', display: 'block', marginTop: '0.75rem' };

const inputStyle = {
  width: '100%',
  padding: '0.5rem',
  marginTop: '0.25rem',
  borderRadius: '5px',
  border: '1px solid #374151',
  backgroundColor: '#111827',
  color: 'white',
  boxSizing: 'border-box',
};

const buttonStyle = {
  width: '100%',
  marginTop: '1.25rem',
  padding: '0.6rem',
  borderRadius: '5px',
  border: 'none',
  backgroundColor: '#22c55e',
  color: 'black',
  fontWeight: 'bold',
  cursor: 'pointer',
};

const errorStyle = { color: '#f87171', marginTop: '0.75rem', fontSize: '0.85rem' };
const infoStyle = { color: '#4ade80', marginTop: '0.75rem', fontSize: '0.85rem' };
const switchTextStyle = { color: '#9ca3af', fontSize: '0.8rem', marginTop: '1rem', textAlign: 'center' };
const switchLinkStyle = { color: '#22c55e', cursor: 'pointer', textDecoration: 'underline' };

export default App;