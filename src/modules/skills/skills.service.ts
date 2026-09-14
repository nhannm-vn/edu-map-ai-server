import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from 'prisma/prisma.service'
import { CreateSkillDto } from './dto/create-skill.dto'
import { AddUserSkillDto } from './dto/add-user-skill.dto'
import { UpdateSkillDto } from './dto/update-skill.dto'
import { UpdateUserSkillDto } from './dto/update-user-skill.dto'

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
}
