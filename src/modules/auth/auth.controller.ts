import { Body, Controller, Get, Patch, Post, Request, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { RegisterDto, LoginDto, ChangePasswordDto } from './dto/auth.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'

export interface AuthenticatedUser {
  id: string
  email: string
  fullName: string
  subscriptionTier: string
}

export interface RequestWithUser extends Express.Request {
  user: AuthenticatedUser
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản mới' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  @Post('login')
  @ApiOperation({ summary: 'Đăng nhập hệ thống' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin tài khoản đang đăng nhập' })
  getProfile(@Request() req: RequestWithUser): AuthenticatedUser {
    return req.user
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đổi mật khẩu tài khoản' })
  changePassword(@Request() req: RequestWithUser, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, dto)
  }
}
