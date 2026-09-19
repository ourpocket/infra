import { BetaApplicationService } from '../../src/beta/beta-application.service';
import { BetaApplication } from '../../src/entities/beta-application.entity';
import { getMetadataArgsStorage } from 'typeorm';

it('maps beta application fields to the migrated database columns', () => {
  const columns = getMetadataArgsStorage().columns.filter(
    (column) => column.target === BetaApplication,
  );
  const columnNames = Object.fromEntries(
    columns.map((column) => [
      column.propertyName,
      column.options.name ?? column.propertyName,
    ]),
  );

  expect(columnNames).toMatchObject({
    companyName: 'company_name',
    useCase: 'use_case',
    createdAt: 'created_at',
  });
});

describe('BetaApplicationService', () => {
  function createService() {
    const applications = {
      findOne: jest.fn(),
      create: jest.fn((input: unknown) => input),
      save: jest.fn(),
    };
    return {
      applications,
      service: new BetaApplicationService(applications as never),
    };
  }

  it('normalizes an application email and stores the limited beta fields once', async () => {
    const { applications, service } = createService();
    applications.findOne.mockResolvedValue(null);
    applications.save.mockResolvedValue({ id: 'application-id' });

    await expect(
      service.apply({
        email: ' Developer@Example.com ',
        companyName: ' Example Labs ',
        useCase: 'payments',
      }),
    ).resolves.toEqual({ status: 'received' });

    expect(applications.findOne).toHaveBeenCalledWith({
      where: { email: 'developer@example.com' },
    });
    expect(applications.create).toHaveBeenCalledWith({
      email: 'developer@example.com',
      companyName: 'Example Labs',
      useCase: 'payments',
    });
  });

  it('returns the same response for an existing email without creating another application', async () => {
    const { applications, service } = createService();
    applications.findOne.mockResolvedValue({ id: 'application-id' });

    await expect(
      service.apply({ email: 'developer@example.com', useCase: 'payouts' }),
    ).resolves.toEqual({ status: 'received' });
    expect(applications.create).not.toHaveBeenCalled();
    expect(applications.save).not.toHaveBeenCalled();
  });

  it('treats a concurrent duplicate as an already received application', async () => {
    const { applications, service } = createService();
    applications.findOne.mockResolvedValue(null);
    applications.save.mockRejectedValue({ driverError: { code: '23505' } });

    await expect(
      service.apply({ email: 'developer@example.com', useCase: 'payments' }),
    ).resolves.toEqual({ status: 'received' });
  });
});
