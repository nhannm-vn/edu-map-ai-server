import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsNotEmpty } from 'class-validator'

export enum UserRole {
  STUDENT = 'STUDENT',
  ADMIN = 'ADMIN',
}

export class ChangeRoleDto {
  @ApiProperty({ enum: UserRole, example: UserRole.ADMIN })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole
}
