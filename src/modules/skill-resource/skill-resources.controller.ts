import { Controller, Get, Post, Delete, Param, Body, Patch, Query, UseGuards } from '@nestjs/common'
import { SkillResourcesService } from './skill-resources.service'
import { CreateSkillResourceDto } from './dto/skill-resource.dto'
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger'
import { UpdateSkillResourceDto } from './dto/update-skill-resource.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'

@ApiTags('Skill Resources')
@Controller('api/v1')
export class SkillResourcesController {
  constructor(private readonly skillResourcesService: SkillResourcesService) {}

  // --- PUBLIC ENDPOINTS (Sinh viên đọc dữ liệu công khai) ---

  @Get('skill-resources/top')
  @ApiOperation({ summary: 'Lấy danh sách khóa học/tài nguyên hàng đầu (Top Rated) toàn hệ thống' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng item cần lấy (Default: 10)' })
  async getTopResources(@Query('limit') limit?: number) {
    return this.skillResourcesService.getTopResources(limit)
  }

  @Get('skills/:skillId/resources')
  @ApiOperation({
    summary: 'Lấy tài nguyên học tập dạng danh sách phẳng theo Skill ID (Tự động kết nối Third-Party API)',
  })
  async getResourcesBySkill(@Param('skillId') skillId: string) {
    return this.skillResourcesService.getResourcesBySkill(skillId)
  }

  @Get('skills/:skillId/resources/grouped')
  @ApiOperation({ summary: 'Lấy tài nguyên học tập phân loại theo nhóm (Videos, Docs, Practices) cho UI Frontend' })
  async getResourcesBySkillGrouped(@Param('skillId') skillId: string) {
    return this.skillResourcesService.getResourcesBySkillGrouped(skillId)
  }

  @Get('skill-resources/:id')
  @ApiOperation({ summary: 'Lấy chi tiết thông tin một tài nguyên học tập' })
  async getResourceById(@Param('id') id: string) {
    return this.skillResourcesService.getResourceById(id)
  }

  // --- PROTECTED ENDPOINTS (Bắt buộc gửi accessToken + Quyền ADMIN) ---

  @Post('skill-resources')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '[ADMIN] Thêm tài nguyên/khóa học tuyển chọn thủ công' })
  async createResource(@Body() dto: CreateSkillResourceDto) {
    return this.skillResourcesService.createResource(dto)
  }

  @Patch('skill-resources/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '[ADMIN] Cập nhật thông tin tài nguyên học tập' })
  async updateResource(@Param('id') id: string, @Body() dto: UpdateSkillResourceDto) {
    return this.skillResourcesService.updateResource(id, dto)
  }

  @Delete('skill-resources/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '[ADMIN] Xóa tài nguyên học tập' })
  async deleteResource(@Param('id') id: string) {
    return this.skillResourcesService.deleteResource(id)
  }
}
