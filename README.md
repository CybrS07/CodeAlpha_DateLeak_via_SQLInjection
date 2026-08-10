# Task 2 - Detecting Data Leaks Using SQL Injection

A login system built with React + Supabase, showing how to protect
against SQL injection without needing a separate server.

## The trick that keeps this simple

Earlier we talked about Edge Functions as a way to keep secrets (the
encryption key, the JWT signing key) away from the browser. Edge
Functions work, but they need the Supabase CLI, a Deno-based server,
and a deploy step - a lot for a first project.

Here's a much simpler way to get the same protection: **write the
secrets directly inside the SQL functions themselves**, instead of
inside `.env`. Since SQL functions only ever run inside the database

- never inside someone's browser - a secret placed there is never
  part of the website's JavaScript bundle, so nobody visiting your site
  can see it (view-source, dev tools, etc. show none of it).

That means:

- No Edge Functions
- No CLI, no Deno, no deploy step
- Your React code just calls `supabase.rpc(...)`, exactly like before

## Setup

1. Open `schema.sql`. Find the two `CHANGE_ME` placeholders and
   replace them with your own random values (there are two functions
   that need `enc_key` and one that needs `jwt_secret` - **make sure
   the same value is used everywhere it appears**, or password
   checks / logins will silently fail). Generate values with:
   ```
   openssl rand -hex 32
   ```
2. Run the whole file in the Supabase SQL editor.
3. Fill in `.env` with your Supabase project URL and anon key (from
   Supabase → Settings → API). Nothing secret goes in this file.
4. `npm install`
5. `npm run dev`

## Try it

1. Click "Sign up," create an account.
2. Log in with that username/password.
3. You'll land on the Home page, which asks the database for the
   flag using the token you got at login. If everything checks out:
   `T@HA{G3t_th3_sq1,1nj3ct10n}`

## What actually stops SQL injection here

`signup()`, `login()`, and `get_flag()` in `schema.sql` all take every
value as a separate PARAMETER (like `p_username`, `p_password`)
instead of pasting them into one big SQL string. The database always
knows exactly where "code" ends and "data" begins, no matter what
characters someone types into the form - so there's nothing to break
out of.

## Honest limitation of this approach (worth knowing)

Putting secrets inside SQL function bodies is genuinely safe _as long
as only you can edit your database's functions_ - which is true for a
normal Supabase project. Where it gets weaker: if you ever paste
`schema.sql` into a **public** GitHub repo with the real secret values
still in it (instead of `CHANGE_ME`), anyone reading that repo could
see them. Two easy habits fix that:

- Keep the real secret values only in Supabase (where you ran the
  SQL), and leave `CHANGE_ME` placeholders in the copy you commit.
- Or just don't push `schema.sql` publicly at all once it has real
  values in it.

This is different from the Edge Function version, where the secret
lives in Supabase's secret storage and never appears in any file at
all - which is why real production apps usually end up there
eventually. But for learning and for this project, keeping secrets
inside the SQL functions is a perfectly solid, much simpler approach.
