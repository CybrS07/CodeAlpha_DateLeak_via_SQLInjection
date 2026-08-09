# Task 2 - Detecting Data Leaks Using SQL Injection

Hey! This is a small project that shows how SQL injection attacks work,
and how to actually protect against them. It's a login page built with
React + Supabase.

## What's in here

```
.
├── .env               <- your secret keys go here
├── schema.sql          <- run this in Supabase to set up the database
├── README.md           <- you are here
└── src
    ├── App.jsx          <- the login page
    ├── Home.jsx         <- the page you see after logging in (has the flag!)
    └── js-script
        ├── supabase.js  <- connects to Supabase
        └── login.js     <- the actual login logic
```

## How it's protected (in plain English)

1. **Passwords/emails aren't stored as plain text.** They get scrambled
   with AES-256 encryption before going into the database (`pgcrypto`
   in `schema.sql`).
2. **Capability code = a second secret.** Besides the password, every
   account has its own random code. Knowing just the password isn't
   enough to log in.
3. **Row Level Security (RLS).** The database itself refuses to let
   anyone read the `accounts` table directly. You have to go through
   the `verify_login` function, which is the only "door" in.
4. **No string-gluing in SQL.** The login function takes the username,
   password, and code as separate parameters instead of pasting them
   into one big SQL string. That's really the main thing that stops
   SQL injection.

## Setting it up

1. Make a free Supabase project.
2. Open the SQL editor in Supabase and paste in everything from
   `schema.sql`, then run it.
3. Copy `.env` into your project and fill in the blanks:
   - `REACT_APP_SUPABASE_URL` (from Supabase settings)
   - `REACT_APP_SUPABASE_ANON_KEY` (from Supabase settings)
   - `REACT_APP_ENC_KEY` (make one up, or run `openssl rand -hex 32`)
4. Install the Supabase package:
   ```
   npm install @supabase/supabase-js
   ```
5. Create a test account. Easiest way: open the Supabase SQL editor
   and run something like:
   ```sql
   select * from signup('Test User', 'testuser', 'mypassword123', 'test@test.com', null, 'REPLACE_WITH_YOUR_ENC_KEY_FROM_ENV');
   ```
   This gives you back a `capability_code` - save it somewhere, you
   need it to log in.
6. Run the app (`npm start` or `npm run dev` depending on your setup)
   and log in with the username, password, and capability code from
   step 5.
7. If it works, you'll land on the Home page and see the flag:
   `T@HA{G3t_th3_sq1,1nj3ct10n}`

## About the "for the video" part

In `js-script/login.js` there's a regex that would normally block SQL
injection-looking input, but it's commented out on purpose. Same idea
in `schema.sql` - there's a second, unsafe version of the login
function, also commented out.

The plan is:

1. Record the demo WITHOUT the protections (show how someone could try
   to break in with weird input).
2. Uncomment the protections.
3. Record it again, showing the attack no longer works.

Just remember: don't leave the unsafe SQL function turned on anywhere
except a throwaway/test Supabase project, and drop it when you're done
recording.
