function fakeProcess() {
  return { on: vi.fn() };
}

describe('timeshift startup wiring', () => {
  it('initializes enabled timeshift recordings and schedules cleanup', async () => {
    const { startTimeshiftServices } = require('../../lib/timeshiftStartup');
    const engine = { initialize: vi.fn(), runCleanup: vi.fn(), shutdown: vi.fn() };
    const schedule = { scheduleJob: vi.fn() };
    startTimeshiftServices({ engine, schedule, cleanupIntervalMinutes: 5, processLike: fakeProcess() });
    expect(engine.initialize).toHaveBeenCalled();
    expect(schedule.scheduleJob).toHaveBeenCalledWith('*/5 * * * *', engine.runCleanup);
  });

  it('catches initialization failures', async () => {
    const { startTimeshiftServices } = require('../../lib/timeshiftStartup');
    const error = new Error('boom');
    const onError = vi.fn();
    const engine = { initialize: vi.fn(() => Promise.reject(error)), runCleanup: vi.fn(), shutdown: vi.fn() };
    startTimeshiftServices({ engine, schedule: { scheduleJob: vi.fn() }, cleanupIntervalMinutes: 5, processLike: fakeProcess(), onError });
    await new Promise(resolve => setImmediate(resolve));
    expect(onError).toHaveBeenCalledWith('[TIMESHIFT] Initialization failed:', error);
  });

  it('registers SIGINT and SIGTERM handlers that call engine.shutdown', () => {
    const { startTimeshiftServices } = require('../../lib/timeshiftStartup');
    const engine = { initialize: vi.fn(), runCleanup: vi.fn(), shutdown: vi.fn() };
    const handlers = {};
    const processLike = { on: vi.fn((event, handler) => { handlers[event] = handler; }) };
    startTimeshiftServices({ engine, schedule: { scheduleJob: vi.fn() }, cleanupIntervalMinutes: 5, processLike });
    handlers.SIGINT();
    handlers.SIGTERM();
    expect(engine.shutdown).toHaveBeenCalledTimes(2);
  });
});
