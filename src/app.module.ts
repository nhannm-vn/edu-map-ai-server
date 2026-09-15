import { SkillTreesModule } from './modules/skill-trees/skill-trees.module'
import { SkillsModule } from './modules/skills/skills.module'
import { Module } from '@nestjs/common'
import { AuthModule } from './modules/auth/auth.module'
import { PrismaModule } from 'prisma/prisma.module'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { UsersModule } from './modules/users/users.module'

@Module({
  imports: [
    SkillTreesModule,
    SkillsModule, //
    PrismaModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
