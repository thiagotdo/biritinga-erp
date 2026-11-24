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
- **SEMOSP** (`/api/obras/obra`): 7 obras reais
- **SEFROTA** (`/api/frota/veiculo`): 13 veículos reais
- **SEFIN** (`/api/sefin/orcamento`): LOA 2026 R$28,75M + 13 dotações
- **SECOM** (`/api/comunicacao/noticias`, `/api/comunicacao/agenda`): 5 notícias + 6 eventos

## Autenticação para testes curl
```bash
curl -sc /tmp/erp-cookies.txt -X POST https://erp.biritinga.ba.gov.br/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"SEU_EMAIL","senha":"SUA_SENHA"}'
# Depois: curl -sb /tmp/erp-cookies.txt ...
```

## Bugs conhecidos / padrões
- Usar `db.$queryRaw` com template literals para INSERT/UPDATE quando há risco de coluna inexistente no schema Prisma
- FK `Servidor.cargoId` recriada apontando para `Cargo` (não `cargos`)
- `fonte` em dotações: VARCHAR curto — usar valores ≤ 10 chars ("PROPRIO", "FUNDEB 70", "RPPS")
- Credenciais completas: ver memória do projeto no Claude
