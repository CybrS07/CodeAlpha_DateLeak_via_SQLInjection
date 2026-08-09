// This is the login logic. Extremely basic on purpose -
// it just sends whatever the user typed straight to the
// database, with no filtering at all.

import { supabase } from './supabase';

export async function loginUser(username, password) {
  const { data, error } = await supabase.rpc('login', {
    p_username: username,
    p_password: password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data || data.length === 0) {
    return { success: false, error: 'Wrong username or password.' };
  }

  const user = data[0];

  localStorage.setItem(
    'session',
    JSON.stringify({ loggedIn: true, username: user.username })
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