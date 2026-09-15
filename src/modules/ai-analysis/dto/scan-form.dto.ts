import { IsString, IsObject, IsOptional, IsInt, IsArray, ValidateNested, IsBoolean, IsNumber } from 'class-validator'
import { Type } from 'class-transformer'

class ProjectScaleContext {
  @IsOptional()
  @IsNumber()
  maxConcurrentUsers?: number

  @IsOptional()
  @IsString()
  databaseVolume?: string

  @IsOptional()
  @IsBoolean()
  hasProductionIncidentHandling?: boolean
}

class DomainProficiencyContext {
  @IsOptional()
  @IsInt()
  systemDesign?: number

  @IsOptional()
  @IsInt()
  databaseTuning?: number

  @IsOptional()
  @IsInt()
  testingAndQA?: number

  @IsOptional()
  @IsInt()
  securityBasics?: number
}

export class ScanFormDto {
  @IsString()
  targetRole!: string // VD: "C/C++ Junior", "Embedded Developer", "Backend Developer"

  @IsOptional()
  @IsNumber()
  yearsOfExperience?: number // Có thể để 0 hoặc bỏ trống nếu là người mới hoàn toàn

  @IsObject()
  selfAssessment!: Record<string, number> // Bắt buộc hoặc flexible: { "C": 2, "Pointers": 1 }

  @IsOptional()
  @ValidateNested()
  @Type(() => DomainProficiencyContext)
  domainProficiency?: DomainProficiencyContext // Optional cho beginner

  @IsOptional()
  @ValidateNested()
  @Type(() => ProjectScaleContext)
  projectScale?: ProjectScaleContext // Optional cho beginner

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keyAchievements?: string[] // Optional

  @IsString()
  cvSummaryText!: string // Tự do mô tả (vd: "Em mới học C đến con trỏ, chưa làm project thực tế nào lớn.")
}
