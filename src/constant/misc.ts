const API_KEY_PREFIX = 'op_';
const PROJECT_API_KEY_PREFIX = {
  test: 'op_test_sk_',
  live: 'op_live_sk_',
} as const;

export { API_KEY_PREFIX, PROJECT_API_KEY_PREFIX };
