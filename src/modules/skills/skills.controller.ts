import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { SkillsService } from './skills.service'
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard'
import { RolesGuard } from 'src/modules/auth/guards/roles.guard'
import { Roles } from 'src/modules/auth/decorators/roles.decorator'
import { CreateSkillDto } from './dto/create-skill.dto'
import { AddUserSkillDto } from './dto/add-user-skill.dto'
import { UpdateSkillDto } from './dto/update-skill.dto'
import * as authController from '../auth/auth.controller'
import { UpdateUserSkillDto } from './dto/update-user-skill.dto'
import { SkillQueryDto } from './dto/skill-query.dto'

@ApiTags('Skills')
@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}
  @Get('search')
  @ApiOperation({ summary: 'Tìm kiếm & Phân trang danh mục kỹ năng' })
  searchSkills(@Query() query: SkillQueryDto) {
    return this.skillsService.searchSkills(query)
  }

  @Get('my-skills/summary')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[STUDENT] Thống kê tổng quan hồ sơ kỹ năng cá nhân' })
  getUserSkillsSummary(@Request() req: authController.RequestWithUser) {
    return this.skillsService.getUserSkillsSummary(req.user.id)
  }

  @Get('my-skills')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[STUDENT] Lấy danh sách kỹ năng cá nhân' })
  getUserSkills(@Request() req: authController.RequestWithUser) {
    return this.skillsService.getUserSkills(req.user.id)
  }

  @Post('my-skills')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[STUDENT] Khai báo kỹ năng cá nhân' })
  addUserSkill(@Request() req: authController.RequestWithUser, @Body() dto: AddUserSkillDto) {
    return this.skillsService.addUserSkill(req.user.id, dto)
  }

  @Patch('my-skills/:skillId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[STUDENT] Cập nhật trình độ/giờ học kỹ năng cá nhân' })
  updateUserSkill(
    @Request() req: authController.RequestWithUser,
    @Param('skillId') skillId: string,
    @Body() dto: UpdateUserSkillDto,
  ) {
    return this.skillsService.updateUserSkill(req.user.id, skillId, dto)
  }

  @Delete('my-skills/:skillId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[STUDENT] Xóa kỹ năng khỏi hồ sơ cá nhân' })
  deleteUserSkill(@Request() req: authController.RequestWithUser, @Param('skillId') skillId: string) {
    return this.skillsService.deleteUserSkill(req.user.id, skillId)
  }

  @Get()
  @ApiOperation({ summary: 'Lấy tất cả kỹ năng (Công khai)' })
  getAllSkills(@Query('category') category?: string) {
    return this.skillsService.getAllSkills(category)
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Tạo kỹ năng mới' })
  createSkill(@Body() dto: CreateSkillDto) {
    return this.skillsService.createSkill(dto)
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Cập nhật kỹ năng' })
  updateSkill(@Param('id') id: string, @Body() dto: UpdateSkillDto) {
    return this.skillsService.updateSkill(id, dto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Xóa kỹ năng' })
  deleteSkill(@Param('id') id: string) {
    return this.skillsService.deleteSkill(id)
  }
}
