import pg from 'pg';

const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres.axakpuacdaptgcsrxams:dishu9389338858@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres',
});

async function createProfile() {
  await client.connect();
  console.log('Connected to database');

  const sql = `
    INSERT INTO public.profiles (id, email, full_name)
    VALUES ('80c880af-5182-481d-a597-8df09061e922', 'testuser123@gmail.com', 'Test User')
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name;
  `;

  try {
    await client.query(sql);
    console.log('Profile created');
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }

  await client.end();
  console.log('Done');
}

createProfile().catch(console.error);
