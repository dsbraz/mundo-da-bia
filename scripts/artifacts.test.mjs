import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newest } from './artifacts.mjs';
test('de cada nome fica o upload mais novo, mesmo com id menor (re-execução de jobs falhos)', () => {
  const artifacts = [
    { id: 14139071195, name: 'quality-ci', created: '2026-11-15T00:15:49Z' }, { id: 14138224468, name: 'quality-ci', created: '2026-11-15T00:24:09Z' },
    { id: 3, name: 'quality-checks', created: '2026-11-15T00:10:54Z' }, { id: 4, name: 'blob-1', created: '2026-11-15T00:20:00Z' },
  ];
  assert.deepEqual(newest(artifacts, 'quality-').map(a => a.id), [3, 14138224468]);
});
