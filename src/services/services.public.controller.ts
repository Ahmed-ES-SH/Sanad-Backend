import { Controller, Get, Param } from '@nestjs/common';
import { ServicesService } from './services.service';
import { Service } from './schema/service.schema';
import { Public } from '../auth/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Services (Public)')
@Public()
@Controller('services')
export class ServicesPublicController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @ApiOperation({ summary: 'List all published services' })
  @ApiResponse({
    status: 200,
    description: 'List of published services sorted by order',
  })
  async findPublished(): Promise<{ data: Service[] }> {
    const data = await this.servicesService.findPublished();
    return { data };
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a published service by slug' })
  @ApiParam({ name: 'slug', description: 'Service slug', type: String })
  @ApiResponse({ status: 200, description: 'Service details' })
  @ApiResponse({ status: 404, description: 'Published service not found' })
  async findBySlug(@Param('slug') slug: string): Promise<Service> {
    return this.servicesService.findBySlug(slug);
  }
}
