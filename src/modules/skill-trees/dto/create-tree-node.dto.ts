import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, IsNotEmpty, IsOptional, IsUUID, Min } from 'class-validator'

export class CreateTreeNodeDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsUUID()
  @IsNotEmpty()
  skillId!: string

  @ApiPropertyOptional({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'Node cha trong cùng cây' })
  @IsUUID()
  @IsOptional()
  parentNodeId?: string

  @ApiProperty({ example: 1, description: 'Cấp độ của node trong cây' })
  @IsInt()
  @Min(1)
  nodeLevel!: number

  @ApiPropertyOptional({ example: 1, description: 'Thứ tự ưu tiên học' })
  @IsInt()
  @IsOptional()
  priorityRank?: number
}
