import { Skill, SkillTree, SkillTreeNode } from '@prisma/client'

export type SkillTreeNodeWithSkill = SkillTreeNode & {
  skill: Skill
  children?: SkillTreeNodeWithSkill[]
}

export type SkillTreeWithNodes = SkillTree & {
  nodes: SkillTreeNodeWithSkill[]
}

export interface TreeProgressResponse {
  treeId: string
  careerPath: string
  completionPercentage: number
  completedCount: number
  totalNodes: number
  nodes: SkillTreeNodeWithSkill[]
}
