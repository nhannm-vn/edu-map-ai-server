import { Body, Controller, Get, Patch, Request, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { UsersService } from './users.service'
import * as requestWithUserInterface from '../auth/interfaces/request-with-user.interface'

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
}
