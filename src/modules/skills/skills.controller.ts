import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'
import { SkillsService } from './skills.service'
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard'
import { RolesGuard } from 'src/modules/auth/guards/roles.guard'
import { Roles } from 'src/modules/auth/decorators/roles.decorator'
import { CreateSkillDto } from './dto/create-skill.dto'
import { AddUserSkillDto } from './dto/add-user-skill.dto'
import { UpdateSkillDto } from './dto/update-skill.dto'
import * as authController from '../auth/auth.controller'
import { UpdateUserSkillDto } from './dto/update-user-skill.dto'

@ApiTags('Skills')
@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh mục tất cả kỹ năng trong hệ thống (Công khai)' })
  @ApiQuery({ name: 'category', required: false, example: 'Backend' })
  getAllSkills(@Query('category') category?: string) {
    return this.skillsService.getAllSkills(category)
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Tạo kỹ năng mới vào hệ thống Master Data' })
  createSkill(@Body() dto: CreateSkillDto) {
    return this.skillsService.createSkill(dto)
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Cập nhật thông tin kỹ năng' })
  updateSkill(@Param('id') id: string, @Body() dto: UpdateSkillDto) {
    return this.skillsService.updateSkill(id, dto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Xóa kỹ năng khỏi hệ thống' })
  deleteSkill(@Param('id') id: string) {
    return this.skillsService.deleteSkill(id)
  }

  @Patch('my-skills/:skillId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[STUDENT] Cập nhật trình độ hoặc số giờ học của kỹ năng cá nhân' })
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
  @ApiOperation({ summary: '[STUDENT] Xóa một kỹ năng khỏi hồ sơ cá nhân' })
  deleteUserSkill(@Request() req: authController.RequestWithUser, @Param('skillId') skillId: string) {
    return this.skillsService.deleteUserSkill(req.user.id, skillId)
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
  @ApiOperation({ summary: '[STUDENT] Khai báo hoặc cập nhật trình độ kỹ năng cá nhân' })
  addUserSkill(@Request() req: authController.RequestWithUser, @Body() dto: AddUserSkillDto) {
    return this.skillsService.addUserSkill(req.user.id, dto)
  }
}
