import { IsNotEmpty, IsString, IsUrl, IsOptional, IsNumber, Min } from 'class-validator'

export class CreateSkillResourceDto {
  @IsNotEmpty()
  @IsString()
  skillId!: string

  @IsOptional()
  @IsString()
  affiliateId?: string

  @IsOptional()
  @IsString()
  resourceType?: string

  @IsNotEmpty()
  @IsString()
  title!: string

  @IsNotEmpty()
  @IsUrl({}, { message: 'URL không hợp lệ' })
  url!: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number

  @IsOptional()
  @IsNumber()
  rating?: number

  @IsOptional()
  @IsNumber()
  durationHours?: number
}

// Interface định nghĩa response trả về từ YouTube API
export interface YouTubeSearchItem {
  id: {
    videoId?: string
    playlistId?: string
  }
  snippet: {
    title: string
    description: string
    channelTitle: string
    thumbnails: {
      high?: { url: string }
      default?: { url: string }
    }
  }
}

export interface YouTubeSearchResponse {
  items: YouTubeSearchItem[]
}
