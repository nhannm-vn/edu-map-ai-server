import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import express from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { SyncGithubDto } from './dto/github.dto'
import { GithubService } from './github.service'

@ApiTags('GitHub Integration')
@Controller('github')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

  @Post('sync-and-analyze')
  @ApiOperation({
    summary: '[STUDENT] Tự động đồng bộ và AI phân tích Tech Stack toàn bộ Repos',
  })
  async syncAndAnalyze(@Req() req: express.Request, @Body() dto: SyncGithubDto) {
    const userId = (req.user as { id: string }).id
    return this.githubService.syncAndAnalyzeRepositories(userId, dto)
  }
}
