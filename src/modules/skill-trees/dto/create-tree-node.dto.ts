import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator'

export class CreateTreeNodeDto {
  @ApiProperty({ example: 'uuid-cua-skill' })
  @IsUUID()
  @IsNotEmpty()
  skillId: string | undefined

  @ApiProperty({ example: 1, description: 'Thứ tự vị trí mốc học trong cây' })
  @IsInt()
  @Min(1)
  positionOrder: number | undefined

  @ApiPropertyOptional({ example: 'Nắm vững khái niệm Async/Await và Event Loop' })
  @IsString()
  @IsOptional()
  description?: string
}
