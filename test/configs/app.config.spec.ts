import appConfig from '../../src/configs/app.config';

describe('AppConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return default values when env vars are not set', () => {
    delete process.env.PORT;
    delete process.env.NODE_ENV;
    delete process.env.LEDGER_URL;
    delete process.env.UPLOAD_PATH;
    delete process.env.MAX_FILE_SIZE;
    delete process.env.RATE_LIMIT_TTL;
    delete process.env.RATE_LIMIT_LIMIT;

    const config = appConfig();
    expect(config.port).toBe(3000);
    expect(config.nodeEnv).toBe('development');
    expect(config.ledgerUrl).toBe('http://localhost:4000');
    expect(config.corsOrigin).toBe('*');
    expect(config.uploadPath).toBe('./uploads');
    expect(config.maxFileSize).toBe(10485760);
    expect(config.rateLimitTtl).toBe(60);
    expect(config.rateLimitLimit).toBe(100);
  });

  it('should return values from env vars', () => {
    process.env.PORT = '4000';
    process.env.NODE_ENV = 'production';
    process.env.LEDGER_URL = 'http://ledger-service';
    process.env.UPLOAD_PATH = '/mnt/uploads';
    process.env.MAX_FILE_SIZE = '2048';
    process.env.RATE_LIMIT_TTL = '120';
    process.env.RATE_LIMIT_LIMIT = '200';

    const config = appConfig();
    expect(config.port).toBe(4000);
    expect(config.nodeEnv).toBe('production');
    expect(config.ledgerUrl).toBe('http://ledger-service');
    expect(config.uploadPath).toBe('/mnt/uploads');
    expect(config.maxFileSize).toBe(2048);
    expect(config.rateLimitTtl).toBe(120);
    expect(config.rateLimitLimit).toBe(200);
  });
});
