import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator'

export class CoreCourseDto {
  @ApiProperty({
    example: 'Cơ sở dữ liệu',
    description: 'Tên môn học',
  })
  @IsString()
  @IsNotEmpty()
  courseName: string | undefined

  @ApiProperty({
    example: 'A',
    description: 'Điểm môn học (A, B+, C,...)',
  })
  @IsString()
  @IsNotEmpty()
  grade: string | undefined
}

export class AcademicFormDto {
  @ApiPropertyOptional({
    example: 'Đại học Bách Khoa',
    description: 'Tên trường đại học',
  })
  @IsString()
  @IsOptional()
  universityName?: string

  @ApiPropertyOptional({
    example: 3,
    description: 'Năm học hiện tại',
  })
  @IsInt()
  @IsOptional()
  currentYear?: number

  @ApiPropertyOptional({
    type: [CoreCourseDto],
    description: 'Danh sách các môn học chuyên ngành',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoreCourseDto)
  @IsOptional()
  coreCourses?: CoreCourseDto[]
}

export class GenerateSkillTreeDto {
  @ApiProperty({
    example: 'Backend Developer',
    description: 'Vị trí mục tiêu mong muốn (BẮT BUỘC)',
  })
  @IsString()
  @IsNotEmpty()
  targetRole: string | undefined

  @ApiPropertyOptional({
    example: 'octocat',
    description: 'Username hoặc URL GitHub (Truyền khi chọn Mode 2: GitHub Only hoặc Mode 3: Hybrid)',
  })
  @IsString()
  @IsOptional()
  githubUsername?: string

  @ApiPropertyOptional({
    type: AcademicFormDto,
    description: 'Thông tin bảng điểm/CV (Truyền khi chọn Mode 1: CV Only hoặc Mode 3: Hybrid)',
  })
  @ValidateNested()
  @Type(() => AcademicFormDto)
  @IsOptional()
  academicForm?: AcademicFormDto
}
