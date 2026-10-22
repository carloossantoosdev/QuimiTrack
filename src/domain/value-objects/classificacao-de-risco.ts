import { textoObrigatorio } from '../text'

export class ClassificacaoDeRisco {
  private constructor(readonly valor: string) {}

  static criar(valor: string): ClassificacaoDeRisco {
    return new ClassificacaoDeRisco(textoObrigatorio(valor, 'Classe de risco', 40))
  }
}
