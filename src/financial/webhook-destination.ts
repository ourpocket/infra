import { BadRequestException } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
export function publicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b, c] = address.split('.').map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && [0, 168].includes(b)) ||
      (a === 192 && b === 2) ||
      (a === 198 && [18, 19, 51].includes(b)) ||
      (a === 203 && b === 0 && c === 113)
    );
  }
  if (isIP(address) === 6) {
    const first = parseInt(address.split(':')[0], 16);
    return (
      first >= 0x2000 &&
      first <= 0x3fff &&
      !/^2001:(db8|0|2|10|20):/i.test(address) &&
      !/^2002:/i.test(address)
    );
  }
  return false;
}
export async function webhookDestination(
  value: string,
  resolve: (
    host: string,
    options: { all: true; verbatim: true },
  ) => Promise<Array<{ address: string; family: number }>> = lookup,
) {
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    (url.port && url.port !== '443')
  )
    throw new BadRequestException(
      'Webhook endpoints must use HTTPS on port 443 without URL credentials',
    );
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = await resolve(host, { all: true, verbatim: true });
  if (
    !addresses.length ||
    addresses.some((item) => !publicAddress(item.address))
  )
    throw new BadRequestException(
      'Webhook endpoint must resolve exclusively to public addresses',
    );
  return { url, address: addresses[0] };
}
