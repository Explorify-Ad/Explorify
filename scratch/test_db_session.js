const { Client } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const client = new Client({
  user: 'postgres.xmaatrlfqfevbpxltahg',
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  database: 'postgres',
  password: 'Alpha@12345!!',
  port: 5432,
  ssl: { rejectUnauthorized: false },
});

async function test() {
  try {
    console.log('Attempting pooler-host direct connect (5432)...');
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
