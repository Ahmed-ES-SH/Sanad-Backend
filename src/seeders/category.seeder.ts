import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Category } from '../categories/schema/category.schema';

@Injectable()
export class CategorySeeder {
  private readonly logger = new Logger(CategorySeeder.name);

  constructor(private readonly dataSource: DataSource) {}

  async seed(): Promise<void> {
    const categoryRepository = this.dataSource.getRepository(Category);

    const existingCategories = await categoryRepository.count();
    if (existingCategories > 0) {
      this.logger.log('Categories already seeded, skipping...');
      return;
    }

    const categories: Partial<Category>[] = [
      {
        name: 'Web Development',
        slug: 'web-development',
        description: 'Web development projects and tutorials',
        color: '#3B82F6',
        icon: 'globe',
        order: 1,
      },
      {
        name: 'Mobile Development',
        slug: 'mobile-development',
        description: 'Mobile app development projects',
        color: '#10B981',
        icon: 'smartphone',
        order: 2,
      },
      {
        name: 'UI/UX Design',
        slug: 'ui-ux-design',
        description: 'UI/UX design projects and resources',
        color: '#8B5CF6',
        icon: 'paint-brush',
        order: 3,
      },
      {
        name: 'DevOps',
        slug: 'devops',
        description: 'DevOps and cloud infrastructure',
        color: '#F59E0B',
        icon: 'cloud',
        order: 4,
      },
      {
        name: 'Data Science',
        slug: 'data-science',
        description: 'Data science and machine learning',
        color: '#EF4444',
        icon: 'chart-bar',
        order: 5,
      },
      {
        name: 'Cybersecurity',
        slug: 'cybersecurity',
        description: 'Security auditing and penetration testing',
        color: '#DC2626',
        icon: 'shield',
        order: 6,
      },
      {
        name: 'Blockchain',
        slug: 'blockchain',
        description: 'Blockchain and cryptocurrency development',
        color: '#F97316',
        icon: 'link',
        order: 7,
      },
      {
        name: 'Game Development',
        slug: 'game-development',
        description: 'Video game design and development',
        color: '#7C3AED',
        icon: 'gamepad',
        order: 8,
      },
      {
        name: 'IoT',
        slug: 'iot',
        description: 'Internet of Things and embedded systems',
        color: '#06B6D4',
        icon: 'cpu',
        order: 9,
      },
      {
        name: 'Cloud Computing',
        slug: 'cloud-computing',
        description: 'Cloud platforms and serverless architectures',
        color: '#0EA5E9',
        icon: 'cloud-upload',
        order: 10,
      },
      {
        name: 'API Development',
        slug: 'api-development',
        description: 'RESTful and GraphQL API design',
        color: '#14B8A6',
        icon: 'server',
        order: 11,
      },
      {
        name: 'E-Commerce',
        slug: 'e-commerce',
        description: 'Online store and payment solutions',
        color: '#84CC16',
        icon: 'shopping-cart',
        order: 12,
      },
      {
        name: 'CMS',
        slug: 'cms',
        description: 'Content management systems',
        color: '#A3E635',
        icon: 'file-text',
        order: 13,
      },
      {
        name: 'Testing & QA',
        slug: 'testing-qa',
        description: 'Software testing and quality assurance',
        color: '#FBBF24',
        icon: 'check-circle',
        order: 14,
      },
      {
        name: 'Performance',
        slug: 'performance',
        description: 'Performance optimization and monitoring',
        color: '#FB923C',
        icon: 'zap',
        order: 15,
      },
      {
        name: 'Accessibility',
        slug: 'accessibility',
        description: 'Web accessibility and inclusive design',
        color: '#4ADE80',
        icon: 'eye',
        order: 16,
      },
      {
        name: 'SEO',
        slug: 'seo',
        description: 'Search engine optimization techniques',
        color: '#34D399',
        icon: 'search',
        order: 17,
      },
      {
        name: 'Microservices',
        slug: 'microservices',
        description: 'Microservice architecture patterns',
        color: '#60A5FA',
        icon: 'layers',
        order: 18,
      },
      {
        name: 'Serverless',
        slug: 'serverless',
        description: 'Serverless computing and FaaS',
        color: '#A78BFA',
        icon: 'function',
        order: 19,
      },
      {
        name: 'Progressive Web Apps',
        slug: 'progressive-web-apps',
        description: 'PWA development and service workers',
        color: '#F472B6',
        icon: 'wifi',
        order: 20,
      },
      {
        name: 'AR/VR',
        slug: 'ar-vr',
        description: 'Augmented and virtual reality experiences',
        color: '#E879F9',
        icon: 'glasses',
        order: 21,
      },
      {
        name: 'Machine Learning',
        slug: 'machine-learning',
        description: 'ML models and AI integration',
        color: '#C084FC',
        icon: 'brain',
        order: 22,
      },
      {
        name: 'Natural Language Processing',
        slug: 'nlp',
        description: 'Text analysis and language models',
        color: '#818CF8',
        icon: 'message-square',
        order: 23,
      },
      {
        name: 'Computer Vision',
        slug: 'computer-vision',
        description: 'Image recognition and processing',
        color: '#6366F1',
        icon: 'camera',
        order: 24,
      },
      {
        name: 'Database Design',
        slug: 'database-design',
        description: 'Database architecture and optimization',
        color: '#22D3EE',
        icon: 'database',
        order: 25,
      },
      {
        name: 'Frontend Frameworks',
        slug: 'frontend-frameworks',
        description: 'React, Vue, Angular and more',
        color: '#2DD4BF',
        icon: 'layout',
        order: 26,
      },
      {
        name: 'Backend Frameworks',
        slug: 'backend-frameworks',
        description: 'NestJS, Express, Django and more',
        color: '#38BDF8',
        icon: 'terminal',
        order: 27,
      },
      {
        name: 'System Design',
        slug: 'system-design',
        description: 'Scalable system architecture patterns',
        color: '#A3E635',
        icon: 'network',
        order: 28,
      },
      {
        name: 'Open Source',
        slug: 'open-source',
        description: 'Open source projects and contributions',
        color: '#FACC15',
        icon: 'github',
        order: 29,
      },
      {
        name: 'Freelancing',
        slug: 'freelancing',
        description: 'Freelance tips and best practices',
        color: '#F87171',
        icon: 'briefcase',
        order: 30,
      },
      {
        name: 'Career Development',
        slug: 'career-development',
        description: 'Professional growth and skill building',
        color: '#FB7185',
        icon: 'trending-up',
        order: 31,
      },
    ];

    await categoryRepository.save(categories);
    this.logger.log('Categories seeded successfully');
  }
}
