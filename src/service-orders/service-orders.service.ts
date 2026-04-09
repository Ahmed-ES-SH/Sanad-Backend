import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { ServiceOrder } from './schema/service-order.schema';
import { OrderUpdate } from './schema/order-update.schema';
import { Service } from '../services/schema/service.schema';
import { Payment } from '../payments/schema/payment.schema';
import { PaymentsService } from '../payments/payments.service';
import { OrderStatus } from './enums/order-status.enum';
import { UpdateAuthor } from './enums/update-author.enum';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AddOrderUpdateDto } from './dto/add-order-update.dto';
import { OrderFilterDto } from './dto/order-filter.dto';

@Injectable()
export class ServiceOrdersService {
  private readonly logger = new Logger(ServiceOrdersService.name);

  constructor(
    @InjectRepository(ServiceOrder)
    private readonly orderRepo: Repository<ServiceOrder>,
    @InjectRepository(OrderUpdate)
    private readonly updateRepo: Repository<OrderUpdate>,
    @InjectRepository(Service)
    private readonly serviceRepo: Repository<Service>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly paymentsService: PaymentsService,
  ) {}

  // ──────────────────────────────────────────────────────────────────
  // User: Create Order
  // ──────────────────────────────────────────────────────────────────

  async createOrder(userId: number, dto: CreateOrderDto): Promise<ServiceOrder> {
    const service = await this.serviceRepo.findOne({
      where: { id: dto.serviceId, isPublished: true },
    });

    if (!service) {
      throw new NotFoundException(
        `Service "${dto.serviceId}" not found or unavailable`,
      );
    }

    const order = this.orderRepo.create({
      userId,
      serviceId: service.id,
      status: OrderStatus.PENDING,
      amount: service.basePrice,
      currency: 'usd',
      notes: dto.notes ?? null,
    });

    const saved = await this.orderRepo.save(order);

    // System timeline entry
    await this.updateRepo.save(
      this.updateRepo.create({
        orderId: saved.id,
        author: UpdateAuthor.SYSTEM,
        content: `Order created for service "${service.title}".`,
      }),
    );

    return saved;
  }

  // ──────────────────────────────────────────────────────────────────
  // User: Initiate Payment
  // ──────────────────────────────────────────────────────────────────

  async initiatePayment(
    userId: number,
    orderId: string,
  ): Promise<{ clientSecret: string; paymentId: string; stripePaymentIntentId: string }> {
    const order = await this.findOrderForUser(userId, orderId);

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Cannot initiate payment: order status is "${order.status}". Only pending orders can be paid.`,
      );
    }

    if (order.paymentId) {
      throw new BadRequestException(
        'Payment already initiated for this order. Check current payment status.',
      );
    }

    const result = await this.paymentsService.createPaymentIntent({
      amount: order.amount,
      currency: order.currency,
      description: `Service Order: ${order.service?.title ?? order.serviceId}`,
      userId: String(userId), // Convert int to string for Payment entity
    });

    // Store orderId in payment metadata for webhook resolution
    await this.paymentRepo.update(result.paymentId, {
      metadata: { orderId: order.id },
    });

    // Link payment to order
    order.paymentId = result.paymentId;
    await this.orderRepo.save(order);

    await this.updateRepo.save(
      this.updateRepo.create({
        orderId: order.id,
        author: UpdateAuthor.SYSTEM,
        content: 'Payment initiated. Awaiting confirmation from payment gateway.',
      }),
    );

    return result;
  }

  // ──────────────────────────────────────────────────────────────────
  // Webhook: Mark order as PAID (called after Stripe confirms payment)
  // ──────────────────────────────────────────────────────────────────

  @OnEvent('payment.succeeded')
  async handlePaymentSucceeded(payload: { orderId?: string }): Promise<void> {
    if (!payload.orderId) return;
    await this.markOrderAsPaid(payload.orderId);
  }

  async markOrderAsPaid(orderId: string): Promise<void> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });

    if (!order) {
      this.logger.warn(`markOrderAsPaid: Order ${orderId} not found. Skipping.`);
      return;
    }

    if (order.status === OrderStatus.PAID) {
      this.logger.debug(`Order ${orderId} already paid. Idempotent skip.`);
      return;
    }

    order.status = OrderStatus.PAID;
    await this.orderRepo.save(order);

    await this.updateRepo.save(
      this.updateRepo.create({
        orderId: order.id,
        author: UpdateAuthor.SYSTEM,
        content: 'Payment confirmed. Your order is now being processed.',
      }),
    );

    this.logger.log(`Order ${orderId} marked as PAID`);
  }

  // ──────────────────────────────────────────────────────────────────
  // User: List My Orders
  // ──────────────────────────────────────────────────────────────────

  async findUserOrders(userId: number, page: number = 1, limit: number = 10) {
    const [data, total] = await this.orderRepo.findAndCount({
      where: { userId },
      relations: ['service', 'updates'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // User: Get Single Order (ownership check)
  // ──────────────────────────────────────────────────────────────────

  async findOneForUser(userId: number, orderId: string): Promise<ServiceOrder> {
    return this.findOrderForUser(userId, orderId);
  }

  // ──────────────────────────────────────────────────────────────────
  // Admin: List All Orders
  // ──────────────────────────────────────────────────────────────────

  async findAll(query: OrderFilterDto) {
    const { page = 1, limit = 10, status, userId, serviceId } = query;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (serviceId) where.serviceId = serviceId;

    const [data, total] = await this.orderRepo.findAndCount({
      where,
      relations: ['service', 'user', 'updates'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // Admin: Get Single Order
  // ──────────────────────────────────────────────────────────────────

  async findOneAdmin(orderId: string): Promise<ServiceOrder> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['service', 'user', 'updates', 'payment'],
    });

    if (!order) throw new NotFoundException(`Order "${orderId}" not found`);
    return order;
  }

  // ──────────────────────────────────────────────────────────────────
  // Admin: Update Order Status
  // ──────────────────────────────────────────────────────────────────

  async updateStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
  ): Promise<ServiceOrder> {
    const order = await this.findOneAdmin(orderId);
    const prevStatus = order.status;

    order.status = dto.status;
    await this.orderRepo.save(order);

    await this.updateRepo.save(
      this.updateRepo.create({
        orderId: order.id,
        author: UpdateAuthor.ADMIN,
        content: `Order status changed from "${prevStatus}" to "${dto.status}".`,
      }),
    );

    return order;
  }

  // ──────────────────────────────────────────────────────────────────
  // Admin/User: Add Timeline Update
  // ──────────────────────────────────────────────────────────────────

  async addUpdate(
    orderId: string,
    dto: AddOrderUpdateDto,
    author: UpdateAuthor = UpdateAuthor.ADMIN,
  ): Promise<OrderUpdate> {
    await this.findOneAdmin(orderId);

    const update = this.updateRepo.create({
      orderId,
      author,
      content: dto.content,
    });

    return this.updateRepo.save(update);
  }

  // ──────────────────────────────────────────────────────────────────
  // Private Helpers
  // ──────────────────────────────────────────────────────────────────

  private async findOrderForUser(
    userId: number,
    orderId: string,
  ): Promise<ServiceOrder> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['service', 'updates'],
    });

    if (!order) throw new NotFoundException(`Order "${orderId}" not found`);
    if (order.userId !== userId) throw new ForbiddenException('Access denied');

    return order;
  }
}
