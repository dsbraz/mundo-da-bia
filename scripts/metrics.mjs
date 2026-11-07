export const requiredChecks = {
  ci: ['typecheck', 'lint', 'architecture', 'unit', 'gate-tests', 'coverage', 'build', 'budget', 'e2e'],
  mutation: ['mutation', 'mutation-metrics'],
};
export function evaluateBudget(javascriptGzipBytes, initialAssetBytes, policy) {
  return {
    javascriptGzipBytes, initialAssetBytes,
    limits: { javascriptGzipBytes: policy.blocking.javascriptGzipBytes, initialAssetBytes: policy.blocking.initialAssetBytes },
    passed: Number.isFinite(javascriptGzipBytes) && Number.isFinite(initialAssetBytes)
      && javascriptGzipBytes <= policy.blocking.javascriptGzipBytes && initialAssetBytes <= policy.blocking.initialAssetBytes,
  };
}
export function coverageMetrics(summary, policy) {
  const areas = {};
  for (const area of ['domain', 'persistence']) {
    const files = Object.entries(summary).filter(([name]) => name.replaceAll('\\', '/').includes(`/src/${area}/`));
    const metrics = {};
    for (const metric of ['lines', 'branches']) {
      const total = files.reduce((sum, [, file]) => sum + file[metric].total, 0);
      const covered = files.reduce((sum, [, file]) => sum + file[metric].covered, 0);
      metrics[metric] = { total, covered, value: total ? covered / total * 100 : null, limit: policy.blocking.coverage[metric] };
    }
    areas[area] = { ...metrics, passed: Object.values(metrics).every(m => m.value !== null && m.value >= m.limit) };
  }
  return { areas, passed: Object.values(areas).every(area => area.passed) };
}
export function mutationMetrics(report, policy) {
  const areas = {};
  for (const area of ['domain', 'persistence']) {
    const mutants = Object.entries(report.files).filter(([file]) => file.replaceAll('\\', '/').includes(`src/${area}/`)).flatMap(([, file]) => file.mutants);
    const eligible = mutants.filter(m => !['CompileError', 'Ignored'].includes(m.status));
    const killed = eligible.filter(m => ['Killed', 'Timeout'].includes(m.status)).length;
    const score = eligible.length ? killed / eligible.length * 100 : null;
    areas[area] = { score, eligible: eligible.length, killed, limit: policy.blocking.mutation, status: score === null ? 'not-applicable' : 'measured', passed: score !== null && score >= policy.blocking.mutation };
  }
  return { areas, passed: Object.values(areas).every(area => area.passed) };
}
export function validateReports(reports, sha, policy) {
  return Object.entries(requiredChecks).every(([kind, required]) => {
    const matches = reports.filter(report => report?.kind === kind);
    if (matches.length !== 1) return false;
    const report = matches[0];
    return report.sha === sha && report.policyVersion === policy.version && report.status === 'passed'
      && required.every(name => report.checks.some(check => check.name === name && check.passed === true));
  });
}
