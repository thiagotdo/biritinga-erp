/**
 * POST /api/educacao/aluno/importar
 * Importa alunos a partir de CSV (multipart/form-data, campo "arquivo").
 *
 * Colunas aceitas (case-insensitive, separador ; ou ,):
 *   nome* | cpf | dataNascimento (DD/MM/AAAA) | sexo (M/F) | nomeMae | nomePai
 *   responsavel | telefoneResponsavel | logradouro | bairro | zona (URBANA/RURAL)
 *   nee (s/n ou 1/0 ou sim/não) | laudoNEE
 *   turmaId | anoLetivo (padrão = ano atual)
 *
 * Retorna: { ok, importados, ignorados, erros[] }
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'

function mid(req: NextRequest) {
  return req.headers.get('x-erp-municipio-id') ?? ''
}

function parseBool(v: string) {
  return ['s','sim','1','yes','true','x'].includes(v.toLowerCase().trim())
}

function parseDate(s: string): Date | null {
  if (!s) return null
  // DD/MM/AAAA
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m1) return new Date(`${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`)
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s)
  return null
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  if (!municipioId) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  try {
    const formData = await req.formData()
    const arquivo = formData.get('arquivo') as File | null
    if (!arquivo) return NextResponse.json({ erro: 'Envie o arquivo CSV no campo "arquivo"' }, { status: 400 })

    const texto = await arquivo.text()
    const linhas = texto.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    if (linhas.length < 2) return NextResponse.json({ erro: 'CSV vazio ou sem dados' }, { status: 400 })

    // Detecta separador
    const sep = linhas[0].includes(';') ? ';' : ','

    // Mapeia cabeçalhos
    const cabecalho = linhas[0].split(sep).map(c => c.trim().toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, ''))
    const idx = (nome: string) => cabecalho.indexOf(nome)

    const nomeIdx    = idx('nome')
    if (nomeIdx === -1) return NextResponse.json({ erro: 'Coluna "nome" não encontrada no CSV' }, { status: 400 })

    const anoLetivo = new Date().getFullYear()
    const resultados: { linha: number; nome: string; status: string; erro?: string }[] = []
    let importados = 0

    for (let i = 1; i < linhas.length; i++) {
      const cols = linhas[i].split(sep).map(c => c.trim().replace(/^"|"$/g, ''))
      const get = (campo: string) => cols[idx(campo)]?.trim() ?? ''

      const nome = get('nome')
      if (!nome) { resultados.push({ linha: i + 1, nome: '(vazio)', status: 'ignorado', erro: 'Nome vazio' }); continue }

      try {
        const cpfRaw = get('cpf').replace(/\D/g, '')
        const cpf = cpfRaw || null

        // Checar CPF duplicado
        if (cpf) {
          const dup = await prisma.Aluno.findFirst({ where: { municipioId, cpf } })
          if (dup) {
            resultados.push({ linha: i + 1, nome, status: 'ignorado', erro: 'CPF já cadastrado' })
            continue
          }
        }

        const neeRaw = get('nee')
        const nee = neeRaw ? parseBool(neeRaw) : false

        const zonaRaw = get('zona').toUpperCase()
        const zona = ['URBANA','RURAL'].includes(zonaRaw) ? zonaRaw : null

        const sexoRaw = get('sexo').toUpperCase()
        const sexo = ['M','F'].includes(sexoRaw) ? sexoRaw : null

        const aluno = await prisma.Aluno.create({
          data: {
            municipioId,
            nome,
            cpf,
            dataNascimento: parseDate(get('datanascimento')),
            sexo,
            nomeMae:              get('nomemae') || null,
            nomePai:              get('nomepai') || null,
            responsavel:          get('responsavel') || null,
            telefoneResponsavel:  get('telefoneresponsavel') || null,
            logradouro:           get('logradouro') || null,
            bairro:               get('bairro') || null,
            zona,
            nee,
            laudoNEE:             get('laudonee') || null,
            ativo:                true,
          },
        })

        // Matricular se tiver turmaId
        const turmaId = get('turmaid')
        if (turmaId) {
          const turma = await prisma.Turma.findFirst({ where: { id: turmaId, municipioId } })
          if (turma) {
            const anoMat = Number(get('anoletivo')) || anoLetivo
            const jaMatriculado = await prisma.Matricula.findFirst({
              where: { alunoId: aluno.id, turmaId, anoLetivo: anoMat },
            })
            if (!jaMatriculado) {
              const contagem = await prisma.Matricula.count({ where: { turmaId, anoLetivo: anoMat } })
              await prisma.Matricula.create({
                data: {
                  municipioId,
                  alunoId: aluno.id,
                  turmaId,
                  anoLetivo: anoMat,
                  situacao: 'ATIVA',
                  numeroChamada: contagem + 1,
                  dataMatricula: new Date(`${anoMat}-02-01`),
                },
              })
            }
          }
        }

        importados++
        resultados.push({ linha: i + 1, nome, status: 'importado' })
      } catch (e: any) {
        resultados.push({ linha: i + 1, nome, status: 'erro', erro: e.message.slice(0, 100) })
      }
    }

    const erros = resultados.filter(r => r.status === 'erro')
    const ignorados = resultados.filter(r => r.status === 'ignorado').length

    return NextResponse.json({
      ok: erros.length === 0,
      importados,
      ignorados,
      erros: erros.slice(0, 20),
      total: linhas.length - 1,
    })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
