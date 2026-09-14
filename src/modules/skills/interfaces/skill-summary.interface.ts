import { Skill, UserSkill } from '@prisma/client'

export type UserSkillWithRelation = UserSkill & {
  skill: Skill
}

export interface UserSkillsSummaryResponse {
  totalSkills: number
  totalHours: number
  topSkills: UserSkillWithRelation[]
  categoryStats: Record<string, number>
}
