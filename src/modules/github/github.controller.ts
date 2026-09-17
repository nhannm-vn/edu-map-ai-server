import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface'
import { AnalyzeReadmeDto, SyncGithubDto } from './dto/github.dto'
import { GithubService } from './github.service'

@ApiTags('GitHub Integration')
@Controller('api/v1/github')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

  @Post('sync')
  @ApiOperation({ summary: '[STUDENT] Đồng bộ danh sách Repositories từ GitHub' })
  async syncRepositories(@Req() req: RequestWithUser, @Body() dto: SyncGithubDto) {
    return this.githubService.syncRepositories(req.user.id, dto)
  }

  @Post('analyze-readme')
  @ApiOperation({ summary: '[STUDENT] AI đọc file README.md bóc tách Tech Stack' })
  async analyzeReadme(@Req() req: RequestWithUser, @Body() dto: AnalyzeReadmeDto) {
    return this.githubService.analyzeReadme(req.user.id, dto)
  }
}
