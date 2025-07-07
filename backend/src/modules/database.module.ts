import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from 'nestjs-redis';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('POSTGRES_HOST', 'postgres'),
        port: parseInt(configService.get('POSTGRES_PORT', '5432'), 10),
        username: configService.get('POSTGRES_USER', 'ali'),
        password: configService.get('POSTGRES_PASSWORD', 'ali_password'),
        database: configService.get('POSTGRES_DB', 'ali_db'),
        autoLoadEntities: true,
        synchronize: false,
      }),
      inject: [ConfigService],
    }),
    RedisModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        url: configService.get('REDIS_URL', 'redis://redis:6379')
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [TypeOrmModule, RedisModule],
})
export class DatabaseModule {}
