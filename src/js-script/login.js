// This file talks to our edge functions and manages the capability
// token. Two layers of SQL-injection protection are involved before
// any of this even runs:
//   1. The regex below - checked in the browser, first line of
//      defense, fast feedback.
//   2. Real validation + parameterized queries on the server (see
//      the edge functions and schema.sql) - this is what actually
//      matters, since a regex in the browser can always be bypassed.

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

const SQLI_PATTERN =
  /('|"|--|;|\/\*|\*\/|\bOR\b|\bAND\b|\bUNION\b|\bSELECT\b|\bDROP\b|\bINSERT\b|\bDELETE\b|\bUPDATE\b|\bEXEC\b)/i;

function looksLikeSqlInjection(value) {
  return typeof value === 'string' && SQLI_PATTERN.test(value);
}

function checkFieldsForSqlInjection(fields) {
  for (const [label, value] of Object.entries(fields)) {
    if (value && looksLikeSqlInjection(value)) {
      return `${label} contains characters that aren't allowed.`;
    }
  }
  return null;
}

// Reads the capabilities out of our saved token WITHOUT verifying
// its signature. This is only safe to use for deciding what to SHOW
// in the UI (like whether to display an "Admin Panel" link) - never
// to actually grant access. Real access decisions always happen on
// the server, which does check the signature (see get-flag and
// get-admin-flag).
function readCapabilitiesFromToken(token) {
  try {
    const payloadBase64 = token.split('.')[1];
    const payload = JSON.parse(atob(payloadBase64));
    return payload.capabilities || [];
  } catch (e) {
    return [];
  }
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

    localStorage.setItem('token', result.token);
    localStorage.setItem('username', result.username);

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

// Asks the server for the regular user flag. The server checks the
// token's signature and its capabilities before answering.
export async function fetchFlag() {
  return callProtectedEndpoint('get-flag');
}

// Asks the server for the admin flag. Only works if the token really
// contains "home:admin" - the server verifies this itself.
export async function fetchAdminFlag() {
  return callProtectedEndpoint('get-admin-flag');
}

async function callProtectedEndpoint(name) {
  const token = localStorage.getItem('token');

  if (!token) {
    return { success: false, error: 'Not logged in.' };
  }

  try {
    const response = await fetch(`${FUNCTIONS_URL}/${name}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Access denied.' };
    }

    return { success: true, flag: result.flag, username: result.username };
  } catch (err) {
    return { success: false, error: 'Could not reach the server.' };
  }
}

// UI-only hint: does the saved token look like it has admin
// capability? NOT a security check - just used to decide whether to
// show the "Admin Panel" link. fetchAdminFlag() above is what
// actually enforces it.
export function hasAdminCapabilityHint() {
  const token = localStorage.getItem('token');
  if (!token) return false;
  return readCapabilitiesFromToken(token).includes('home:admin');
}

export function logoutUser() {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
}

export function hasSavedToken() {
  return !!localStorage.getItem('token');
}