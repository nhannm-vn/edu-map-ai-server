import { Module } from '@nestjs/common'
import { SkillTreesController } from './skill-trees.controller'
import { SkillTreesService } from './skill-trees.service'

@Module({
  controllers: [SkillTreesController],
  providers: [SkillTreesService],
  exports: [SkillTreesService],
})
export class SkillTreesModule {}
