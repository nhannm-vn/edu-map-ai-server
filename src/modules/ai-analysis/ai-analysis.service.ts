import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import { PrismaService } from 'prisma/prisma.service'
import { ScanFormDto } from './dto/scan-form.dto'

@Injectable()
export class AiAnalysisService {
  private readonly modelName = 'gemini-3.6-flash' // đồng bộ 1 nguồn duy nhất
  private readonly geminiUrl: string

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY')
    if (!apiKey) {
      throw new InternalServerErrorException('Chưa cấu hình GEMINI_API_KEY trong file .env')
    }
    this.geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${apiKey}`
  }

  async analyzeUserForm(userId: string, dto: ScanFormDto) {
    // 0. Xác định Target Role hiệu dụng
    const existingSkillTree = await this.prisma.skillTree.findUnique({
      where: { userId },
    })
    const effectiveTargetRole = dto.targetRole || existingSkillTree?.careerPath || 'Software Engineer'

    // 1. Tìm assessment gần nhất của user
    const previousAssessment = await this.prisma.selfAssessment.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    // 2. Lưu form mới vào selfAssessments
    const savedAssessment = await this.prisma.selfAssessment.create({
      data: {
        userId,
        targetRole: effectiveTargetRole,
        selfAssessment: dto.selfAssessment,
        cvSummaryText: dto.cvSummaryText,
      },
    })

    const isBeginnerProfile = !dto.domainProficiency && !dto.projectScale

    // 3. Xây dựng prompt
    const commonExtractedSkillsSchema = `
Bắt buộc có trường "extractedSkills" là mảng các kỹ năng xuất hiện hoặc cần học cho mục tiêu ${effectiveTargetRole}:
"extractedSkills": [
  {
    "skillName": "Tên kỹ năng (VD: TypeScript, React)",
    "category": "Programming Languages | Frameworks | Databases | Tools",
    "difficultyLevel": 1 đến 5,
    "currentLevel": 1 đến 5,
    "targetLevel": 1 đến 5,
    "status": "GAP | MASTERED | IN_PROGRESS"
  }
]`

    let prompt = ''
    if (previousAssessment) {
      prompt = `
Principal Engineer / Career Mentor đánh giá tiến trình sau thời gian dài của ứng viên cho mục tiêu: ${effectiveTargetRole}.
So sánh trạng thái CŨ và MỚI để đo lường sự tiến bộ và điều chỉnh lộ trình:

--- LẦN ĐÁNH GIÁ TRƯỚC ---
- Target Role cũ: ${previousAssessment.targetRole}
- Self-assessment cũ: ${JSON.stringify(previousAssessment.selfAssessment)}
- CV Summary cũ: ${previousAssessment.cvSummaryText}

--- LẦN ĐÁNH GIÁ HIỆN TẠI (Target Role hiện tại: ${effectiveTargetRole}) ---
- Years of Experience: ${dto.yearsOfExperience ?? 'N/A'}
- Self-assessment mới: ${JSON.stringify(dto.selfAssessment)}
- Domain Proficiency: ${dto.domainProficiency ? JSON.stringify(dto.domainProficiency) : 'Not provided'}
- Project Scale: ${dto.projectScale ? JSON.stringify(dto.projectScale) : 'Not provided'}
- Key Achievements: ${dto.keyAchievements ? JSON.stringify(dto.keyAchievements) : 'Not provided'}
- CV Summary mới: ${dto.cvSummaryText}

Trả về JSON thuần túy theo cấu trúc:
{
  "isProgressTracking": true,
  "progressEvaluation": "Nhận định chung sau thời gian qua hướng tới ${effectiveTargetRole}",
  ${commonExtractedSkillsSchema},
  "deltaImprovements": [
    {
      "skillOrArea": "Tên kỹ năng/khía cạnh",
      "changeStatus": "UPGRADED | STAGNANT | REGRESSED",
      "comment": "Đánh giá chi tiết sự thay đổi"
    }
  ],
  "resolvedBlindSpots": ["Điểm mù trước đó đã khắc phục"],
  "remainingOrNewBlindSpots": ["Điểm mù mới phát sinh hoặc tồn đọng"],
  "nextPhaseActionPlan": [
    {
      "priority": "HIGH | MEDIUM | LOW",
      "focusArea": "Chủ đề thời gian tới",
      "actionableAdvice": "Cần học/làm gì tiếp theo",
      "expectedMilestone": "Mục tiêu đạt được"
    }
  ],
  "growthScoreDelta": 15
}`
    } else if (isBeginnerProfile) {
      prompt = `
Mentor C/C++ / CS sắc sảo, kiên nhẫn nhưng thực tế. 
Ứng viên này ở mức nhập môn (beginner), mục tiêu hướng tới ${effectiveTargetRole}, chưa có kiến thức về system/server/docker:
- Target Role: ${effectiveTargetRole}
- Years of Experience: ${dto.yearsOfExperience ?? 0}
- Self-assessment: ${JSON.stringify(dto.selfAssessment)}
- Profile / Context: ${dto.cvSummaryText}

Phân tích theo góc nhìn foundation và trả về JSON thuần túy:
{
  "isProgressTracking": false,
  "mentorMindset": "Nhận định định hướng cho người mới bắt đầu...",
  "realityCheckScore": 85,
  ${commonExtractedSkillsSchema},
  "blindSpots": [
    {
      "area": "Tên khái niệm nền tảng bị hiểu sai hoặc hổng",
      "insight": "Giải thích ngắn gọn bẫy tư duy của người mới"
    }
  ],
  "customDimensions": {
    "fundamentalStrength": "Đánh giá mức nắm vững gốc rễ",
    "nextParadigmShift": "Bước chuyển tư duy tiếp theo cần có"
  },
  "adaptiveActionPlan": [
    {
      "priority": "HIGH",
      "focusArea": "Chủ đề nền tảng",
      "actionableAdvice": "Cần làm bài tập gì, đọc sách/tài liệu nào",
      "whyItMatters": "Vì sao đây là chốt chặn quan trọng"
    }
  ]
}`
    } else {
      prompt = `
Principal Engineer / Technical Lead sắc sảo, tư duy thực chiến. 
Phân tích hồ sơ dưới đây theo góc nhìn độc lập, bóc tách điểm mù thực sự đối với role ${effectiveTargetRole}:

- Target Role: ${effectiveTargetRole}
- Years of Experience: ${dto.yearsOfExperience ?? 'N/A'}
- Self-assessment: ${JSON.stringify(dto.selfAssessment)}
- Domain Proficiency: ${JSON.stringify(dto.domainProficiency || {})}
- Project Scale: ${JSON.stringify(dto.projectScale || {})}
- Key Achievements: ${JSON.stringify(dto.keyAchievements || [])}
- CV Summary: ${dto.cvSummaryText}

Trả về JSON thuần túy theo cấu trúc mở rộng linh hoạt:
{
  "isProgressTracking": false,
  "mentorMindset": "Đoạn suy nghĩ/nhận định mở đầu mang tính chẩn đoán sâu sắc từ góc nhìn Tech Lead...",
  "realityCheckScore": 82,
  ${commonExtractedSkillsSchema},
  "blindSpots": [
    {
      "area": "Tên khía cạnh/kỹ năng bị đánh giá quá cao hoặc bỏ sót",
      "insight": "Phân tích vì sao đây là bẫy/điểm yếu thực tế"
    }
  ],
  "customDimensions": {},
  "adaptiveActionPlan": [
    {
      "priority": "HIGH | MEDIUM | LOW",
      "focusArea": "Tên chủ đề cần tập trung",
      "actionableAdvice": "Cần làm gì, làm sâu cái gì, build project gì",
      "whyItMatters": "Lý do chiến lược"
    }
  ]
}`
    }

    let aiParsedResponse: any
    let rawText = ''

    try {
      const response = await axios.post(
        this.geminiUrl,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.7,
          },
        },
        { headers: { 'Content-Type': 'application/json' } },
      )

      rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || ''

      // [FIX]: Dọn dẹp sạch markdown block lẫn khoảng trắng thừa
      const cleanJsonText = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/, '')
        .trim()

      aiParsedResponse = JSON.parse(cleanJsonText)
    } catch (error) {
      console.error('\n========== DEBUG LỖI AI SCAN ==========')
      if (axios.isAxiosError(error)) {
        console.error('LỖI TỪ API GEMINI:', JSON.stringify(error.response?.data, null, 2))
      } else if (error instanceof SyntaxError) {
        console.error('LỖI PARSE JSON! Gemini trả về Text không chuẩn JSON:')
        console.error('Raw Text:', rawText)
      } else {
        console.error('LỖI HỆ THỐNG / PRISMA:', error)
      }
      console.error('=======================================\n')
      throw new InternalServerErrorException('Lỗi khi gọi Gemini AI phân tích form! (Xem log terminal)')
    }

    // 4. Lưu kết quả AI vào bảng aiAnalyses
    const savedAnalysis = await this.prisma.aiAnalysis.create({
      data: {
        userId,
        analysisType: previousAssessment ? 'PROGRESS_DELTA_SCAN' : 'DYNAMIC_DEEP_SCAN',
        inputData: JSON.parse(
          JSON.stringify({ current: { ...dto, effectiveTargetRole }, previous: previousAssessment || null }),
        ),
        aiResponse: aiParsedResponse,
        skillGapIdentified: aiParsedResponse.blindSpots || aiParsedResponse.remainingOrNewBlindSpots || [],
        recommendedPath: JSON.stringify(
          aiParsedResponse.adaptiveActionPlan || aiParsedResponse.nextPhaseActionPlan || [],
        ),
        confidenceScore: Number(
          aiParsedResponse.realityCheckScore ||
            (aiParsedResponse.growthScoreDelta ? 85 + aiParsedResponse.growthScoreDelta : 85),
        ),
        modelUsed: this.modelName,
        tokensUsed: 0,
      },
    })

    // 5. Upsert extracted skills song song bằng Promise.all
    const extractedSkills = Array.isArray(aiParsedResponse.extractedSkills) ? aiParsedResponse.extractedSkills : []

    const readyToNodePayloads = await Promise.all(
      extractedSkills.map(async (item: any) => {
        const dbSkill = await this.prisma.skill.upsert({
          where: { name: item.skillName },
          update: {
            category: item.category || 'Programming Languages',
            difficultyLevel: Number(item.difficultyLevel || 2),
          },
          create: {
            name: item.skillName,
            category: item.category || 'Programming Languages',
            difficultyLevel: Number(item.difficultyLevel || 2),
            demandScore: 50,
          },
        })

        return {
          skill: dbSkill,
          nodePayload: {
            skillId: dbSkill.id,
            nodeLevel: Number(item.currentLevel || 1),
            priorityRank: item.status === 'GAP' ? 1 : 2,
          },
        }
      }),
    )

    return {
      message: previousAssessment ? 'Progress delta analyzed successfully' : 'First assessment analyzed',
      effectiveTargetRole,
      assessment: savedAssessment,
      previousAssessmentId: previousAssessment?.id || null,
      aiAnalysis: {
        id: savedAnalysis.id,
        insights: aiParsedResponse,
      },
      readyToNodes: readyToNodePayloads,
    }
  }
}
