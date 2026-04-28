function startTimeshiftServices({ engine, schedule, cleanupIntervalMinutes = 5, processLike = process }) {
  engine.initialize();
  schedule.scheduleJob(`*/${cleanupIntervalMinutes} * * * *`, engine.runCleanup);

  processLike.on('SIGINT', () => engine.shutdown());
  processLike.on('SIGTERM', () => engine.shutdown());
}

module.exports = { startTimeshiftServices };
