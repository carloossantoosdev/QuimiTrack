import { textoObrigatorio } from '../text'

export class ResponsavelTecnico {
  private constructor(
    readonly nome: string,
    readonly registro: string,
  ) {}

  static criar(nome: string, registro: string): ResponsavelTecnico {
    return new ResponsavelTecnico(
      textoObrigatorio(nome, 'Nome do responsável técnico', 160),
      textoObrigatorio(registro, 'Registro do responsável técnico', 60),
    )
  }
}
