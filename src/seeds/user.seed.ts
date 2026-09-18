import { AppDataSource } from '../data-source';
import { User } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';
import { AUTH_TYPE_ENUM } from '../enums';
import { USERS_STATUS_ENUM } from '../enums';

async function seedUser() {
  await AppDataSource.initialize();

  const userRepository = AppDataSource.getRepository(User);

  const usersToSeed = [
    {
      name: 'Admin User',
      email: process.env.ADMIN_USER_EMAIL,
      password: process.env.ADMIN_USER_PASSWORD,
    },
    {
      name: 'Normal User',
      email: process.env.NORMAL_USER_EMAIL,
      password: process.env.NORMAL_USER_PASSWORD,
    },
  ];

  for (const userData of usersToSeed) {
    if (!userData.email || !userData.password) {
      console.log(
        `Skipping seeding for ${userData.name}: email or password missing`,
      );
      continue;
    }

    const existingUser = await userRepository.findOne({
      where: { email: userData.email },
    });

    if (existingUser) {
      console.log(`User ${userData.email} already exists`);
      continue;
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(userData.password, saltRounds);

    const user = userRepository.create({
      name: userData.name,
      email: userData.email,
      passwordHash: passwordHash,
      provider: AUTH_TYPE_ENUM.LOCAL,
      status: USERS_STATUS_ENUM.ACTIVE,
      isEmailVerified: true,
      acceptTerms: true,
    });

    await userRepository.save(user);
    console.log(`User ${userData.email} seeded successfully`);
  }

  await AppDataSource.destroy();
}

seedUser().catch((error) => {
  console.error('Error seeding user:', error);
  process.exit(1);
});
