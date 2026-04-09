import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import type { ServerOptions } from 'socket.io';
import type { Server, Socket } from 'socket.io';

export interface WebSocketData {
  userId: string;
  userName: string;
}

export const createWsConfig = () => ({
  cors: {
    origin: '*',
    credentials: true,
  },
  transports: ['websocket'],
});

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor!: ReturnType<typeof createAdapter>;

  constructor(
    app: INestApplication,
    private readonly configService: ConfigService,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const url = this.configService.getOrThrow<string>('REDIS_URL');
    const pubClient = new Redis(url);
    const subClient = pubClient.duplicate();
    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: this.configService.getOrThrow<string>('FRONTEND_URL'),
        credentials: true,
      },
      transports: ['websocket'],
    });
    server.adapter(this.adapterConstructor);
    return server;
  }
}

// Typed server and socket for use throughout the application
export type TypedIoServer = Server<
  Record<string, unknown>,
  Record<string, unknown>,
  Record<string, unknown>,
  WebSocketData
>;

export type TypedIoSocket = Socket<
  Record<string, unknown>,
  Record<string, unknown>,
  Record<string, unknown>,
  WebSocketData
>;
