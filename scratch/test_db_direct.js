const { Client } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const client = new Client({
  user: 'postgres',
  host: 'db.xmaatrlfqfevbpxltahg.supabase.co',
  database: 'postgres',
  password: 'Alpha@12345!!',
  port: 5432,
  ssl: { rejectUnauthorized: false },
});

async function test() {
  try {
    console.log('Attempting direct connect (5432)...');
    await client.connect();
    console.log('Connected!');
    const res = await client.query('SELECT NOW()');
    console.log(res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('Failed:', err);
  }
}
test();
