/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Patch,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common'
import { SkillResourcesService } from './skill-resources.service'
import { CreateSkillResourceDto } from './dto/skill-resource.dto'
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth, ApiBody, ApiParam, ApiResponse } from '@nestjs/swagger'
import { UpdateSkillResourceDto } from './dto/update-skill-resource.dto'
import { RecordHistoryDto } from './dto/record-history.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'

interface AuthenticatedRequest extends Request {
  user: {
    id: string
    [key: string]: any
  }
}

@ApiTags('Skill Resources')
@Controller('api/v1')
export class SkillResourcesController {
  constructor(private readonly skillResourcesService: SkillResourcesService) {}

  // --- PUBLIC ENDPOINTS ---

  @Get('skill-resources/top')
  @ApiOperation({
    summary: 'Lấy danh sách tài nguyên hàng đầu (Top Rated)',
    description: 'Trả về các tài nguyên/khóa học được đánh giá cao nhất trên hệ thống.',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng item (Mặc định: 10)', example: 10 })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công.' })
  async getTopResources(@Query('limit') limit?: number) {
    return this.skillResourcesService.getTopResources(limit)
  }

  @Get('skills/:skillId/resources')
  @ApiOperation({
    summary: 'Lấy tài nguyên theo Skill ID (Dạng phẳng)',
    description: 'Tự động cào dữ liệu từ YouTube, DevDocs, Dev.to nếu DB chưa có.',
  })
  @ApiParam({ name: 'skillId', description: 'UUID của kỹ năng', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Trả về mảng tài nguyên học tập.' })
  @ApiResponse({ status: 404, description: 'Kỹ năng không tồn tại.' })
  async getResourcesBySkill(@Param('skillId') skillId: string) {
    return this.skillResourcesService.getResourcesBySkill(skillId)
  }

  @Get('skills/:skillId/resources/grouped')
  @ApiOperation({
    summary: 'Lấy tài nguyên phân loại theo nhóm (UI Frontend)',
    description: 'Gom nhóm tài nguyên thành: videos, documentations, practices.',
  })
  @ApiParam({ name: 'skillId', description: 'UUID của kỹ năng', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Trả về object gồm summary và data phân nhóm.' })
  async getResourcesBySkillGrouped(@Param('skillId') skillId: string) {
    return this.skillResourcesService.getResourcesBySkillGrouped(skillId)
  }

  // --- STUDENT PROTECTED ENDPOINTS ---

  @Post('skill-resources/history')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '[STUDENT] Ghi nhận lượt xem tài nguyên học tập',
    description: 'Gửi request khi sinh viên nhấp vào xem 1 link bài học/tài nguyên.',
  })
  @ApiBody({
    type: RecordHistoryDto,
    description: 'Thông tin tài nguyên sinh viên đã click',
    examples: {
      default: {
        summary: 'Ví dụ Payload chuẩn',
        value: {
          skillResourceId: 'c4b8b6a1-9c12-4d2b-8a71-6c2a13890f11',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Ghi nhận lịch sử thành công.' })
  @ApiResponse({ status: 400, description: 'Thiếu skillResourceId hoặc định dạng UUID không đúng.' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực (Thiếu Bearer Token).' })
  async recordHistory(@Req() req: AuthenticatedRequest, @Body() dto: RecordHistoryDto) {
    if (!dto.skillResourceId) {
      throw new BadRequestException('skillResourceId is required')
    }
    return this.skillResourcesService.recordViewHistory(req.user.id, dto.skillResourceId)
  }

  @Get('skill-resources/history')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '[STUDENT] Lấy lịch sử tài nguyên đã xem',
    description: 'Trả về danh sách tài nguyên sinh viên đã từng nhấp xem, sắp xếp theo mới nhất.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng bản ghi (Mặc định: 20)',
    example: 20,
  })
  @ApiResponse({ status: 200, description: 'Lấy lịch sử xem thành công.' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực (Thiếu Bearer Token).' })
  async getHistory(@Req() req: AuthenticatedRequest, @Query('limit') limit?: number) {
    return this.skillResourcesService.getUserHistory(req.user.id, limit)
  }

  @Get('skill-resources/:id')
  @ApiOperation({ summary: 'Lấy chi tiết một tài nguyên học tập' })
  @ApiParam({ name: 'id', description: 'UUID của tài nguyên', example: 'c4b8b6a1-9c12-4d2b-8a71-6c2a13890f11' })
  @ApiResponse({ status: 200, description: 'Chi tiết tài nguyên.' })
  @ApiResponse({ status: 404, description: 'Tài nguyên không tồn tại.' })
  async getResourceById(@Param('id') id: string) {
    return this.skillResourcesService.getResourceById(id)
  }

  // --- ADMIN PROTECTED ENDPOINTS ---

  @Post('skill-resources')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '[ADMIN] Thêm tài nguyên thủ công' })
  @ApiBody({ type: CreateSkillResourceDto })
  @ApiResponse({ status: 201, description: 'Tạo tài nguyên thành công.' })
  @ApiResponse({ status: 403, description: 'Không có quyền ADMIN.' })
  async createResource(@Body() dto: CreateSkillResourceDto) {
    return this.skillResourcesService.createResource(dto)
  }

  @Patch('skill-resources/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '[ADMIN] Cập nhật tài nguyên học tập' })
  @ApiParam({ name: 'id', description: 'UUID của tài nguyên cần sửa' })
  @ApiBody({ type: UpdateSkillResourceDto })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công.' })
  async updateResource(@Param('id') id: string, @Body() dto: UpdateSkillResourceDto) {
    return this.skillResourcesService.updateResource(id, dto)
  }

  @Delete('skill-resources/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '[ADMIN] Xóa tài nguyên học tập' })
  @ApiParam({ name: 'id', description: 'UUID của tài nguyên cần xóa' })
  @ApiResponse({ status: 200, description: 'Xóa tài nguyên thành công.' })
  async deleteResource(@Param('id') id: string) {
    return this.skillResourcesService.deleteResource(id)
  }
}
