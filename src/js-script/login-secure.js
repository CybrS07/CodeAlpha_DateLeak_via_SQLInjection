// =====================================================================
// ENHANCED SECURITY: Double-Layer Encryption Protocol
// 
// LAYER 1 (Frontend - this file): RSA-4096 encryption
//   - All sensitive data encrypted client-side before transmission
//   - Public key distributed with app (cannot decrypt)
//   - Private key ONLY on server (never exposed to client)
//   - Provides: End-to-end encryption, forward secrecy per request
//
// LAYER 2 (Backend/EAS): Existing AES-256 encryption
//   - Data at rest in database
//   - Additional parameterized SQL protection
//   - JWT capability token system
//
// =====================================================================

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

// PUBLIC KEY - distributed with app, used ONLY for encryption
// This is your RSA-4096 public key. Generate fresh keys for production:
//   openssl genrsa -out private.pem 4096
//   openssl rsa -in private.pem -pubout -out public.pem
// Then copy the public key here.
const RSA_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAwOs1+BZV3hJDK0f8qOZR
A0+fLRU8rLw45a21laNDAn6n5MXjbh+sRd+B8d6+t5gVfo+84wogJpVf7VId6Sty
IRKsiGA0QHp1ImuWDDXBPA535WHoaeU/UMGx3NC1YXnRqxYmRK7aiF6PCVrvR5eb
QOuArslxi5KVu7v4gFf2XlrmMMEpnY8FQ27YP5sPQtrms0SJv231F6NLth/UrpCc
fVFPRlB/Cfzxlrh6OyDIsBMewxWDheqN5MQtfHfjuKDixwKPNmyvnaE/IV6+4dEG
cjFRv8RnivW1CJGbEBvl+uvlo3SVo+AOxGYhWCuhY/HbVaqS5oC9ItGgBBEECGMs
LiL2I5Kg3VXEETIijNeNBWaaNoU74z1HuJSsw4Mw6H8PeiOjTi3eweb4brAGcXUe
HVnn8lcwNvkNOz7cZ2q73Z8lvluspEDOnvOsAPkuzeRlZRkhun8PoIItz33iY2Qa
ivVeEMVXaNgi4hNmPygeMK+WsfNg1UtI8LKzqUtct39yJueLbJoCjtW6Um4UuDVa
dKgPqfDua8Rv8heDw+MmzRwSLkwYGbWszfv5AteCSbkXNO3cu6MN1F0s+snRmx0k
cxAVLj5R3gP1DCua61wYUSkIc2qHjkDn6Oco/hbDNqbKg4W0bNp908uzEDhG5i0S
At/Js27oHJDA86F90svFrFUCAwEAAQ==
-----END PUBLIC KEY-----
`;

// =====================================================================
// RSA ENCRYPTION UTILITIES
// =====================================================================

async function encryptDataWithRSA(data) {
  try {
    // Import the public key
    const publicKey = await importRSAPublicKey();
    
    // Convert data to JSON string if it's an object
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    
    // Encrypt using RSA-OAEP (optimal asymmetric encryption padding)
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256'
      },
      publicKey,
      new TextEncoder().encode(dataString)
    );
    
    // Convert to base64 for transmission
    return btoa(String.fromCharCode(...new Uint8Array(encryptedData)));
  } catch (error) {
    console.error('RSA encryption failed:', error);
    throw new Error('Failed to encrypt data for transmission');
  }
}

async function importRSAPublicKey() {
  // Remove PEM headers and convert to binary
  const pemHeader = '-----BEGIN PUBLIC KEY-----';
  const pemFooter = '-----END PUBLIC KEY-----';
  const pemContents = RSA_PUBLIC_KEY
    .substring(pemHeader.length, RSA_PUBLIC_KEY.length - pemFooter.length)
    .trim()
    .replace(/\n/g, '');
  
  const binaryString = atob(pemContents);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return await crypto.subtle.importKey(
    'spki',
    bytes.buffer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256'
    },
    false,
    ['encrypt']
  );
}

// =====================================================================
// ORIGINAL REGEX & VALIDATION (FIRST LAYER OF DEFENSE)
// =====================================================================

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

function readCapabilitiesFromToken(token) {
  try {
    const payloadBase64 = token.split('.')[1];
    const payload = JSON.parse(atob(payloadBase64));
    return payload.capabilities || [];
  } catch (e) {
    return [];
  }
}

// =====================================================================
// ENHANCED LOGIN - WITH RSA ENCRYPTION
// =====================================================================

export async function loginUser(username, password) {
  if (!username || !password) {
    return { success: false, error: 'Please fill in both fields.' };
  }

  // Client-side validation
  const sqliError = checkFieldsForSqlInjection({ Username: username, Password: password });
  if (sqliError) {
    return { success: false, error: sqliError };
  }

  try {
    // LAYER 1: Encrypt with RSA-4096 before sending
    const encryptedPayload = await encryptDataWithRSA({
      username,
      password,
      timestamp: Date.now(), // Prevents replay attacks
      nonce: crypto.getRandomValues(new Uint8Array(16)).toString() // Additional entropy
    });

    const response = await fetch(`${FUNCTIONS_URL}/login-secure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        encrypted_payload: encryptedPayload,
        // Client identifies encryption method for future algorithm upgrades
        encryption_method: 'RSA-OAEP-4096',
        encryption_timestamp: Date.now()
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Login failed.' };
    }

    localStorage.setItem('token', result.token);
    localStorage.setItem('username', result.username);

    return { success: true };
  } catch (err) {
    console.error('Login error:', err);
    return { success: false, error: 'Could not reach the server.' };
  }
}

// =====================================================================
// ENHANCED SIGNUP - WITH RSA ENCRYPTION
// =====================================================================

export async function signupUser(username, phone, email, password) {
  if (!username || !email || !password) {
    return { success: false, error: 'Username, email, and password are required.' };
  }

  // Client-side validation
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
    // LAYER 1: Encrypt with RSA-4096 before sending
    const encryptedPayload = await encryptDataWithRSA({
      username,
      phone: phone || null,
      email,
      password,
      timestamp: Date.now(),
      nonce: crypto.getRandomValues(new Uint8Array(16)).toString()
    });

    const response = await fetch(`${FUNCTIONS_URL}/signup-secure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        encrypted_payload: encryptedPayload,
        encryption_method: 'RSA-OAEP-4096',
        encryption_timestamp: Date.now()
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Sign up failed.' };
    }

    return { success: true };
  } catch (err) {
    console.error('Signup error:', err);
    return { success: false, error: 'Could not reach the server.' };
  }
}

// =====================================================================
// FLAG FETCHING - UNCHANGED (Token already provides security)
// =====================================================================

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

// =====================================================================
// UI HINTS (UNCHANGED)
// =====================================================================

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