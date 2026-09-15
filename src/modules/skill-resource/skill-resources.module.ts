import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { ConfigModule } from '@nestjs/config' // 1. Import ConfigModule
import { SkillResourcesService } from './skill-resources.service'
import { SkillResourcesController } from './skill-resources.controller'
import { PrismaModule } from 'prisma/prisma.module'

@Module({
  imports: [
    PrismaModule,
    ConfigModule, // 2. Khai báo ConfigModule tại đây
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 3,
    }),
  ],
  controllers: [SkillResourcesController],
  providers: [SkillResourcesService],
  exports: [SkillResourcesService],
})
export class SkillResourcesModule {}
