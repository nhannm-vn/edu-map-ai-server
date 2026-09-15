import { Injectable, NotFoundException } from '@nestjs/common'
import { SkillTree, SkillTreeNode } from '@prisma/client'
import { CreateSkillTreeDto } from './dto/create-skill-tree.dto'
import { CreateTreeNodeDto } from './dto/create-tree-node.dto'
import { UpdateSkillTreeDto } from './dto/update-skill-tree.dto'
import { UpdateTreeNodeDto } from './dto/update-tree-node.dto'
import { SkillTreeWithNodes, TreeProgressResponse } from './interfaces/tree-progress.interface'
import { PrismaService } from 'prisma/prisma.service'

@Injectable()
export class SkillTreesService {
  constructor(private readonly prisma: PrismaService) {}

  // Lấy danh sách tất cả Cây Kỹ Năng
  async getAllTrees(): Promise<SkillTreeWithNodes[]> {
    return this.prisma.skillTree.findMany({
      include: {
        nodes: {
          include: { skill: true },
          orderBy: { priorityRank: 'asc' },
        },
      },
    })
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

    return tree
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
      nodes: tree.nodes,
    }
  }

  // [STUDENT] Toggle Bật / Tắt Hoàn Thành Node & Tự Động Cập Nhật Tiến Độ Cây
  async toggleNodeCompletion(userId: string, treeId: string, nodeId: string): Promise<SkillTreeNode> {
    const tree = await this.prisma.skillTree.findFirst({
      where: { id: treeId, userId },
    })

    if (!tree) {
      throw new NotFoundException('Cây kỹ năng không thuộc về người dùng này')
    }

    const node = await this.prisma.skillTreeNode.findFirst({
      where: { id: nodeId, skillTreeId: treeId },
    })

    if (!node) {
      throw new NotFoundException('Node không tồn tại trong cây kỹ năng này')
    }

    const nextCompletedState = !node.isCompleted
    const updatedNode = await this.prisma.skillTreeNode.update({
      where: { id: nodeId },
      data: {
        isCompleted: nextCompletedState,
        completedAt: nextCompletedState ? new Date() : null,
      },
      include: { skill: true },
    })

    const allNodes = await this.prisma.skillTreeNode.findMany({
      where: { skillTreeId: treeId, isVisible: true },
    })

    const totalNodes = allNodes.length
    const completedNodes = allNodes.filter((n) => n.isCompleted).length
    const newCompletionPercentage = totalNodes > 0 ? (completedNodes / totalNodes) * 100 : 0

    await this.prisma.skillTree.update({
      where: { id: treeId },
      data: {
        completionPercentage: newCompletionPercentage,
        lastAnalyzedAt: new Date(),
      },
    })

    return updatedNode
  }
}
