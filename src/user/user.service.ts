import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './schema/user.schema';
import * as argon2 from 'argon2';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(dto: CreateUserDto) {
    const isExists = await this.userRepo.findOne({
      where: { email: dto.email },
    });

    if (isExists) throw new BadRequestException('The user is Already Exists');

    dto.password = await argon2.hash(dto.password);

    const user = this.userRepo.create(dto);
    return this.userRepo.save(user);
  }

  findAll() {
    return this.userRepo.find();
  }

  findOne(id: number) {
    return this.userRepo.findOne({ where: { id } });
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.findOne(id);

    if (!user) throw new BadRequestException('The user is not found');

    if (!user.isEmailVerified) user.email = dto?.email ?? user.email;
    if (dto.password) user.password = await argon2.hash(dto.password);
    user.name = dto?.name ?? user.name;
    user.role = dto?.role ?? user.role;

    return this.userRepo.save(user);
  }

  async remove(id: number) {
    const user = await this.findOne(id);

    if (!user) throw new BadRequestException('The user is not found');

    return await this.userRepo.remove(user);
  }

  async findById(id: number) {
    const user = await this.userRepo.findOne({ where: { id } });

    if (user) {
      return user;
    }

    throw new BadRequestException('The user not found .');
  }

  async findByEmail(email: string) {
    return this.userRepo.findOne({ where: { email } });
  }
}
