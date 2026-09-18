import { Injectable, BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common'
import { RegisterDto, LoginDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto'
import * as bcrypt from 'bcrypt'
import * as crypto from 'crypto'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from 'prisma/prisma.service'
import { MailService } from '../mail/mail.service'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  private generateToken(userId: string, email: string): string {
    return this.jwtService.sign({ sub: userId, email })
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    })

    if (existingUser) {
      throw new BadRequestException('Email này đã được sử dụng')
    }

    const passwordHash = await bcrypt.hash(dto.password, 10)

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        subscriptionTier: true,
        createdAt: true,
      },
    })

    const accessToken = this.generateToken(user.id, user.email)

    return { user, accessToken }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    })

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác')
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác')
    }

    // Đưa role vào JWT Payload
    const payload = { sub: user.id, email: user.email, role: user.role }
    const accessToken = await this.jwtService.signAsync(payload)

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role, // Trả về ROLE cho Frontend kiểm tra
      },
    }
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new UnauthorizedException('Tài khoản không tồn tại')
    }

    const isPasswordValid = await bcrypt.compare(dto.oldPassword, user.passwordHash)
    if (!isPasswordValid) {
      throw new BadRequestException('Mật khẩu hiện tại không chính xác')
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10)

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    })

    return { message: 'Đổi mật khẩu thành công' }
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    })

    if (!user) {
      throw new NotFoundException('Email không tồn tại trong hệ thống')
    }

    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000) // Hết hạn 15 phút

    await this.prisma.user.update({
      where: { email: dto.email },
      data: {
        resetToken,
        resetTokenExpiresAt,
      },
    })

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`

    await this.mailService.sendResetPasswordEmail(dto.email, resetLink)

    return {
      message: 'Đã gửi đường dẫn khôi phục mật khẩu vào email của bạn',
      debugLink: resetLink,
      debugToken: resetToken,
    }
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Mật khẩu mới và xác nhận mật khẩu không khớp')
    }

    const user = await this.prisma.user.findFirst({
      where: { resetToken: dto.token },
    })

    if (!user) {
      throw new BadRequestException('Token khôi phục không hợp lệ')
    }

    if (!user.resetTokenExpiresAt || new Date() > user.resetTokenExpiresAt) {
      throw new BadRequestException('Đường dẫn khôi phục mật khẩu đã hết hạn')
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10)

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        resetToken: null,
        resetTokenExpiresAt: null,
      },
    })

    return { message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay bây giờ.' }
  }
}
