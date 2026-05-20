const { spawnSync } = require('child_process');
const path = require('path');

const vitestBin =
  process.platform === 'win32'
    ? path.join(__dirname, '..', 'node_modules', '.bin', 'vitest.cmd')
    : path.join(__dirname, '..', 'node_modules', '.bin', 'vitest');

const args = process.argv
  .slice(2)
  .flatMap((arg) => (arg === '--verbose' ? ['--reporter=verbose'] : [arg]));

const result = spawnSync(vitestBin, ['run', ...args], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
