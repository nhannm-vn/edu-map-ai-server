/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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

  // ADMIN: Lấy danh sách tất cả người dùng
  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        subscriptionTier: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  // ADMIN: Cấp/hạ quyền người dùng
  async changeUserRole(targetUserId: string, role: string) {
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } })
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng này')
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { role: role as any },
      select: { id: true, email: true, role: true },
    })
  }
}
