import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common'
import { AiAnalysisService } from './ai-analysis.service'
import { ScanFormDto } from './dto/scan-form.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@Controller('ai-analysis')
@UseGuards(JwtAuthGuard)
export class AiAnalysisController {
  constructor(private readonly service: AiAnalysisService) {}

  @Post('assess-and-scan')
  async assessAndScan(@Req() req: any, @Body() dto: ScanFormDto) {
    return this.service.analyzeUserForm(req.user.id, dto)
  }
}
