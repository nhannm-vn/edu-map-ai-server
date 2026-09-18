import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, MaxLength } from 'class-validator'

export class CreateChatSessionDto {
  @ApiPropertyOptional({
    example: 'Tư vấn lộ trình Backend Java',
    description: 'Tiêu đề tùy chọn cho phiên trò chuyện',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string
}
