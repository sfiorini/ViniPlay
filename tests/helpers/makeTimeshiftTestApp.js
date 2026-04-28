const express = require('express');
const path = require('path');

function createFakeDb() {
  const rows = new Map();
  return {
    rows,
    all(sql, _params, cb) {
      if (sql.includes('timeshift_channels')) cb(null, Array.from(rows.values()));
      else cb(null, []);
    },
    get(_sql, params, cb) {
      cb(null, rows.get(params[0]) || null);
    },
    run(sql, params, cb = () => {}) {
      if (sql.startsWith('DELETE')) {
        rows.delete(params[0]);
      } else {
        const [channel_id, channel_name, max_duration_hours, is_enabled] = params;
        rows.set(channel_id, { channel_id, channel_name, max_duration_hours, is_enabled });
      }
      cb.call({ changes: 1 }, null);
    }
  };
}

function makeTimeshiftTestApp({ session, registerTimeshiftRoutes, deps = {} }) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = session || {};
    next();
  });

  const engine = deps.engine || { start: vi.fn(), stop: vi.fn(), status: vi.fn(() => []) };
  registerTimeshiftRoutes(app, {
    db: deps.db || createFakeDb(),
    engine,
    fs: deps.fs || { existsSync: () => true },
    path,
    timeshiftDir: deps.timeshiftDir || '/timeshift'
  });
  return { app, engine };
}

module.exports = { makeTimeshiftTestApp, createFakeDb };
