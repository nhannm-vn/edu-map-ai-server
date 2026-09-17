/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
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
   * 1. Ghi nhận lượt xem tài liệu của sinh viên
   */
  async recordViewHistory(userId: string, skillResourceId: string) {
    const resource = await this.prisma.skillResource.findUnique({
      where: { id: skillResourceId },
    })

    if (!resource) {
      throw new NotFoundException('Tài nguyên học tập không tồn tại trong hệ thống')
    }

    return await this.prisma.resourceHistory.create({
      data: {
        userId,
        skillResourceId,
      },
    })
  }

  /**
   * 2. Lấy danh sách lịch sử tài liệu đã xem của sinh viên
   */
  async getUserHistory(userId: string, limit: number = 20) {
    const take = Number(limit) > 0 ? Number(limit) : 20

    return await this.prisma.resourceHistory.findMany({
      where: { userId },
      take,
      orderBy: { viewedAt: 'desc' },
      include: {
        skillResource: {
          include: {
            skill: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
          },
        },
      },
    })
  }

  /**
   * Lấy danh sách tài nguyên học tập theo Skill ID (Dạng phẳng).
   * Tự động kết nối Third-Party APIs (YouTube, Dev.to, DevDocs, GitHub) nếu DB chưa có tài nguyên.
   */
  async getResourcesBySkill(skillId: string) {
    const skill = await this.prisma.skill.findUnique({
      where: { id: skillId },
    })

    if (!skill) {
      throw new NotFoundException('Kỹ năng không tồn tại trong hệ thống')
    }

    let resources = await this.prisma.skillResource.findMany({
      where: { skillId },
      orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
    })

    // Nếu chưa có trong DB -> cào lần đầu
    if (resources.length === 0) {
      await this.fetchAndSaveMultiSourceResources(skill.id, skill.name)

      resources = await this.prisma.skillResource.findMany({
        where: { skillId },
        orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
      })
    }

    return resources
  }

  /**
   * Lấy danh sách tài nguyên đã được phân loại (Grouped) chuyên nghiệp cho UI Frontend + External Links.
   */
  async getResourcesBySkillGrouped(skillId: string) {
    const skill = await this.prisma.skill.findUnique({
      where: { id: skillId },
    })

    if (!skill) {
      throw new NotFoundException('Kỹ năng không tồn tại trong hệ thống')
    }

    const resources = await this.getResourcesBySkill(skillId)

    const videos = resources.filter((r) => r.resourceType === 'VIDEO_COURSE')
    const documentations = resources.filter((r) => ['DOCUMENTATION', 'ARTICLE', 'BOOK'].includes(r.resourceType || ''))
    const practices = resources.filter((r) => ['INTERACTIVE_LAB', 'PRACTICE'].includes(r.resourceType || ''))

    const searchKeyword = encodeURIComponent(skill.name)
    const formattedSkill = skill.name.toLowerCase().replace(/[^a-z0-9]/g, '')

    return {
      skillId,
      skillName: skill.name,
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
      // Liên kết tìm kiếm bổ sung ra các nền tảng mở rộng
      externalSearchLinks: {
        youtube: `https://www.youtube.com/results?search_query=${searchKeyword}+tutorial+course`,
        github: `https://github.com/topics/${formattedSkill}`,
        devTo: `https://dev.to/t/${formattedSkill}`,
        coursera: `https://www.coursera.org/search?query=${searchKeyword}`,
        udemy: `https://www.udemy.com/courses/search/?q=${searchKeyword}`,
      },
    }
  }

  /**
   * Cào thêm tài nguyên học tập ở các trang tiếp theo (Page 2, 3...) và nạp thêm vào DB.
   */
  async fetchMoreResources(skillId: string, page: number = 2) {
    const skill = await this.prisma.skill.findUnique({
      where: { id: skillId },
    })

    if (!skill) {
      throw new NotFoundException('Kỹ năng không tồn tại trong hệ thống')
    }

    // 1. Lấy danh sách URL đã có trong DB của skill này để chủ động chống trùng lặp
    const existingResources = await this.prisma.skillResource.findMany({
      where: { skillId },
      select: { url: true },
    })
    const existingUrls = new Set(existingResources.map((r) => r.url))

    const newResources: Prisma.SkillResourceCreateManyInput[] = []
    const formattedSkill = skill.name.toLowerCase().replace(/[^a-z0-9]/g, '')

    // 2. Fetch thêm từ Dev.to theo trang (page)
    try {
      const devToUrl = `https://dev.to/api/articles?tag=${formattedSkill}&page=${page}&per_page=4`
      const devToResponse = await firstValueFrom(this.httpService.get<DevToArticle[]>(devToUrl))

      if (Array.isArray(devToResponse.data)) {
        devToResponse.data.forEach((article) => {
          if (article.url && !existingUrls.has(article.url)) {
            newResources.push({
              skillId,
              resourceType: 'ARTICLE',
              title: article.title || `Bài viết hướng dẫn ${skill.name}`,
              url: article.url,
              cost: 0,
              rating: 4.7,
              durationHours: Math.ceil((article.reading_time_minutes || 5) / 60),
            })
            existingUrls.add(article.url) // Đánh dấu đã thêm vào bộ nhớ tạm
          }
        })
      }
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.warn(`Không thể fetch thêm từ Dev.to (Trang ${page}): ${errMessage}`)
    }

    // 3. Fetch thêm từ YouTube API
    const apiKey = process.env.YOUTUBE_API_KEY
    if (apiKey) {
      const searchQuery = `advanced ${skill.name} project tutorial`
      try {
        const response = await firstValueFrom(
          this.httpService.get<YouTubeSearchResponse>('https://www.googleapis.com/youtube/v3/search', {
            params: {
              part: 'snippet',
              q: searchQuery,
              type: 'video',
              maxResults: 3,
              key: apiKey,
            },
          }),
        )

        const items = response.data.items || []
        items.forEach((item) => {
          if (item.id?.videoId && item.snippet?.title) {
            const videoUrl = `https://www.youtube.com/watch?v=${item.id.videoId}`
            if (!existingUrls.has(videoUrl)) {
              newResources.push({
                skillId,
                resourceType: 'VIDEO_COURSE',
                title: this.decodeHtmlEntities(item.snippet.title),
                url: videoUrl,
                cost: 0,
                rating: 4.8,
                durationHours: 3,
              })
              existingUrls.add(videoUrl)
            }
          }
        })
      } catch (error) {
        this.logger.error('Lỗi khi fetch thêm từ YouTube API:', error)
      }
    }

    // 4. Lưu toàn bộ tài nguyên mới vừa cào được vào DB
    if (newResources.length > 0) {
      await this.prisma.skillResource.createMany({
        data: newResources,
        skipDuplicates: true, // Chống ghi trùng cấp DB nếu schema có @unique trên URL
      })
    }

    // 5. Trả lại response grouped đã cập nhật thêm dữ liệu mới
    return this.getResourcesBySkillGrouped(skillId)
  }

  /**
   * Helper giải mã HTML entities từ Third-Party API
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
   * Cào lần đầu đa nguồn tài nguyên học tập (Multi-Source Crawling)
   */
  private async fetchAndSaveMultiSourceResources(skillId: string, skillName: string): Promise<void> {
    const resourcesToCreate: Prisma.SkillResourceCreateManyInput[] = []
    const formattedSkill = skillName.toLowerCase().replace(/[^a-z0-9]/g, '')

    // A. DevDocs
    resourcesToCreate.push({
      skillId,
      resourceType: 'DOCUMENTATION',
      title: `Trang tra cứu tài liệu chuẩn: ${skillName} Docs`,
      url: `https://devdocs.io/${formattedSkill}/`,
      cost: 0,
      rating: 5.0,
      durationHours: 1,
    })

    // B. Dev.to
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

    // C. GitHub Topics
    resourcesToCreate.push({
      skillId,
      resourceType: 'INTERACTIVE_LAB',
      title: `Bài tập thực hành & Project mẫu: ${skillName} Labs`,
      url: `https://github.com/topics/${formattedSkill}`,
      cost: 0,
      rating: 4.9,
      durationHours: 3,
    })

    // D. YouTube Data API v3
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

    if (resourcesToCreate.length > 0) {
      await this.prisma.skillResource.createMany({
        data: resourcesToCreate,
        skipDuplicates: true,
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
    await this.getResourceById(id)

    if (dto.skillId) {
      const skillExists = await this.prisma.skill.findUnique({
        where: { id: dto.skillId },
      })

      if (!skillExists) {
        throw new NotFoundException('Kỹ năng mới được gán không tồn tại trong hệ thống')
      }
    }

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
