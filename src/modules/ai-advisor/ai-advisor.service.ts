/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { GoogleGenAI, Type } from '@google/genai'
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'prisma/prisma.service'
import { GithubService } from '../github/github.service'
import { GenerateSkillTreeDto } from './dto/ai-advisor.dto'

interface AiNodeResponse {
  skillName: string
  category: string
  parentSkillName?: string | null
  nodeLevel?: number
  priorityRank?: number
  status?: string
  reason?: string
}

interface AiAnalysisResponse {
  summary: string
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  nodes: AiNodeResponse[]
}

@Injectable()
export class AiAdvisorService {
  private readonly logger = new Logger(AiAdvisorService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly githubService: GithubService,
  ) {}

  /**
   * Gọi Gemini AI bằng Google GenAI SDK chính thức với cơ chế Schema ép kiểu JSON chuẩn
   */
  private async callGeminiApi(prompt: string): Promise<{ data: AiAnalysisResponse; modelUsed: string }> {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new InternalServerErrorException('Chưa cấu hình GEMINI_API_KEY trong file .env')
    }

    const ai = new GoogleGenAI({ apiKey })

    // Danh sách model ưu tiên
    const models = ['gemini-3.5-flash-lite', 'gemini-2.5-flash']
    let lastError: unknown

    for (const model of models) {
      try {
        this.logger.log(`Đang gọi Gemini API với model: ${model}...`)

        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                strengths: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                weaknesses: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                recommendations: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                nodes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      skillName: { type: Type.STRING },
                      category: { type: Type.STRING },
                      parentSkillName: { type: Type.STRING, nullable: true },
                      nodeLevel: { type: Type.INTEGER },
                      priorityRank: { type: Type.INTEGER },
                      status: { type: Type.STRING },
                      reason: { type: Type.STRING },
                    },
                    required: ['skillName', 'category', 'status'],
                  },
                },
              },
              required: ['summary', 'strengths', 'weaknesses', 'recommendations', 'nodes'],
            },
          },
        })

        const text = response.text
        if (!text?.trim()) {
          throw new Error(`Gemini trả về response rỗng với model ${model}`)
        }

        const parsedData = JSON.parse(text) as AiAnalysisResponse
        if (
          typeof parsedData.summary !== 'string' ||
          !Array.isArray(parsedData.strengths) ||
          !Array.isArray(parsedData.weaknesses) ||
          !Array.isArray(parsedData.recommendations) ||
          !Array.isArray(parsedData.nodes)
        ) {
          throw new Error(`Gemini trả về JSON không đúng cấu trúc với model ${model}`)
        }

        return { data: parsedData, modelUsed: model }
      } catch (error) {
        lastError = error
        const message = error instanceof Error ? error.message : String(error)
        this.logger.warn(`Gặp lỗi khi gọi model ${model}: ${message}`)

        // Lỗi xác thực/quyền hạn không thể được giải quyết bằng model dự phòng.
        const status = this.getGeminiErrorStatus(error)
        if (status === 401 || status === 403) {
          throw new ServiceUnavailableException(
            'Gemini API Key không hợp lệ hoặc không có quyền sử dụng Gemini API. Hãy kiểm tra lại GEMINI_API_KEY trong file .env.',
          )
        }
      }
    }

    const lastErrorMessage = lastError instanceof Error ? lastError.message : String(lastError)
    throw new ServiceUnavailableException(
      `Không thể gọi Gemini API. Kiểm tra API key, quota và model được bật. Chi tiết: ${lastErrorMessage}`,
    )
  }

  private getGeminiErrorStatus(error: unknown): number | undefined {
    if (typeof error !== 'object' || error === null || !('status' in error)) {
      return undefined
    }

    const status = error.status
    return typeof status === 'number' ? status : undefined
  }

  async analyzeAndGenerateSkillTree(userId: string, dto: GenerateSkillTreeDto) {
    // 1. Kích hoạt Sync GitHub CHẠY NGẦM (Non-blocking)
    if (dto.githubUsername) {
      this.logger.log(`Kích hoạt Sync GitHub chạy ngầm cho user ${userId} (${dto.githubUsername})`)
      this.githubService.syncAndAnalyzeRepositories(userId, { username: dto.githubUsername }).catch((error) => {
        this.logger.warn(`Lỗi sync GitHub ngầm: ${(error as Error).message}`)
      })
    }

    // 2. Lấy dữ liệu GithubProfile khớp chuẩn Prisma Field (githubUsername)
    let githubProfile = await this.prisma.githubProfile.findUnique({
      where: { userId },
      include: { repositories: true },
    })

    if (!githubProfile && dto.githubUsername) {
      githubProfile = await this.prisma.githubProfile.findUnique({
        where: { githubUsername: dto.githubUsername },
        include: { repositories: true },
      })
    }

    const githubTechs: string[] = Array.from(
      new Set(
        (
          githubProfile?.repositories.flatMap((r) => {
            const techStack = r.techStack as string[] | null
            return techStack || []
          }) || []
        ).filter((tech): tech is string => typeof tech === 'string'),
      ),
    )

    const hasGithubData = githubTechs.length > 0 || Boolean(dto.githubUsername)
    const hasAcademicData =
      dto.academicForm &&
      (dto.academicForm.universityName || (dto.academicForm.coreCourses && dto.academicForm.coreCourses.length > 0))

    // 3. Validation
    if (!hasGithubData && !hasAcademicData) {
      throw new BadRequestException(
        'Vui lòng nhập GitHub Username HOẶC thông tin bảng điểm để hệ thống có dữ liệu phân tích!',
      )
    }

    // 4. Prompt Context
    let modeContext = ''
    if (hasGithubData && hasAcademicData) {
      modeContext = `[MODE: HYBRID] Phân tích đối chiếu giữa Kết quả học tập (Lý thuyết) và Tech Stack thực tế cào từ GitHub (Thực hành).`
    } else if (hasGithubData) {
      modeContext = `[MODE: GITHUB ONLY] Phân tích dựa hoàn toàn trên Tech Stack thực tế cào từ GitHub. Tự động đề xuất các kỹ năng còn thiếu (LOCKED) bắt buộc cho vị trí ${dto.targetRole}.`
    } else {
      modeContext = `[MODE: ACADEMIC ONLY] Phân tích dựa trên kết quả môn học lý thuyết/bảng điểm. Đề xuất các kỹ năng thực tế cần học bổ sung cho vị trí ${dto.targetRole}.`
    }

    const prompt = `
    Bạn là chuyên gia cố vấn lộ trình học tập và định hướng nghề nghiệp CNTT.
    CHẾ ĐỘ PHÂN TÍCH: ${modeContext}

    THÔNG TIN ĐẦU VÀO CỦA SINH VIÊN:
    - Vị trí mục tiêu: ${dto.targetRole}
    - GitHub Username: ${dto.githubUsername || 'Không cung cấp'}
    - Tech Stack thực tế từ GitHub: ${githubTechs.length > 0 ? JSON.stringify(githubTechs) : 'Chưa phân tích xong / Không có'}
    - Kết quả học tập / Bảng điểm: ${
      hasAcademicData
        ? JSON.stringify({
            university: dto.academicForm?.universityName || 'N/A',
            year: dto.academicForm?.currentYear || 'N/A',
            courses: dto.academicForm?.coreCourses || [],
          })
        : 'Không cung cấp'
    }

    Quy tắc phân loại trạng thái "status" của từng kỹ năng (node):
    - "COMPLETED": Sinh viên đã học hoặc đã dùng kỹ năng này thành thạo.
    - "IN_PROGRESS": Có nền tảng cơ bản nhưng cần thực hành nâng cao thêm.
    - "LOCKED": Kỹ năng còn thiếu bắt buộc phải học cho vị trí ${dto.targetRole}.

    Hãy tạo lộ trình có cấu trúc, không trả về danh sách ngắn:
    - Trả về từ 12 đến 20 node kỹ năng, bao phủ nền tảng, kỹ năng cốt lõi và kỹ năng nâng cao cho vị trí mục tiêu.
    - Mỗi node phải có skillName, category, status, nodeLevel (1-5), priorityRank (1-20).
    - Dùng parentSkillName để tạo quan hệ node con với node cha trong chính danh sách trả về. Node gốc không có parentSkillName.
    - Không lặp lại skillName; ưu tiên tên kỹ năng chuẩn, phổ biến và có thể tái sử dụng trong master skill.
    `

    // 5. Gọi AI với SDK mới
    const { data: aiResult, modelUsed } = await this.callGeminiApi(prompt)

    // 6. Transaction lưu Database
    try {
      const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const aiAnalysis = await tx.aiAnalysis.create({
          data: {
            userId,
            analysisType: 'SKILL_TREE_GENERATION',
            recommendedPath: dto.targetRole,
            aiResponse: aiResult as unknown as Prisma.InputJsonValue,
            modelUsed,
          },
        })

        const skillTree = await tx.skillTree.upsert({
          where: { userId },
          update: {
            careerPath: dto.targetRole ?? 'Undecided',
            lastAnalyzedAt: new Date(),
          },
          create: {
            userId,
            careerPath: dto.targetRole ?? 'Undecided',
            lastAnalyzedAt: new Date(),
          },
        })

        await tx.skillTreeNode.deleteMany({
          where: { skillTreeId: skillTree.id },
        })

        const createdNodes: Prisma.SkillTreeNodeGetPayload<{
          include: { skill: true }
        }>[] = []
        const nodeRecords: Array<{ node: AiNodeResponse; skillId: string }> = []
        for (const node of aiResult.nodes || []) {
          const normalizedName = node.skillName.trim()
          const existingSkill = await tx.skill.findFirst({
            where: { name: { equals: normalizedName, mode: 'insensitive' } },
          })
          const skill =
            existingSkill ??
            (await tx.skill.create({
              data: {
                name: normalizedName,
                category: node.category.trim(),
                difficultyLevel: Number(node.nodeLevel ?? 1),
              },
            }))

          nodeRecords.push({ node, skillId: skill.id })
        }

        const createdNodeBySkillName = new Map<string, { id: string }>()
        for (const { node, skillId } of nodeRecords) {
          const isCompleted = node.status?.toUpperCase() === 'COMPLETED'

          const treeNode = await tx.skillTreeNode.create({
            data: {
              skillTreeId: skillTree.id,
              skillId,
              nodeLevel: Number(node.nodeLevel ?? 1),
              priorityRank: Number(node.priorityRank ?? 1),
              isCompleted,
              completedAt: isCompleted ? new Date() : null,
              isVisible: true,
            },
            include: { skill: true },
          })

          createdNodes.push(treeNode)
          createdNodeBySkillName.set(node.skillName.trim().toLowerCase(), treeNode)
        }

        for (const { node } of nodeRecords) {
          if (!node.parentSkillName) continue

          const child = createdNodeBySkillName.get(node.skillName.trim().toLowerCase())
          const parent = createdNodeBySkillName.get(node.parentSkillName.trim().toLowerCase())
          if (!child || !parent || child.id === parent.id) continue

          const updatedNode = await tx.skillTreeNode.update({
            where: { id: child.id },
            data: { parentNodeId: parent.id },
            include: { skill: true },
          })
          const index = createdNodes.findIndex((createdNode) => createdNode.id === child.id)
          if (index >= 0) createdNodes[index] = updatedNode
        }

        return {
          analysisId: aiAnalysis.id,
          treeId: skillTree.id,
          careerPath: skillTree.careerPath,
          summary: aiResult.summary,
          strengths: aiResult.strengths,
          weaknesses: aiResult.weaknesses,
          recommendations: aiResult.recommendations,
          nodes: createdNodes,
        }
      })

      return {
        message: 'Tạo Cây Kỹ Năng và phân tích năng lực thành công!',
        data: result,
      }
    } catch (err) {
      this.logger.error('Lỗi khi lưu Database:', err)
      throw new InternalServerErrorException((err as Error).message)
    }
  }
}
