import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import * as requestWithUserInterface from '../auth/interfaces/request-with-user.interface'
import { CreateSkillTreeDto } from './dto/create-skill-tree.dto'
import { CreateTreeNodeDto } from './dto/create-tree-node.dto'
import { UpdateSkillTreeDto } from './dto/update-skill-tree.dto'
import { UpdateTreeNodeDto } from './dto/update-tree-node.dto'
import { SkillTreeWithNodes, TreeProgressResponse } from './interfaces/tree-progress.interface'
import { SkillTreesService } from './skill-trees.service'

@ApiTags('Skill Trees')
@Controller('skill-trees')
export class SkillTreesController {
  constructor(private readonly skillTreesService: SkillTreesService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả Cây Kỹ Năng' })
  async getAllTrees(): Promise<SkillTreeWithNodes[]> {
    return this.skillTreesService.getAllTrees()
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết 1 Cây Kỹ Năng theo ID' })
  async getTreeById(@Param('id') id: string): Promise<SkillTreeWithNodes> {
    return this.skillTreesService.getTreeById(id)
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Tạo Cây Kỹ Năng mới' })
  async createTree(@Body() dto: CreateSkillTreeDto) {
    return this.skillTreesService.createTree(dto)
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Cập nhật Cây Kỹ Năng' })
  async updateTree(@Param('id') id: string, @Body() dto: UpdateSkillTreeDto) {
    return this.skillTreesService.updateTree(id, dto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Xóa Cây Kỹ Năng' })
  async deleteTree(@Param('id') id: string) {
    return this.skillTreesService.deleteTree(id)
  }

  @Post(':treeId/nodes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Thêm Node kỹ năng vào Cây' })
  async addNodeToTree(@Param('treeId') treeId: string, @Body() dto: CreateTreeNodeDto) {
    return this.skillTreesService.addNodeToTree(treeId, dto)
  }

  @Patch('nodes/:nodeId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Cập nhật thông tin Node' })
  async updateNode(@Param('nodeId') nodeId: string, @Body() dto: UpdateTreeNodeDto) {
    return this.skillTreesService.updateNode(nodeId, dto)
  }

  @Delete('nodes/:nodeId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Xóa Node ra khỏi Cây' })
  async deleteNode(@Param('nodeId') nodeId: string) {
    return this.skillTreesService.deleteNode(nodeId)
  }

  @Get(':treeId/my-progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[STUDENT] Xem tiến độ hoàn thành Cây Kỹ Năng của tôi' })
  async getTreeProgress(
    @Param('treeId') treeId: string,
    @Request() req: requestWithUserInterface.RequestWithUser,
  ): Promise<TreeProgressResponse> {
    return this.skillTreesService.getTreeProgress(treeId, req.user.id)
  }

  @Post(':treeId/nodes/:nodeId/toggle')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[STUDENT] Đánh dấu / Bỏ đánh dấu hoàn thành Node' })
  async toggleNodeCompletion(
    @Param('treeId') treeId: string,
    @Param('nodeId') nodeId: string,
    @Request() req: requestWithUserInterface.RequestWithUser,
  ) {
    return this.skillTreesService.toggleNodeCompletion(req.user.id, treeId, nodeId)
  }
}
