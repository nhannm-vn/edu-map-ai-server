import { Module } from '@nestjs/common'
import { PrismaModule } from 'prisma/prisma.module'
import { GithubModule } from '../github/github.module' // Import GithubModule
import { AiAdvisorController } from './ai-advisor.controller'
import { AiAdvisorService } from './ai-advisor.service'

@Module({
  imports: [PrismaModule, GithubModule], // Thêm GithubModule vào đây
  controllers: [AiAdvisorController],
  providers: [AiAdvisorService],
  exports: [AiAdvisorService],
})
export class AiAdvisorModule {}
