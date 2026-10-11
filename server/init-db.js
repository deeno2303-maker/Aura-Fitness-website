import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { pool } from './db.js';
import { defaultSiteContent } from '../src/data/siteData.js';

try {
  const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  await pool.query(schema);
  await pool.query(
    `INSERT INTO cms_content (content_key, content)
     VALUES ('site', $1::jsonb)
     ON CONFLICT (content_key) DO NOTHING`,
    [JSON.stringify(defaultSiteContent)]
  );
  console.log('Database schema and initial CMS content are ready.');
} catch (error) {
  console.error('Database initialization failed:', error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
