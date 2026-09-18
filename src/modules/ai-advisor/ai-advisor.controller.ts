import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Request } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AiAdvisorService } from './ai-advisor.service'
import { GenerateSkillTreeDto } from './dto/ai-advisor.dto'

interface AuthenticatedRequest extends Request {
  user: {
    id: string
    [key: string]: unknown
  }
}

@ApiTags('AI Advisor')
@Controller('ai-advisor')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiAdvisorController {
  constructor(private readonly aiAdvisorService: AiAdvisorService) {}

  @Post('generate-skill-tree')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Phân tích AI và Tạo Cây Kỹ Năng (Skill Tree)',
    description: `
### 📌 QUY ĐỊNH TRUYỀN DỮ LIỆU CỦA API:
Trường **\`targetRole\`** là **BẮT BUỘC** đối với tất cả các trường hợp.

Bạn có thể truyền dữ liệu theo **1 trong 3 trường hợp** dưới đây:

---

#### 🔹 Trường hợp 1: Chỉ dùng Bảng điểm / CV (Academic Only)
*Truyền \`targetRole\` và object \`academicForm\`, bỏ qua \`githubUsername\`.*
\`\`\`json
{
  "targetRole": "Backend Developer",
  "academicForm": {
    "universityName": "Đại học Bách Khoa",
    "currentYear": 3,
    "coreCourses": [
      { "courseName": "Cơ sở dữ liệu", "grade": "A" },
      { "courseName": "Lập trình Web", "grade": "B+" }
    ]
  }
}
\`\`\`

---

#### 🔹 Trường hợp 2: Chỉ dùng GitHub (GitHub Only)
*Truyền \`targetRole\` và \`githubUsername\`, bỏ qua \`academicForm\`. Hệ thống sẽ tự động kích hoạt đồng bộ GitHub.*
\`\`\`json
{
  "targetRole": "Backend Developer",
  "githubUsername": "octocat"
}
\`\`\`

---

#### 🔹 Trường hợp 3: Kết hợp Bảng điểm & GitHub (Hybrid - Khuyên dùng)
*Truyền đầy đủ cả \`targetRole\`, \`githubUsername\` và \`academicForm\` để phân tích toàn diện nhất.*
\`\`\`json
{
  "targetRole": "Backend Developer",
  "githubUsername": "octocat",
  "academicForm": {
    "universityName": "Đại học Bách Khoa",
    "currentYear": 3,
    "coreCourses": [
      { "courseName": "Cơ sở dữ liệu", "grade": "A" }
    ]
  }
}
\`\`\`
    `,
  })
  @ApiBody({ type: GenerateSkillTreeDto })
  @ApiResponse({
    status: 200,
    description: 'Phân tích và khởi tạo Cây Kỹ Năng thành công.',
  })
  @ApiResponse({
    status: 400,
    description: 'Lỗi dữ liệu: Chưa truyền targetRole hoặc thiếu cả GitHub Username lẫn Bảng điểm.',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa xác thực JWT Token (Unauthorized).',
  })
  async generateSkillTree(@Req() req: AuthenticatedRequest, @Body() dto: GenerateSkillTreeDto) {
    const userId = req.user.id
    return this.aiAdvisorService.analyzeAndGenerateSkillTree(userId, dto)
  }
}
