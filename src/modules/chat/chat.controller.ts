/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface'
import { CreateChatSessionDto } from './dto/create-chat-session.dto'
import { SendChatMessageDto } from './dto/send-chat-message.dto'
import { ChatService } from './chat.service'

@ApiTags('Chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('sessions')
  @ApiOperation({ summary: '[STUDENT] Tạo phiên trò chuyện AI sau khi đã có lộ trình kỹ năng' })
  createSession(@Req() req: RequestWithUser, @Body() dto: CreateChatSessionDto) {
    return this.chatService.createSession(req.user.id, dto)
  }

  @Get('sessions')
  @ApiOperation({ summary: '[STUDENT] Lấy danh sách phiên trò chuyện của tôi' })
  listSessions(@Req() req: RequestWithUser) {
    return this.chatService.listSessions(req.user.id)
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: '[STUDENT] Lấy chi tiết một phiên trò chuyện' })
  getSession(@Req() req: RequestWithUser, @Param('sessionId') sessionId: string) {
    return this.chatService.getSessionById(req.user.id, sessionId)
  }

  @Post('sessions/:sessionId/messages')
  @ApiOperation({ summary: '[STUDENT] Gửi câu hỏi và nhận lời khuyên AI dựa trên lộ trình hiện tại' })
  sendMessage(@Req() req: RequestWithUser, @Param('sessionId') sessionId: string, @Body() dto: SendChatMessageDto) {
    const userId = req.user.id
    if (!userId) {
      throw new UnauthorizedException()
    }
    if (dto.content === undefined) {
      throw new BadRequestException('Message content is required')
    }

    return this.chatService.sendMessage(userId, sessionId, dto.content)
  }

  @Delete('sessions/:sessionId')
  @ApiOperation({ summary: '[STUDENT] Xóa phiên trò chuyện' })
  deleteSession(@Req() req: RequestWithUser, @Param('sessionId') sessionId: string) {
    return this.chatService.deleteSession(req.user.id, sessionId)
  }
}
