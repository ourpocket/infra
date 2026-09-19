import { BetaApplicationService } from '../../src/beta/beta-application.service';

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
