import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, Min } from 'class-validator'

export class SkillQueryDto {
  @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm theo tên skill' })
  @IsString()
  @IsOptional()
  q?: string

  @ApiPropertyOptional({ description: 'Lọc theo danh mục' })
  @IsString()
  @IsOptional()
  category?: string

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1

  @ApiPropertyOptional({ default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10
}
