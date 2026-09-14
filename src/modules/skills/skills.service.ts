import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from 'prisma/prisma.service'
import { CreateSkillDto } from './dto/create-skill.dto'
import { AddUserSkillDto } from './dto/add-user-skill.dto'
import { UpdateSkillDto } from './dto/update-skill.dto'
import { UpdateUserSkillDto } from './dto/update-user-skill.dto'
import { SkillQueryDto } from './dto/skill-query.dto'
import { Prisma } from '@prisma/client'
import { UserSkillsSummaryResponse } from './interfaces/skill-summary.interface'

@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}

  // Lấy tất cả kỹ năng trong Master Data (cho phép lọc theo category)
  async getAllSkills(category?: string) {
    return this.prisma.skill.findMany({
      where: category ? { category: { equals: category, mode: 'insensitive' } } : {},
      orderBy: { demandScore: 'desc' },
    })
  }

  // Admin thêm mới 1 kỹ năng vào hệ thống
  async createSkill(dto: CreateSkillDto) {
    const existing = await this.prisma.skill.findUnique({
      where: { name: dto.name },
    })
    if (existing) {
      throw new ConflictException('Kỹ năng này đã tồn tại trên hệ thống')
    }
    return this.prisma.skill.create({ data: dto })
  }

  // Lấy danh sách kỹ năng sinh viên đang có
  async getUserSkills(userId: string) {
    return this.prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
      orderBy: { proficiencyLevel: 'desc' },
    })
  }

  // Sinh viên tự cập nhật trình độ / số giờ học
  async addUserSkill(userId: string, dto: AddUserSkillDto) {
    const skillExists = await this.prisma.skill.findUnique({
      where: { id: dto.skillId },
    })
    if (!skillExists) {
      throw new NotFoundException('Kỹ năng không tồn tại trong hệ thống')
    }

    return this.prisma.userSkill.upsert({
      where: {
        userId_skillId: { userId, skillId: dto.skillId },
      },
      update: {
        proficiencyLevel: dto.proficiencyLevel,
        hoursSpent: dto.hoursSpent,
      },
      create: {
        userId,
        skillId: dto.skillId,
        proficiencyLevel: dto.proficiencyLevel ?? 1,
        hoursSpent: dto.hoursSpent ?? 0,
      },
      include: { skill: true },
    })
  }

  // STUDENT: Cập nhật trình độ/giờ học của kỹ năng cá nhân
  async updateUserSkill(userId: string, skillId: string, dto: UpdateUserSkillDto) {
    const userSkill = await this.prisma.userSkill.findUnique({
      where: {
        userId_skillId: { userId, skillId },
      },
    })

    if (!userSkill) {
      throw new NotFoundException('Bạn chưa khai báo kỹ năng này')
    }

    return this.prisma.userSkill.update({
      where: {
        userId_skillId: { userId, skillId },
      },
      data: dto,
      include: { skill: true },
    })
  }

  // STUDENT: Xóa kỹ năng khỏi hồ sơ cá nhân
  async deleteUserSkill(userId: string, skillId: string) {
    const userSkill = await this.prisma.userSkill.findUnique({
      where: {
        userId_skillId: { userId, skillId },
      },
    })

    if (!userSkill) {
      throw new NotFoundException('Không tìm thấy kỹ năng này trong hồ sơ của bạn')
    }

    return this.prisma.userSkill.delete({
      where: {
        userId_skillId: { userId, skillId },
      },
    })
  }

  // ADMIN: Cập nhật thông tin kỹ năng
  async updateSkill(id: string, dto: UpdateSkillDto) {
    const skill = await this.prisma.skill.findUnique({ where: { id } })
    if (!skill) {
      throw new NotFoundException('Không tìm thấy kỹ năng này')
    }

    return this.prisma.skill.update({
      where: { id },
      data: dto,
    })
  }

  // ADMIN: Xóa kỹ năng
  async deleteSkill(id: string) {
    const skill = await this.prisma.skill.findUnique({ where: { id } })
    if (!skill) {
      throw new NotFoundException('Không tìm thấy kỹ năng này')
    }

    return this.prisma.skill.delete({
      where: { id },
    })
  }

  // SEARCH

  async searchSkills(query: SkillQueryDto) {
    const page = query.page ?? 1
    const limit = query.limit ?? 10
    const skip = (page - 1) * limit

    // Sử dụng Prisma.SkillWhereInput thay vì any
    const where: Prisma.SkillWhereInput = {}

    if (query.category) {
      where.category = { equals: query.category, mode: 'insensitive' }
    }

    if (query.q) {
      where.name = { contains: query.q, mode: 'insensitive' }
    }

    const [data, total] = await Promise.all([
      this.prisma.skill.findMany({
        where,
        skip,
        take: limit,
        orderBy: { demandScore: 'desc' },
      }),
      this.prisma.skill.count({ where }),
    ])

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  // STUDENT: Lấy tổng quan kỹ năng của sinh viên
  async getUserSkillsSummary(userId: string): Promise<UserSkillsSummaryResponse> {
    const userSkills = await this.prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
    })

    const totalSkills = userSkills.length
    const totalHours = userSkills.reduce((sum, item) => sum + item.hoursSpent, 0)

    // Sort an toàn trên bản sao mảng
    const topSkills = [...userSkills].sort((a, b) => b.proficiencyLevel - a.proficiencyLevel).slice(0, 3)

    // Type-safe accumulator cho reduce
    const categoryStats = userSkills.reduce<Record<string, number>>((acc, item) => {
      const category = item.skill.category
      acc[category] = (acc[category] ?? 0) + 1
      return acc
    }, {})

    return {
      totalSkills,
      totalHours,
      topSkills,
      categoryStats,
    }
  }
}
