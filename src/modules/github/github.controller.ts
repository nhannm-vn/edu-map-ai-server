import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common'
import { GithubService } from './github.service'
import { ConnectGithubDto } from './dto/connect-github.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ExtractReadmeDto } from './dto/extract-readme.dto'

@Controller('github')
@UseGuards(JwtAuthGuard)
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

  @Post('connect')
  async connect(@Req() req: any, @Body() dto: ConnectGithubDto) {
    return this.githubService.connectAccount(req.user.id, dto)
  }

  @Post('sync')
  async sync(@Req() req: any) {
    return this.githubService.syncRepos(req.user.id)
  }
  @Post('extract-readme')
  async extractReadme(@Req() req: any, @Body() dto: ExtractReadmeDto) {
    return this.githubService.extractReadme(req.user.id, dto)
  }
}
