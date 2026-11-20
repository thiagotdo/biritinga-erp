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

  // ── SEDUC — Educação ─────────────────────────────────────────────────────────
  {
    nome: 'Escola',
    sql: `CREATE TABLE IF NOT EXISTS \`Escola\` (
      id           VARCHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
      municipioId  VARCHAR(36)  NOT NULL,
      nome         VARCHAR(200) NOT NULL,
      inep         VARCHAR(20),
      situacao     ENUM('ATIVA','DESATIVADA','REFORMA') NOT NULL DEFAULT 'ATIVA',
      tipo         VARCHAR(50),
      cep          VARCHAR(10),
      logradouro   VARCHAR(200),
      numero       VARCHAR(20),
      bairro       VARCHAR(100),
      zona         VARCHAR(20),
      telefone     VARCHAR(20),
      email        VARCHAR(200),
      diretor      VARCHAR(200),
      secretario   VARCHAR(200),
      totalSalas   INT          DEFAULT 0,
      capacidade   INT          DEFAULT 0,
      cnpj         VARCHAR(18),
      ativo        TINYINT(1)   NOT NULL DEFAULT 1,
      createdAt    DATETIME     NOT NULL DEFAULT NOW(),
      updatedAt    DATETIME     NOT NULL DEFAULT NOW() ON UPDATE NOW(),
      KEY idx_municipio (municipioId),
      CONSTRAINT fk_escola_municipio FOREIGN KEY (municipioId) REFERENCES \`Municipio\`(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  {
    nome: 'Aluno',
    sql: `CREATE TABLE IF NOT EXISTS \`Aluno\` (
      id                   VARCHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
      municipioId          VARCHAR(36)  NOT NULL,
      nome                 VARCHAR(200) NOT NULL,
      cpf                  VARCHAR(14),
      nis                  VARCHAR(20),
      dataNascimento       DATE,
      sexo                 CHAR(1),
      racaCor              VARCHAR(30),
      nomeMae              VARCHAR(200),
      nomePai              VARCHAR(200),
      responsavelNome      VARCHAR(200),
      responsavelTelefone  VARCHAR(20),
      responsavelEmail     VARCHAR(200),
      responsavelCpf       VARCHAR(14),
      logradouro           VARCHAR(200),
      numero               VARCHAR(20),
      bairro               VARCHAR(100),
      cep                  VARCHAR(10),
      zona                 VARCHAR(20),
      pcd                  TINYINT(1)   NOT NULL DEFAULT 0,
      laudoPcd             VARCHAR(100),
      bolsaFamilia         TINYINT(1)   NOT NULL DEFAULT 0,
      situacao             VARCHAR(30)  NOT NULL DEFAULT 'ATIVO',
      ativo                TINYINT(1)   NOT NULL DEFAULT 1,
      createdAt            DATETIME     NOT NULL DEFAULT NOW(),
      updatedAt            DATETIME     NOT NULL DEFAULT NOW() ON UPDATE NOW(),
      KEY idx_municipio (municipioId),
      CONSTRAINT fk_aluno_municipio FOREIGN KEY (municipioId) REFERENCES \`Municipio\`(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  {
    nome: 'Turma',
    sql: `CREATE TABLE IF NOT EXISTS \`Turma\` (
      id             VARCHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
      municipioId    VARCHAR(36)  NOT NULL,
      escolaId       VARCHAR(36)  NOT NULL,
      serie          VARCHAR(20)  NOT NULL,
      segmento       VARCHAR(20)  NOT NULL DEFAULT 'EF1',
      turma          VARCHAR(10)  NOT NULL,
      turno          ENUM('MATUTINO','VESPERTINO','NOTURNO','INTEGRAL') NOT NULL DEFAULT 'MATUTINO',
      anoLetivo      INT          NOT NULL,
      professorNome  VARCHAR(200),
      professorEmail VARCHAR(200),
      capacidade     INT          NOT NULL DEFAULT 30,
      ativo          TINYINT(1)   NOT NULL DEFAULT 1,
      createdAt      DATETIME     NOT NULL DEFAULT NOW(),
      updatedAt      DATETIME     NOT NULL DEFAULT NOW() ON UPDATE NOW(),
      KEY idx_municipio (municipioId),
      KEY idx_escola (escolaId),
      CONSTRAINT fk_turma_escola    FOREIGN KEY (escolaId)    REFERENCES \`Escola\`(id),
      CONSTRAINT fk_turma_municipio FOREIGN KEY (municipioId) REFERENCES \`Municipio\`(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  {
    nome: 'Matricula',
    sql: `CREATE TABLE IF NOT EXISTS \`Matricula\` (
      id                 VARCHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
      municipioId        VARCHAR(36)  NOT NULL,
      numero             VARCHAR(20)  NOT NULL,
      alunoId            VARCHAR(36)  NOT NULL,
      turmaId            VARCHAR(36)  NOT NULL,
      anoLetivo          INT          NOT NULL,
      situacao           ENUM('ATIVA','TRANSFERIDA','EVADIDA','CANCELADA','CONCLUIDA') NOT NULL DEFAULT 'ATIVA',
      dataMatricula      DATE         NOT NULL DEFAULT (CURDATE()),
      dataTransferencia  DATE,
      escolaDestino      VARCHAR(200),
      motivoCancelamento TEXT,
      percentualFreq     DECIMAL(5,2) NOT NULL DEFAULT 100.00,
      mediaGeral         DECIMAL(4,2),
      resultadoFinal     ENUM('EM_PROGRESSO','APROVADO','APROVADO_CONSELHO','REPROVADO') NOT NULL DEFAULT 'EM_PROGRESSO',
      usuarioId          VARCHAR(36),
      createdAt          DATETIME     NOT NULL DEFAULT NOW(),
      updatedAt          DATETIME     NOT NULL DEFAULT NOW() ON UPDATE NOW(),
      KEY idx_municipio (municipioId),
      KEY idx_turma (turmaId),
      KEY idx_aluno (alunoId),
      UNIQUE KEY uk_aluno_turma_ano (alunoId, turmaId, anoLetivo),
      CONSTRAINT fk_matricula_aluno    FOREIGN KEY (alunoId)    REFERENCES \`Aluno\`(id),
      CONSTRAINT fk_matricula_turma    FOREIGN KEY (turmaId)    REFERENCES \`Turma\`(id),
      CONSTRAINT fk_matricula_municipio FOREIGN KEY (municipioId) REFERENCES \`Municipio\`(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  {
    nome: 'AulaRegistro',
    sql: `CREATE TABLE IF NOT EXISTS \`AulaRegistro\` (
      id          VARCHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
      municipioId VARCHAR(36)  NOT NULL,
      turmaId     VARCHAR(36)  NOT NULL,
      data        DATE         NOT NULL,
      disciplina  VARCHAR(100),
      conteudo    TEXT,
      totalAulas  INT          NOT NULL DEFAULT 1,
      createdAt   DATETIME     NOT NULL DEFAULT NOW(),
      KEY idx_turma (turmaId),
      KEY idx_municipio (municipioId),
      UNIQUE KEY uk_turma_data (turmaId, data),
      CONSTRAINT fk_aulareg_turma    FOREIGN KEY (turmaId)    REFERENCES \`Turma\`(id),
      CONSTRAINT fk_aulareg_municipio FOREIGN KEY (municipioId) REFERENCES \`Municipio\`(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  {
    nome: 'FrequenciaAluno',
    sql: `CREATE TABLE IF NOT EXISTS \`FrequenciaAluno\` (
      id          VARCHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
      municipioId VARCHAR(36)  NOT NULL,
      aulaId      VARCHAR(36)  NOT NULL,
      matriculaId VARCHAR(36)  NOT NULL,
      presente    TINYINT(1)   NOT NULL DEFAULT 1,
      justificada TINYINT(1)   NOT NULL DEFAULT 0,
      observacao  TEXT,
      createdAt   DATETIME     NOT NULL DEFAULT NOW(),
      KEY idx_aula (aulaId),
      KEY idx_matricula (matriculaId),
      UNIQUE KEY uk_aula_matricula (aulaId, matriculaId),
      CONSTRAINT fk_freq_aula      FOREIGN KEY (aulaId)      REFERENCES \`AulaRegistro\`(id) ON DELETE CASCADE,
      CONSTRAINT fk_freq_matricula FOREIGN KEY (matriculaId) REFERENCES \`Matricula\`(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  {
    nome: 'Avaliacao',
    sql: `CREATE TABLE IF NOT EXISTS \`Avaliacao\` (
      id          VARCHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
      municipioId VARCHAR(36)  NOT NULL,
      turmaId     VARCHAR(36)  NOT NULL,
      bimestre    INT          NOT NULL,
      disciplina  VARCHAR(100) NOT NULL,
      descricao   VARCHAR(200),
      peso        DECIMAL(4,2) NOT NULL DEFAULT 1.00,
      createdAt   DATETIME     NOT NULL DEFAULT NOW(),
      KEY idx_turma (turmaId),
      CONSTRAINT fk_aval_turma    FOREIGN KEY (turmaId)    REFERENCES \`Turma\`(id),
      CONSTRAINT fk_aval_municipio FOREIGN KEY (municipioId) REFERENCES \`Municipio\`(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  {
    nome: 'NotaAluno',
    sql: `CREATE TABLE IF NOT EXISTS \`NotaAluno\` (
      id           VARCHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
      municipioId  VARCHAR(36)  NOT NULL,
      avaliacaoId  VARCHAR(36)  NOT NULL,
      matriculaId  VARCHAR(36)  NOT NULL,
      nota         DECIMAL(4,2) NOT NULL,
      observacao   TEXT,
      createdAt    DATETIME     NOT NULL DEFAULT NOW(),
      updatedAt    DATETIME     NOT NULL DEFAULT NOW() ON UPDATE NOW(),
      UNIQUE KEY uk_aval_mat (avaliacaoId, matriculaId),
      KEY idx_matricula (matriculaId),
      CONSTRAINT fk_nota_avaliacao FOREIGN KEY (avaliacaoId)  REFERENCES \`Avaliacao\`(id),
      CONSTRAINT fk_nota_matricula FOREIGN KEY (matriculaId)  REFERENCES \`Matricula\`(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  {
    nome: 'CardapioMerenda',
    sql: `CREATE TABLE IF NOT EXISTS \`CardapioMerenda\` (
      id          VARCHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
      municipioId VARCHAR(36)  NOT NULL,
      escolaId    VARCHAR(36),
      semana      DATE         NOT NULL,
      diaSemana   TINYINT      NOT NULL,
      turno       VARCHAR(20)  NOT NULL DEFAULT 'MATUTINO',
      categoria   VARCHAR(30)  NOT NULL,
      descricao   TEXT         NOT NULL,
      calorias    INT,
      createdAt   DATETIME     NOT NULL DEFAULT NOW(),
      KEY idx_municipio (municipioId),
      KEY idx_escola (escolaId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },

  // ── SEMSA — Saúde ───────────────────────────────────────────────────────────
  {
    nome: 'UnidadeSaude',
    sql: `CREATE TABLE IF NOT EXISTS \`UnidadeSaude\` (
      id          VARCHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
      municipioId VARCHAR(36)  NOT NULL,
      nome        VARCHAR(300) NOT NULL,
      tipo        ENUM('UBS','CAPS','CEO','HOSPITAL','LABORATORIO','OUTRO') NOT NULL DEFAULT 'UBS',
      cnes        VARCHAR(10),
      cep         VARCHAR(9),
      logradouro  VARCHAR(300),
      numero      VARCHAR(20),
      bairro      VARCHAR(150),
      telefone    VARCHAR(20),
      email       VARCHAR(200),
      responsavel VARCHAR(200),
      horario     VARCHAR(200),
      ativo       TINYINT(1)   NOT NULL DEFAULT 1,
      createdAt   DATETIME     NOT NULL DEFAULT NOW(),
      updatedAt   DATETIME     NOT NULL DEFAULT NOW() ON UPDATE NOW(),
      KEY idx_municipio (municipioId),
      CONSTRAINT fk_unidadesaude_municipio FOREIGN KEY (municipioId) REFERENCES \`Municipio\`(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  {
    nome: 'Paciente',
    sql: `CREATE TABLE IF NOT EXISTS \`Paciente\` (
      id                VARCHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
      municipioId       VARCHAR(36)  NOT NULL,
      nome              VARCHAR(300) NOT NULL,
      cpf               VARCHAR(11),
      cns               VARCHAR(15),
      dataNascimento    DATE,
      sexo              ENUM('M','F','OUTRO'),
      racaCor           VARCHAR(30),
      nomeMae           VARCHAR(300),
      logradouro        VARCHAR(300),
      numero            VARCHAR(20),
      bairro            VARCHAR(150),
      cep               VARCHAR(9),
      telefone          VARCHAR(20),
      email             VARCHAR(200),
      unidadeReferenciaId VARCHAR(36),
      situacao          ENUM('ATIVO','INATIVO','OBITO') NOT NULL DEFAULT 'ATIVO',
      createdAt         DATETIME     NOT NULL DEFAULT NOW(),
      updatedAt         DATETIME     NOT NULL DEFAULT NOW() ON UPDATE NOW(),
      KEY idx_municipio (municipioId),
      KEY idx_cpf (cpf),
      KEY idx_cns (cns),
      CONSTRAINT fk_paciente_municipio FOREIGN KEY (municipioId) REFERENCES \`Municipio\`(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  {
    nome: 'ProfissionalSaude',
    sql: `CREATE TABLE IF NOT EXISTS \`ProfissionalSaude\` (
      id           VARCHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
      municipioId  VARCHAR(36)  NOT NULL,
      unidadeId    VARCHAR(36),
      nome         VARCHAR(300) NOT NULL,
      cpf          VARCHAR(11),
      cns          VARCHAR(15),
      especialidade VARCHAR(150),
      conselho     VARCHAR(50),
      numeroConselho VARCHAR(30),
      cargo        VARCHAR(150),
      telefone     VARCHAR(20),
      email        VARCHAR(200),
      ativo        TINYINT(1)   NOT NULL DEFAULT 1,
      createdAt    DATETIME     NOT NULL DEFAULT NOW(),
      updatedAt    DATETIME     NOT NULL DEFAULT NOW() ON UPDATE NOW(),
      KEY idx_municipio (municipioId),
      CONSTRAINT fk_profissional_municipio FOREIGN KEY (municipioId) REFERENCES \`Municipio\`(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  {
    nome: 'Agendamento',
    sql: `CREATE TABLE IF NOT EXISTS \`Agendamento\` (
      id              VARCHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
      municipioId     VARCHAR(36)  NOT NULL,
      pacienteId      VARCHAR(36)  NOT NULL,
      unidadeId       VARCHAR(36)  NOT NULL,
      profissionalId  VARCHAR(36),
      dataHora        DATETIME     NOT NULL,
      especialidade   VARCHAR(150),
      tipo            ENUM('CONSULTA','EXAME','VACINA','RETORNO','CIRURGIA','OUTRO') NOT NULL DEFAULT 'CONSULTA',
      status          ENUM('AGENDADO','CONFIRMADO','ATENDIDO','CANCELADO','FALTA') NOT NULL DEFAULT 'AGENDADO',
      observacoes     TEXT,
      createdAt       DATETIME     NOT NULL DEFAULT NOW(),
      updatedAt       DATETIME     NOT NULL DEFAULT NOW() ON UPDATE NOW(),
      KEY idx_municipio (municipioId),
      KEY idx_paciente (pacienteId),
      KEY idx_unidade (unidadeId),
      KEY idx_data (dataHora),
      CONSTRAINT fk_agend_municipio FOREIGN KEY (municipioId) REFERENCES \`Municipio\`(id),
      CONSTRAINT fk_agend_paciente  FOREIGN KEY (pacienteId)  REFERENCES \`Paciente\`(id),
      CONSTRAINT fk_agend_unidade   FOREIGN KEY (unidadeId)   REFERENCES \`UnidadeSaude\`(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  {
    nome: 'Atendimento',
    sql: `CREATE TABLE IF NOT EXISTS \`Atendimento\` (
      id              VARCHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
      municipioId     VARCHAR(36)  NOT NULL,
      pacienteId      VARCHAR(36)  NOT NULL,
      unidadeId       VARCHAR(36)  NOT NULL,
      profissionalId  VARCHAR(36),
      agendamentoId   VARCHAR(36),
      dataHora        DATETIME     NOT NULL DEFAULT NOW(),
      tipo            ENUM('CONSULTA','EXAME','VACINA','RETORNO','URGENCIA','OUTRO') NOT NULL DEFAULT 'CONSULTA',
      cid10           VARCHAR(10),
      queixa          TEXT,
      evolucao        TEXT,
      prescricao      TEXT,
      peso            DECIMAL(5,2),
      altura          DECIMAL(4,2),
      pressao         VARCHAR(10),
      temperatura     DECIMAL(4,1),
      createdAt       DATETIME     NOT NULL DEFAULT NOW(),
      updatedAt       DATETIME     NOT NULL DEFAULT NOW() ON UPDATE NOW(),
      KEY idx_municipio (municipioId),
      KEY idx_paciente (pacienteId),
      KEY idx_data (dataHora),
      CONSTRAINT fk_atend_municipio FOREIGN KEY (municipioId) REFERENCES \`Municipio\`(id),
      CONSTRAINT fk_atend_paciente  FOREIGN KEY (pacienteId)  REFERENCES \`Paciente\`(id),
      CONSTRAINT fk_atend_unidade   FOREIGN KEY (unidadeId)   REFERENCES \`UnidadeSaude\`(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  {
    nome: 'Vacinacao',
    sql: `CREATE TABLE IF NOT EXISTS \`Vacinacao\` (
      id              VARCHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
      municipioId     VARCHAR(36)  NOT NULL,
      pacienteId      VARCHAR(36)  NOT NULL,
      unidadeId       VARCHAR(36)  NOT NULL,
      profissionalId  VARCHAR(36),
      vacina          VARCHAR(200) NOT NULL,
      lote            VARCHAR(50),
      fabricante      VARCHAR(150),
      dose            VARCHAR(30),
      dataAplicacao   DATE         NOT NULL,
      proximaDose     DATE,
      observacoes     TEXT,
      createdAt       DATETIME     NOT NULL DEFAULT NOW(),
      KEY idx_municipio (municipioId),
      KEY idx_paciente (pacienteId),
      KEY idx_data (dataAplicacao),
      CONSTRAINT fk_vacina_municipio FOREIGN KEY (municipioId) REFERENCES \`Municipio\`(id),
      CONSTRAINT fk_vacina_paciente  FOREIGN KEY (pacienteId)  REFERENCES \`Paciente\`(id),
      CONSTRAINT fk_vacina_unidade   FOREIGN KEY (unidadeId)   REFERENCES \`UnidadeSaude\`(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  {
    nome: 'MedicamentoEstoque',
    sql: `CREATE TABLE IF NOT EXISTS \`MedicamentoEstoque\` (
      id              VARCHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
      municipioId     VARCHAR(36)  NOT NULL,
      unidadeId       VARCHAR(36)  NOT NULL,
      nome            VARCHAR(300) NOT NULL,
      principioAtivo  VARCHAR(200),
      apresentacao    VARCHAR(150),
      lote            VARCHAR(50),
      dataVencimento  DATE,
      quantidadeTotal INT          NOT NULL DEFAULT 0,
      quantidadeMin   INT          NOT NULL DEFAULT 10,
      valorUnitario   DECIMAL(10,2),
      ativo           TINYINT(1)   NOT NULL DEFAULT 1,
      createdAt       DATETIME     NOT NULL DEFAULT NOW(),
      updatedAt       DATETIME     NOT NULL DEFAULT NOW() ON UPDATE NOW(),
      KEY idx_municipio (municipioId),
      KEY idx_unidade (unidadeId),
      CONSTRAINT fk_medest_municipio FOREIGN KEY (municipioId) REFERENCES \`Municipio\`(id),
      CONSTRAINT fk_medest_unidade   FOREIGN KEY (unidadeId)   REFERENCES \`UnidadeSaude\`(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  {
    nome: 'MedicamentoDispensacao',
    sql: `CREATE TABLE IF NOT EXISTS \`MedicamentoDispensacao\` (
      id              VARCHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
      municipioId     VARCHAR(36)  NOT NULL,
      estoqueId       VARCHAR(36)  NOT NULL,
      pacienteId      VARCHAR(36)  NOT NULL,
      profissionalId  VARCHAR(36),
      quantidade      INT          NOT NULL,
      dataDispensacao DATETIME     NOT NULL DEFAULT NOW(),
      receita         VARCHAR(200),
      observacoes     TEXT,
      createdAt       DATETIME     NOT NULL DEFAULT NOW(),
      KEY idx_municipio (municipioId),
      KEY idx_paciente (pacienteId),
      KEY idx_data (dataDispensacao),
      CONSTRAINT fk_disp_municipio FOREIGN KEY (municipioId) REFERENCES \`Municipio\`(id),
      CONSTRAINT fk_disp_estoque   FOREIGN KEY (estoqueId)   REFERENCES \`MedicamentoEstoque\`(id),
      CONSTRAINT fk_disp_paciente  FOREIGN KEY (pacienteId)  REFERENCES \`Paciente\`(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  {
    nome: 'NotificacaoEpidem',
    sql: `CREATE TABLE IF NOT EXISTS \`NotificacaoEpidem\` (
      id              VARCHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
      municipioId     VARCHAR(36)  NOT NULL,
      unidadeId       VARCHAR(36),
      pacienteId      VARCHAR(36),
      agravo          VARCHAR(200) NOT NULL,
      cid10           VARCHAR(10),
      dataNotificacao DATE         NOT NULL DEFAULT (CURDATE()),
      dataSintomas    DATE,
      bairro          VARCHAR(150),
      status          ENUM('SUSPEITO','CONFIRMADO','DESCARTADO','INVESTIGANDO') NOT NULL DEFAULT 'SUSPEITO',
      observacoes     TEXT,
      createdAt       DATETIME     NOT NULL DEFAULT NOW(),
      updatedAt       DATETIME     NOT NULL DEFAULT NOW() ON UPDATE NOW(),
      KEY idx_municipio (municipioId),
      KEY idx_data (dataNotificacao),
      CONSTRAINT fk_notif_municipio FOREIGN KEY (municipioId) REFERENCES \`Municipio\`(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
]

// ── Colunas extras (migration graceful) ──────────────────────────────────────
const COLS_EXTRA = [
  // Municipio
  "ALTER TABLE `Municipio` ADD COLUMN brasaoUrl     VARCHAR(500) NULL",
  "ALTER TABLE `Municipio` ADD COLUMN favicon       VARCHAR(500) NULL",
  "ALTER TABLE `Municipio` ADD COLUMN corSecundaria CHAR(7)      NULL",
  "ALTER TABLE `Municipio` ADD COLUMN corAcento     CHAR(7)      NULL",
  // Fornecedor — tabela antiga pode ter 'razaoSocial' em vez de 'nome'
  "ALTER TABLE `Fornecedor` ADD COLUMN nome        VARCHAR(300) NULL",
  "ALTER TABLE `Fornecedor` ADD COLUMN tipo        ENUM('PJ','PF') NOT NULL DEFAULT 'PJ'",
  "ALTER TABLE `Fornecedor` ADD COLUMN cpfCnpj     VARCHAR(18) NULL",
  "ALTER TABLE `Fornecedor` ADD COLUMN ativo       TINYINT(1)  NOT NULL DEFAULT 1",
  "ALTER TABLE `Fornecedor` ADD COLUMN createdAt   DATETIME    NULL",
  "ALTER TABLE `Fornecedor` ADD COLUMN updatedAt   DATETIME    NULL",
  // Preencher nome a partir de razaoSocial (se existir)
  "UPDATE `Fornecedor` SET nome = razaoSocial WHERE nome IS NULL AND razaoSocial IS NOT NULL",
  // Preencher cpfCnpj a partir de cnpj (se existir)
  "UPDATE `Fornecedor` SET cpfCnpj = cnpj WHERE cpfCnpj IS NULL AND cnpj IS NOT NULL",
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
