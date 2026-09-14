import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'
import { SkillsService } from './skills.service'
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard'
import { RolesGuard } from 'src/modules/auth/guards/roles.guard'
import { Roles } from 'src/modules/auth/decorators/roles.decorator'
import { CreateSkillDto } from './create-skill.dto'
import { AddUserSkillDto } from './add-user-skill.dto'
import * as requestWithUserInterface from 'src/modules/auth/interfaces/request-with-user.interface'

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

  @Get('my-skills')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[STUDENT] Lấy danh sách kỹ năng cá nhân' })
  getUserSkills(@Request() req: requestWithUserInterface.RequestWithUser) {
    return this.skillsService.getUserSkills(req.user.id)
  }

  @Post('my-skills')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[STUDENT] Khai báo hoặc cập nhật trình độ kỹ năng cá nhân' })
  addUserSkill(@Request() req: requestWithUserInterface.RequestWithUser, @Body() dto: AddUserSkillDto) {
    return this.skillsService.addUserSkill(req.user.id, dto)
  }
}
