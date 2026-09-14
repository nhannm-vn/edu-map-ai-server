import { ApiProperty } from '@nestjs/swagger'
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'

export class CreateSkillDto {
  @ApiProperty({ example: 'NestJS' })
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiProperty({ example: 'Backend' })
  @IsString()
  @IsNotEmpty()
  category: string

  @ApiProperty({ example: 3, description: 'Độ khó (1-5)' })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  difficultyLevel?: number

  @ApiProperty({ example: 8.5, description: 'Điểm nhu cầu thị trường (0-10)' })
  @IsNumber()
  @Min(0)
  @Max(10)
  @IsOptional()
  demandScore?: number
}
