import type { CargaQuimica } from '../entities/carga-quimica'
import type { StatusCarga } from '../enums'

export interface CargaQuimicaRepository {
  save(carga: CargaQuimica): Promise<void>
  findById(id: string): Promise<CargaQuimica | null>
  list(filtro?: { status?: StatusCarga }): Promise<CargaQuimica[]>
}
