/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, NotFoundException } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import { CreateSkillResourceDto, YouTubeSearchResponse } from './dto/skill-resource.dto'
import { PrismaService } from 'prisma/prisma.service'

@Injectable()
export class SkillResourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Lấy danh sách tài nguyên học tập theo Skill ID.
   * Tự động kết nối Third-Party API (YouTube) nếu DB chưa có tài nguyên.
   */
  async getResourcesBySkill(skillId: string) {
    // 1. Kiểm tra Skill có tồn tại không
    const skill = await this.prisma.skill.findUnique({
      where: { id: skillId },
    })

    if (!skill) {
      throw new NotFoundException('Kỹ năng không tồn tại trong hệ thống')
    }

    // 2. Tìm tài nguyên đã có trong DB
    let resources = await this.prisma.skillResource.findMany({
      where: { skillId },
      orderBy: { rating: 'desc' },
    })

    // 3. Nếu chưa có -> Tự động gọi YouTube API cào tài nguyên uy tín về lưu DB
    if (resources.length === 0) {
      await this.fetchAndSaveThirdPartyResources(skill.id, skill.name)

      // Query lại DB sau khi đã nạp tự động
      resources = await this.prisma.skillResource.findMany({
        where: { skillId },
        orderBy: { rating: 'desc' },
      })
    }

    return resources
  }

  /**
   * Helper giải mã HTML entities đơn giản từ YouTube API (ví dụ: &#39; -> ', &amp; -> &)
   */
  private decodeHtmlEntities(str: string): string {
    return str
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
  }

  /**
   * Phương thức private gọi YouTube Data API v3 để tìm khóa học/bài giảng chất lượng
   */
  private async fetchAndSaveThirdPartyResources(skillId: string, skillName: string): Promise<void> {
    // Lấy API key truyền thống qua process.env
    const apiKey = process.env.YOUTUBE_API_KEY

    // Nếu không cấu hình API Key thì bỏ qua tự động fetch
    if (!apiKey) {
      console.warn('YOUTUBE_API_KEY chưa được cấu hình trong file .env')
      return
    }

    const searchQuery = `${skillName} full course tutorial for beginners`
    const url = `https://www.googleapis.com/youtube/v3/search`

    try {
      const response = await firstValueFrom(
        this.httpService.get<YouTubeSearchResponse>(url, {
          params: {
            part: 'snippet',
            q: searchQuery,
            type: 'video',
            maxResults: 5,
            relevanceLanguage: 'en',
            videoDuration: 'long', // Ưu tiên video bài giảng dài/khóa học đầy đủ
            key: apiKey,
          },
        }),
      )

      const items = response.data.items || []
      const resourcesToCreate = items
        .filter((item) => item.id && item.id.videoId)
        .map((item) => ({
          skillId,
          resourceType: 'VIDEO_COURSE',
          title: this.decodeHtmlEntities(item.snippet.title),
          url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
          cost: 0, // Miễn phí
          rating: 4.8, // Đánh giá mặc định cho nội dung chất lượng cao
          durationHours: 2, // Thời lượng ước tính
        }))

      if (resourcesToCreate.length > 0) {
        // Lưu hàng loạt vào Database
        await this.prisma.skillResource.createMany({
          data: resourcesToCreate,
        })
      }
    } catch (error: any) {
      // Log lỗi rõ ràng nhưng không crash ứng dụng
      console.error('Lỗi khi fetch dữ liệu từ YouTube API:', error?.response?.data || error?.message || error)
    }
  }

  /**
   * [ADMIN] Thêm tài nguyên học tập thủ công/tuyển chọn
   */
  async createResource(dto: CreateSkillResourceDto) {
    const skill = await this.prisma.skill.findUnique({
      where: { id: dto.skillId },
    })

    if (!skill) {
      throw new NotFoundException('Kỹ năng không tồn tại')
    }

    return await this.prisma.skillResource.create({
      data: {
        skillId: dto.skillId,
        affiliateId: dto.affiliateId,
        resourceType: dto.resourceType || 'COURSE',
        title: dto.title,
        url: dto.url,
        cost: dto.cost ?? 0,
        rating: dto.rating,
        durationHours: dto.durationHours,
      },
    })
  }

  /**
   * [ADMIN] Xóa tài nguyên học tập
   */
  async deleteResource(id: string) {
    const resource = await this.prisma.skillResource.findUnique({
      where: { id },
    })

    if (!resource) {
      throw new NotFoundException('Tài nguyên không tồn tại')
    }

    await this.prisma.skillResource.delete({
      where: { id },
    })

    return { message: 'Đã xóa tài nguyên học tập thành công' }
  }
}
