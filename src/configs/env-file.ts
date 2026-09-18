import { existsSync } from 'fs';
import { dirname, join, resolve } from 'path';

export function resolveEnvironmentFile(startDirectory: string): string {
  let currentDirectory = resolve(startDirectory);

  while (true) {
    const environmentFile = join(currentDirectory, '.env');

    if (
      existsSync(environmentFile) ||
      existsSync(join(currentDirectory, 'package.json'))
    ) {
      return environmentFile;
    }

    const parentDirectory = dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      return resolve(process.cwd(), '.env');
    }

    currentDirectory = parentDirectory;
  }
}
