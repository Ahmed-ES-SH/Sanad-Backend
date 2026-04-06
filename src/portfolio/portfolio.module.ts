import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioService } from './portfolio.service';
import { PortfolioController } from './portfolio.controller';
import { PortfolioPublicController } from './portfolio.public.controller';
import { Project } from './schema/project.schema';

@Module({
  imports: [TypeOrmModule.forFeature([Project])],
  controllers: [PortfolioController, PortfolioPublicController],
  providers: [PortfolioService],
  exports: [PortfolioService],
})
export class PortfolioModule {}
