import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class ResetMyTreeDto {
  @ApiProperty({
    description: 'Định hướng nghề nghiệp mới mà sinh viên muốn theo đuổi',
    example: 'Frontend React Developer',
  })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập định hướng nghề nghiệp mới' })
  careerPath!: string
}
