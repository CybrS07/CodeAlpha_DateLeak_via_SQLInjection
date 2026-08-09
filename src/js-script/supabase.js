// This file connects our app to Supabase, one time,
// and everyone else imports "supabase" from here.

import { createClient } from '@supabase/supabase-js';

// This is a Vite project, so env variables come from
// import.meta.env, and their names must start with VITE_
// (see the .env file in the project root).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('Oops! Supabase URL or anon key is missing. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);