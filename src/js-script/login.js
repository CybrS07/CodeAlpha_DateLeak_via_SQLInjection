// This file has two layers of protection working together:
//
//   1. FRONT-END REGEX - catches obviously bad input (quotes,
//      semicolons, SQL keywords) before we even send a request.
//      This is a nice first line of defense and gives the user fast
//      feedback, but it's not the REAL protection - clever attackers
//      can often find ways around a regex filter.
//
//   2. The actual protection: our /login and /signup edge functions
//      call PARAMETERIZED database functions (see schema.sql), which
//      is what truly stops SQL injection, no matter what characters
//      are typed. The regex below is a bonus, not our only defense.

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

// Looks for classic SQL injection characters/keywords:
// quotes, semicolons, comment markers, and SQL command words.
const SQLI_PATTERN =
  /('|"|--|;|\/\*|\*\/|\bOR\b|\bAND\b|\bUNION\b|\bSELECT\b|\bDROP\b|\bINSERT\b|\bDELETE\b|\bUPDATE\b|\bEXEC\b)/i;

function looksLikeSqlInjection(value) {
  return typeof value === 'string' && SQLI_PATTERN.test(value);
}

// Checks a list of fields against the regex and returns an error
// message for the first bad one it finds, or null if they're all okay.
function checkFieldsForSqlInjection(fields) {
  for (const [label, value] of Object.entries(fields)) {
    if (value && looksLikeSqlInjection(value)) {
      return `${label} contains characters that aren't allowed.`;
    }
  }
  return null;
}

export async function loginUser(username, password) {
  if (!username || !password) {
    return { success: false, error: 'Please fill in both fields.' };
  }

  const sqliError = checkFieldsForSqlInjection({ Username: username, Password: password });
  if (sqliError) {
    return { success: false, error: sqliError };
  }

  try {
    const response = await fetch(`${FUNCTIONS_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Login failed.' };
    }

    localStorage.setItem(
      'session',
      JSON.stringify({ loggedIn: true, username: result.username })
    );

    return { success: true };
  } catch (err) {
    return { success: false, error: 'Could not reach the server.' };
  }
}

export async function signupUser(username, phone, email, password) {
  if (!username || !email || !password) {
    return { success: false, error: 'Username, email, and password are required.' };
  }

  const sqliError = checkFieldsForSqlInjection({
    Username: username,
    Phone: phone,
    Email: email,
    Password: password,
  });
  if (sqliError) {
    return { success: false, error: sqliError };
  }

  try {
    const response = await fetch(`${FUNCTIONS_URL}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, phone, email, password }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Sign up failed.' };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: 'Could not reach the server.' };
  }
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