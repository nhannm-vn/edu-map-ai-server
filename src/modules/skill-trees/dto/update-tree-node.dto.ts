import { PartialType } from '@nestjs/swagger'
import { CreateTreeNodeDto } from './create-tree-node.dto'

export class UpdateTreeNodeDto extends PartialType(CreateTreeNodeDto) {}
