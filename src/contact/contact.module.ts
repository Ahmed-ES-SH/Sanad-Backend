import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactMessage } from './schema/contact-message.schema';
import { ContactService } from './contact.service';
import { ContactController } from './contact.controller';
import { ContactPublicController } from './contact.public.controller';
import { AuthModule } from 'src/auth/auth.module';
import { AuthGuard } from 'src/auth/guards/auth.guard';

@Module({
  imports: [TypeOrmModule.forFeature([ContactMessage]), AuthModule],
  controllers: [ContactController, ContactPublicController],
  providers: [ContactService, AuthGuard],
})
export class ContactModule {}
