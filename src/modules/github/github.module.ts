import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { GithubController } from './github.controller'
import { GithubService } from './github.service'
import { PrismaModule } from 'prisma/prisma.module'

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [GithubController],
  providers: [GithubService],
  exports: [GithubService],
})
export class GithubModule {}
