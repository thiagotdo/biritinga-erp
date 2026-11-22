// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { obterUsuario } from '@/lib/auth'

export const runtime = 'nodejs'

// ─── Contratos de Obras Públicas ─────────────────────────────────────────────
// Lê da tabela Contrato (licitacoes) com join nas obras vinculadas

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id        = searchParams.get('id')
  const situacao  = searchParams.get('situacao')
  const busca     = searchParams.get('busca')
  const municipioId = usuario.municipioId

  try {
    if (id) {
      const rows = await db.$queryRaw`
        SELECT c.*,
               f.nome AS contratadaNome, f.cnpj AS contratadaCNPJ,
               o.nome AS obraTitulo, o.numero AS obraNumero, o.situacao AS obraSituacao, o.id AS obraId,
               uf.nome AS fiscalNome, ug.nome AS gestorNome,
               (SELECT COUNT(*) FROM AditivoContrato a WHERE a.contratoId = c.id) AS qtdAditivos,
               (SELECT COUNT(*) FROM MedicaoContrato m WHERE m.contratoId = c.id) AS qtdMedicoes,
               (SELECT COALESCE(SUM(m.valorBruto), 0) FROM MedicaoContrato m WHERE m.contratoId = c.id) AS valorExecutado
        FROM Contrato c
        LEFT JOIN Fornecedor f ON f.id = c.fornecedorId
        LEFT JOIN ProcessoLicitatorio p ON p.id = c.processoId
        LEFT JOIN Obra o ON o.municipioId = c.municipioId AND o.licitacaoId = c.processoId
        LEFT JOIN Usuario uf ON uf.id = c.fiscalId
        LEFT JOIN Usuario ug ON ug.id = c.gestorId
        WHERE c.id = ${id} AND c.municipioId = ${municipioId}
        LIMIT 1`
      const contrato = (rows as any[])[0] ?? null
      if (!contrato) return NextResponse.json({ erro: 'Contrato não encontrado' }, { status: 404 })
      return NextResponse.json({ contrato })
    }

    // Listagem — filtrar contratos vinculados a obras (via processo que tem obra)
    let whereClause = db.$queryRaw`WHERE c.municipioId = ${municipioId}`
    if (situacao) whereClause = db.$queryRaw`WHERE c.municipioId = ${municipioId} AND c.situacao = ${situacao}`

    const contratos = await db.$queryRaw`
      SELECT c.id, c.numero, c.objeto, c.situacao, c.valorInicial AS valorOriginal,
             c.valorAtual, c.dataAssinatura, c.dataInicio, c.dataFim,
             f.nome AS contratadaNome, f.cnpj AS contratadaCNPJ,
             o.nome AS obraTitulo, o.numero AS obraNumero, o.id AS obraId,
             o.situacao AS obraSituacao,
             uf.nome AS fiscalNome, ug.nome AS gestorNome,
             c.contratoUrl AS urlContrato,
             (SELECT COALESCE(SUM(m.valorBruto), 0) FROM MedicaoContrato m WHERE m.contratoId = c.id) AS valorExecutado,
             (SELECT COUNT(*) FROM AditivoContrato a WHERE a.contratoId = c.id) AS qtdAditivos,
             (SELECT COUNT(*) FROM MedicaoContrato m WHERE m.contratoId = c.id) AS qtdMedicoes
      FROM Contrato c
      LEFT JOIN Fornecedor f ON f.id = c.fornecedorId
      LEFT JOIN Obra o ON o.municipioId = c.municipioId AND o.licitacaoId = c.processoId
      LEFT JOIN Usuario uf ON uf.id = c.fiscalId
      LEFT JOIN Usuario ug ON ug.id = c.gestorId
      WHERE c.municipioId = ${municipioId}
        ${situacao ? db.$queryRaw`AND c.situacao = ${situacao}` : db.$queryRaw``}
        ${busca ? db.$queryRaw`AND (c.numero LIKE ${`%${busca}%`} OR f.nome LIKE ${`%${busca}%`} OR c.objeto LIKE ${`%${busca}%`})` : db.$queryRaw``}
      ORDER BY c.criadoEm DESC
      LIMIT 200`

    return NextResponse.json({
      contratos: (contratos as any[]).map(c => ({
        ...c,
        valorOriginal: Number(c.valorOriginal ?? 0),
        valorAtual:    Number(c.valorAtual ?? 0),
        valorExecutado:Number(c.valorExecutado ?? 0),
        _count: { aditivos: Number(c.qtdAditivos ?? 0), medicoes: Number(c.qtdMedicoes ?? 0) },
        obra: c.obraId ? { id: c.obraId, titulo: c.obraTitulo, numero: c.obraNumero, situacao: c.obraSituacao } : null,
      })),
      total: (contratos as any[]).length,
    })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
