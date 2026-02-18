import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { UserProvider } from '../entities/user-provider.entity';
import { PROVIDER_TYPE_ENUM } from '../enums';
import { CreateUserProviderDto } from './dto/create-user-provider.dto';
import { UpdateUserProviderDto } from './dto/update-user-provider.dto';
import { UserProviderResponseDto } from './dto/user-provider-response.dto';
import { UserProviderRepository } from './user-provider.repository';

@Injectable()
export class UserProviderService {
  constructor(
    private readonly userProviderRepository: UserProviderRepository,
  ) {}

  async create(
    userId: string,
    createUserProviderDto: CreateUserProviderDto,
  ): Promise<UserProviderResponseDto> {
    const existingProvider =
      await this.userProviderRepository.findByUserIdAndType(
        userId,
        createUserProviderDto.type,
      );

    if (existingProvider) {
      throw new ConflictException(
        `Provider of type ${createUserProviderDto.type} already exists for this user`,
      );
    }

    const userProvider = this.userProviderRepository.create({
      userId,
      ...createUserProviderDto,
    });

    const savedProvider = await this.userProviderRepository.save(userProvider);
    return UserProviderResponseDto.fromEntity(savedProvider);
  }

  async findAll(userId: string): Promise<UserProviderResponseDto[]> {
    const providers = await this.userProviderRepository.findAllByUserId(userId);

    return UserProviderResponseDto.fromEntities(providers);
  }

  async findOne(userId: string, id: string): Promise<UserProviderResponseDto> {
    const provider = await this.userProviderRepository.findByUserIdAndId(
      userId,
      id,
    );

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    return UserProviderResponseDto.fromEntity(provider);
  }

  async findByType(
    userId: string,
    type: PROVIDER_TYPE_ENUM,
  ): Promise<UserProviderResponseDto> {
    const provider = await this.findByTypeInternal(userId, type);

    return UserProviderResponseDto.fromEntity(provider);
  }

  async findByTypeInternal(
    userId: string,
    type: PROVIDER_TYPE_ENUM,
  ): Promise<UserProvider> {
    const provider = await this.userProviderRepository.findByUserIdAndType(
      userId,
      type,
    );

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    return provider;
  }

  async update(
    userId: string,
    id: string,
    updateUserProviderDto: UpdateUserProviderDto,
  ): Promise<UserProviderResponseDto> {
    const provider = await this.userProviderRepository.findByUserIdAndId(
      userId,
      id,
    );

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    await this.userProviderRepository.update(id, updateUserProviderDto);

    const updatedProvider = await this.userProviderRepository.findOne({
      where: { id },
    });

    return UserProviderResponseDto.fromEntity(updatedProvider!);
  }

  async remove(userId: string, id: string): Promise<void> {
    const provider = await this.userProviderRepository.findByUserIdAndId(
      userId,
      id,
    );

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    await this.userProviderRepository.update(id, { isDeleted: true });
  }

  async toggleActive(
    userId: string,
    id: string,
  ): Promise<UserProviderResponseDto> {
    const provider = await this.userProviderRepository.findByUserIdAndId(
      userId,
      id,
    );

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    await this.userProviderRepository.update(id, {
      isActive: !provider.isActive,
    });

    const updatedProvider = await this.userProviderRepository.findOne({
      where: { id },
    });

    return UserProviderResponseDto.fromEntity(updatedProvider!);
  }
}
