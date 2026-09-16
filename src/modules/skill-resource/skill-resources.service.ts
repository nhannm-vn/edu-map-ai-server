/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import { Injectable, NotFoundException, Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import { AxiosError } from 'axios'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'prisma/prisma.service'
import { CreateSkillResourceDto, YouTubeSearchResponse } from './dto/skill-resource.dto'
import { UpdateSkillResourceDto } from './dto/update-skill-resource.dto'

/** Interface cho dữ liệu trả về từ Dev.to API */
interface DevToArticle {
  id: number
  title: string
  url: string
  reading_time_minutes?: number
}

@Injectable()
export class SkillResourcesService {
  private readonly logger = new Logger(SkillResourcesService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Lấy danh sách tài nguyên học tập theo Skill ID (Dạng phẳng).
   * Tự động kết nối Third-Party APIs (YouTube, Dev.to, DevDocs, GitHub) nếu DB chưa có tài nguyên.
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

    // 3. Nếu chưa có -> Tự động cào đa nguồn tài nguyên uy tín về lưu DB
    if (resources.length === 0) {
      await this.fetchAndSaveMultiSourceResources(skill.id, skill.name)

      // Query lại DB sau khi đã nạp tự động
      resources = await this.prisma.skillResource.findMany({
        where: { skillId },
        orderBy: { rating: 'desc' },
      })
    }

    return resources
  }

  /**
   * Lấy danh sách tài nguyên đã được phân loại (Grouped) chuyên nghiệp cho UI Frontend.
   */
  async getResourcesBySkillGrouped(skillId: string) {
    const resources = await this.getResourcesBySkill(skillId)

    const videos = resources.filter((r) => r.resourceType === 'VIDEO_COURSE')
    const documentations = resources.filter((r) => ['DOCUMENTATION', 'ARTICLE', 'BOOK'].includes(r.resourceType || ''))
    const practices = resources.filter((r) => ['INTERACTIVE_LAB', 'PRACTICE'].includes(r.resourceType || ''))

    return {
      skillId,
      summary: {
        total: resources.length,
        hasVideo: videos.length > 0,
        hasDocs: documentations.length > 0,
        hasPractice: practices.length > 0,
      },
      data: {
        videos,
        documentations,
        practices,
      },
    }
  }

  /**
   * Helper giải mã HTML entities từ Third-Party API (ví dụ: &#39; -> ', &amp; -> &)
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
   * Phương thức private tự động cào đa nguồn tài nguyên học tập (Multi-Source Crawling)
   */
  private async fetchAndSaveMultiSourceResources(skillId: string, skillName: string): Promise<void> {
    const resourcesToCreate: Prisma.SkillResourceCreateManyInput[] = []
    const formattedSkill = skillName.toLowerCase().replace(/[^a-z0-9]/g, '')

    // --- A. NGUỒN DOCS & CHEATSHEET CHÍNH THỨC (DevDocs) ---
    resourcesToCreate.push({
      skillId,
      resourceType: 'DOCUMENTATION',
      title: `Trang tra cứu tài liệu chuẩn: ${skillName} Docs`,
      url: `https://devdocs.io/${formattedSkill}/`,
      cost: 0,
      rating: 5.0,
      durationHours: 1,
    })

    // --- B. NGUỒN BÀI VIẾT CHUYÊN SÂU (Dev.to API - Không cần API Key) ---
    try {
      const devToUrl = `https://dev.to/api/articles?tag=${formattedSkill}&per_page=2`
      const devToResponse = await firstValueFrom(this.httpService.get<DevToArticle[]>(devToUrl))

      if (Array.isArray(devToResponse.data)) {
        devToResponse.data.forEach((article) => {
          resourcesToCreate.push({
            skillId,
            resourceType: 'ARTICLE',
            title: article.title || `Bài viết hướng dẫn ${skillName}`,
            url: article.url,
            cost: 0,
            rating: 4.8,
            durationHours: Math.ceil((article.reading_time_minutes || 5) / 60),
          })
        })
      }
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.warn(`Không thể fetch bài viết từ Dev.to cho skill: ${skillName}. Error: ${errMessage}`)
    }

    // --- C. NGUỒN BÀI TẬP THỰC HÀNH / LABS (GitHub Topics) ---
    resourcesToCreate.push({
      skillId,
      resourceType: 'INTERACTIVE_LAB',
      title: `Bài tập thực hành & Project mẫu: ${skillName} Labs`,
      url: `https://github.com/topics/${formattedSkill}`,
      cost: 0,
      rating: 4.9,
      durationHours: 3,
    })

    // --- D. NGUỒN VIDEO BÀI GIẢNG (YouTube Data API v3) ---
    const apiKey = process.env.YOUTUBE_API_KEY

    if (apiKey) {
      const searchQuery = `${skillName} full course tutorial for beginners`
      const youtubeUrl = `https://www.googleapis.com/youtube/v3/search`

      try {
        const response = await firstValueFrom(
          this.httpService.get<YouTubeSearchResponse>(youtubeUrl, {
            params: {
              part: 'snippet',
              q: searchQuery,
              type: 'video',
              maxResults: 3,
              relevanceLanguage: 'en',
              videoDuration: 'long',
              key: apiKey,
            },
          }),
        )

        const items = response.data.items || []
        items.forEach((item) => {
          if (item.id?.videoId && item.snippet?.title) {
            resourcesToCreate.push({
              skillId,
              resourceType: 'VIDEO_COURSE',
              title: this.decodeHtmlEntities(item.snippet.title),
              url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
              cost: 0,
              rating: 4.8,
              durationHours: 2,
            })
          }
        })
      } catch (error) {
        if (error instanceof AxiosError) {
          this.logger.error('Lỗi khi fetch dữ liệu từ YouTube API:', error.response?.data || error.message)
        } else {
          this.logger.error('Lỗi không xác định khi kết nối YouTube API:', error)
        }
      }
    } else {
      this.logger.warn('YOUTUBE_API_KEY chưa được cấu hình trong process.env')
    }

    // Lưu toàn bộ tài nguyên đa nguồn vào Database
    if (resourcesToCreate.length > 0) {
      await this.prisma.skillResource.createMany({
        data: resourcesToCreate,
      })
    }
  }

  /**
   * Lấy chi tiết thông tin của 1 tài nguyên học tập theo ID
   */
  async getResourceById(id: string) {
    const resource = await this.prisma.skillResource.findUnique({
      where: { id },
    })

    if (!resource) {
      throw new NotFoundException('Tài nguyên học tập không tồn tại')
    }

    return resource
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
        resourceType: dto.resourceType || 'VIDEO_COURSE',
        title: dto.title,
        url: dto.url,
        cost: dto.cost ?? 0,
        rating: dto.rating,
        durationHours: dto.durationHours,
      },
    })
  }

  /**
   * [ADMIN] Cập nhật thông tin tài nguyên học tập
   */
  async updateResource(id: string, dto: UpdateSkillResourceDto) {
    // 1. Kiểm tra tài nguyên có tồn tại không
    await this.getResourceById(id)

    // 2. Nếu DTO có chứa skillId mới -> Kiểm tra skillId đó có tồn tại không
    if (dto.skillId) {
      const skillExists = await this.prisma.skill.findUnique({
        where: { id: dto.skillId },
      })

      if (!skillExists) {
        throw new NotFoundException('Kỹ năng mới được gán không tồn tại trong hệ thống')
      }
    }

    // 3. Tiến hành cập nhật thông tin (Cast kiểu UncheckedUpdateInput để tránh lỗi TypeScript)
    return await this.prisma.skillResource.update({
      where: { id },
      data: dto as Prisma.SkillResourceUncheckedUpdateInput,
    })
  }

  /**
   * [ADMIN] Xóa tài nguyên học tập
   */
  async deleteResource(id: string) {
    await this.getResourceById(id)

    await this.prisma.skillResource.delete({
      where: { id },
    })

    return { message: 'Đã xóa tài nguyên học tập thành công' }
  }

  /**
   * Lấy danh sách các tài nguyên/khóa học hàng đầu (Top Rated) trên toàn hệ thống.
   */
  async getTopResources(limit: number = 10) {
    const take = Number(limit) > 0 ? Number(limit) : 10

    return await this.prisma.skillResource.findMany({
      take,
      orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
      include: {
        skill: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
      },
    })
  }
}
