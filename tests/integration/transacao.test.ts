import { expect, it } from 'vitest'
import { criarCarga, criarProduto, transicionar, usarApi } from './helpers'

const api = usarApi()

it('desfaz status e histórico quando a gravação do histórico falha', async () => {
  const app = api.obter()
  const produto = await criarProduto(app)
  const carga = await criarCarga(app, produto.id)
  const id = carga.body.id as string
  expect((await transicionar(app, id, 'EM_ANALISE')).statusCode).toBe(200)

  await app.prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION quimitrack_falhar_historico()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $func$
    BEGIN
      IF NEW.motivo = 'FALHA_FORCADA' THEN
        RAISE EXCEPTION 'falha transacional forcada';
      END IF;
      RETURN NEW;
    END;
    $func$;
  `)
  await app.prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS trg_quimitrack_falhar_historico ON historico_cargas')
  await app.prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_quimitrack_falhar_historico
    BEFORE INSERT ON historico_cargas
    FOR EACH ROW
    EXECUTE FUNCTION quimitrack_falhar_historico()
  `)

  try {
    const bloqueio = await app.inject({
      method: 'PATCH',
      url: `/api/v1/cargas-quimicas/${id}/bloquear`,
      payload: { solicitante: 'qualidade', motivo: 'FALHA_FORCADA' },
    })
    expect(bloqueio.statusCode).toBe(500)
    expect(bloqueio.json().message).toBe('Erro interno.')
    expect(JSON.stringify(bloqueio.json())).not.toContain('falha transacional')

    const salva = await app.prisma.cargaQuimica.findUnique({ where: { id }, include: { historico: true } })
    expect(salva?.status).toBe('EM_ANALISE')
    expect(salva?.historico.some((evento) => evento.motivo === 'FALHA_FORCADA')).toBe(false)
    expect(salva?.historico.some((evento) => evento.statusNovo === 'BLOQUEADA')).toBe(false)
  } finally {
    await app.prisma.$executeRawUnsafe(
      'DROP TRIGGER IF EXISTS trg_quimitrack_falhar_historico ON historico_cargas',
    )
  }
})
