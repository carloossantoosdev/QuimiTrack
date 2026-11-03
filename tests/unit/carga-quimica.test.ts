import { describe, expect, it } from 'vitest'
import { CargaQuimica } from '../../src/domain/entities/carga-quimica'
import { DomainError } from '../../src/domain/errors/domain-error'

const agora = new Date('2026-10-22T15:00:00.000Z')
const amanha = new Date('2026-10-23T00:00:00.000Z')
const ontem = new Date('2026-10-21T00:00:00.000Z')

function cargaRegistrada(ativo = true) {
  return CargaQuimica.registrar({
    codigo: 'CG-1',
    produto: { id: 'produto-1', ativo, classeRisco: '8' },
    quantidade: 10,
    unidadeMedida: 't',
    origem: 'Santos',
    destino: 'Cubatão',
    responsavelNome: 'Marina Alves',
    responsavelRegistro: 'CRQ-12345',
    dataEntrada: new Date('2026-10-22T00:00:00.000Z'),
    solicitante: 'operador',
    now: agora,
  })
}

function validarObrigatorio(carga: CargaQuimica, validade: Date | null = amanha) {
  const documentoId = carga.anexarDocumento(
    { tipo: 'Ficha de emergência', obrigatorio: true, validade },
    'analista',
    agora,
  )
  carga.validarDocumento(documentoId, 'VALIDO', null, 'analista', agora)
}

describe('CargaQuimica', () => {
  it('registra carga válida copiando a classificação do produto', () => {
    const carga = cargaRegistrada()
    expect(carga.status).toBe('REGISTRADA')
    expect(carga.classificacaoRisco).toBe('8')
    expect(carga.historico[0]).toMatchObject({
      acao: 'REGISTRO',
      statusAnterior: null,
      statusNovo: 'REGISTRADA',
      solicitante: 'operador',
    })
    expect(carga.historico[0]?.ocorridoEm).toEqual(agora)
  })

  it('rejeita produto inativo', () => {
    expect(() => cargaRegistrada(false)).toThrow(DomainError)
  })

  it.each([0, -1, 0.0004, 1.2345])('rejeita quantidade %s', (quantidade) => {
    expect(() =>
      CargaQuimica.registrar({
        codigo: 'CG-1',
        produto: { id: 'produto-1', ativo: true, classeRisco: '8' },
        quantidade,
        unidadeMedida: 't',
        origem: 'Santos',
        destino: 'Cubatão',
        responsavelNome: 'Marina Alves',
        responsavelRegistro: 'CRQ-12345',
        dataEntrada: agora,
        solicitante: 'operador',
        now: agora,
      }),
    ).toThrow(/quantidade/i)
  })

  it('rejeita responsável técnico ausente', () => {
    expect(() =>
      CargaQuimica.registrar({
        codigo: 'CG-1',
        produto: { id: 'produto-1', ativo: true, classeRisco: '8' },
        quantidade: 1,
        unidadeMedida: 't',
        origem: 'Santos',
        destino: 'Cubatão',
        responsavelNome: ' ',
        responsavelRegistro: 'CRQ-1',
        dataEntrada: agora,
        solicitante: 'operador',
        now: agora,
      }),
    ).toThrow(DomainError)
  })

  it('libera em análise quando a inspeção não é necessária e a documentação está válida', () => {
    const carga = cargaRegistrada()
    carga.iniciarAnalise('operador', agora)
    validarObrigatorio(carga)
    carga.liberar('autorizado', agora)
    expect(carga.status).toBe('LIBERADA')
  })

  it('não libera sem documento obrigatório válido', () => {
    const carga = cargaRegistrada()
    carga.iniciarAnalise('operador', agora)
    expect(() => carga.liberar('autorizado', agora)).toThrow(/Documentação obrigatória ausente/)
    expect(carga.status).toBe('EM_ANALISE')
  })

  it('não libera documento obrigatório vencido', () => {
    const carga = cargaRegistrada()
    carga.iniciarAnalise('operador', agora)
    validarObrigatorio(carga, ontem)
    expect(() => carga.liberar('autorizado', agora)).toThrow(/vencido/)
    expect(carga.status).toBe('EM_ANALISE')
  })

  it('ignora documento não obrigatório inválido quando existe obrigatório válido', () => {
    const carga = cargaRegistrada()
    carga.iniciarAnalise('operador', agora)
    validarObrigatorio(carga)
    const acessorio = carga.anexarDocumento({ tipo: 'Foto', obrigatorio: false }, 'analista', agora)
    carga.validarDocumento(acessorio, 'INVALIDO', null, 'analista', agora)
    carga.liberar('autorizado', agora)
    expect(carga.status).toBe('LIBERADA')
  })

  it('não libera inspeção exigida sem resultado aprovado', () => {
    const carga = cargaRegistrada()
    carga.iniciarAnalise('operador', agora)
    validarObrigatorio(carga)
    carga.solicitarInspecao('qualidade', agora)
    expect(() => carga.liberar('autorizado', agora)).toThrow(/aprovado/)
    expect(carga.status).toBe('EM_INSPECAO')
    expect(carga.inspecaoNecessaria).toBe(true)
    expect(carga.inspecao?.resultado).toBe('PENDENTE')
  })

  it('não contorna a inspeção necessária voltando para análise', () => {
    const carga = cargaRegistrada()
    carga.iniciarAnalise('operador', agora)
    validarObrigatorio(carga)
    carga.solicitarInspecao('qualidade', agora)
    carga.registrarResultadoInspecao('APROVADA', null, 'qualidade', agora)
    carga.devolverInspecaoParaAnalise('qualidade', agora)
    expect(carga.inspecao?.resultado).toBe('PENDENTE')
    expect(() => carga.liberar('autorizado', agora)).toThrow(/fora de EM_INSPECAO/)
    expect(carga.status).toBe('EM_ANALISE')
  })

  it('libera o fluxo oficial depois da inspeção aprovada', () => {
    const carga = cargaRegistrada()
    carga.iniciarAnalise('operador', agora)
    carga.solicitarInspecao('qualidade', agora)
    carga.registrarResultadoInspecao('APROVADA', 'conforme', 'qualidade', agora)
    validarObrigatorio(carga)
    carga.liberar('autorizado', agora)
    carga.iniciarMovimentacao('operador', agora)
    carga.finalizar('operador', agora)
    expect(carga.status).toBe('FINALIZADA')
    expect(carga.inspecao?.resultado).toBe('APROVADA')
  })

  it('retorna carga bloqueada para análise sem liberá-la', () => {
    const carga = cargaRegistrada()
    carga.iniciarAnalise('operador', agora)
    carga.bloquear('vazamento', 'foto-1', 'qualidade', agora)
    expect(carga.status).toBe('BLOQUEADA')
    carga.retornarParaAnalise('qualidade', agora)
    expect(carga.status).toBe('EM_ANALISE')
    expect(carga.historico.at(-1)?.acao).toBe('RETORNO_ANALISE')
    expect(carga.historico.at(-1)?.statusNovo).toBe('EM_ANALISE')
  })

  it('não movimenta carga bloqueada nem libera carga cancelada', () => {
    const bloqueada = cargaRegistrada()
    bloqueada.iniciarAnalise('operador', agora)
    bloqueada.bloquear('risco', null, 'qualidade', agora)
    expect(() => bloqueada.iniciarMovimentacao('operador', agora)).toThrow(DomainError)
    expect(bloqueada.status).toBe('BLOQUEADA')

    const cancelada = cargaRegistrada()
    cancelada.cancelar('desistência', 'operador', agora)
    expect(() => cancelada.liberar('autorizado', agora)).toThrow(DomainError)
    expect(cancelada.status).toBe('CANCELADA')
  })

  it('não finaliza carga em inspeção e não altera estado terminal', () => {
    const carga = cargaRegistrada()
    carga.iniciarAnalise('operador', agora)
    carga.solicitarInspecao('qualidade', agora)
    expect(() => carga.finalizar('operador', agora)).toThrow(DomainError)
    expect(carga.status).toBe('EM_INSPECAO')

    carga.cancelar('encerrado', 'operador', agora)
    expect(() => carga.anexarDocumento({ tipo: 'Laudo', obrigatorio: true }, 'analista', agora)).toThrow(
      /cancelada/i,
    )
  })

  it('documento anexado nasce pendente e a validação não muda o status da carga', () => {
    const carga = cargaRegistrada()
    const id = carga.anexarDocumento({ tipo: 'Ficha', obrigatorio: true }, 'analista', agora)
    expect(carga.documentos[0]?.statusValidacao).toBe('PENDENTE')
    carga.validarDocumento(id, 'VALIDO', null, 'analista', agora)
    expect(carga.status).toBe('REGISTRADA')
    expect(carga.documentos[0]?.validadoPor).toBe('analista')
  })

  it('rejeita bloqueio sem motivo', () => {
    const carga = cargaRegistrada()
    carga.iniciarAnalise('operador', agora)
    expect(() => carga.bloquear('  ', null, 'qualidade', agora)).toThrow(/Motivo/)
    expect(carga.status).toBe('EM_ANALISE')
  })
})
