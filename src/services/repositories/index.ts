import { createMockRepositories } from './mock';
import type { Repositories } from './types';

export * from './types';

// Screens read data only through this object; replacing the mock with a real backend
// means calling registerRepositories once at startup.
let current: Repositories = createMockRepositories();

export function getRepositories(): Repositories {
  return current;
}

export function registerRepositories(repositories: Repositories): void {
  current = repositories;
}
