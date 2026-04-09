import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';
import { Socket } from 'socket.io';
import { WebSocketData } from '../../config/ws.config';
import { AuthService } from '../auth.service';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const token = this.extractToken(client);

    if (!token) {
      throw new UnauthorizedException('WebSocket token not provided');
    }

    // Check if token is blacklisted
    const isBlacklisted = await this.authService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new ForbiddenException('Token has been revoked');
    }

    try {
      const payload = this.jwtService.verify(token);

      // Attach user data to the socket for typed access
      (client as any).data = {
        userId: payload.sub || payload.id,
        userName: payload.name || payload.email || 'Unknown',
      } as WebSocketData;

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid WebSocket token');
    }
  }

  private extractToken(client: Socket): string | undefined {
    // Try to get token from query parameter first
    const query = client.handshake.query;
    if (query.token && typeof query.token === 'string') {
      return query.token;
    }

    // Try to get token from auth header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader) {
      const [type, token] = authHeader.split(' ');
      if (type === 'Bearer') {
        return token;
      }
    }

    return undefined;
  }
}
