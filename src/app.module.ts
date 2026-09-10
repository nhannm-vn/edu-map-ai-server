import { Module } from '@nestjs/common'
import { AuthModule } from './modules/auth/auth.module'
import { PrismaModule } from 'prisma/prisma.module'

@Module({
  imports: [PrismaModule, AuthModule],
})
export class AppModule {}
