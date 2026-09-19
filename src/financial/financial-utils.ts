import { BadRequestException } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}
export function fingerprint(operation: string, value: unknown): string {
  return createHash('sha256')
    .update(`${operation}:${canonical(value)}`)
    .digest('hex');
}
export function equalSignature(
  expected: string,
  actual: string | undefined,
): boolean {
  if (!actual) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(actual);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function redact(value: Record<string, unknown>): Record<string, unknown>;
export function redact(value: unknown): unknown;
export function redact(value: unknown): unknown {
  if (typeof value === 'string')
    return value
      .replace(
        /\b(?:op_(?:live|test)_sk_|sk_(?:live|test)_|FLWSECK_(?:LIVE|TEST)-|whsec_)[A-Za-z0-9_-]+/g,
        '[REDACTED]',
      )
      .replace(/Bearer\s+[^\s"']+/gi, 'Bearer [REDACTED]');
  if (Array.isArray(value)) return value.map(redact);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        /key|secret|token|password|authorization|email|account.?number|card|signature/i.test(
          key,
        )
          ? '[REDACTED]'
          : redact(item),
      ]),
    );
  }
  return value;
}
export function minorToMajor(amount: string, currency: string): string {
  const exponent = currencyExponent(currency);
  if (exponent === 0) return amount;
  const padded = amount.padStart(exponent + 1, '0');
  return `${padded.slice(0, -exponent)}.${padded.slice(-exponent)}`;
}
export function currencyExponent(currency: string): number {
  const exponent = new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
  }).resolvedOptions().maximumFractionDigits;
  if (exponent === undefined)
    throw new BadRequestException('Unsupported currency');
  return exponent;
}
export function majorToMinor(
  amount: string | number,
  currency: string,
): string {
  if (
    typeof amount === 'number' &&
    (!Number.isFinite(amount) || Math.abs(amount) > Number.MAX_SAFE_INTEGER)
  )
    throw new BadRequestException('Unsafe provider amount');
  const exponent = currencyExponent(currency);
  const [whole, fractional = ''] = String(amount).split('.');
  if (
    !/^\d+$/.test(whole) ||
    !/^\d*$/.test(fractional) ||
    (fractional.length > exponent && /[1-9]/.test(fractional.slice(exponent)))
  )
    throw new BadRequestException('Invalid provider amount');
  return BigInt(
    `${whole}${fractional.slice(0, exponent).padEnd(exponent, '0')}`,
  ).toString();
}
