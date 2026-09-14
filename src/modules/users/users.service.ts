import { Injectable, NotFoundException } from '@nestjs/common'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { PrismaService } from 'prisma/prisma.service'

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        universityName: true,
        currentYear: true,
        githubUsername: true,
        role: true,
        subscriptionTier: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      throw new NotFoundException('Không tìm thấy thông tin người dùng')
    }

    return user
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { ...dto },
      select: {
        id: true,
        email: true,
        fullName: true,
        universityName: true,
        currentYear: true,
        githubUsername: true,
        role: true,
        subscriptionTier: true,
        updatedAt: true,
      },
    })
  }
}
