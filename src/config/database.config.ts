import { User } from '../user/schema/user.schema';
import { DataSourceOptions, DataSource } from 'typeorm';
import { config } from 'dotenv';
import { BlackList } from '../auth/schema/blacklisk-tokens.schema';
import { Service } from '../services/schema/service.schema';

// Config
config({ path: '.env' });

// Data Source Options
export const databaseConfig: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, BlackList, Service],
  migrations: ['dist/db/migrations/*.js'],
};

const dataSource = new DataSource(databaseConfig);

export default dataSource;
