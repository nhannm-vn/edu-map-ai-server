import { ApiProperty } from '@nestjs/swagger'
import { IsInt, IsNotEmpty, IsOptional, IsUUID, Max, Min } from 'class-validator'

export class AddUserSkillDto {
  @ApiProperty({ example: 'uuid-of-skill' })
  @IsUUID()
  @IsNotEmpty()
  skillId: string

  @ApiProperty({ example: 3, description: 'Mức độ thành thạo (1-5)' })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  proficiencyLevel?: number

  @ApiProperty({ example: 50, description: 'Số giờ đã học' })
  @IsInt()
  @Min(0)
  @IsOptional()
  hoursSpent?: number
}
