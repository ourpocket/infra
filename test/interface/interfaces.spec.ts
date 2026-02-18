import * as WalletProviderModule from '../../src/interface/wallet-provider.interface';
import * as WalletProviderBaseModule from '../../src/interface/wallet-provider-base.interface';
import * as Web3ProviderBaseModule from '../../src/interface/web3-provider-base.interface';

describe('Interface modules', () => {
  it('should be importable at runtime', () => {
    expect(WalletProviderModule).toBeDefined();
    expect(typeof WalletProviderModule).toBe('object');

    expect(WalletProviderBaseModule).toBeDefined();
    expect(typeof WalletProviderBaseModule).toBe('object');

    expect(Web3ProviderBaseModule).toBeDefined();
    expect(typeof Web3ProviderBaseModule).toBe('object');
  });
});
