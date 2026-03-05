const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// TODO: Add API key to .env
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Supabase admin client for server-side operations.
 * Uses service role key for elevated permissions.
 */
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

module.exports = supabase;
