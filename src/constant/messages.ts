export const MESSAGES = {
  SUCCESS: {
    USER_REGISTERED: 'User successfully registered',
    LOGIN_SUCCESSFUL: 'User successfully logged in',
    EMAIL_VERIFIED: 'Email successfully verified',
    PASSWORD_RESET: 'Password successfully reset',
  },
  ERROR: {
    INVALID_CREDENTIALS: 'Invalid credentials',
    WRONG_PROVIDER: (provider: string) =>
      `Please login with your ${provider} account`,
    TOKEN_INVALID_OR_EXPIRED: 'Token is invalid or has expired',
    LOGIN_FAILED: 'Could not log in user',
    USER_EXISTS: 'User with this email already exists',
    TERMS_NOT_ACCEPTED: 'You must accept the Terms to register',
    PASSWORD_REQUIRED: 'Password is required',
    EMAIL_ALREADY_IN_USE: 'Email already in use',
  },
};
