import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateSkillTreeDto {
  @ApiProperty({ example: 'Fullstack Node.js & React Developer' })
  @IsString()
  @IsNotEmpty()
  title: string | undefined

  @ApiPropertyOptional({ example: 'Lộ trình từ Zero đến Hero cho Fullstack Web' })
  @IsString()
  @IsOptional()
  description?: string

  @ApiProperty({ example: 'Fullstack Developer' })
  @IsString()
  @IsNotEmpty()
  targetRole: string | undefined
}
