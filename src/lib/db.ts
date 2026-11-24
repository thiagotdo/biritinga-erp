/**
 * src/lib/db.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Camada de acesso a dados via mysql2 - substitui Prisma onde o engine nativo
 * do Prisma falha com MySQL 8.0 / sha256_password do cPanel.
 *
 * Uso idêntico ao Prisma:
 *   import { db } from '@/lib/db'
 *   const rows = await db.empenho.findMany({ where: { municipioId }, take: 50 })
 *   const row  = await db.empenho.findFirst({ where: { id } })
 *   const novo = await db.empenho.create({ data: { ... } })
 *   await db.empenho.update({ where: { id }, data: { ... } })
 *   const n    = await db.empenho.count({ where: { municipioId } })
 *   const res  = await db.$queryRaw`SELECT ...`
 *   const res  = await db.$transaction(async (tx) => { ... })
 */

import mysql, { type Connection, type RowDataPacket } from 'mysql2/promise'

// ─── Conexão ──────────────────────────────────────────────────────────────────

function parseDbUrl(url: string) {
  const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)
  if (!m) throw new Error('DATABASE_URL inválida')
  return {
    user:     m[1],
    password: decodeURIComponent(m[2]),
    host:     m[3],
    port:     parseInt(m[4]),
    database: m[5].split('?')[0],
  }
}

let _pool: mysql.Pool | null = null

function getPool(): mysql.Pool {
  if (!_pool) {
    const cfg = parseDbUrl(process.env.DATABASE_URL ?? '')
    _pool = mysql.createPool({
      ...cfg,
      ssl:              { rejectUnauthorized: false },
      waitForConnections: true,
      connectionLimit:    5,
      queueLimit:         0,
      timezone:           '-03:00',
    })
  }
  return _pool
}

export async function getConn(): Promise<Connection> {
  const cfg = parseDbUrl(process.env.DATABASE_URL ?? '')
  return mysql.createConnection({
    ...cfg,
    ssl:      { rejectUnauthorized: false },
    timezone: '-03:00',
  })
}

// ─── Helpers de conversão ─────────────────────────────────────────────────────

type WhereClause = Record<string, any>
type OrderByClause = Record<string, 'asc' | 'desc'>

/** Converte { id, municipioId, status: { in: [...] } } → SQL WHERE + params */
function buildWhere(where?: WhereClause): { sql: string; params: any[] } {
  if (!where || !Object.keys(where).length) return { sql: '', params: [] }
  const parts: string[] = []
  const params: any[]   = []

  for (const [key, val] of Object.entries(where)) {
    if (key === 'OR') {
      const sub = (val as WhereClause[]).map(w => {
        const { sql, params: p } = buildWhere(w)
        params.push(...p)
        return `(${sql.replace(/^WHERE /i, '')})`
      })
      parts.push(`(${sub.join(' OR ')})`)
    } else if (key === 'AND') {
      const sub = (val as WhereClause[]).map(w => {
        const { sql, params: p } = buildWhere(w)
        params.push(...p)
        return `(${sql.replace(/^WHERE /i, '')})`
      })
      parts.push(`(${sub.join(' AND ')})`)
    } else if (val === null) {
      parts.push(`\`${key}\` IS NULL`)
    } else if (typeof val === 'object' && !Array.isArray(val)) {
      if ('in' in val)           { parts.push(`\`${key}\` IN (${val.in.map(() => '?').join(',')})`) ; params.push(...val.in) }
      else if ('notIn' in val)   { parts.push(`\`${key}\` NOT IN (${val.notIn.map(() => '?').join(',')})`) ; params.push(...val.notIn) }
      else if ('gte' in val)     { parts.push(`\`${key}\` >= ?`);  params.push(val.gte) }
      else if ('lte' in val)     { parts.push(`\`${key}\` <= ?`);  params.push(val.lte) }
      else if ('gt' in val)      { parts.push(`\`${key}\` > ?`);   params.push(val.gt) }
      else if ('lt' in val)      { parts.push(`\`${key}\` < ?`);   params.push(val.lt) }
      else if ('contains' in val){ parts.push(`\`${key}\` LIKE ?`);params.push(`%${val.contains}%`) }
      else if ('startsWith' in val){ parts.push(`\`${key}\` LIKE ?`);params.push(`${val.startsWith}%`) }
      else if ('not' in val)     {
        if (val.not === null) { parts.push(`\`${key}\` IS NOT NULL`) }
        else { parts.push(`\`${key}\` != ?`); params.push(val.not) }
      }
    } else {
      parts.push(`\`${key}\` = ?`)
      params.push(val)
    }
  }

  return { sql: parts.length ? `WHERE ${parts.join(' AND ')}` : '', params }
}

function buildOrderBy(orderBy?: OrderByClause | OrderByClause[]): string {
  if (!orderBy) return ''
  const arr = Array.isArray(orderBy) ? orderBy : [orderBy]
  const parts = arr.flatMap(o => Object.entries(o).map(([k, v]) => `\`${k}\` ${v.toUpperCase()}`))
  return parts.length ? `ORDER BY ${parts.join(', ')}` : ''
}

// ─── Model genérico ───────────────────────────────────────────────────────────

interface FindManyArgs {
  where?:   WhereClause
  orderBy?: OrderByClause | OrderByClause[]
  take?:    number
  skip?:    number
  select?:  Record<string, boolean>
}

interface FindFirstArgs {
  where?:   WhereClause
  orderBy?: OrderByClause | OrderByClause[]
  select?:  Record<string, boolean>
}

interface CreateArgs { data: Record<string, any> }

interface UpdateArgs {
  where: WhereClause
  data:  Record<string, any>
}

interface UpdateManyArgs {
  where: WhereClause
  data:  Record<string, any>
}

interface DeleteArgs  { where: WhereClause }
interface CountArgs   { where?: WhereClause }

interface UpsertArgs {
  where:  WhereClause
  create: Record<string, any>
  update: Record<string, any>
}

function makeModel(table: string) {
  const pool = () => getPool()

  async function findMany(args: FindManyArgs = {}) {
    const { sql: w, params: wp } = buildWhere(args.where)
    const ob  = buildOrderBy(args.orderBy)
    const lim = args.take  ? `LIMIT ${args.take}`        : ''
    const off = args.skip  ? `OFFSET ${args.skip}`       : ''
    const sel = args.select
      ? Object.entries(args.select).filter(([,v]) => v).map(([k]) => `\`${k}\``).join(', ')
      : '*'
    const q = `SELECT ${sel} FROM \`${table}\` ${w} ${ob} ${lim} ${off}`.trim()
    const [rows] = await pool().execute<RowDataPacket[]>(q, wp)
    return rows
  }

  async function findFirst(args: FindFirstArgs = {}) {
    const rows = await findMany({ ...args, take: 1 })
    return rows[0] ?? null
  }

  async function findUnique(args: { where: WhereClause }) {
    return findFirst(args)
  }

  async function create(args: CreateArgs) {
    const data = { ...args.data }
    // Serializar arrays/objetos como JSON
    for (const [k, v] of Object.entries(data)) {
      if (typeof v === 'object' && v !== null && !(v instanceof Date)) {
        data[k] = JSON.stringify(v)
      }
    }
    const keys   = Object.keys(data).map(k => `\`${k}\``).join(', ')
    const placeholders = Object.keys(data).map(() => '?').join(', ')
    const vals   = Object.values(data)
    const q      = `INSERT INTO \`${table}\` (${keys}) VALUES (${placeholders})`
    const [res]  = await pool().execute(q, vals) as any
    // Retornar o registro inserido
    return findFirst({ where: { id: data.id ?? res.insertId } }) ?? data
  }

  async function update(args: UpdateArgs) {
    const { sql: w, params: wp } = buildWhere(args.where)
    const data = { ...args.data }
    for (const [k, v] of Object.entries(data)) {
      if (typeof v === 'object' && v !== null && !(v instanceof Date)) {
        if ('increment' in (v as any)) { data[k] = { __raw: `\`${k}\` + ${(v as any).increment}` }; continue }
        if ('decrement' in (v as any)) { data[k] = { __raw: `\`${k}\` - ${(v as any).decrement}` }; continue }
        data[k] = JSON.stringify(v)
      }
    }
    const setParts: string[] = []
    const setParams: any[]   = []
    for (const [k, v] of Object.entries(data)) {
      if (typeof v === 'object' && v !== null && '__raw' in (v as any)) {
        setParts.push(`\`${k}\` = ${(v as any).__raw}`)
      } else {
        setParts.push(`\`${k}\` = ?`)
        setParams.push(v)
      }
    }
    const q = `UPDATE \`${table}\` SET ${setParts.join(', ')} ${w}`
    await pool().execute(q, [...setParams, ...wp])
    return findFirst({ where: args.where }) ?? args.data
  }

  async function updateMany(args: UpdateManyArgs) {
    const { sql: w, params: wp } = buildWhere(args.where)
    const setParts = Object.keys(args.data).map(k => `\`${k}\` = ?`)
    const setParams = Object.values(args.data)
    const q = `UPDATE \`${table}\` SET ${setParts.join(', ')} ${w}`
    const [res] = await pool().execute(q, [...setParams, ...wp]) as any
    return { count: res.affectedRows }
  }

  async function upsert(args: UpsertArgs) {
    const existing = await findFirst({ where: args.where })
    if (existing) return update({ where: args.where, data: args.update })
    return create({ data: args.create })
  }

  async function deleteOne(args: DeleteArgs) {
    const row = await findFirst({ where: args.where })
    const { sql: w, params: wp } = buildWhere(args.where)
    await pool().execute(`DELETE FROM \`${table}\` ${w}`, wp)
    return row
  }

  async function deleteMany(args: { where?: WhereClause } = {}) {
    const { sql: w, params: wp } = buildWhere(args.where)
    const [res] = await pool().execute(`DELETE FROM \`${table}\` ${w}`, wp) as any
    return { count: res.affectedRows }
  }

  async function count(args: CountArgs = {}) {
    const { sql: w, params: wp } = buildWhere(args.where)
    const [rows] = await pool().execute<RowDataPacket[]>(`SELECT COUNT(*) as n FROM \`${table}\` ${w}`, wp)
    return Number((rows[0] as any).n)
  }

  async function aggregate(args: { where?: WhereClause; _sum?: Record<string, boolean>; _count?: boolean }) {
    const { sql: w, params: wp } = buildWhere(args.where)
    const selects: string[] = []
    if (args._count) selects.push('COUNT(*) as _count')
    if (args._sum) {
      for (const k of Object.keys(args._sum)) selects.push(`SUM(\`${k}\`) as _sum_${k}`)
    }
    if (!selects.length) selects.push('COUNT(*) as _count')
    const [rows] = await pool().execute<RowDataPacket[]>(`SELECT ${selects.join(', ')} FROM \`${table}\` ${w}`, wp)
    const r = rows[0] as any
    const result: any = {}
    if (args._count) result._count = Number(r._count)
    if (args._sum) {
      result._sum = {}
      for (const k of Object.keys(args._sum)) result._sum[k] = Number(r[`_sum_${k}`] ?? 0)
    }
    return result
  }

  return { findMany, findFirst, findUnique, create, update, updateMany, upsert, delete: deleteOne, deleteMany, count, aggregate }
}

// ─── $queryRaw e $transaction ─────────────────────────────────────────────────

async function $queryRaw(strings: TemplateStringsArray, ...values: any[]) {
  const sql = strings.reduce((acc, s, i) => acc + s + (i < values.length ? '?' : ''), '')
  const [rows] = await getPool().execute<RowDataPacket[]>(sql, values)
  return rows
}

async function $executeRaw(strings: TemplateStringsArray, ...values: any[]) {
  const sql = strings.reduce((acc, s, i) => acc + s + (i < values.length ? '?' : ''), '')
  const [res] = await getPool().execute(sql, values) as any
  return res.affectedRows
}

async function $transaction<T>(fn: (tx: typeof db) => Promise<T>): Promise<T> {
  const conn = await getConn()
  await conn.beginTransaction()
  try {
    // Criar uma instância do db usando essa conexão específica
    const txDb = makeTxDb(conn)
    const result = await fn(txDb)
    await conn.commit()
    return result
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    await conn.end()
  }
}

/** Versão do db que usa uma conexão única (para transações) */
function makeTxDb(conn: Connection) {
  function makeModelTx(table: string) {
    async function findMany(args: FindManyArgs = {}) {
      const { sql: w, params: wp } = buildWhere(args.where)
      const ob  = buildOrderBy(args.orderBy)
      const lim = args.take ? `LIMIT ${args.take}` : ''
      const off = args.skip ? `OFFSET ${args.skip}` : ''
      const q = `SELECT * FROM \`${table}\` ${w} ${ob} ${lim} ${off}`.trim()
      const [rows] = await conn.execute<RowDataPacket[]>(q, wp)
      return rows
    }
    async function findFirst(args: FindFirstArgs = {}) {
      return (await findMany({ ...args, take: 1 }))[0] ?? null
    }
    async function findUnique(args: { where: WhereClause }) { return findFirst(args) }
    async function create(args: CreateArgs) {
      const data = { ...args.data }
      for (const [k, v] of Object.entries(data)) {
        if (typeof v === 'object' && v !== null && !(v instanceof Date)) data[k] = JSON.stringify(v)
      }
      const keys  = Object.keys(data).map(k => `\`${k}\``).join(', ')
      const ph    = Object.keys(data).map(() => '?').join(', ')
      await conn.execute(`INSERT INTO \`${table}\` (${keys}) VALUES (${ph})`, Object.values(data))
      return findFirst({ where: { id: data.id } }) ?? data
    }
    async function update(args: UpdateArgs) {
      const { sql: w, params: wp } = buildWhere(args.where)
      const data = { ...args.data }
      const setParts: string[] = []
      const setParams: any[] = []
      for (const [k, v] of Object.entries(data)) {
        if (typeof v === 'object' && v !== null && '__raw' in (v as any)) {
          setParts.push(`\`${k}\` = ${(v as any).__raw}`)
        } else if (typeof v === 'object' && v !== null && 'increment' in (v as any)) {
          setParts.push(`\`${k}\` = \`${k}\` + ${(v as any).increment}`)
        } else {
          setParts.push(`\`${k}\` = ?`)
          setParams.push(typeof v === 'object' && v !== null && !(v instanceof Date) ? JSON.stringify(v) : v)
        }
      }
      await conn.execute(`UPDATE \`${table}\` SET ${setParts.join(', ')} ${w}`, [...setParams, ...wp])
      return findFirst({ where: args.where }) ?? data
    }
    async function updateMany(args: UpdateManyArgs) {
      const { sql: w, params: wp } = buildWhere(args.where)
      const setParts = Object.keys(args.data).map(k => `\`${k}\` = ?`)
      const [res] = await conn.execute(`UPDATE \`${table}\` SET ${setParts.join(', ')} ${w}`, [...Object.values(args.data), ...wp]) as any
      return { count: res.affectedRows }
    }
    async function count(args: CountArgs = {}) {
      const { sql: w, params: wp } = buildWhere(args.where)
      const [rows] = await conn.execute<RowDataPacket[]>(`SELECT COUNT(*) as n FROM \`${table}\` ${w}`, wp)
      return Number((rows[0] as any).n)
    }
    async function deleteOne(args: DeleteArgs) {
      const row = await findFirst({ where: args.where })
      const { sql: w, params: wp } = buildWhere(args.where)
      await conn.execute(`DELETE FROM \`${table}\` ${w}`, wp)
      return row
    }
    async function deleteMany(args: { where?: WhereClause } = {}) {
      const { sql: w, params: wp } = buildWhere(args.where)
      const [res] = await conn.execute(`DELETE FROM \`${table}\` ${w}`, wp) as any
      return { count: res.affectedRows }
    }
    async function aggregate(args: { where?: WhereClause; _sum?: Record<string, boolean>; _count?: boolean }) {
      const { sql: w, params: wp } = buildWhere(args.where)
      const selects: string[] = []
      if (args._count) selects.push('COUNT(*) as _count')
      if (args._sum) for (const k of Object.keys(args._sum)) selects.push(`SUM(\`${k}\`) as _sum_${k}`)
      if (!selects.length) selects.push('COUNT(*) as _count')
      const [rows] = await conn.execute<RowDataPacket[]>(`SELECT ${selects.join(', ')} FROM \`${table}\` ${w}`, wp)
      const r = rows[0] as any
      const result: any = {}
      if (args._count) result._count = Number(r._count)
      if (args._sum) { result._sum = {}; for (const k of Object.keys(args._sum)) result._sum[k] = Number(r[`_sum_${k}`] ?? 0) }
      return result
    }
    return { findMany, findFirst, findUnique, create, update, updateMany, delete: deleteOne, deleteMany, count, aggregate }
  }

  // Mesmo conjunto de models
  return {
    ...Object.fromEntries(DB_TABLES.map(t => [t, makeModelTx(t)])),
    $queryRaw: async (strings: TemplateStringsArray, ...values: any[]) => {
      const sql = strings.reduce((acc, s, i) => acc + s + (i < values.length ? '?' : ''), '')
      const [rows] = await conn.execute<RowDataPacket[]>(sql, values)
      return rows
    },
    $executeRaw: async (strings: TemplateStringsArray, ...values: any[]) => {
      const sql = strings.reduce((acc, s, i) => acc + s + (i < values.length ? '?' : ''), '')
      const [res] = await conn.execute(sql, values) as any
      return res.affectedRows
    },
  } as unknown as typeof db
}

// ─── Lista de tabelas (models) ────────────────────────────────────────────────

const DB_TABLES = [
  // Core
  'Municipio', 'Usuario', 'Sessao', 'Perfil', 'AuditLog',
  // SEFIN
  'LOA', 'LDO', 'PPA', 'OrcamentoUnidade', 'Dotacao',
  'Empenho', 'Liquidacao', 'Pagamento',
  'ReceitaPrevista', 'LancamentoReceita',
  'ContaBancaria', 'Fornecedor',
  // SEMAD / RH
  'Cargo', 'Departamento', 'Unidade', 'Servidor',
  'FeriasServidor', 'AfastamentoServidor',
  'FolhaPagamento', 'Contracheque', 'Rubrica',
  // SEMSA
  'UnidadeSaude', 'ProfissionalSaude', 'Paciente',
  'Agendamento', 'Atendimento', 'EquipeESF',
  'RegistroVacinacao', 'OcorrenciaEpidemiologica',
  'ItemFarmacia', 'MovimentoFarmacia',
  // SEDUC
  'Escola', 'ServidorEducacao', 'Turma', 'Aluno',
  'Matricula', 'RegistroFrequencia', 'CardapioMerenda', 'VeiculoTransporte',
  // SECOM
  'Noticia', 'EventoAgenda', 'Midia', 'AlbumMidia',
  // SEMMA
  'LicencaAmbiental', 'AutoInfracaoAmbiental', 'ArvoreUrbana',
  'ProdutorRural', 'PropriedadeRural',
  // SEMOB / Obras
  'Obra', 'ObraPublica', 'MedicaoObra', 'Alvara', 'FiscalizacaoObra', 'EtapaCronograma',
  // Frota
  'Veiculo', 'Motorista', 'Abastecimento', 'Manutencao', 'UtilizacaoVeiculo',
  // Patrimônio
  'Bem', 'BemPatrimonial', 'Inventario', 'MovimentacaoPatrimonial',
  // Tributação
  'ImovelUrbano', 'Contribuinte', 'GuiaISS', 'DividaAtiva', 'ParcelamentoIPTU',
  // Licitações
  'Licitacao', 'ItemLicitacao', 'Contrato',
  'LoteLicitacao', 'ParticipanteLicitacao',
  // Portal / Ouvidoria / e-SIC
  'Demanda', 'RespostaDemanda', 'SolicitacaoSIC', 'RespostaSIC',
  'Manifestacao', 'MovimentacaoManifestacao', 'RespostaManifestacao',
  'PedidoAcesso', 'RecursoPedido', 'TramitacaoPedido',
  'TransparenciaAtiva', 'PublicacaoTransparencia',
  // Transparência
  'PortalTransparencia', 'DespesaOrcamentaria',
  // Assistência Social (SUAS)
  'UnidadeSuas', 'FamiliaReferenciada', 'AtendimentoSuas', 'BeneficioFamilia',
  // SEFIN extra
  'ReceitaOrcamentaria', 'Folha', 'ExercicioOrcamentario', 'Orcamento',
  // Protocolo e tramitação
  'Protocolo', 'Tramitacao',
  // Almoxarifado
  'CatalogoMaterial', 'Requisicao', 'EntradaEstoque', 'MovimentacaoEstoque',
  'ItemAlmoxarifado',
  // Protocolo tramitação
  'ProtocoloTramitacao', 'ContratoAdm',
  // Convênios
  'Convenio',
  // Diárias
  'Diaria',
] as const

type DbModels = {
  [K in typeof DB_TABLES[number]]: ReturnType<typeof makeModel>
}

// ─── Instância exportada ──────────────────────────────────────────────────────

export const db = {
  ...Object.fromEntries(DB_TABLES.map(t => [t, makeModel(t)])) as DbModels,
  $queryRaw,
  $executeRaw,
  $transaction,
} as DbModels & {
  $queryRaw:    typeof $queryRaw
  $executeRaw:  typeof $executeRaw
  $transaction: typeof $transaction
}

// Alias para compatibilidade com código que usa `prisma`
export { db as prisma }

export default db
