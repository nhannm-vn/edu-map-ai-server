import type { Request } from 'express'

export class RequestWithUser extends Request {
  user!: {
    id: string
    email: string
    role: string
  }
}
