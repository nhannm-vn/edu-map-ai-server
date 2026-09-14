import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from 'prisma/prisma.service'
import { ConnectGithubDto } from './dto/connect-github.dto'
import { ExtractReadmeDto } from './dto/extract-readme.dto'
import axios from 'axios'

@Injectable()
export class GithubService {
  constructor(private prisma: PrismaService) {}

  async connectAccount(userId: string, dto: ConnectGithubDto) {
    return await this.prisma.$transaction(async (tx) => {
      const existingProfile = await tx.githubProfile.findUnique({
        where: { userId },
      })

      // Nếu đã có profile và đổi sang username khác -> xóa sạch repo rác của username cũ
      if (existingProfile && existingProfile.githubUsername !== dto.githubUsername) {
        await tx.githubRepository.deleteMany({
          where: { githubProfileId: existingProfile.id },
        })
      }

      const profileUrl = `https://github.com/${dto.githubUsername}`
      return tx.githubProfile.upsert({
        where: { userId },
        update: {
          githubUsername: dto.githubUsername,
          accessToken: dto.accessToken || null,
          profileUrl,
        },
        create: {
          userId,
          githubUsername: dto.githubUsername,
          accessToken: dto.accessToken || null,
          profileUrl,
        },
      })
    })
  }

  async syncRepos(userId: string) {
    const profile = await this.prisma.githubProfile.findUnique({
      where: { userId },
    })
    if (!profile) {
      throw new NotFoundException('Chưa liên kết tài khoản GitHub!')
    }

    const { data: repos } = await axios.get(
      `https://api.github.com/users/${profile.githubUsername}/repos?per_page=100`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'EduMap-AI',
          ...(profile.accessToken ? { Authorization: `token ${profile.accessToken}` } : {}),
        },
      },
    )

    return await this.prisma.$transaction(async (tx) => {
      await tx.githubRepository.deleteMany({
        where: { githubProfileId: profile.id },
      })

      const payload = repos.map((r: any) => ({
        githubProfileId: profile.id,
        repoName: r.name,
        repoUrl: r.html_url,
        mainLanguage: r.language || null,
      }))

      if (payload.length) {
        await tx.githubRepository.createMany({ data: payload })
      }

      return tx.githubProfile.update({
        where: { id: profile.id },
        data: { lastSyncedAt: new Date() },
      })
    })
  }

  async extractReadme(userId: string, dto: ExtractReadmeDto) {
    const repo = await this.prisma.githubRepository.findUnique({
      where: { id: dto.repoId },
      include: { githubProfile: true },
    })

    if (!repo || repo.githubProfile.userId !== userId) {
      throw new NotFoundException('Repository không tồn tại hoặc không thuộc quyền sở hữu')
    }

    const { githubUsername } = repo.githubProfile
    const ownerRepo = `${githubUsername}/${repo.repoName}`

    let readmeText = ''
    try {
      const { data: readmeRes } = await axios.get(`https://api.github.com/repos/${ownerRepo}/readme`, {
        headers: { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'EduMap-AI' },
      })
      if (readmeRes.content && readmeRes.encoding === 'base64') {
        readmeText = Buffer.from(readmeRes.content, 'base64').toString('utf-8')
      }
    } catch {
      readmeText = 'No README.md found.'
    }

    const extractedResult = {
      projectGoal: 'AI summarized project objective...',
      techStack: [repo.mainLanguage, 'TypeScript', 'NestJS'].filter(Boolean),
      rawLength: readmeText.length,
    }

    return this.prisma.githubRepository.update({
      where: { id: repo.id },
      data: {
        extractedSkills: extractedResult,
      },
    })
  }
}
