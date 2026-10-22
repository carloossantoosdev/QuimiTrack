import { buildApp } from './app'

async function main(): Promise<void> {
  const app = await buildApp({ habilitarLogHttp: true })
  const port = Number(process.env.PORT ?? 3000)
  await app.listen({ port, host: '0.0.0.0' })
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'falha ao iniciar'
  console.error(message)
  process.exit(1)
})
