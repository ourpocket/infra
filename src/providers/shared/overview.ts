import { ProviderOverviewSection } from '../operations';

export function maskedAccountNumber(value: unknown): string | null {
  if (typeof value !== 'string' || value.length < 4) return null;
  return `${'*'.repeat(Math.max(value.length - 4, 4))}${value.slice(-4)}`;
}

export function availableSection<T>(data: T): ProviderOverviewSection<T> {
  return { state: 'available', data };
}

export function unavailableSection<T>(
  _error: unknown,
): ProviderOverviewSection<T> {
  return {
    state: 'unavailable',
    data: null,
    message: 'This provider section is unavailable for the connected account.',
  };
}

export async function section<T>(
  operation: () => Promise<T>,
): Promise<ProviderOverviewSection<T>> {
  try {
    return availableSection(await operation());
  } catch (error) {
    return unavailableSection<T>(error);
  }
}

export function stringValue(value: unknown): string | null {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : null;
}
