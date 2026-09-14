import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class ConnectGithubDto {
  @IsString()
  @IsNotEmpty()
  githubUsername!: string

  @IsString()
  @IsOptional()
  accessToken?: string
}
