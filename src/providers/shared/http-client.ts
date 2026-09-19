import { BadGatewayException } from '@nestjs/common';
import axios from 'axios';
import { z } from 'zod';

const providerEnvelope = z.object({
  status: z.union([z.string(), z.boolean()]),
  data: z.unknown(),
});

export class ProviderHttpClient {
  constructor(
    private readonly baseURL: string,
    private readonly authorization: (key: string) => Record<string, string>,
  ) {}

  async request<T>(
    key: string,
    method: 'GET' | 'POST',
    path: string,
    schema: z.ZodType<T>,
    body?: unknown,
  ): Promise<T> {
    const response = await axios.request<unknown>({
      baseURL: this.baseURL,
      method,
      url: path,
      headers: this.authorization(key),
      data: body,
      timeout: 15_000,
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 300,
    });
    const envelope = providerEnvelope.safeParse(response.data);
    if (!envelope.success)
      throw new BadGatewayException('Provider response is malformed');
    if (
      envelope.data.status !== true &&
      envelope.data.status !== 'success' &&
      envelope.data.status !== 'successful'
    )
      throw new BadGatewayException('Provider rejected operation');
    const parsed = schema.safeParse(envelope.data.data);
    if (!parsed.success)
      throw new BadGatewayException('Provider response is malformed');
    return parsed.data;
  }
}
