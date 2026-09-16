import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { SkillResourcesService } from './skill-resources.service'
import { SkillResourcesController } from './skill-resources.controller'
import { PrismaModule } from 'prisma/prisma.module'

@Module({
  imports: [
    PrismaModule,
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
