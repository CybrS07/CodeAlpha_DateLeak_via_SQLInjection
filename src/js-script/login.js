// =============================================================
// Frontend auth + double-layer security.
//
// Layer 1 (in this file, before the network): RSA-OAEP-2048.
//   We ask the server for its public key once, cache it, and
//   encrypt username/password with it BEFORE sending. Even if
//   HTTPS is inspected by a corporate proxy or the browser is
//   attached to an insecure debugger, the credentials on the
//   wire are still ciphertext that only the server's private
//   key can open.
//
// Layer 2 (already there, on the server / DB):
//   - AES-256 at rest for phone/email/password (pgp_sym_encrypt).
//   - Parameterized SQL (no string glueing).
//   - Signed JWT capability tokens.
//
// The old regex + validation still run first, because a fast
// "no" in the browser is nicer than a round-trip that ends the
// same way.
// =============================================================

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

// -------------------------------------------------------------
// RSA public key: fetched once from the server and cached in
// memory. We deliberately don't hardcode a key here - that way
// there's nothing to accidentally leave stale, and rotating the
// key on the server just works.
// -------------------------------------------------------------
let cachedPublicKey = null;

async function getServerPublicKey() {
  if (cachedPublicKey) return cachedPublicKey;

  const response = await fetch(`${FUNCTIONS_URL}/get-public-key`);
  if (!response.ok) {
    throw new Error('Could not fetch server public key.');
  }
  const { publicKey } = await response.json();

  // Convert the PEM string into a CryptoKey the browser can use.
  const pemBody = publicKey
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s+/g, '');

  const binary = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  cachedPublicKey = await crypto.subtle.importKey(
    'spki',
    binary.buffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  );

  return cachedPublicKey;
}

async function encryptPayload(payloadObject) {
  const publicKey = await getServerPublicKey();
  const plaintext = new TextEncoder().encode(JSON.stringify(payloadObject));

  // RSA-OAEP with SHA-256 on a 2048-bit key can encrypt up to
  // ~190 bytes of plaintext. Username + password + a small
  // timestamp fits comfortably inside that.
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    plaintext
  );

  // Turn the bytes into base64 so we can send it as JSON.
  return btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
}

// -------------------------------------------------------------
// UI-only helper: read capabilities from a saved token WITHOUT
// verifying the signature. Safe for choosing what to show in
// the UI (e.g. the Admin button), never for granting access.
// -------------------------------------------------------------
function readCapabilitiesFromToken(token) {
  try {
    const payloadBase64 = token.split('.')[1];
    const payload = JSON.parse(atob(payloadBase64));
    return payload.capabilities || [];
  } catch (e) {
    return [];
  }
}

// -------------------------------------------------------------
// LOGIN
// -------------------------------------------------------------
export async function loginUser(username, password) {
  if (!username || !password) {
    return { success: false, error: 'Please fill in both fields.' };
  }

  const sqliError = checkFieldsForSqlInjection({ Username: username, Password: password });
  if (sqliError) {
    return { success: false, error: sqliError };
  }

  try {
    const encrypted = await encryptPayload({
      username,
      password,
      ts: Date.now(), // used server-side to reject old replays
    });

    const response = await fetch(`${FUNCTIONS_URL}/login-secure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: encrypted }),
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

// -------------------------------------------------------------
// SIGNUP
// -------------------------------------------------------------
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
    const encrypted = await encryptPayload({
      username,
      phone: phone || '',
      email,
      password,
      ts: Date.now(),
    });

    const response = await fetch(`${FUNCTIONS_URL}/signup-secure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: encrypted }),
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

// -------------------------------------------------------------
// Protected reads - the token is already the capability proof,
// no need to re-encrypt anything here.
// -------------------------------------------------------------
export async function fetchFlag() {
  return callProtectedEndpoint('get-flag');
}

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

export function hasAdminCapabilityHint() {
  const token = localStorage.getItem('token');
  if (!token) return false;
  return readCapabilitiesFromToken(token).includes('home:admin');
}

export function getCapabilitiesHint() {
  const token = localStorage.getItem('token');
  if (!token) return [];
  return readCapabilitiesFromToken(token);
}

export function logoutUser() {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
}

export function hasSavedToken() {
  return !!localStorage.getItem('token');
}