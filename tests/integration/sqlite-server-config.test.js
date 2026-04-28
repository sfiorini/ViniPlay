const fs = require('fs');
const path = require('path');

const serverSource = () => fs.readFileSync(path.join(__dirname, '..', '..', 'server.js'), 'utf8');

describe('server SQLite lock handling', () => {
  it('configures the app database and session store for concurrent SQLite writes', () => {
    const source = serverSource();

    expect(source).toContain("require('./lib/sqliteConfig')");
    expect(source).toMatch(/configureSqliteDatabase\(db\)/);
    expect(source).toMatch(/new SQLiteStore\(\{[^}]*concurrentDb:\s*true/s);
  });
});
