import { resolve } from 'path';
import { resolveEnvironmentFile } from '../../src/configs/env-file';

describe('resolveEnvironmentFile', () => {
  const projectRoot = resolve(__dirname, '../..');

  it.each(['src/configs', 'dist/src/configs', 'dist/src'])(
    'finds the project environment file from %s',
    (relativeDirectory) => {
      expect(
        resolveEnvironmentFile(resolve(projectRoot, relativeDirectory)),
      ).toBe(resolve(projectRoot, '.env'));
    },
  );
});
