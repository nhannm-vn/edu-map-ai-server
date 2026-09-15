import { Module } from '@nestjs/common'
import { AuthModule } from './modules/auth/auth.module'
import { PrismaModule } from 'prisma/prisma.module'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { UsersModule } from './modules/users/users.module'
import { GithubModule } from './modules/github/github.module'
import { AiAnalysisModule } from './modules/ai-analysis/ai-analysis.module'

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, GithubModule, AiAnalysisModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
