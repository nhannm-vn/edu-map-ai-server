import { Module } from '@nestjs/common'
import { GithubController } from './github.controller'
import { GithubService } from './github.service'
import { PrismaModule } from '../../../prisma/prisma.module'

@Module({
  imports: [PrismaModule], // Bỏ qua nếu PrismaModule đã khai báo @Global()
  controllers: [GithubController],
  providers: [GithubService],
})
export class GithubModule {}
