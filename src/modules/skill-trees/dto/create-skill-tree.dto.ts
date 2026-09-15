import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, IsUUID } from 'class-validator'

export class CreateSkillTreeDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsUUID()
  @IsNotEmpty()
  userId!: string

  @ApiProperty({ example: 'Fullstack Node.js & React Developer' })
  @IsString()
  @IsNotEmpty()
  careerPath!: string
}
