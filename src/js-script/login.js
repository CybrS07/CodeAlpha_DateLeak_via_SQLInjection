// This is the login/signup logic - the SECURE version.
//
// Three things make login safe:
//   1. We call a database function (login) and pass username/password
//      as separate PARAMETERS - never as one glued-together string.
//   2. The password and other sensitive fields are stored encrypted
//      (AES-256) in the database, not as plain text.
//   3. Logging in also requires a capability token - a second secret
//      created automatically when the account was made. The user
//      never sees or types it - the BROWSER remembers it for them
//      (saved to localStorage right after signup), and login.js just
//      quietly attaches it to every login attempt from that device.

import { supabase } from './supabase';

// Where we keep each account's capability token in the browser.
// (In a real app you'd want something more robust than localStorage,
// like an httpOnly cookie set by a server - this is simplified for
// the demo.)
function tokenStorageKey(username) {
  return 'capability_token:' + username;
}

function saveToken(username, token) {
  localStorage.setItem(tokenStorageKey(username), token);
}

function getStoredToken(username) {
  return localStorage.getItem(tokenStorageKey(username));
}

// Creates a new account. The database hands back a capability token,
// which we immediately save in the browser so the user never has to
// see it, remember it, or type it in anywhere.
export async function signupUser(username, phone, email, password) {
  if (!username || !email || !password) {
    return { success: false, error: 'Username, email, and password are required.' };
  }

  const { data, error } = await supabase.rpc('signup', {
    p_username: username,
    p_phone: phone || null,
    p_email: email,
    p_password: password,
    p_enc_key: import.meta.env.VITE_ENC_KEY,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const result = data[0];
  saveToken(result.new_username, result.capability_token);

  return { success: true };
}

export async function loginUser(username, password) {
  if (!username || !password) {
    return { success: false, error: 'Please fill in both fields.' };
  }

  // Grab the capability token automatically - the user never enters this.
  const capabilityToken = getStoredToken(username);

  if (!capabilityToken) {
    return {
      success: false,
      error: 'No saved access token found for this account on this device. Please sign up first.',
    };
  }

  // supabase.rpc() sends every value as a separate parameter -
  // Postgres keeps them separate from the SQL code itself, so there
  // is nothing for SQL injection to "break out" of.
  const { data, error } = await supabase.rpc('login', {
    p_username: username,
    p_password: password,
    p_capability_token: capabilityToken,
    p_enc_key: import.meta.env.VITE_ENC_KEY,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data || data.length === 0) {
    return { success: false, error: 'Wrong username or password.' };
  }

  const user = data[0];

  // Save a tiny "I am logged in" note in the browser.
  // This is just for our demo, not real session handling.
  localStorage.setItem(
    'session',
    JSON.stringify({ loggedIn: true, username: user.out_username })
  );

  return { success: true, account: user };
}

export function logoutUser() {
  localStorage.removeItem('session');
}

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem('session'));
  } catch (e) {
    return null;
  }
}