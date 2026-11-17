import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres.axakpuacdaptgcsrxams:dishu9389338858@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres',
});

async function runMigrations() {
  await client.connect();
  console.log('Connected to database');

  const migrationsDir = path.join(process.cwd(), '..', 'supabase', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');
    console.log(`Running migration: ${file}`);
    try {
      await client.query(sql);
      console.log(`  Success`);
    } catch (err) {
      console.error(`  Error: ${err.message}`);
    }
  }

  await client.end();
  console.log('Migrations complete');
}

runMigrations().catch(console.error);
