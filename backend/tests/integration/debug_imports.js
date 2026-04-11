try {
  console.log('Loading supertest...');
  require('supertest');
  console.log('Loading app...');
  require('../../src/server');
  console.log('Loading database...');
  require('../../src/config/database');
  console.log('Loading supabase...');
  require('../../src/config/supabase');
  console.log('All loaded successfully!');
} catch (err) {
  console.error('FAILED TO LOAD:');
  console.error(err);
  process.exit(1);
}
