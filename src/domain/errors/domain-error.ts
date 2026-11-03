export class DomainError extends Error {
  readonly code: string
  readonly details?: string[]

  constructor(code: string, message: string, details?: string[]) {
    super(message)
    this.name = 'DomainError'
    this.code = code
    this.details = details
  }
}
