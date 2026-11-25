# CLAUDE.md — ERP Biritinga

## Contexto
ERP municipal da Prefeitura de Biritinga (BA). Next.js 15 no Vercel.
Repo: `thiagotdo/biritinga-erp` | URL: `erp.biritinga.ba.gov.br`

## Banco de dados
- MySQL em `69.6.213.189:3306/biriting_erp`, usuário `biriting_adm`
- DATABASE_URL no `.env` — **NUNCA commitar o .env**
- Acesso via `src/lib/db.ts` com camada customizada (`makeModel`)

## ⚠️ Regra crítica: camada db customizada (`makeModel`)
O `prisma` exportado em `src/lib/db.ts` **NÃO é Prisma real** — é um proxy.
Diferenças obrigatórias vs Prisma real:

1. **Nomes PascalCase obrigatórios**: `prisma.Noticia`, `prisma.EventoAgenda`, `prisma.Veiculo` — nunca `prisma.noticia`
2. **IDs manuais**: sempre passar `id: randomUUID()` no `create()`
3. **Timestamps manuais**: sempre passar `criadoEm: new Date(), atualizadoEm: new Date()` no `create()`

```typescript
import { randomUUID } from 'crypto'
await prisma.Noticia.create({
  data: {
    id: randomUUID(),
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    // ... demais campos
  }
})
```

## Schema real vs Prisma schema
O banco foi criado por migração antiga — colunas diferem do schema.prisma.
**Sempre verificar o schema real via `/api/migrate?token=...` antes de fazer INSERT.**

### Tabela `Veiculo`
- `odometroAtual` (não `kmAtual`)
- `chassis` (não `chassi`)
- **sem** coluna `descricao` — usar `observacoes`
- `tipo` ENUM: `('CARRO','CAMINHAO','ONIBUS','MOTO','MICRO_ONIBUS','TRATOR','OUTRO')`
- Colunas extras: `ativo`, `status`, `observacoes`, `motoristaPadrao`

### Tabela `EventoAgenda`
- `tipo` ENUM: `('AUDIENCIA_PUBLICA','REUNIAO','SHOW','ESPORTE','CULTURAL','SAUDE','EDUCACAO','INAUGURACAO','OUTRO')`
- `status` ENUM: `('PROGRAMADO','EM_ANDAMENTO','REALIZADO','CANCELADO','ADIADO')`

### Tabela `Noticia`
- Timestamps: `criadoEm`, `atualizadoEm` (não `createdAt`/`updatedAt`)

## Endpoint de migração / manutenção
`GET /api/migrate?token=$SETUP_SECRET` — roda DDL idempotente + retorna `tableInfo` com colunas e ENUMs
`POST /api/migrate?token=$SETUP_SECRET` — body `{ "sqls": ["..."] }` — executa SQL de manutenção

## Módulos e estado dos dados
- **SEMOSP** (`/api/obras/obra`): 7+ obras reais
- **SEFROTA** (`/api/frota/veiculo`): 13 veículos reais; `/api/frota/abastecimento`: 24 abastecimentos Jan-Nov/2026
- **SEFIN** (`/api/sefin/orcamento`): LOA 2026 R$28,75M + 13 dotações; `/api/sefin/empenhos`: 25 empenhos Jan-Nov/2026; `/api/sefin/receitas`: 66 receitas orçamentárias Jan-Nov/2026 (6 fontes × 11 meses)
- **SECOM** (`/api/comunicacao/noticias`, `/api/comunicacao/agenda`): 22 notícias + 23 eventos (atualizado Nov/2026)
- **SEMAD** (`/api/semad/servidores`): 68 servidores (matrículas até 610, sexo: M/F)
- **Licitações** (`/api/licitacoes/licitacao`): 35 licitações reais 2026 (01-28/2026 + 90000s)
- **Contratos** (`/api/licitacoes/contrato`): 12 contratos reais 2026 em `ContratoAdm` (001-012/2026)
- **Protocolo Eletrônico** (`/api/protocolo/v2`): 18 protocolos reais Jan-Jun/2026 + 10 tramitações
- **Transparência despesas** (`/api/transparencia/despesa`): 34 despesas orçamentárias LOA 2026 (Jan-Nov)
- **Folha de pagamento** (`/api/folha/competencia`): 11 competências Jan-Nov 2026 (~R$1,87-1,99M/mês)
- **Educação** (`/api/educacao/escola`): 68 escolas cadastradas
- **Almoxarifado** (`/api/almoxarifado`): 30 itens em `ItemAlmoxarifado`; movimentações em `MovimentacaoConsumo`
- **Ouvidoria** (`/api/ouvidoria/manifestacao`): 14 manifestações reais Jan-Out/2026
- **Diárias e Viagens** (`/api/diarias/viagem`): 22 viagens reais Jan-Dez/2026 em tabela `Viagem` (VIAG-2026/0001 a VIAG-2026/0022)
- **Convênios e Parcerias** (`/api/convenios/convenio`): 12 convênios reais 2024-2026 em tabela `Convenio` (CONV-2024/001 a CONV-2026/005)
- **Saúde ESF** (`/api/saude/esf`): 8 equipes ESF + 32 registros VisitaACS (out-nov/2026)
- **Vacinação** (`/api/saude/vacinacao`): 20 registros reais 2026

## Tabelas extras criadas via SQL (não no Prisma schema original)
- `DespesaOrcamentaria`: criada via /api/migrate; model adicionado ao DB_TABLES em db.ts
- `Folha`: existia, mas colunas `totalServidores` e `observacoes` foram adicionadas via ALTER TABLE
- `ProtocoloTramitacao`: criada via /api/migrate para histórico de tramitações do Protocolo
- `Viagem`: criada via /api/migrate; VIAG-YYYY/NNNN; status: `SOLICITADA`,`APROVADA`,`EM_ANDAMENTO`,`CONCLUIDA`,`CANCELADA`

### Tabela `Convenio` (schema real — diferente do schema planejado)
- **NÃO tem** colunas `ano`, `tipo`, `convenente`, `valorExecutado`, `dataVigenciaInicio`, `dataVigenciaFim`
- Colunas reais: `numero`, `objeto`, `concedente`, `proponente`, `valorTotal`, `valorRepasse`, `valorContrapartida`, `valorDesembolsado`
- Datas: `dataAssinatura`, `dataInicio`, `dataFim`
- `status` ENUM: `'CELEBRADO','VIGENTE','EM_EXECUCAO','CONCLUIDO','RESCINDIDO','SUSPENSO'`
- Extras: `programaFederal`, `orgaoConcedente`, `processoSEI`, `linkSIAFI`, `secretariaExecutora`, `situacao`, `descricao`, `observacoes`, `ativo`

## Tabela `Protocolo` (legada — schema diferente do Prisma)
- Campos obrigatórios: `solicitanteId` NOT NULL, `categoria` NOT NULL
- `status` ENUM: `ABERTO`, `EM_ANALISE`, `DEFERIDO`, `INDEFERIDO`, `CANCELADO`, `ARQUIVADO`
- `prioridade` ENUM: `NORMAL`, `URGENTE`, `MUITO_URGENTE`
- `origem` ENUM: `INTERNO`, `BALCAO`, `EMAIL`, `CORREIO`
- Nova API: `/api/protocolo/v2` (GET/POST/PATCH) — NÃO usar `/api/protocolo/processo` (antiga)
- Colunas extras adicionadas: `ano`, `tipo`, `setorOrigemNome`, `setorAtualNome`, `observacoes`, `dataAbertura`, `interessado`
- Coluna `cpfCnpjInteressado` NÃO existe — usar `cpfSolicitante` ou omitir

## Autenticação para testes curl
```bash
curl -sc /tmp/erp-cookies.txt -X POST https://erp.biritinga.ba.gov.br/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"SEU_EMAIL","senha":"SUA_SENHA"}'
# Depois: curl -sb /tmp/erp-cookies.txt ...
```

## FKs corrigidas via ALTER TABLE
- `AbastecimentoVeiculo.veiculoId` FK recriada apontando para `Veiculo` (antes apontava para `veiculos` vazia)

## Bugs conhecidos / padrões
- Usar `db.$queryRaw` com template literals para INSERT/UPDATE quando há risco de coluna inexistente no schema Prisma
- FK `Servidor.cargoId` recriada apontando para `Cargo` (não `cargos`)
- `fonte` em dotações: VARCHAR curto — usar valores ≤ 10 chars ("PROPRIO", "FUNDEB 70", "RPPS")
- `regime` em Servidor: usar `CLT` (não `CELETISTA`) — o ENUM aceita `ESTATUTARIO` e `CLT`
- `sexo` em Servidor: usar `M` ou `F` — não aceita `MASCULINO`/`FEMININO`
- Tabela `Escola` usa Prisma real (`@/lib/prisma`), não makeModel; model `Turma` não tem campo `ativo`
- `DespesaOrcamentaria`: tabela existe no MySQL mas NÃO estava em DB_TABLES — foi adicionada. Usar PascalCase `prisma.DespesaOrcamentaria` e passar id/criadoEm/atualizadoEm manualmente
- `NaturezaDespesa` ENUM: `PESSOAL_ENCARGOS`, `JUROS_ENCARGOS_DIVIDA`, `OUTRAS_CORRENTES`, `INVESTIMENTOS`, `INVERSOES_FINANCEIRAS`, `AMORTIZACAO_DIVIDA`, `RESERVA_CONTINGENCIA`
- Credenciais completas: ver memória do projeto no Claude
- Tabela `Manifestacao` — schema real (diferente do Prisma):
  - Colunas: `protocolo` (não `numero`), `situacao` (não `status`), `cidadaoNome` (não `nomeRequerente`), `orgaoRelacionado` (não `setorResponsavel`), `prazoResposta` (não `prazo`) — sem coluna `ano`
  - `tipo` ENUM: `RECLAMACAO`, `DENUNCIA`, `SUGESTAO`, `ELOGIO`, `SOLICITACAO_LAI`, `PEDIDO_INFORMACAO`, `SOLICITACAO_INFO`, `RECURSO_LAI`
  - `situacao` ENUM: `RECEBIDA`, `EM_ANALISE`, `ENCAMINHADA`, `EM_RESPOSTA`, `RESPONDIDA`, `ARQUIVADA`, `ENCERRADA`, `CANCELADA`
  - `prioridade` ENUM: `URGENTE`, `ALTA`, `MEDIA`, `BAIXA`, `NORMAL`
  - Protocolo auto-gerado: formato `OUV-YYYY/NNNNN`
