import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Nguyễn Văn A' })
  @IsString()
  @IsOptional()
  fullName?: string

  @ApiPropertyOptional({ example: 'Đại học Bách Khoa' })
  @IsString()
  @IsOptional()
  universityName?: string

  @ApiPropertyOptional({ example: 3, description: 'Sinh viên năm thứ mấy' })
  @IsInt()
  @Min(1)
  @Max(7)
  @IsOptional()
  currentYear?: number

  @ApiPropertyOptional({ example: 'github_user123' })
  @IsString()
  @IsOptional()
  githubUsername?: string
}
