import { z } from 'zod';

const optionalNonEmptyString = z.string().trim().min(1).optional();

const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    JWT_SECRET: z.preprocess(
      (value) => value ?? '',
      z.string().trim().min(1, 'JWT_SECRET is required'),
    ),
    JWT_EXPIRES_IN: z.string().trim().min(1).default('1d'),
    PROVIDER_CONFIG_ENCRYPTION_KEY: z.string().trim().min(32).optional(),
    DATABASE_URL: optionalNonEmptyString,
    DATABASE_HOST: optionalNonEmptyString,
    DATABASE_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
    DATABASE_USERNAME: optionalNonEmptyString,
    DATABASE_PASSWORD: optionalNonEmptyString,
    DATABASE_NAME: optionalNonEmptyString,
    REDIS_PORT: z.coerce.number().int().min(1).max(65535).default(6379),
    MAX_FILE_SIZE: z.coerce.number().int().positive().default(10_485_760),
    RATE_LIMIT_TTL: z.coerce.number().int().positive().default(60),
    RATE_LIMIT_LIMIT: z.coerce.number().int().positive().default(100),
  })
  .passthrough()
  .superRefine((environment, context) => {
    if (
      environment.NODE_ENV === 'production' &&
      !environment.PROVIDER_CONFIG_ENCRYPTION_KEY
    ) {
      context.addIssue({
        code: 'custom',
        path: ['PROVIDER_CONFIG_ENCRYPTION_KEY'],
        message: 'A dedicated encryption key is required in production',
      });
    }
    if (environment.DATABASE_URL) {
      return;
    }

    const requiredDatabaseVariables = [
      'DATABASE_HOST',
      'DATABASE_USERNAME',
      'DATABASE_PASSWORD',
      'DATABASE_NAME',
    ] as const;

    for (const variable of requiredDatabaseVariables) {
      if (!environment[variable]) {
        context.addIssue({
          code: 'custom',
          path: [variable],
          message: `${variable} is required when DATABASE_URL is not set`,
        });
      }
    }
  });

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(
  configuration: Record<string, unknown>,
): Environment {
  const result = environmentSchema.safeParse(configuration);

  if (!result.success) {
    const issues = result.error.issues
      .map(
        (issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`,
      )
      .join('\n- ');

    throw new Error(`Invalid environment configuration:\n- ${issues}`);
  }

  return result.data;
}
