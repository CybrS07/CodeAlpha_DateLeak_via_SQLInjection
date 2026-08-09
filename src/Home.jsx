// This is the page we show AFTER a successful login.
// It reveals our flag, since only a logged-in user should see it.

import { logoutUser, getSession } from './js-script/login';

function Home(props) {
  const session = getSession();

  function handleLogoutClick() {
    logoutUser();
    props.onLogout();
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>
          Welcome{session && session.username ? ', ' + session.username : ''}!
        </h1>
        <p style={subtitleStyle}>You made it in.</p>

        {session && session.loggedIn ? (
          <div style={flagBoxStyle}>
            <p style={flagLabelStyle}>FLAG:</p>
            <code style={flagStyle}>T@HA{'{'}G3t_th3_sq1,1nj3ct10n{'}'}</code>
          </div>
        ) : null}

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

const titleStyle = {
  color: 'white',
  marginBottom: '0.25rem',
};

const subtitleStyle = {
  color: '#9ca3af',
  marginBottom: '1.25rem',
};

const flagBoxStyle = {
  backgroundColor: '#111827',
  border: '1px solid #22c55e',
  borderRadius: '8px',
  padding: '0.75rem',
  marginBottom: '1.25rem',
};

const flagLabelStyle = {
  color: '#22c55e',
  fontSize: '0.75rem',
  margin: 0,
  marginBottom: '0.35rem',
};

const flagStyle = {
  color: 'white',
  fontSize: '0.9rem',
  wordBreak: 'break-all',
};

const buttonStyle = {
  padding: '0.5rem 1.25rem',
  borderRadius: '5px',
  border: '1px solid #374151',
  backgroundColor: 'transparent',
  color: 'white',
  cursor: 'pointer',
};

export default Home;