# Secure Auth — how it works

This project uses three ideas layered on top of each other. Each one is doing a specific, small job. Together they make the app hard to attack in the ways you'd expect a login system to be attacked.

## The three ideas

### 1. AES-256 encryption (at rest, inside the database)

`accounts.phone_enc`, `accounts.email_enc`, and `accounts.password_enc` are all `bytea` columns. Nothing plaintext lives in them. The `signup()` stored procedure wraps every incoming value in `pgp_sym_encrypt(value, ENC_KEY, 'cipher-algo=aes256')` before insert, and `login()` uses `pgp_sym_decrypt` when it needs to check a password.

`ENC_KEY` lives in Supabase secrets, not in the database. So if someone gets a raw dump of the `accounts` table, they get ciphertext and no key. This is what "encryption at rest" means: the data is protected in the place it lives.

Two things are worth noticing:

- The username is _not_ encrypted — we need to `WHERE username = p_username` to find the row, and you can't index encrypted values usefully.
- Passwords are encrypted rather than hashed here because the assignment asked for it. In a normal app, passwords are hashed with something like Argon2 and never decryptable, even by the server.

### 2. Capability codes (the tokens the app hands out)

A capability is a small, signed permission slip. Not "who are you", but "what are you allowed to do".

At signup, every account gets `capabilities = array['home:user']` by default. There's no `p_capabilities` parameter in `signup()`, so the client can't grant itself anything. To make a test admin, you have to `UPDATE ... SET capabilities = array['home:user', 'home:admin']` in the database yourself.

At login, the DB hands the capability list to the `/login-secure` edge function, which stuffs it into a JWT signed with `JWT_SECRET`:

```json
{ "username": "alice", "capabilities": ["home:user"], "exp": ... }
```

That JWT is what the browser stores. From then on:

- `/get-flag` opens the token, checks the signature and expiry, and asks: does `capabilities` include `home:user`? If yes → flag. If no → 403.
- `/get-admin-flag` does the same check with `home:admin`.

Nothing on the server looks up "is alice an admin" in the database on every request. The token _is_ the answer, because it's signed. A user can't edit their own capabilities without breaking the signature, and they don't have `JWT_SECRET`, so they can't re-sign it.

The frontend has a `hasAdminCapabilityHint()` helper that peeks at the JWT to decide whether to _show_ the Admin button. That's UI only — the actual admin flag is only released after the server verifies the token itself.

### 3. Double-layer encryption (RSA on the client, then AES on the server)

Before double-layer, the login flow was:

```
browser → { username, password } as JSON → HTTPS → server → DB (AES-256)
```

HTTPS is real protection, but the JSON on the wire is plaintext to anything that can see inside the TLS tunnel — a corporate MITM proxy, a misconfigured debug tool, a compromised extension.

With double-layer, the flow is:

```
browser → RSA-OAEP(payload, server public key) → HTTPS → server RSA private key → validation → DB (AES-256)
```

Same trip, but the payload is _already ciphertext_ before HTTPS touches it. Only the server's private key can open it, and the private key never leaves the server (it's in Supabase secrets as `RSA_PRIVATE_KEY`). The public key is served by a tiny `/get-public-key` endpoint, so the browser doesn't need it hardcoded.

Each encrypted payload also carries a `ts` (timestamp). The server rejects anything older than 60 seconds. So even if someone captures the exact encrypted bytes, they can't replay them a minute later.

That's the two layers:

- **Layer 1 (in transit, before the network):** RSA-OAEP-2048 with the server's public key.
- **Layer 2 (at rest, after the DB call):** AES-256 via `pgp_sym_encrypt`.

Independent keys, independent algorithms, independent purposes. If one layer breaks, the other still applies.

---

## Setup

You need to do these things once.

### 1. Generate an RSA key pair

On your machine:

```bash
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out private.pem
openssl rsa -in private.pem -pubout -out public.pem
```

You'll get two files: `private.pem` (keep this secret) and `public.pem` (safe to expose).

### 2. Add the secrets in Supabase

Dashboard → Project Settings → Edge Functions → Secrets. Paste in:

| Name              | Value                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| `RSA_PRIVATE_KEY` | The entire contents of `private.pem`, including the `-----BEGIN PRIVATE KEY-----` header/footer |
| `RSA_PUBLIC_KEY`  | The entire contents of `public.pem`, including the `-----BEGIN PUBLIC KEY-----` header/footer   |
| `ENC_KEY`         | Already there from Task 2 — the AES key used by `pgp_sym_encrypt`                               |
| `JWT_SECRET`      | Already there from Task 2 — the HMAC key used to sign JWTs                                      |

### 3. Deploy three edge functions

Create each one in the dashboard (Functions → Create new) and paste the file:

- `get-public-key` → `get-public-key.ts`
- `signup-secure` → `signup-secure.ts`
- `login-secure` → `login-secure.ts`

The old `/signup`, `/login`, `/get-flag`, `/get-admin-flag` functions from Task 2 are still needed — `/get-flag` and `/get-admin-flag` don't change, and you can leave `/signup` and `/login` deployed or delete them, since the frontend now calls the `-secure` versions.

### 4. Replace three files in the frontend

- `src/js-script/login.js` → the new `login.js`
- `src/Home.jsx` → the new `Home.jsx`
- `src/Home2.jsx` → the new `Home2.jsx`

`App.jsx`, `main.jsx`, and `supabase.js` are unchanged.

### 5. Run

```bash
npm run dev
```

Open it, sign up, log in. On the home page you should see the small green "RSA-OAEP + AES-256 active" badge and a chip showing your `home:user` capability. If you `UPDATE` yourself to admin in the DB and log in again (a fresh login re-mints the JWT with the new capabilities), the Admin Panel button appears.

---

## Troubleshooting the signup failure

The previous version of this project had a placeholder RSA public key hardcoded into `login.js`. If you didn't replace it with a real key, encryption produced garbage that the server couldn't decrypt, and signup failed silently with "Could not decrypt payload."

The new `login.js` doesn't hardcode a key at all. It fetches the public key from `/get-public-key` on first use and caches it. So as long as you set `RSA_PUBLIC_KEY` in Supabase secrets (step 2 above), it will just work — nothing to paste into any source file.

If signup still fails, check in order:

1. Is `/get-public-key` deployed and returning your public key? Open it directly in the browser: `https://YOUR-PROJECT.supabase.co/functions/v1/get-public-key`. You should see JSON with a `publicKey` field.
2. Is `RSA_PRIVATE_KEY` set in secrets, with the full PEM (BEGIN/END lines included)?
3. Are `RSA_PUBLIC_KEY` and `RSA_PRIVATE_KEY` from the same key pair? If you regenerated one and not the other they won't match. `openssl rsa -in private.pem -pubout` should reproduce your public.pem exactly.
4. Is your machine's clock right? The server rejects payloads older than 60 seconds, and a badly-set clock will make every request look "expired."

---

## Files in this drop

| File                | Where it goes                                        |
| ------------------- | ---------------------------------------------------- |
| `login.js`          | `src/js-script/login.js`                             |
| `Home.jsx`          | `src/Home.jsx`                                       |
| `Home2.jsx`         | `src/Home2.jsx`                                      |
| `get-public-key.ts` | New Supabase edge function `get-public-key/index.ts` |
| `signup-secure.ts`  | New Supabase edge function `signup-secure/index.ts`  |
| `login-secure.ts`   | New Supabase edge function `login-secure/index.ts`   |
| `README.md`         | This file                                            |
