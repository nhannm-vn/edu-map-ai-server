export interface SkillNodeResponse {
  id: string
  skillTreeId: string
  skillId: string
  nodeLevel: number
  priorityRank: number
  isCompleted: boolean
  completedAt: Date | null
  isVisible: boolean
  skill: {
    id: string
    name: string
    category: string
    description: string | null
  }
}

export interface MyTreeResponse {
  treeId: string
  careerPath: string
  completionPercentage: number
  completedCount: number
  totalNodes: number
  lastAnalyzedAt: Date | null
  nodes: SkillNodeResponse[]
}
