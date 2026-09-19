/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { BadRequestException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { GoogleGenAI } from '@google/genai'
import { PrismaService } from 'prisma/prisma.service'
import { CreateChatSessionDto } from './dto/create-chat-session.dto'

// const GEMINI_CHAT_MODEL = 'gemini-3.6-flash'
const GEMINI_CHAT_MODEL = 'gemini-3.5-flash-lite'

interface ChatSessionContext {
  userId: string
  targetRole?: string
  universityName?: string | null
  currentYear?: number | null
  githubTechStack: string[]
  userSkills: string[]
  completedSkills: string[]
  inProgressSkills: string[]
  lockedSkills: string[]
  lastAnalysisSummary?: string | null
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name)

  constructor(private readonly prisma: PrismaService) {}

  async createSession(userId: string, dto: CreateChatSessionDto) {
    const tree = await this.prisma.skillTree.findUnique({
      where: { userId },
      include: {
        nodes: {
          include: { skill: true },
          orderBy: { priorityRank: 'asc' },
        },
      },
    })

    if (!tree) {
      throw new BadRequestException('Bạn cần tạo lộ trình kỹ năng trước khi bắt đầu trò chuyện với AI.')
    }

    const latestAnalysis = await this.prisma.aiAnalysis.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    const title = dto.title?.trim() || `${tree.careerPath || 'Lộ trình'} – Tư vấn cá nhân`

    return this.prisma.chatSession.create({
      data: {
        userId,
        skillTreeId: tree.id,
        analysisId: latestAnalysis?.id ?? null,
        title,
        lastMessageAt: new Date(),
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })
  }

  async listSessions(userId: string) {
    return this.prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })
  }

  async getSessionById(userId: string, sessionId: string) {
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!session) {
      throw new NotFoundException('Phiên trò chuyện không tồn tại hoặc không thuộc về tài khoản của bạn.')
    }

    return session
  }

  async sendMessage(userId: string, sessionId: string, rawContent: string) {
    const content = rawContent.trim()
    if (!content) {
      throw new BadRequestException('Nội dung tin nhắn không được để trống.')
    }

    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
    })

    if (!session) {
      throw new NotFoundException('Phiên trò chuyện không tồn tại hoặc không thuộc về tài khoản của bạn.')
    }

    const context = await this.buildContext(userId, session)

    return this.prisma.$transaction(async (tx) => {
      await tx.chatMessage.create({
        data: {
          sessionId,
          role: 'USER',
          content,
        },
      })

      const recentHistory = await tx.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
        take: 20,
      })

      const aiReply = await this.generateAssistantReply({
        userMessage: content,
        history: recentHistory,
        context,
      })

      const assistantMessage = await tx.chatMessage.create({
        data: {
          sessionId,
          role: 'ASSISTANT',
          content: aiReply,
          modelUsed: GEMINI_CHAT_MODEL,
        },
      })

      const updatedTitle = session.title?.trim() || this.buildDefaultTitle(context.targetRole)

      await tx.chatSession.update({
        where: { id: sessionId },
        data: {
          title: updatedTitle,
          lastMessageAt: new Date(),
        },
      })

      return assistantMessage
    })
  }

  async deleteSession(userId: string, sessionId: string) {
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
    })

    if (!session) {
      throw new NotFoundException('Phiên trò chuyện không tồn tại hoặc không thuộc về tài khoản của bạn.')
    }

    await this.prisma.chatSession.delete({
      where: { id: sessionId },
    })

    return {
      message: 'Đã xóa phiên trò chuyện thành công.',
      sessionId,
    }
  }

  private buildDefaultTitle(targetRole?: string) {
    return targetRole ? `Tư vấn ${targetRole}` : 'Tư vấn nghề nghiệp CNTT'
  }

  private async buildContext(userId: string, session: { skillTreeId: string | null; analysisId: string | null }) {
    const tree = session.skillTreeId
      ? await this.prisma.skillTree.findUnique({
          where: { id: session.skillTreeId },
          include: {
            nodes: {
              include: { skill: true },
              orderBy: { priorityRank: 'asc' },
            },
          },
        })
      : await this.prisma.skillTree.findUnique({
          where: { userId },
          include: {
            nodes: {
              include: { skill: true },
              orderBy: { priorityRank: 'asc' },
            },
          },
        })

    if (!tree) {
      throw new BadRequestException(
        'Bạn chưa có lộ trình kỹ năng nào. Vui lòng tạo lộ trình trước khi trò chuyện với AI.',
      )
    }

    const profile = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        githubProfile: {
          include: { repositories: true },
        },
        userSkills: {
          include: { skill: true },
        },
        academicTranscript: true,
      },
    })

    const githubTechStack = Array.from(
      new Set(
        (profile?.githubProfile?.repositories ?? []).flatMap((repo) => {
          const techStack = repo.techStack as string[] | null
          return Array.isArray(techStack) ? techStack : []
        }),
      ),
    )

    const userSkills = profile?.userSkills ?? []

    const completedSkills = tree.nodes.filter((node) => node.isCompleted).map((node) => node.skill.name)
    const inProgressSkills = tree.nodes
      .filter((node) => !node.isCompleted && node.isVisible)
      .map((node) => node.skill.name)
    const lockedSkills = tree.nodes
      .filter((node) => !node.isCompleted)
      .filter((node) => !node.isVisible || node.priorityRank === null)
      .map((node) => node.skill.name)

    const latestAnalysis = session.analysisId
      ? await this.prisma.aiAnalysis.findUnique({
          where: { id: session.analysisId },
        })
      : await this.prisma.aiAnalysis.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        })

    const analysisSummary =
      latestAnalysis && latestAnalysis.aiResponse && typeof latestAnalysis.aiResponse === 'object'
        ? ((latestAnalysis.aiResponse as { summary?: string }).summary ?? null)
        : null

    return {
      userId,
      targetRole: tree.careerPath,
      universityName: profile?.universityName ?? (profile?.academicTranscript ? 'Đã có dữ liệu' : null),
      currentYear: profile?.currentYear,
      githubTechStack,
      userSkills: userSkills.map((item) => item.skill.name),
      completedSkills,
      inProgressSkills,
      lockedSkills,
      lastAnalysisSummary: analysisSummary,
    } satisfies ChatSessionContext
  }

  private async generateAssistantReply({
    userMessage,
    history,
    context,
  }: {
    userMessage: string
    history: Array<{ role: string; content: string }>
    context: ChatSessionContext
  }) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new ServiceUnavailableException('Chưa cấu hình GEMINI_API_KEY trong file .env')
    }

    const summarySource = context.lastAnalysisSummary ?? 'Chưa có tóm tắt phân tích'

    const recentMessages = history
      .slice(-8)
      .map((item) => `${item.role === 'USER' ? 'Người dùng' : 'AI'}: ${item.content}`)
      .join('\n')

    const prompt = `
      Bạn là AI Career Coach chuyên tư vấn sinh viên CNTT ở Việt Nam.
      Hãy trả lời dựa trên lộ trình kỹ năng đã được phân tích sẵn, không trả lời chung chung.

      Thông tin người dùng:
      - Mục tiêu nghề nghiệp: ${context.targetRole ?? 'Chưa xác định'}
      - Trường: ${context.universityName ?? 'Không cung cấp'}
      - Năm học: ${context.currentYear ?? 'Không cung cấp'}
      - Tech stack GitHub: ${context.githubTechStack.length > 0 ? context.githubTechStack.join(', ') : 'Chưa có dữ liệu'}
      - Kỹ năng đã khai báo: ${context.userSkills.length > 0 ? context.userSkills.join(', ') : 'Chưa có dữ liệu'}
      - Đã hoàn thành: ${context.completedSkills.length > 0 ? context.completedSkills.join(', ') : 'Chưa có'}
      - Đang học: ${context.inProgressSkills.length > 0 ? context.inProgressSkills.join(', ') : 'Chưa có'}
      - Kỹ năng còn thiếu bắt buộc: ${context.lockedSkills.length > 0 ? context.lockedSkills.join(', ') : 'Chưa có'}
      - Tóm tắt AI phân tích gần nhất: ${summarySource}

      Lịch sử hội thoại gần đây:
      ${recentMessages || 'Chưa có hội thoại nào trước đó.'}

      Câu hỏi mới của người dùng:
      ${userMessage}

      Yêu cầu trả lời:
      1. Trả lời ngắn gọn nhưng có giá trị thực tế, không dài quá 5-7 đoạn văn.
      2. Nếu câu hỏi liên quan tới lộ trình, ưu tiên dẫn dắt dựa trên tiến độ hiện tại và kỹ năng còn thiếu.
      3. Nếu cần, hãy đề xuất roadmap ưu tiên trong 2-6 tuần.
      4. Nếu người dùng còn thiếu dữ liệu, hãy hỏi tối đa 2 câu để làm rõ.
      5. Tránh nói chung chung; hãy gắn với kỹ năng, stack, và mục tiêu nghề nghiệp.
      6. Chú ý ngôn ngữ tự nhiên của sinh viên Việt Nam.
    `

    const ai = new GoogleGenAI({ apiKey })
    const maxAttempts = 2
    let lastError: unknown

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await ai.models.generateContent({
          model: GEMINI_CHAT_MODEL,
          contents: prompt,
        })

        const text = response.text?.trim()
        if (!text) {
          throw new Error('Gemini trả về nội dung rỗng.')
        }

        return text
      } catch (error) {
        lastError = error
        const status = this.getGeminiErrorStatus(error)
        const message = error instanceof Error ? error.message : String(error)

        if (status !== 503 || attempt === maxAttempts) {
          this.logger.error(`Gemini chat thất bại (attempt ${attempt}): ${message}`)
          if (status === 503) {
            throw new ServiceUnavailableException('Dịch vụ Gemini đang quá tải. Vui lòng thử lại sau ít phút.')
          }
          throw new ServiceUnavailableException(`Không thể nhận phản hồi từ Gemini: ${message}`)
        }

        this.logger.warn(`Gemini đang quá tải, thử lại sau (attempt ${attempt}/${maxAttempts}).`)
        await this.delay(1000)
      }
    }

    const message = lastError instanceof Error ? lastError.message : String(lastError)
    throw new ServiceUnavailableException(`Không thể nhận phản hồi từ Gemini: ${message}`)
  }

  private getGeminiErrorStatus(error: unknown): number | undefined {
    if (typeof error !== 'object' || error === null || !('status' in error)) {
      return undefined
    }

    const status = error.status
    return typeof status === 'number' ? status : undefined
  }

  private delay(milliseconds: number) {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, milliseconds)
    })
  }
}
