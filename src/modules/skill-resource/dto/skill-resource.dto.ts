import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ResourceType } from '@prisma/client'
import { IsNotEmpty, IsString, IsUrl, IsOptional, IsNumber, Min, Max, IsEnum } from 'class-validator'

export class CreateSkillResourceDto {
  @ApiProperty({ description: 'ID của kỹ năng liên kết' })
  @IsNotEmpty()
  @IsString()
  skillId!: string

  @ApiPropertyOptional({ description: 'ID chương trình tiếp thị liên kết (Affiliate)' })
  @IsOptional()
  @IsString()
  affiliateId?: string

  @ApiPropertyOptional({
    description: 'Loại tài nguyên',
    enum: ResourceType,
  })
  @IsOptional()
  @IsEnum(ResourceType, { message: 'resourceType không hợp lệ' })
  resourceType?: ResourceType // Sử dụng kiểu ResourceType thay cho string

  @ApiProperty({ description: 'Tiêu đề tài nguyên học tập' })
  @IsNotEmpty()
  @IsString()
  title!: string

  @ApiProperty({ description: 'Đường dẫn URL của tài nguyên' })
  @IsNotEmpty()
  @IsUrl({}, { message: 'URL không hợp lệ' })
  url!: string

  @ApiPropertyOptional({ description: 'Chi phí (VNĐ/USD), mặc định là 0' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number

  @ApiPropertyOptional({ description: 'Đánh giá thang điểm 5.0' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number

  @ApiPropertyOptional({ description: 'Thời lượng học (tính theo giờ)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  durationHours?: number
}

// Interface định nghĩa response trả về từ YouTube Data API v3
export interface YouTubeSearchItem {
  id?: {
    kind?: string
    videoId?: string
    playlistId?: string
  }
  snippet?: {
    title: string
    description: string
    channelTitle?: string
    thumbnails?: {
      high?: { url: string }
      default?: { url: string }
    }
  }
}

export interface YouTubeSearchResponse {
  items?: YouTubeSearchItem[]
}
