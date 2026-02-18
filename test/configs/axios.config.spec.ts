import createAxiosInstance from '../../src/configs/axios.config';

describe('AxiosConfig', () => {
  it('should create an axios instance with default config', () => {
    const instance = createAxiosInstance();
    expect(instance.defaults.timeout).toBe(15000);
    expect(instance.defaults.headers['Content-Type']).toBe('application/json');
  });

  it('should create an axios instance with base URL', () => {
    const baseURL = 'https://api.example.com';
    const instance = createAxiosInstance(baseURL);
    expect(instance.defaults.baseURL).toBe(baseURL);
  });

  it('should include API key in headers if provided', () => {
    const apiKey = 'test-api-key';
    const instance = createAxiosInstance(undefined, apiKey);
    expect(instance.defaults.headers['Authorization']).toBe(`Bearer ${apiKey}`);
  });

  it('should merge extra headers', () => {
    const extraHeaders = { 'X-Custom-Header': 'test' };
    const instance = createAxiosInstance(undefined, undefined, extraHeaders);
    expect(instance.defaults.headers['X-Custom-Header']).toBe('test');
  });

  it('should combine all options', () => {
    const baseURL = 'https://api.example.com';
    const apiKey = 'test-api-key';
    const extraHeaders = { 'X-Custom-Header': 'test' };
    const instance = createAxiosInstance(baseURL, apiKey, extraHeaders);

    expect(instance.defaults.baseURL).toBe(baseURL);
    expect(instance.defaults.headers['Authorization']).toBe(`Bearer ${apiKey}`);
    expect(instance.defaults.headers['X-Custom-Header']).toBe('test');
    expect(instance.defaults.headers['Content-Type']).toBe('application/json');
  });
});
