function startTimeshiftServices({ engine, schedule, cleanupIntervalMinutes = 5, processLike = process, onError = console.error }) {
  Promise.resolve(engine.initialize()).catch(error => onError('[TIMESHIFT] Initialization failed:', error));
  schedule.scheduleJob(`*/${cleanupIntervalMinutes} * * * *`, engine.runCleanup);

  processLike.on('SIGINT', () => engine.shutdown());
  processLike.on('SIGTERM', () => engine.shutdown());
}

module.exports = { startTimeshiftServices };
