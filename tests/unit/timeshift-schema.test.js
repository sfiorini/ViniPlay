const sqlite3 = require('sqlite3').verbose();

describe('timeshift schema', () => {
  it('keeps existing core tables when schema initialization is extracted', async () => {
    const { initializeSchema } = require('../../lib/schema');
    const db = new sqlite3.Database(':memory:');
    await initializeSchema(db);
    const tables = await new Promise((resolve, reject) => {
      db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => err ? reject(err) : resolve(rows.map(r => r.name)));
    });
    expect(tables).toEqual(expect.arrayContaining(['users', 'user_settings', 'dvr_jobs', 'stream_history']));
  });

  it('creates the timeshift_channels table with required columns', async () => {
    const { initializeSchema } = require('../../lib/schema');
    const db = new sqlite3.Database(':memory:');
    await initializeSchema(db);
    const columns = await new Promise((resolve, reject) => {
      db.all('PRAGMA table_info(timeshift_channels)', [], (err, rows) => err ? reject(err) : resolve(rows));
    });
    const byName = Object.fromEntries(columns.map(c => [c.name, c]));
    expect(byName.channel_id.pk).toBe(1);
    expect(byName.channel_name.notnull).toBe(1);
    expect(byName.max_duration_hours.dflt_value).toContain('3');
    expect(byName.is_enabled.dflt_value).toContain('1');
    expect(byName.created_at.dflt_value).toContain('CURRENT_TIMESTAMP');
    expect(byName.updated_at.dflt_value).toContain('CURRENT_TIMESTAMP');
  });
});
