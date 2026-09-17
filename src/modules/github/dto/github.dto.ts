import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class SyncGithubDto {
  @ApiProperty({ example: 'octocat', description: 'Tên tài khoản GitHub' })
  @IsString()
  @IsNotEmpty()
  username!: string
}

export class AnalyzeReadmeDto {
  @ApiProperty({ example: 'octocat', description: 'Chủ sở hữu Repository' })
  @IsString()
  @IsNotEmpty()
  owner!: string

  @ApiProperty({ example: 'Hello-World', description: 'Tên Repository' })
  @IsString()
  @IsNotEmpty()
  repo!: string
}
