import { Module } from '@nestjs/common'
import { AiAnalysisController } from './ai-analysis.controller'
import { AiAnalysisService } from './ai-analysis.service'
import { PrismaModule } from 'prisma/prisma.module'
import { ConfigModule } from '@nestjs/config'

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [AiAnalysisController],
  providers: [AiAnalysisService],
  exports: [AiAnalysisService],
})
export class AiAnalysisModule {}
