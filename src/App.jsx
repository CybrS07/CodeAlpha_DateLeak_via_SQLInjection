// This is our login page.
// It shows a form with username + password.
// When submitted, we call loginUser() from login.js.

import { useState } from 'react';
import Home from './Home';
import { loginUser, getSession } from './js-script/login';

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const existingSession = getSession();
  const [loggedIn, setLoggedIn] = useState(existingSession ? existingSession.loggedIn : false);

  async function handleSubmit(event) {
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

  if (loggedIn) {
    return <Home onLogout={() => setLoggedIn(false)} />;
  }

  return (
    <div style={pageStyle}>
      <form style={cardStyle} onSubmit={handleSubmit}>
        <h1 style={titleStyle}>Login</h1>

        <label style={labelStyle}>Username</label>
        <input
          style={inputStyle}
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />

        <label style={labelStyle}>Password</label>
        <input
          style={inputStyle}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {errorMessage ? <p style={errorStyle}>{errorMessage}</p> : null}

        <button style={buttonStyle} type="submit" disabled={isLoading}>
          {isLoading ? 'Checking...' : 'Log In'}
        </button>
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

const cardStyle = {
  backgroundColor: '#1f2937',
  padding: '2rem',
  borderRadius: '10px',
  width: '300px',
};

const titleStyle = {
  color: 'white',
  marginBottom: '1rem',
};

const labelStyle = {
  color: '#9ca3af',
  fontSize: '0.85rem',
  display: 'block',
  marginTop: '0.75rem',
};

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

const errorStyle = {
  color: '#f87171',
  marginTop: '0.75rem',
  fontSize: '0.85rem',
};

export default App;