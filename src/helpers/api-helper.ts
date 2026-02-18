import * as crypto from 'crypto';

export type TSize = 16 | 25 | 32 | 64;

export interface ApiKeyResult {
  rawKey: string;
  hashedKey: string;
}

export const generateApiKey = (size: TSize = 32): ApiKeyResult => {
  const rawKey = crypto.randomBytes(size).toString('hex');

  const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');

  return { rawKey, hashedKey };
};

export const verifyApiKey = (
  incomingKey: string,
  storedHash: string,
): boolean => {
  const incomingHash = crypto
    .createHash('sha256')
    .update(incomingKey)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(incomingHash, 'hex'),
    Buffer.from(storedHash, 'hex'),
  );
};
