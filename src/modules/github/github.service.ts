/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import { SyncGithubDto } from './dto/github.dto'
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

  constructor(private readonly prisma: PrismaService) {}

  // 1. Hàm trợ giúp: Đọc README và gọi AI phân tích Tech Stack cho 1 Repo
  private async extractTechStackFromRepo(owner: string, repo: string): Promise<string[]> {
    let readmeContent = ''
    try {
      let res = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`)
      if (!res.ok) {
        res = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/master/README.md`)
      }
      if (res.ok) {
        readmeContent = await res.text()
      }
    } catch {
      this.logger.warn(`Không đọc được README cho ${owner}/${repo}`)
    }

    // Nếu không có README, trả về mảng rỗng
    if (!readmeContent.trim()) return []

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return []

    const prompt = `
    Đọc file README sau và trích xuất danh sách công nghệ/thư viện chính đã được sử dụng.
    README: ${readmeContent.substring(0, 3000)}

    TRẢ VỀ ĐỊNH DẠNG JSON ARRAY TÊN CÁC CÔNG NGHỆ (Ví dụ: ["NestJS", "Prisma", "Docker"]):
    `

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

      if (!response.ok) return []

      const data = await response.json()
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text
      return responseText ? (JSON.parse(responseText) as string[]) : []
    } catch (err) {
      this.logger.error(`Lỗi AI đọc README của ${repo}:`, err)
      return []
    }
  }

  // 2. API Tự động hóa toàn bộ: Sync Repos + Phân tích AI cho tất cả
  async syncAndAnalyzeRepositories(userId: string, dto: SyncGithubDto) {
    // A. Kiểm tra profile hiện tại
    let profile = await this.prisma.githubProfile.findUnique({
      where: { userId },
    })

    const isUsernameChanged = profile && profile.githubUsername !== dto.username

    // B. Fetch Repos từ GitHub API (Lấy 10 repos mới nhất)
    let repos: GithubRepoResponse[] = []
    try {
      const res = await fetch(`https://api.github.com/users/${dto.username}/repos?sort=updated&per_page=10`, {
        headers: { 'User-Agent': 'EduMap-App' },
      })

      if (!res.ok) {
        throw new BadRequestException(`Không tìm thấy username GitHub: ${dto.username}`)
      }

      repos = (await res.json()) as GithubRepoResponse[]
    } catch (err) {
      if (err instanceof BadRequestException) throw err
      throw new InternalServerErrorException('Không thể kết nối API GitHub.')
    }

    // C. Xóa repos cũ nếu đổi sang Username khác
    if (isUsernameChanged && profile) {
      await this.prisma.githubRepository.deleteMany({
        where: { githubProfileId: profile.id },
      })
    }

    // D. Tạo/Cập nhật Profile & User
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

    await this.prisma.user.update({
      where: { id: userId },
      data: { githubUsername: dto.username },
    })

    // E. TỰ ĐỘNG HÓA: Song song cào README + Gọi AI phân tích từng Repo
    const processedRepos = await Promise.all(
      repos.map(async (repo) => {
        const extractedTechStack = await this.extractTechStackFromRepo(dto.username, repo.name)

        // Lưu vào DB
        const savedRepo = await this.prisma.githubRepository.upsert({
          where: {
            githubProfileId_repoName: {
              githubProfileId: profile.id,
              repoName: repo.name,
            },
          },
          update: {
            repoUrl: repo.html_url,
            mainLanguage: repo.language,
            techStack: extractedTechStack,
          },
          create: {
            githubProfileId: profile.id,
            repoName: repo.name,
            repoUrl: repo.html_url,
            mainLanguage: repo.language,
            techStack: extractedTechStack,
          },
        })

        return savedRepo
      }),
    )

    // F. Tổng hợp tất cả Tech-Stack thu thập được từ tất cả các Repos
    const allExtractedTechs = Array.from(new Set(processedRepos.flatMap((r) => r.techStack || [])))

    return {
      message: 'Đồng bộ và phân tích toàn bộ dự án GitHub thành công!',
      githubUsername: dto.username,
      totalReposSynced: processedRepos.length,
      aggregatedTechStack: allExtractedTechs, // Trả về danh sách kỹ năng tổng hợp
      repositories: processedRepos,
    }
  }
}
