/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, NotFoundException } from '@nestjs/common'
import { SkillTree, SkillTreeNode } from '@prisma/client'
import { CreateSkillTreeDto } from './dto/create-skill-tree.dto'
import { CreateTreeNodeDto } from './dto/create-tree-node.dto'
import { UpdateSkillTreeDto } from './dto/update-skill-tree.dto'
import { UpdateTreeNodeDto } from './dto/update-tree-node.dto'
import { SkillTreeWithNodes, TreeProgressResponse } from './interfaces/tree-progress.interface'
import { PrismaService } from 'prisma/prisma.service'
import { ResetMyTreeDto } from './dto/reset-my-tree.dto'

@Injectable()
export class SkillTreesService {
  constructor(private readonly prisma: PrismaService) {}

  private nestNodes<T extends { id: string; parentNodeId: string | null }>(nodes: T[]) {
    const byId = new Map(nodes.map((node) => [node.id, { ...node, children: [] as T[] }]))
    const roots: Array<T & { children: T[] }> = []

    for (const node of byId.values()) {
      if (node.parentNodeId && byId.has(node.parentNodeId)) {
        byId.get(node.parentNodeId)?.children.push(node)
      } else {
        roots.push(node)
      }
    }

    return roots
  }

  /**
   * [STUDENT] Lấy Cây Kỹ Năng cá nhân của User đang đăng nhập
   */
  async getMyTree(userId: string): Promise<TreeProgressResponse> {
    // 1. Lấy thông tin cây kỹ năng kèm danh sách nodes và skill liên kết
    const tree = await this.prisma.skillTree.findUnique({
      where: { userId },
      include: {
        nodes: {
          where: { isVisible: true },
          include: {
            skill: true, // Lấy toàn bộ thông tin của Skill (tránh lỗi chọn sai field description)
          },
          orderBy: { priorityRank: 'asc' },
        },
      },
    })

    if (!tree) {
      throw new NotFoundException('Bạn chưa có cây kỹ năng nào. Hãy tạo lộ trình mới!')
    }

    // 2. Tính toán tiến độ
    const totalNodes = tree.nodes.length
    const completedCount = tree.nodes.filter((node) => node.isCompleted).length
    const completionPercentage = totalNodes > 0 ? Math.round((completedCount / totalNodes) * 100) : 0

    return {
      treeId: tree.id,
      careerPath: tree.careerPath,
      completionPercentage,
      completedCount,
      totalNodes,
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      nodes: this.nestNodes(tree.nodes) as any,
    }
  }

  /**
   * [STUDENT] Reset/Xóa cây cũ để tạo cây mới
   */
  async resetMyTree(userId: string, dto: ResetMyTreeDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Kiểm tra cây cũ
      const existingTree = await tx.skillTree.findUnique({
        where: { userId },
      })

      // 2. Nếu có cây cũ thì xóa
      if (existingTree) {
        await tx.skillTree.delete({
          where: { userId },
        })
      }

      // 3. Tạo cây mới
      const newTree = await tx.skillTree.create({
        data: {
          userId,
          careerPath: dto.careerPath,
          completionPercentage: 0,
          lastAnalyzedAt: new Date(),
        },
      })

      return {
        message: 'Đặt lại lộ trình thành công. Đang chờ AI phân tích các mốc kỹ năng mới!',
        tree: newTree,
      }
    })
  }

  // Lấy danh sách tất cả Cây Kỹ Năng
  async getAllTrees(): Promise<SkillTreeWithNodes[]> {
    const trees = await this.prisma.skillTree.findMany({
      include: {
        nodes: {
          include: { skill: true },
          orderBy: { priorityRank: 'asc' },
        },
      },
    })
    return trees.map((tree) => ({ ...tree, nodes: this.nestNodes(tree.nodes) as any }))
  }

  // Lấy chi tiết 1 Cây Kỹ Năng theo ID
  async getTreeById(id: string): Promise<SkillTreeWithNodes> {
    const tree = await this.prisma.skillTree.findUnique({
      where: { id },
      include: {
        nodes: {
          include: { skill: true },
          orderBy: { priorityRank: 'asc' },
        },
      },
    })

    if (!tree) {
      throw new NotFoundException('Cây kỹ năng không tồn tại')
    }

    return { ...tree, nodes: this.nestNodes(tree.nodes) }
  }

  // [ADMIN/SYSTEM] Tạo mới Cây Kỹ Năng
  async createTree(dto: CreateSkillTreeDto): Promise<SkillTree> {
    return this.prisma.skillTree.create({
      data: dto,
    })
  }

  // [ADMIN/SYSTEM] Cập nhật Cây Kỹ Năng
  async updateTree(id: string, dto: UpdateSkillTreeDto): Promise<SkillTree> {
    await this.getTreeById(id)
    return this.prisma.skillTree.update({
      where: { id },
      data: dto,
    })
  }

  // [ADMIN/SYSTEM] Xóa Cây Kỹ Năng
  async deleteTree(id: string): Promise<SkillTree> {
    await this.getTreeById(id)
    return this.prisma.skillTree.delete({
      where: { id },
    })
  }

  // [ADMIN/SYSTEM] Thêm Node kỹ năng vào Cây
  async addNodeToTree(skillTreeId: string, dto: CreateTreeNodeDto): Promise<SkillTreeNode> {
    await this.getTreeById(skillTreeId)

    const skill = await this.prisma.skill.findUnique({
      where: { id: dto.skillId },
    })
    if (!skill) {
      throw new NotFoundException('Kỹ năng không tồn tại trong hệ thống')
    }

    return this.prisma.skillTreeNode.create({
      data: {
        skillTreeId,
        skillId: dto.skillId,
        parentNodeId: dto.parentNodeId,
        nodeLevel: dto.nodeLevel,
        priorityRank: dto.priorityRank,
      },
      include: { skill: true },
    })
  }

  // [ADMIN/SYSTEM] Cập nhật Node trong Cây
  async updateNode(nodeId: string, dto: UpdateTreeNodeDto): Promise<SkillTreeNode> {
    const node = await this.prisma.skillTreeNode.findUnique({
      where: { id: nodeId },
    })
    if (!node) {
      throw new NotFoundException('Node kỹ năng không tồn tại')
    }

    return this.prisma.skillTreeNode.update({
      where: { id: nodeId },
      data: dto,
      include: { skill: true },
    })
  }

  // [ADMIN/SYSTEM] Xóa Node khỏi Cây
  async deleteNode(nodeId: string): Promise<SkillTreeNode> {
    const node = await this.prisma.skillTreeNode.findUnique({
      where: { id: nodeId },
    })
    if (!node) {
      throw new NotFoundException('Node kỹ năng không tồn tại')
    }

    return this.prisma.skillTreeNode.delete({
      where: { id: nodeId },
    })
  }

  // [STUDENT] Xem Cây Kỹ Năng kèm Tiến Độ (%)
  async getTreeProgress(treeId: string, userId: string): Promise<TreeProgressResponse> {
    const tree = await this.prisma.skillTree.findFirst({
      where: { id: treeId, userId },
      include: {
        nodes: {
          where: { isVisible: true },
          include: { skill: true },
          orderBy: { priorityRank: 'asc' },
        },
      },
    })

    if (!tree) {
      throw new NotFoundException('Cây kỹ năng không tồn tại hoặc không thuộc về người dùng này')
    }

    const totalNodes = tree.nodes.length
    const completedCount = tree.nodes.filter((node) => node.isCompleted).length
    const progressPercent = totalNodes > 0 ? Math.round((completedCount / totalNodes) * 100) : 0

    return {
      treeId: tree.id,
      careerPath: tree.careerPath,
      completionPercentage: progressPercent,
      completedCount,
      totalNodes,
      nodes: this.nestNodes(tree.nodes),
    }
  }

  /**
   * [STUDENT] Toggle trạng thái node kỹ năng
   * Đảm bảo tính toán % Cây và tự động sync sang bảng userSkills
   */
  async toggleNodeCompletion(userId: string, treeId: string, nodeId: string) {
    // 1. Kiểm tra Cây Kỹ Năng có thuộc về User không
    const tree = await this.prisma.skillTree.findFirst({
      where: { id: treeId, userId },
    })

    if (!tree) {
      throw new NotFoundException('Cây kỹ năng không thuộc về người dùng này')
    }

    // 2. Kiểm tra Node có tồn tại trong Cây này không
    const node = await this.prisma.skillTreeNode.findFirst({
      where: { id: nodeId, skillTreeId: treeId },
    })

    if (!node) {
      throw new NotFoundException('Node không tồn tại trong cây kỹ năng này')
    }

    const nextCompletedState = !node.isCompleted

    // 3. Thực thi Transaction theo chuẩn dữ liệu của Schema
    return await this.prisma.$transaction(async (tx) => {
      // A. Cập nhật trạng thái Node trong skillTreeNodes
      const updatedNode = await tx.skillTreeNode.update({
        where: { id: nodeId },
        data: {
          isCompleted: nextCompletedState,
          completedAt: nextCompletedState ? new Date() : null,
        },
        include: { skill: true },
      })

      // B. Đồng bộ tự động sang bảng userSkills khi Hoàn thành (isCompleted = true)
      if (nextCompletedState) {
        await tx.userSkill.upsert({
          where: {
            userId_skillId: {
              userId,
              skillId: node.skillId,
            },
          },
          update: {
            // Trường hợp đã có skill này trong Hồ sơ, có thể giữ nguyên hoặc tăng nhẹ hoursSpent
            hoursSpent: { increment: 5 },
          },
          create: {
            userId,
            skillId: node.skillId,
            proficiencyLevel: 1, // Dạng int (default: 1 theo schema)
            hoursSpent: 5, // Dạng int
            verifiedByGithub: false,
          },
        })
      }

      // C. Lấy danh sách các Node có isVisible = true để tính lại % Tiến độ
      const allVisibleNodes = await tx.skillTreeNode.findMany({
        where: { skillTreeId: treeId, isVisible: true },
      })

      const totalNodes = allVisibleNodes.length
      const completedNodes = allVisibleNodes.filter((n) => n.isCompleted).length

      // Kiểu dữ liệu Float trong schema
      const newCompletionPercentage = totalNodes > 0 ? Number(((completedNodes / totalNodes) * 100).toFixed(2)) : 0

      // D. Cập nhật % completionPercentage và thời gian lastAnalyzedAt cho skillTrees
      await tx.skillTree.update({
        where: { id: treeId },
        data: {
          completionPercentage: newCompletionPercentage,
          lastAnalyzedAt: new Date(),
        },
      })

      return updatedNode
    })
  }
}
