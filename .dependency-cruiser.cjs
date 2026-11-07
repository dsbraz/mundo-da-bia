module.exports = {
  forbidden: [
    { name: 'no-cycles', severity: 'error', from: {}, to: { circular: true } },
    { name: 'resolved', severity: 'error', from: {}, to: { couldNotResolve: true } },
    { name: 'pure-domain', severity: 'error', from: { path: '^src/domain/' }, to: { pathNot: '^src/domain/' } },
    { name: 'content-boundary', severity: 'error', from: { path: '^src/content/' }, to: { pathNot: '^src/(content|domain)/' } },
    { name: 'content-types-only', severity: 'error', from: { path: '^src/content/' }, to: { path: '^src/domain/', dependencyTypesNot: ['type-only'] } },
    { name: 'persistence-boundary', severity: 'error', from: { path: '^src/persistence/' }, to: { pathNot: '^src/(persistence|domain)/' } },
    { name: 'phaser-boundary', severity: 'error', from: { pathNot: '^src/(presentation|bootstrap)/' }, to: { path: '(^|/)phaser(/|$)' } },
    { name: 'controls-use-callbacks', severity: 'error', from: { path: '^src/presentation/controls\\.ts$' }, to: { path: '(scene|phaser)' } },
    { name: 'presentation-boundary', severity: 'error', from: { path: '^src/presentation/' }, to: { path: '^src/(persistence|bootstrap)/' } },
  ],
  options: { doNotFollow: { path: 'node_modules' }, exclude: { path: '\.test\.ts$' }, tsPreCompilationDeps: true, tsConfig: { fileName: 'tsconfig.json' } },
};
