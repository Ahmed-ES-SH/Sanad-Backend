import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Service } from './schema/service.schema';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { ServicesPublicController } from './services.public.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Service])],
  controllers: [ServicesController, ServicesPublicController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}
