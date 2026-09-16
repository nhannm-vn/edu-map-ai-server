import { PartialType } from '@nestjs/swagger'
import { CreateSkillResourceDto } from './skill-resource.dto'

export class UpdateSkillResourceDto extends PartialType(CreateSkillResourceDto) {}
