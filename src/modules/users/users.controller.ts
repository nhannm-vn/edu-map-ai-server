import { Body, Controller, Get, Param, Patch, Request, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { UsersService } from './users.service'
import * as requestWithUserInterface from '../auth/interfaces/request-with-user.interface'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { ChangeRoleDto } from './dto/change-role.dto'

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Lấy thông tin profile người dùng hiện tại' })
  getProfile(@Request() req: requestWithUserInterface.RequestWithUser) {
    return this.usersService.getProfile(req.user.id)
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Cập nhật thông tin profile cá nhân' })
  updateProfile(@Request() req: requestWithUserInterface.RequestWithUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, dto)
  }

  // --- API DÀNH RIÊNG CHO ADMIN ---

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '[ADMIN] Lấy danh sách tất cả người dùng trong hệ thống' })
  getAllUsers() {
    return this.usersService.getAllUsers()
  }

  @Patch('admin/:id/role')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '[ADMIN] Thay đổi quyền (Role) của người dùng' })
  changeUserRole(@Param('id') targetUserId: string, @Body() dto: ChangeRoleDto) {
    return this.usersService.changeUserRole(targetUserId, dto.role)
  }
}
