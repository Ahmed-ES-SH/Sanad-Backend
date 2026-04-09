import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsController } from './notifications.controller';
import { NotificationsClientController } from './notifications.client.controller';
import { Notification } from './schema/notification.schema';
import { NotificationPreferences } from './schema/notification-preferences.schema';
import { createBullMQConfig } from '../config/bullmq.config';
import { createEventEmitterConfig } from '../config/event-emitter.config';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    // TypeORM entities
    TypeOrmModule.forFeature([Notification, NotificationPreferences]),

    // BullMQ for queue processing
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: createBullMQConfig,
    }),
    BullModule.registerQueue({
      name: 'notifications',
    }),

    // Event emitter for handling system events
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 100,
      ignoreErrors: false,
    }),

    // JWT for WebSocket authentication
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<number>('JWT_EXPIRES_IN'),
        },
      }),
    }),

    // Auth module for token blacklist checking
    AuthModule,
  ],
  controllers: [NotificationsController, NotificationsClientController],
  providers: [NotificationsService, NotificationsGateway],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
