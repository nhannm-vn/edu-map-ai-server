/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { GoogleGenAI } from '@google/genai'
import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import { AnalyzeReadmeDto, SyncGithubDto } from './dto/github.dto'
import { PrismaService } from 'prisma/prisma.service'

interface GithubRepoResponse {
  name: string
  html_url: string
  language: string | null
  description: string | null
}

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name)
  private readonly ai: GoogleGenAI | null = null

  constructor(private readonly prisma: PrismaService) {
    const apiKey = process.env.GEMINI_API_KEY
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey })
    }
  }

  async syncRepositories(userId: string, dto: SyncGithubDto) {
    // 1. Kiểm tra profile hiện tại
    let profile = await this.prisma.githubProfile.findUnique({
      where: { userId },
    })

    const isUsernameChanged = profile && profile.githubUsername !== dto.username

    // 2. Gọi API GitHub TRƯỚC để đảm bảo username tồn tại hợp lệ
    let repos: GithubRepoResponse[] = []
    try {
      const res = await fetch(`https://api.github.com/users/${dto.username}/repos?sort=updated&per_page=15`, {
        headers: { 'User-Agent': 'EduMap-App' },
      })

      if (!res.ok) {
        throw new BadRequestException(`Không tìm thấy username GitHub: ${dto.username}`)
      }

      repos = (await res.json()) as GithubRepoResponse[]
    } catch (err) {
      this.logger.error('Lỗi sync GitHub:', err)
      if (err instanceof BadRequestException) throw err
      throw new InternalServerErrorException('Không thể kết nối API GitHub.')
    }

    // 3. Nếu username hợp lệ VÀ đã bị thay đổi -> Xóa sạch repos cũ
    if (isUsernameChanged && profile) {
      await this.prisma.githubRepository.deleteMany({
        where: { githubProfileId: profile.id },
      })
      this.logger.log(`Đã xóa repos cũ do đổi username sang: ${dto.username}`)
    }

    // 4. Tạo hoặc Cập nhật GithubProfile
    if (!profile) {
      profile = await this.prisma.githubProfile.create({
        data: {
          userId,
          githubUsername: dto.username,
          profileUrl: `https://github.com/${dto.username}`,
          lastSyncedAt: new Date(),
        },
      })
    } else {
      profile = await this.prisma.githubProfile.update({
        where: { id: profile.id },
        data: {
          githubUsername: dto.username,
          profileUrl: `https://github.com/${dto.username}`,
          lastSyncedAt: new Date(),
        },
      })
    }

    // Cập nhật username trên User model
    await this.prisma.user.update({
      where: { id: userId },
      data: { githubUsername: dto.username },
    })

    // 5. Lưu danh sách Repositories mới vào DB
    const upsertOps = repos.map((repo) =>
      this.prisma.githubRepository.upsert({
        where: {
          githubProfileId_repoName: {
            githubProfileId: profile.id,
            repoName: repo.name,
          },
        },
        update: {
          repoUrl: repo.html_url,
          mainLanguage: repo.language,
        },
        create: {
          githubProfileId: profile.id,
          repoName: repo.name,
          repoUrl: repo.html_url,
          mainLanguage: repo.language,
        },
      }),
    )

    await Promise.all(upsertOps)

    return {
      message: 'Đồng bộ danh sách dự án GitHub thành công!',
      syncedCount: repos.length,
    }
  }

  // Trong github.service.ts
  async analyzeReadme(userId: string, dto: AnalyzeReadmeDto) {
    const profile = await this.prisma.githubProfile.findUnique({
      where: { userId },
    })

    if (!profile) {
      throw new BadRequestException('Bạn chưa đồng bộ hồ sơ GitHub. Vui lòng chạy Sync trước.')
    }

    // 1. Tải nội dung README.md từ GitHub Raw
    let readmeContent = ''
    try {
      let res = await fetch(`https://raw.githubusercontent.com/${dto.owner}/${dto.repo}/main/README.md`)
      if (!res.ok) {
        res = await fetch(`https://raw.githubusercontent.com/${dto.owner}/${dto.repo}/master/README.md`)
      }
      if (res.ok) {
        readmeContent = await res.text()
      }
    } catch {
      this.logger.warn(`Không đọc được README cho ${dto.owner}/${dto.repo}`)
    }

    if (!readmeContent) {
      throw new BadRequestException('Không tìm thấy file README.md công khai trong dự án này.')
    }

    // 2. Lấy API Key
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new InternalServerErrorException('Chưa cấu hình GEMINI_API_KEY trong file .env.')
    }

    const prompt = `
  Đọc file README sau và trích xuất danh sách công nghệ/thư viện chính đã được sử dụng.
  README: ${readmeContent.substring(0, 3500)}

  TRẢ VỀ ĐỊNH DẠNG JSON ARRAY TÊN CÁC CÔNG NGHỆ:
  ["NestJS", "Prisma", "PostgreSQL", "Docker"]
  `

    // 3. Gọi Gemini API (Sử dụng model gemini-3.6-flash)
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        },
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Gemini API Error: ${JSON.stringify(errorData)}`)
      }

      const data = await response.json()
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text

      if (!responseText) {
        throw new Error('AI không phản hồi nội dung.')
      }

      const techStackArray = JSON.parse(responseText) as string[]

      // 4. Lưu vào Database
      await this.prisma.githubRepository.update({
        where: {
          githubProfileId_repoName: {
            githubProfileId: profile.id,
            repoName: dto.repo,
          },
        },
        data: { techStack: techStackArray },
      })

      return {
        repoName: dto.repo,
        extractedTechStack: techStackArray,
      }
    } catch (err) {
      this.logger.error('Lỗi Gemini API:', err)
      throw new InternalServerErrorException((err as Error).message)
    }
  }
}
