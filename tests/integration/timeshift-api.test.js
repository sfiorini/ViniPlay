const request = require('supertest');
const { makeTimeshiftTestApp } = require('../helpers/makeTimeshiftTestApp');

describe('timeshift routes', () => {
  it('requires admin for POST /api/timeshift/channels', async () => {
    const { registerTimeshiftRoutes } = require('../../lib/timeshiftRoutes');
    const { app } = makeTimeshiftTestApp({ session: { userId: 2, isAdmin: false }, registerTimeshiftRoutes });
    await request(app).post('/api/timeshift/channels').send({ channelId: 'c1', channelName: 'One' }).expect(403);
  });

  it('requires admin for GET /api/timeshift/channels', async () => {
    const { registerTimeshiftRoutes } = require('../../lib/timeshiftRoutes');
    const { app } = makeTimeshiftTestApp({ session: { userId: 2, isAdmin: false }, registerTimeshiftRoutes });
    await request(app).get('/api/timeshift/channels').expect(403);
  });

  it('validates channelId and channelName on POST', async () => {
    const { registerTimeshiftRoutes } = require('../../lib/timeshiftRoutes');
    const { app } = makeTimeshiftTestApp({ session: { userId: 1, isAdmin: true }, registerTimeshiftRoutes });
    await request(app).post('/api/timeshift/channels').send({ channelId: '../bad', channelName: 'One' }).expect(400);
    await request(app).post('/api/timeshift/channels').send({ channelId: '..', channelName: 'One' }).expect(400);
    await request(app).post('/api/timeshift/channels').send({ channelId: 'c1', channelName: '' }).expect(400);
  });

  it('upserts channel config and starts recording when enabled', async () => {
    const { registerTimeshiftRoutes } = require('../../lib/timeshiftRoutes');
    const { app, engine } = makeTimeshiftTestApp({ session: { userId: 1, isAdmin: true }, registerTimeshiftRoutes });
    await request(app).post('/api/timeshift/channels').send({ channelId: 'c1', channelName: 'One', maxDurationHours: 4, isEnabled: true }).expect(200);
    expect(engine.start).toHaveBeenCalledWith('c1', 'One');
  });

  it('updates config and stops recording when disabling a channel', async () => {
    const { registerTimeshiftRoutes } = require('../../lib/timeshiftRoutes');
    const { app, engine } = makeTimeshiftTestApp({ session: { userId: 1, isAdmin: true }, registerTimeshiftRoutes });
    await request(app).put('/api/timeshift/channels/c1').send({ channelName: 'One', maxDurationHours: 2, isEnabled: false }).expect(200);
    expect(engine.stop).toHaveBeenCalledWith('c1');
  });

  it('deletes channel config and stops recording', async () => {
    const { registerTimeshiftRoutes } = require('../../lib/timeshiftRoutes');
    const { app, engine } = makeTimeshiftTestApp({ session: { userId: 1, isAdmin: true }, registerTimeshiftRoutes });
    await request(app).delete('/api/timeshift/channels/c1').expect(200);
    expect(engine.stop).toHaveBeenCalledWith('c1');
  });

  it('requires auth for playlist and segment endpoints', async () => {
    const { registerTimeshiftRoutes } = require('../../lib/timeshiftRoutes');
    const { app } = makeTimeshiftTestApp({ session: {}, registerTimeshiftRoutes });
    await request(app).get('/api/timeshift/stream/c1/playlist.m3u8').expect(401);
    await request(app).get('/api/timeshift/stream/c1/segment_00000001.ts').expect(401);
  });

  it('rejects path traversal segment names', async () => {
    const { registerTimeshiftRoutes } = require('../../lib/timeshiftRoutes');
    const { app } = makeTimeshiftTestApp({ session: { userId: 1, isAdmin: true }, registerTimeshiftRoutes });
    await request(app).get('/api/timeshift/stream/c1/..%2F..%2Fetc%2Fpasswd').expect(400);
  });
});
