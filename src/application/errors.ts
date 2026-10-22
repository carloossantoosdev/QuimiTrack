export class NotFoundError extends Error {
  readonly code = 'NAO_ENCONTRADO'

  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}
