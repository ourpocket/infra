import { StatelessProviderLayer20260921000000 } from '../../src/migrations/20260921000000-StatelessProviderLayer';

describe('StatelessProviderLayer migration', () => {
  it('purges persisted production provider output before enabling live adapters', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    await new StatelessProviderLayer20260921000000().up({ query } as never);
    const statements = query.mock.calls.map(([statement]) => String(statement));
    expect(statements).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          "DELETE FROM financial_resources WHERE environment = 'production'",
        ),
        expect.stringContaining(
          "DELETE FROM financial_receipts WHERE environment = 'production'",
        ),
        expect.stringContaining("details - 'email' - 'name'"),
        expect.stringContaining('is_verified'),
      ]),
    );
  });
});
