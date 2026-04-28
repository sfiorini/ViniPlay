const fs = require('fs');

const reportPath = 'docs/plans/2026-04-27-upstream-pr-assessment.md';
const prs = ['#116', '#114', '#119', '#109'];
const labels = ['Verdict', 'Upstream intent', 'Implementation correctness', 'Accepted changes', 'Corrections made', 'Tests added', 'Manual verification'];

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!fs.existsSync(reportPath)) {
  fail(`Missing report: ${reportPath}`);
}

const report = fs.readFileSync(reportPath, 'utf8');

for (let i = 0; i < prs.length; i++) {
  const pr = prs[i];
  const next = prs[i + 1];
  const heading = `## PR ${pr}`;
  const start = report.indexOf(heading);
  if (start === -1) fail(`Missing section ${heading}`);
  const end = next ? report.indexOf(`## PR ${next}`, start + heading.length) : report.length;
  const section = report.slice(start, end === -1 ? report.length : end);

  for (const label of labels) {
    const match = section.match(new RegExp(`^- ${label}:\\s*(.+)$`, 'm'));
    if (!match) fail(`Missing label ${label} in ${pr}`);
    const value = match[1].trim();
    if (!value || /^(TODO|\.\.\.)$/i.test(value) || value.includes('TODO')) {
      fail(`Placeholder value for ${label} in ${pr}`);
    }
  }

  const hasTestEvidence = /npm test\s+[^\n]+|tests\//.test(section);
  const hasCommitEvidence = /commit\s+`[0-9a-f]{7,40}`|`[0-9a-f]{7,40}`/.test(section);
  if (!hasTestEvidence && !hasCommitEvidence) {
    fail(`Missing test command or commit evidence in ${pr}`);
  }
}

console.log('PR assessment report is valid.');
