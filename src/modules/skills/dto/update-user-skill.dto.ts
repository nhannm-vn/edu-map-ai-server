import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, IsOptional, Max, Min } from 'class-validator'

export class UpdateUserSkillDto {
  @ApiPropertyOptional({ example: 4, description: 'Cập nhật mức độ thành thạo (1-5)' })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  proficiencyLevel?: number

  @ApiPropertyOptional({ example: 80, description: 'Cập nhật tổng số giờ đã học' })
  @IsInt()
  @Min(0)
  @IsOptional()
  hoursSpent?: number
}
