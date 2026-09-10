import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common'
import { RegisterDto, LoginDto, ChangePasswordDto } from './dto/auth.dto'
import * as bcrypt from 'bcrypt'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from 'prisma/prisma.service'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
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

    const accessToken = this.generateToken(user.id, user.email)

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        subscriptionTier: user.subscriptionTier,
      },
      accessToken,
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
}
