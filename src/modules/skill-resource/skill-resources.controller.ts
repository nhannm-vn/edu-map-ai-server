import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common'
import { SkillResourcesService } from './skill-resources.service'
import { CreateSkillResourceDto } from './dto/skill-resource.dto'
import { ApiTags, ApiOperation } from '@nestjs/swagger'

@ApiTags('Skill Resources')
@Controller('api/v1')
export class SkillResourcesController {
  constructor(private readonly skillResourcesService: SkillResourcesService) {}

  @Get('skills/:skillId/resources')
  @ApiOperation({ summary: 'Lấy tài nguyên học tập theo Skill ID (Tự động kết nối Third-Party API)' })
  async getResourcesBySkill(@Param('skillId') skillId: string) {
    return this.skillResourcesService.getResourcesBySkill(skillId)
  }

  @Post('skill-resources')
  @ApiOperation({ summary: '[ADMIN] Thêm tài nguyên/khóa học tuyển chọn thủ công' })
  async createResource(@Body() dto: CreateSkillResourceDto) {
    return this.skillResourcesService.createResource(dto)
  }

  @Delete('skill-resources/:id')
  @ApiOperation({ summary: '[ADMIN] Xóa tài nguyên học tập' })
  async deleteResource(@Param('id') id: string) {
    return this.skillResourcesService.deleteResource(id)
  }
}
