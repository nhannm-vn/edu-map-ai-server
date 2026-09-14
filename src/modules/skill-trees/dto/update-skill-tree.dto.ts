import { PartialType } from '@nestjs/swagger'
import { CreateSkillTreeDto } from './create-skill-tree.dto'

export class UpdateSkillTreeDto extends PartialType(CreateSkillTreeDto) {}
