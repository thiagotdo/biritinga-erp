/**
 * GET /api/migrate?secret=<SETUP_SECRET>
 * Cria (ou atualiza) todas as tabelas do ERP no MySQL.
 * Idempotente — usa CREATE TABLE IF NOT EXISTS.
 */
import { NextRequest, NextResponse } from 'next/server'
import mysql from 'mysql2/promise'

export const runtime = 'nodejs'
export const maxDuration = 60

function parseDbUrl(url: string) {
  const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)
  if (!m) throw new Error('DATABASE_URL inválida')
  return { user: m[1], password: decodeURIComponent(m[2]), host: m[3], port: parseInt(m[4]), database: m[5].split('?')[0] }
}

async function getConn() {
  const cfg = parseDbUrl(process.env.DATABASE_URL ?? '')
  return mysql.createConnection({ ...cfg, ssl: { rejectUnauthorized: false }, multipleStatements: true })
}

// ─── DDL de cada tabela (IF NOT EXISTS → idempotente) ─────────────────────────

const DDL: Array<{ nome: string; sql: string }> = [

  // ── Core ────────────────────────────────────────────────────────────────────
  {
    nome: 'Municipio',
    sql: `CREATE TABLE IF NOT EXISTS \`Municipio\` (
      id            VARCHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
      nome          VARCHAR(200) NOT NULL,
      uf            CHAR(2)      NOT NULL,
      ibge          VARCHAR(10),
      cnpj          VARCHAR(18),
      slug          VARCHAR(100) NOT NULL,
      dominio       VARCHAR(200),
      logoUrl       VARCHAR(500),
      brasaoUrl     VARCHAR(500),
      favicon       VARCHAR(500),
      corPrimaria   CHAR(7)      DEFAULT '#1B5E20',
      corSecundaria CHAR(7)      DEFAULT '#2E7D32',
      corAcento     CHAR(7)      DEFAULT '#F9A825',
      plano         ENUM('BASICO','AVANCADO','COMPLETO') NOT NULL DEFAULT 'BASICO',
      ativo         TINYINT(1)   NOT NULL DEFAULT 1,
      createdAt     DATETIME     NOT NULL DEFAULT NOW(),
      updatedAt     DATETIME     NOT NULL DEFAULT NOW() ON UPDATE NOW(),
      UNIQUE KEY uk_slug (slug)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  {
    nome: 'Usuario',
    sql: `CREATE TABLE IF NOT EXISTS \`Usuario\` (
      id          VARCHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
      municipioId VARCHAR(36)  NOT NULL,
      nome        VARCHAR(200) NOT NULL,
      email       VARCHAR(200) NOT NULL,
      senhaHash   VARCHAR(255) NOT NULL,
      perfil      ENUM('SUPER_ADMIN','ADMIN_MUNICIPIO','SECRETARIO','SERVIDOR','CIDADAO') NOT NULL DEFAULT 'SERVIDOR',
      secretaria  VARCHAR(50),
      ativo       TINYINT(1)   NOT NULL DEFAULT 1,
      createdAt   DATETIME     NOT NULL DEFAULT NOW(),
      updatedAt   DATETIME     NOT NULL DEFAULT NOW() ON UPDATE NOW(),
      UNIQUE KEY uk_email (email),
      KEY idx_municipio (municipioId),
      CONSTRAINT fk_usuario_municipio FOREIGN KEY (municipioId) REFERENCES \`Municipio\`(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  {
    nome: 'Sessao',
    sql: `CREATE TABLE IF NOT EXISTS \`Sessao\` (
      id           VARCHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
      usuarioId    VARCHAR(36)  NOT NULL,
      municipioId  VARCHAR(36)  NOT NULL,
      refreshToken TEXT         NOT NULL,
      userAgent    TEXT,
      ip           VARCHAR(45),
      expiraEm     DATETIME     NOT NULL,
      ativo        TINYINT(1)   NOT NULL DEFAULT 1,
      createdAt    DATETIME     NOT NULL DEFAULT NOW(),
      KEY idx_usuario (usuarioId),
      CONSTRAINT fk_sessao_usuario FOREIGN KEY (usuarioId) REFERENCES \`Usuario\`(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  {
    nome: 'AuditLog',
    sql: `CREATE TABLE IF NOT EXISTS \`AuditLog\` (
      id          BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
      municipioId VARCHAR(36)  NOT NULL,
      usuarioId   VARCHAR(36),
      entidade    VARCHAR(100) NOT NULL,
      entidadeId  VARCHAR(36),
      acao        VARCHAR(50)  NOT NULL,
      dadosAntes  JSON,
      dadosDepois JSON,
      ip          VARCHAR(45),
      createdAt   DATETIME     NOT NULL DEFAULT NOW(),
      KEY idx_municipio (municipioId),
      KEY idx_entidade (entidade, entidadeId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },

  // ── SEFIN — Orçamento ────────────────────────────────────────────────────────
  {
    nome: 'Unidade',
    sql: `CREATE TABLE IF NOT EXISTS \`Unidade\` (
      id          VARCHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
      municipioId VARCHAR(36)  NOT NULL,
      codigo      VARCHAR(20)  NOT NULL,
      nome        VARCHAR(200) NOT NULL,
      sigla       VARCHAR(20),
      secretaria  VARCHAR(50),
      ativo       TINYINT(1)   NOT NULL DEFAULT 1,
      createdAt   DATETIME     NOT NULL DEFAULT NOW(),
      updatedAt   DATETIME     NOT NULL DEFAULT NOW() ON UPDATE NOW(),
      KEY idx_municipio (municipioId),
      UNIQUE KEY uk_mun_cod (municipioId, codigo),
      CONSTRAINT fk_unidade_municipio FOREIGN KEY (municipioId) REFERENCES \`Municipio\`(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  {
    nome: 'LOA',
    sql: `CREATE TABLE IF NOT EXISTS \`LOA\` (
      id              VARCHAR(36)   NOT NULL DEFAULT (UUID()) PRIMARY KEY,
      municipioId     VARCHAR(36)   NOT NULL,
      exercicio       YEAR          NOT NULL,
      lei             VARCHAR(50),
      dataPublicacao  DATE,
      valorTotal      DECIMAL(15,2) NOT NULL DEFAULT 0,
      status          ENUM('ELABORACAO','APROVADO','VIGENTE','ENCERRADO') NOT NULL DEFAULT 'ELABORACAO',
      createdAt       DATETIME      NOT NULL DEFAULT NOW(),
      updatedAt       DATETIME      NOT NULL DEFAULT NOW() ON UPDATE NOW(),
      KEY idx_municipio (municipioId),
      UNIQUE KEY uk_mun_exercicio (municipioId, exercicio),
      CONSTRAINT fk_loa_municipio FOREIGN KEY (municipioId) REFERENCES \`Municipio\`(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  {
    nome: 'Dotacao',
    sql: `CREATE TABLE IF NOT EXISTS \`Dotacao\` (
      id              VARCHAR(36)   NOT NULL DEFAULT (UUID()) PRIMARY KEY,
      municipioId     VARCHAR(36)   NOT NULL,
      loaId           VARCHAR(36)   NOT NULL,
      unidadeId       VARCHAR(36),
      codigo          VARCHAR(30)   NOT NULL,
      descricao       VARCHAR(500)  NOT NULL,
      funcao          VARCHAR(100),
      subfuncao       VARCHAR(100),
      programa        VARCHAR(100),
      acao            VARCHAR(100),
      elementoDespesa VARCHAR(20),
      fonte           VARCHAR(10),
      valorOrcado     DECIMAL(15,2) NOT NULL DEFAULT 0,
      valorSuplementado DECIMAL(15,2) NOT NULL DEFAULT 0,
      valorAnulado    DECIMAL(15,2) NOT NULL DEFAULT 0,
      createdAt       DATETIME      NOT NULL DEFAULT NOW(),
      updatedAt       DATETIME      NOT NULL DEFAULT NOW() ON UPDATE NOW(),
      KEY idx_municipio (municipioId),
      KEY idx_loa (loaId),
      CONSTRAINT fk_dotacao_municipio FOREIGN KEY (municipioId) REFERENCES \`Municipio\`(id),
      CONSTRAINT fk_dotacao_loa FOREIGN KEY (loaId) REFERENCES \`LOA\`(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },

  // ── SEFIN — Despesa ──────────────────────────────────────────────────────────
  {
    nome: 'Fornecedor',
    sql: `CREATE TABLE IF NOT EXISTS \`Fornecedor\` (
      id          VARCHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
      municipioId VARCHAR(36)  NOT NULL,
      cpfCnpj     VARCHAR(18)  NOT NULL,
      nome        VARCHAR(300) NOT NULL,
      tipo        ENUM('PJ','PF') NOT NULL DEFAULT 'PJ',
      email       VARCHAR(200),
      telefone    VARCHAR(20),
      endereco    VARCHAR(500),
      ativo       TINYINT(1)   NOT NULL DEFAULT 1,
      createdAt   DATETIME     NOT NULL DEFAULT NOW(),
      updatedAt   DATETIME     NOT NULL DEFAULT NOW() ON UPDATE NOW(),
      KEY idx_municipio (municipioId),
      UNIQUE KEY uk_mun_doc (municipioId, cpfCnpj),
      CONSTRAINT fk_fornecedor_municipio FOREIGN KEY (municipioId) REFERENCES \`Municipio\`(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  {
    nome: 'Empenho',
    sql: `CREATE TABLE IF NOT EXISTS \`Empenho\` (
      id              VARCHAR(36)   NOT NULL DEFAULT (UUID()) PRIMARY KEY,
      municipioId     VARCHAR(36)   NOT NULL,
      dotacaoId       VARCHAR(36),
      fornecedorId    VARCHAR(36),
      numero          VARCHAR(20)   NOT NULL,
      exercicio       YEAR          NOT NULL,
      dataEmissao     DATE          NOT NULL,
      tipo            ENUM('ORDINARIO','ESTIMATIVO','GLOBAL') NOT NULL DEFAULT 'ORDINARIO',
      modalidade      VARCHAR(50),
      descricao       TEXT          NOT NULL,
      valor           DECIMAL(15,2) NOT NULL,
      valorAnulado    DECIMAL(15,2) NOT NULL DEFAULT 0,
      status          ENUM('EMITIDO','LIQUIDADO','PAGO','ANULADO','CANCELADO') NOT NULL DEFAULT 'EMITIDO',
      processo        VARCHAR(50),
      createdAt       DATETIME      NOT NULL DEFAULT NOW(),
      updatedAt       DATETIME      NOT NULL DEFAULT NOW() ON UPDATE NOW(),
      KEY idx_municipio (municipioId),
      KEY idx_dotacao (dotacaoId),
      KEY idx_fornecedor (fornecedorId),
      UNIQUE KEY uk_mun_num_exer (municipioId, numero, exercicio),
      CONSTRAINT fk_empenho_municipio  FOREIGN KEY (municipioId)  REFERENCES \`Municipio\`(id),
      CONSTRAINT fk_empenho_dotacao    FOREIGN KEY (dotacaoId)    REFERENCES \`Dotacao\`(id),
      CONSTRAINT fk_empenho_fornecedor FOREIGN KEY (fornecedorId) REFERENCES \`Fornecedor\`(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  {
    nome: 'Liquidacao',
    sql: `CREATE TABLE IF NOT EXISTS \`Liquidacao\` (
      id           VARCHAR(36)   NOT NULL DEFAULT (UUID()) PRIMARY KEY,
      municipioId  VARCHAR(36)   NOT NULL,
      empenhoId    VARCHAR(36)   NOT NULL,
      numero       VARCHAR(20)   NOT NULL,
      dataLiquidacao DATE        NOT NULL,
      valor        DECIMAL(15,2) NOT NULL,
      descricao    TEXT,
      notaFiscal   VARCHAR(50),
      createdAt    DATETIME      NOT NULL DEFAULT NOW(),
      updatedAt    DATETIME      NOT NULL DEFAULT NOW() ON UPDATE NOW(),
      KEY idx_municipio (municipioId),
      KEY idx_empenho (empenhoId),
      CONSTRAINT fk_liquidacao_municipio FOREIGN KEY (municipioId) REFERENCES \`Municipio\`(id),
      CONSTRAINT fk_liquidacao_empenho   FOREIGN KEY (empenhoId)   REFERENCES \`Empenho\`(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  {
    nome: 'ContaBancaria',
    sql: `CREATE TABLE IF NOT EXISTS \`ContaBancaria\` (
      id          VARCHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
      municipioId VARCHAR(36)  NOT NULL,
      banco       VARCHAR(10)  NOT NULL,
      agencia     VARCHAR(10)  NOT NULL,
      conta       VARCHAR(20)  NOT NULL,
      digito      VARCHAR(2),
      nome        VARCHAR(200) NOT NULL,
      tipo        ENUM('CORRENTE','POUPANCA','VINCULADA') NOT NULL DEFAULT 'CORRENTE',
      saldoAtual  DECIMAL(15,2) NOT NULL DEFAULT 0,
      ativo       TINYINT(1)   NOT NULL DEFAULT 1,
      createdAt   DATETIME     NOT NULL DEFAULT NOW(),
      updatedAt   DATETIME     NOT NULL DEFAULT NOW() ON UPDATE NOW(),
      KEY idx_municipio (municipioId),
      CONSTRAINT fk_conta_municipio FOREIGN KEY (municipioId) REFERENCES \`Municipio\`(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  {
    nome: 'Pagamento',
    sql: `CREATE TABLE IF NOT EXISTS \`Pagamento\` (
      id              VARCHAR(36)   NOT NULL DEFAULT (UUID()) PRIMARY KEY,
      municipioId     VARCHAR(36)   NOT NULL,
      liquidacaoId    VARCHAR(36)   NOT NULL,
      contaBancariaId VARCHAR(36),
      numero          VARCHAR(20)   NOT NULL,
      dataPagamento   DATE          NOT NULL,
      valor           DECIMAL(15,2) NOT NULL,
      formaPagamento  ENUM('TRANSFERENCIA','CHEQUE','DINHEIRO','PIX','BOLETO') NOT NULL DEFAULT 'TRANSFERENCIA',
      autenticacao    VARCHAR(100),
      observacao      TEXT,
      createdAt       DATETIME      NOT NULL DEFAULT NOW(),
      updatedAt       DATETIME      NOT NULL DEFAULT NOW() ON UPDATE NOW(),
      KEY idx_municipio (municipioId),
      KEY idx_liquidacao (liquidacaoId),
      CONSTRAINT fk_pagamento_municipio  FOREIGN KEY (municipioId)     REFERENCES \`Municipio\`(id),
      CONSTRAINT fk_pagamento_liquidacao FOREIGN KEY (liquidacaoId)    REFERENCES \`Liquidacao\`(id),
      CONSTRAINT fk_pagamento_conta      FOREIGN KEY (contaBancariaId) REFERENCES \`ContaBancaria\`(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },

  // ── SEFIN — Receita ──────────────────────────────────────────────────────────
  {
    nome: 'ReceitaPrevista',
    sql: `CREATE TABLE IF NOT EXISTS \`ReceitaPrevista\` (
      id           VARCHAR(36)   NOT NULL DEFAULT (UUID()) PRIMARY KEY,
      municipioId  VARCHAR(36)   NOT NULL,
      loaId        VARCHAR(36),
      exercicio    YEAR          NOT NULL,
      codigo       VARCHAR(20)   NOT NULL,
      descricao    VARCHAR(300)  NOT NULL,
      categoria    VARCHAR(100),
      origem       VARCHAR(100),
      especie      VARCHAR(100),
      fonte        VARCHAR(10),
      valorPrevisto DECIMAL(15,2) NOT NULL DEFAULT 0,
      createdAt    DATETIME      NOT NULL DEFAULT NOW(),
      updatedAt    DATETIME      NOT NULL DEFAULT NOW() ON UPDATE NOW(),
      KEY idx_municipio (municipioId),
      CONSTRAINT fk_receita_prev_municipio FOREIGN KEY (municipioId) REFERENCES \`Municipio\`(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  {
    nome: 'LancamentoReceita',
    sql: `CREATE TABLE IF NOT EXISTS \`LancamentoReceita\` (
      id                VARCHAR(36)   NOT NULL DEFAULT (UUID()) PRIMARY KEY,
      municipioId       VARCHAR(36)   NOT NULL,
      receitaPrevistaId VARCHAR(36),
      contaBancariaId   VARCHAR(36),
      dataLancamento    DATE          NOT NULL,
      valor             DECIMAL(15,2) NOT NULL,
      descricao         VARCHAR(300),
      documento         VARCHAR(100),
      fonte             VARCHAR(10),
      createdAt         DATETIME      NOT NULL DEFAULT NOW(),
      updatedAt         DATETIME      NOT NULL DEFAULT NOW() ON UPDATE NOW(),
      KEY idx_municipio (municipioId),
      KEY idx_receita (receitaPrevistaId),
      CONSTRAINT fk_lanc_receita_municipio FOREIGN KEY (municipioId)       REFERENCES \`Municipio\`(id),
      CONSTRAINT fk_lanc_receita_prev      FOREIGN KEY (receitaPrevistaId) REFERENCES \`ReceitaPrevista\`(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },

  // ── SEFIN — PPA / LDO ────────────────────────────────────────────────────────
  {
    nome: 'PPA',
    sql: `CREATE TABLE IF NOT EXISTS \`PPA\` (
      id              VARCHAR(36)   NOT NULL DEFAULT (UUID()) PRIMARY KEY,
      municipioId     VARCHAR(36)   NOT NULL,
      periodoInicio   YEAR          NOT NULL,
      periodoFim      YEAR          NOT NULL,
      lei             VARCHAR(50),
      dataPublicacao  DATE,
      valorTotal      DECIMAL(15,2) NOT NULL DEFAULT 0,
      status          ENUM('ELABORACAO','APROVADO','VIGENTE','ENCERRADO') NOT NULL DEFAULT 'ELABORACAO',
      createdAt       DATETIME      NOT NULL DEFAULT NOW(),
      updatedAt       DATETIME      NOT NULL DEFAULT NOW() ON UPDATE NOW(),
      KEY idx_municipio (municipioId),
      CONSTRAINT fk_ppa_municipio FOREIGN KEY (municipioId) REFERENCES \`Municipio\`(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  {
    nome: 'LDO',
    sql: `CREATE TABLE IF NOT EXISTS \`LDO\` (
      id              VARCHAR(36)   NOT NULL DEFAULT (UUID()) PRIMARY KEY,
      municipioId     VARCHAR(36)   NOT NULL,
      exercicio       YEAR          NOT NULL,
      lei             VARCHAR(50),
      dataPublicacao  DATE,
      metaFiscal      DECIMAL(15,2),
      status          ENUM('ELABORACAO','APROVADO','VIGENTE','ENCERRADO') NOT NULL DEFAULT 'ELABORACAO',
      createdAt       DATETIME      NOT NULL DEFAULT NOW(),
      updatedAt       DATETIME      NOT NULL DEFAULT NOW() ON UPDATE NOW(),
      KEY idx_municipio (municipioId),
      UNIQUE KEY uk_mun_exer (municipioId, exercicio),
      CONSTRAINT fk_ldo_municipio FOREIGN KEY (municipioId) REFERENCES \`Municipio\`(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
]

// ── Colunas extras no Municipio (migration graceful) ──────────────────────────
const COLS_EXTRA = [
  "ALTER TABLE `Municipio` ADD COLUMN brasaoUrl     VARCHAR(500) NULL",
  "ALTER TABLE `Municipio` ADD COLUMN favicon       VARCHAR(500) NULL",
  "ALTER TABLE `Municipio` ADD COLUMN corSecundaria CHAR(7)      NULL",
  "ALTER TABLE `Municipio` ADD COLUMN corAcento     CHAR(7)      NULL",
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')

  if (secret !== process.env.SETUP_SECRET) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  let conn: mysql.Connection | null = null
  const resultados: Record<string, string> = {}

  try {
    conn = await getConn()

    // 1. Criar/garantir tabelas
    for (const { nome, sql } of DDL) {
      try {
        await conn.execute(sql)
        resultados[nome] = 'ok'
      } catch (e: any) {
        resultados[nome] = `ERRO: ${e.message}`
      }
    }

    // 2. Colunas extras no Municipio
    for (const sql of COLS_EXTRA) {
      try {
        await conn.execute(sql)
      } catch (e: any) {
        if (e.errno !== 1060) console.warn('[migrate] col extra:', e.message)
        // 1060 = Duplicate column name — esperado, ignorar
      }
    }

    // 3. Listar tabelas criadas para confirmar
    const [tabelas] = await conn.execute('SHOW TABLES') as any
    const tabelasExistentes = tabelas.map((r: any) => Object.values(r)[0])

    return NextResponse.json({
      ok: true,
      resultados,
      tabelasNoBanco: tabelasExistentes,
      total: tabelasExistentes.length,
    })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  } finally {
    await conn?.end()
  }
}
