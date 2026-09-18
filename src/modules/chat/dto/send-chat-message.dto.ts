import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class SendChatMessageDto {
  @ApiProperty({
    example: 'Mình đang học năm 2, muốn làm Backend Java. Mình nên học gì trước?',
    description: 'Nội dung tin nhắn của người dùng',
  })
  @IsString()
  @IsNotEmpty({ message: 'Nội dung tin nhắn không được để trống' })
  content: string | undefined
}
