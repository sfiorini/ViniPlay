function shouldProcessVodForSource(source = {}, processingOptions = {}) {
  if (processingOptions.includeVodRefresh === false) return false;
  if (source.includeVod === false) return false;
  return true;
}

module.exports = { shouldProcessVodForSource };
