import { IsNotEmpty, IsUUID } from 'class-validator'
export class ExtractReadmeDto {
  @IsUUID()
  @IsNotEmpty()
  repoId!: string
}
