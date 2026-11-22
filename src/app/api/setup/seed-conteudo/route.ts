/**
 * POST /api/setup/seed-conteudo
 * Cria conteúdo inicial (notícias e eventos) para o portal público.
 * Requer token de setup.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const SETUP_SECRET = process.env.SETUP_SECRET ?? 'biritinga-setup-2024-secure'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${SETUP_SECRET}`) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const mun = await prisma.municipio.findFirst({ where: { ativo: true } })
  if (!mun) {
    return NextResponse.json({ erro: 'Município não encontrado' }, { status: 404 })
  }

  const agora = new Date()

  // ── Notícias iniciais ────────────────────────────────────────────────────────
  const noticias = [
    {
      titulo: 'Prefeitura de Biritinga lança novo Portal Municipal com acesso a serviços digitais',
      slug: 'prefeitura-biritinga-lanca-novo-portal-municipal',
      subtitulo: 'Plataforma digital facilita acesso dos cidadãos aos serviços públicos municipais',
      corpo: `<p>A Prefeitura Municipal de Biritinga deu mais um passo importante na modernização da gestão pública com o lançamento do novo Portal Municipal. A plataforma digital oferece aos cidadãos acesso fácil e rápido a serviços, informações e transparência sobre a administração municipal.</p>

<p>O novo portal conta com seções dedicadas a notícias e comunicados oficiais, agenda de eventos, transparência fiscal, Ouvidoria Municipal e acesso ao Portal e-SIC (Sistema Eletrônico do Serviço de Informação ao Cidadão), atendendo às exigências da Lei de Acesso à Informação (LAI).</p>

<p>"Este portal representa nosso compromisso com a transparência e com a melhoria dos serviços ao cidadão. Agora, qualquer pessoa pode acompanhar as ações da nossa gestão com apenas alguns cliques", destacou o prefeito municipal.</p>

<p>O sistema também integra módulos de gestão interna, incluindo saúde, educação, assistência social, obras públicas e recursos humanos, permitindo que a administração municipal opere de forma mais eficiente e integrada.</p>`,
      resumo: 'Prefeitura moderniza atendimento ao cidadão com nova plataforma digital integrada ao sistema de gestão municipal.',
      tipo: 'NOTA_OFICIAL' as const,
      status: 'PUBLICADA' as const,
      destaque: true,
      secretaria: 'Gabinete do Prefeito',
      autor: 'Comunicação Oficial',
      dataPublicacao: new Date(agora.getTime() - 1 * 24 * 60 * 60 * 1000), // ontem
      tags: 'portal,tecnologia,modernização,serviços',
      ativo: true,
    },
    {
      titulo: 'Secretaria de Educação anuncia abertura de matrículas para o ano letivo 2025',
      slug: 'secretaria-educacao-abertura-matriculas-2025',
      subtitulo: 'Pais e responsáveis devem realizar a matrícula entre os dias 15 e 31 de janeiro',
      corpo: `<p>A Secretaria Municipal de Educação de Biritinga informa que estão abertas as matrículas para o ano letivo de 2025. O período de matrículas vai de 15 a 31 de janeiro, nas unidades escolares municipais.</p>

<p>Para efetuar a matrícula, os responsáveis devem comparecer à escola de sua preferência portando os seguintes documentos:</p>
<ul>
  <li>Certidão de nascimento do aluno (original e cópia)</li>
  <li>Cartão de vacinação atualizado</li>
  <li>Comprovante de residência</li>
  <li>Documento de identificação do responsável</li>
  <li>Histórico escolar (para transferências)</li>
</ul>

<p>O atendimento ocorre de segunda a sexta-feira, das 8h às 12h e das 14h às 17h. Para mais informações, entre em contato com a Secretaria de Educação pelo telefone da Prefeitura Municipal.</p>

<p>As escolas municipais de Biritinga atendem alunos da Educação Infantil ao 9º ano do Ensino Fundamental. Para o ano letivo de 2025, novas vagas foram criadas para atender à crescente demanda da população.</p>`,
      resumo: 'Período de matrículas vai de 15 a 31 de janeiro nas unidades escolares municipais de Biritinga.',
      tipo: 'COMUNICADO' as const,
      status: 'PUBLICADA' as const,
      destaque: true,
      secretaria: 'Secretaria de Educação',
      autor: 'Secretaria de Educação',
      dataPublicacao: new Date(agora.getTime() - 2 * 24 * 60 * 60 * 1000),
      tags: 'educação,matrículas,2025,escolas',
      ativo: true,
    },
    {
      titulo: 'Secretaria de Saúde realiza mutirão de vacinação neste sábado',
      slug: 'secretaria-saude-mutirao-vacinacao',
      subtitulo: 'Ação contempla vacinas do calendário básico e influenza para toda a população',
      corpo: `<p>A Secretaria Municipal de Saúde de Biritinga promove neste sábado um mutirão de vacinação gratuito para toda a população. A ação será realizada na Unidade Básica de Saúde Central, das 8h às 16h.</p>

<p>Serão disponibilizadas vacinas do calendário básico do Ministério da Saúde, além da vacina contra a influenza. As vacinas são gratuitas e destinadas a todas as faixas etárias, com prioridade para crianças menores de 5 anos, gestantes, idosos acima de 60 anos e profissionais de saúde.</p>

<p>Para se vacinar, basta comparecer à UBS Central portando carteira de identidade e cartão de vacinação. Crianças devem estar acompanhadas dos pais ou responsáveis legais.</p>

<p>"A vacinação é a principal forma de prevenção contra doenças graves. Convidamos toda a população de Biritinga a aproveitar esta oportunidade e manter seu calendário vacinal em dia", disse o secretário municipal de saúde.</p>`,
      resumo: 'Mutirão de vacinação gratuito será realizado neste sábado na UBS Central, das 8h às 16h.',
      tipo: 'COMUNICADO' as const,
      status: 'PUBLICADA' as const,
      destaque: false,
      secretaria: 'Secretaria de Saúde',
      autor: 'Secretaria de Saúde',
      dataPublicacao: new Date(agora.getTime() - 3 * 24 * 60 * 60 * 1000),
      tags: 'saúde,vacinação,UBS,prevenção',
      ativo: true,
    },
    {
      titulo: 'Obras de pavimentação avançam no Bairro Nova Esperança',
      slug: 'obras-pavimentacao-bairro-nova-esperanca',
      subtitulo: 'Investimento de R$ 450 mil beneficia cerca de 2.000 moradores da região',
      corpo: `<p>As obras de pavimentação asfáltica no Bairro Nova Esperança estão em pleno andamento. O investimento, no valor de R$ 450 mil, contempla a pavimentação de quatro ruas do bairro e a instalação de meio-fio e drenagem pluvial.</p>

<p>As obras fazem parte do Programa Municipal de Infraestrutura Urbana e irão beneficiar aproximadamente 2.000 moradores da região, que há anos aguardavam pela melhoria das condições das vias.</p>

<p>De acordo com a Secretaria de Obras e Infraestrutura, os trabalhos devem ser concluídos em 60 dias. Durante as obras, haverá desvios de tráfego nas ruas afetadas, e a Prefeitura pede compreensão e paciência aos moradores e motoristas.</p>

<p>"Estamos trabalhando para transformar a realidade de cada bairro de Biritinga. Esta obra é mais um compromisso cumprido com os moradores do Nova Esperança", afirmou o secretário de obras.</p>`,
      resumo: 'Pavimentação de quatro ruas no Bairro Nova Esperança beneficiará cerca de 2.000 moradores.',
      tipo: 'NOTICIA' as const,
      status: 'PUBLICADA' as const,
      destaque: false,
      secretaria: 'Secretaria de Obras e Infraestrutura',
      autor: 'Comunicação Oficial',
      dataPublicacao: new Date(agora.getTime() - 5 * 24 * 60 * 60 * 1000),
      tags: 'obras,pavimentação,infraestrutura,bairros',
      ativo: true,
    },
    {
      titulo: 'Prefeitura entrega reforma da Escola Municipal José Fernandes',
      slug: 'prefeitura-entrega-reforma-escola-jose-fernandes',
      subtitulo: 'Unidade escolar recebeu investimento de R$ 280 mil em melhorias estruturais',
      corpo: `<p>A Prefeitura Municipal de Biritinga entregou a reforma completa da Escola Municipal José Fernandes. O investimento de R$ 280 mil contemplou a reforma das salas de aula, banheiros, cozinha, cobertura da quadra esportiva e pintura geral da unidade.</p>

<p>A escola atende cerca de 350 alunos do Ensino Fundamental e é uma das principais unidades educacionais do município. Com a reforma, o ambiente escolar ficou mais moderno, acessível e adequado para o processo de ensino-aprendizagem.</p>

<p>Entre as melhorias realizadas estão: instalação de ar-condicionado em todas as salas de aula, acessibilidade para pessoas com deficiência, adequação das instalações elétricas e hidráulicas, e reforma completa da quadra esportiva coberta.</p>

<p>Os recursos para a reforma vieram de emenda parlamentar e de investimentos do próprio município. A entrega contou com a presença de alunos, professores, pais e da comunidade escolar.</p>`,
      resumo: 'Escola Municipal José Fernandes recebeu investimento de R$ 280 mil em melhorias estruturais e equipamentos.',
      tipo: 'NOTICIA' as const,
      status: 'PUBLICADA' as const,
      destaque: false,
      secretaria: 'Secretaria de Educação',
      autor: 'Comunicação Oficial',
      dataPublicacao: new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000),
      tags: 'educação,reforma,escola,investimento',
      ativo: true,
    },
    {
      titulo: 'Programa Bolsa Família: Prefeitura auxilia famílias a atualizarem cadastro',
      slug: 'bolsa-familia-atualizacao-cadastro',
      subtitulo: 'CRAS oferece atendimento para regularização do CadÚnico até o final do mês',
      corpo: `<p>A Secretaria Municipal de Assistência Social informa que o Centro de Referência de Assistência Social (CRAS) está realizando atendimentos para atualização do Cadastro Único (CadÚnico) e regularização do Bolsa Família.</p>

<p>Famílias que estão com o cadastro desatualizado ou que nunca realizaram o cadastramento podem comparecer ao CRAS para receber orientações e realizar o procedimento gratuitamente.</p>

<p>O atendimento ocorre de segunda a sexta-feira, das 8h às 12h e das 14h às 17h. Para se cadastrar ou atualizar o cadastro, é necessário apresentar os documentos de todos os membros da família, incluindo CPF, RG, certidão de nascimento e comprovante de residência.</p>

<p>A atualização do CadÚnico é fundamental para garantir o acesso a diversos benefícios sociais do governo federal. Famílias com cadastro desatualizado podem ter o benefício suspenso.</p>

<p>Para mais informações, entre em contato com o CRAS de Biritinga.</p>`,
      resumo: 'CRAS realiza atendimentos para atualização do CadÚnico e regularização do Bolsa Família até o final do mês.',
      tipo: 'COMUNICADO' as const,
      status: 'PUBLICADA' as const,
      destaque: false,
      secretaria: 'Secretaria de Assistência Social',
      autor: 'Secretaria de Assistência Social',
      dataPublicacao: new Date(agora.getTime() - 10 * 24 * 60 * 60 * 1000),
      tags: 'assistência social,bolsa família,CadÚnico,CRAS',
      ativo: true,
    },
  ]

  // ── Eventos iniciais ─────────────────────────────────────────────────────────
  const eventos = [
    {
      titulo: 'Audiência Pública — LDO 2026 (Lei de Diretrizes Orçamentárias)',
      descricao: 'Audiência Pública para discussão e aprovação das diretrizes orçamentárias para o exercício de 2026. A participação da comunidade é fundamental para o planejamento das ações do município.',
      tipo: 'AUDIENCIA_PUBLICA' as const,
      status: 'PROGRAMADO' as const,
      local: 'Câmara Municipal de Biritinga',
      endereco: 'Rua Principal, Centro — Biritinga/BA',
      dataInicio: new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000),
      horaInicio: '09:00',
      horaFim: '12:00',
      responsavel: 'Secretaria de Finanças',
      secretaria: 'Secretaria de Finanças',
      publicoEsperado: 200,
      destaque: true,
      ativo: true,
    },
    {
      titulo: 'Campanha de Saúde — Dia D de Vacinação',
      descricao: 'Dia D de mobilização para atualização do calendário vacinal. Equipes da Secretaria de Saúde estarão em pontos estratégicos da cidade oferecendo vacinas gratuitas para toda a população.',
      tipo: 'SAUDE' as const,
      status: 'PROGRAMADO' as const,
      local: 'UBS Central e Pontos Estratégicos',
      endereco: 'Biritinga/BA — vários pontos',
      dataInicio: new Date(agora.getTime() + 3 * 24 * 60 * 60 * 1000),
      horaInicio: '08:00',
      horaFim: '17:00',
      responsavel: 'Secretaria de Saúde',
      secretaria: 'Secretaria de Saúde',
      publicoEsperado: 500,
      destaque: true,
      ativo: true,
    },
    {
      titulo: 'Reunião do Conselho Municipal de Educação',
      descricao: 'Reunião ordinária do Conselho Municipal de Educação para discussão de pautas relacionadas ao planejamento do ano letivo 2025 e prestação de contas do FUNDEB.',
      tipo: 'EDUCACAO' as const,
      status: 'PROGRAMADO' as const,
      local: 'Secretaria Municipal de Educação',
      endereco: 'Prefeitura Municipal de Biritinga — Centro',
      dataInicio: new Date(agora.getTime() + 5 * 24 * 60 * 60 * 1000),
      horaInicio: '14:00',
      horaFim: '17:00',
      responsavel: 'Secretaria de Educação',
      secretaria: 'Secretaria de Educação',
      publicoEsperado: 50,
      destaque: false,
      ativo: true,
    },
    {
      titulo: 'Inauguração da Praça de Eventos do Centro',
      descricao: 'Solenidade de inauguração da nova Praça de Eventos do Centro de Biritinga, com apresentações culturais, shows e diversas atrações para toda a família.',
      tipo: 'INAUGURACAO' as const,
      status: 'PROGRAMADO' as const,
      local: 'Praça do Centro',
      endereco: 'Centro — Biritinga/BA',
      dataInicio: new Date(agora.getTime() + 14 * 24 * 60 * 60 * 1000),
      horaInicio: '18:00',
      responsavel: 'Gabinete do Prefeito',
      secretaria: 'Gabinete do Prefeito',
      publicoEsperado: 1000,
      destaque: true,
      ativo: true,
    },
    {
      titulo: 'Torneio Municipal de Futsal — Fase Final',
      descricao: 'Grande final do Torneio Municipal de Futsal. Disputas nas categorias adulto masculino e feminino com as melhores equipes do município. Entrada gratuita.',
      tipo: 'ESPORTE' as const,
      status: 'PROGRAMADO' as const,
      local: 'Ginásio Municipal de Esportes',
      endereco: 'Rua do Esporte, s/n — Biritinga/BA',
      dataInicio: new Date(agora.getTime() + 10 * 24 * 60 * 60 * 1000),
      horaInicio: '15:00',
      horaFim: '20:00',
      responsavel: 'Secretaria de Esporte e Lazer',
      secretaria: 'Secretaria de Esporte e Lazer',
      publicoEsperado: 300,
      destaque: false,
      ativo: true,
    },
    {
      titulo: 'Formatura dos Alunos da EJA — Turma 2024',
      descricao: 'Solenidade de formatura dos alunos da Educação de Jovens e Adultos (EJA) que concluíram o Ensino Fundamental em 2024. Parabéns a todos os formandos!',
      tipo: 'EDUCACAO' as const,
      status: 'PROGRAMADO' as const,
      local: 'Escola Municipal José Fernandes — Auditório',
      endereco: 'Rua da Escola, s/n — Biritinga/BA',
      dataInicio: new Date(agora.getTime() + 20 * 24 * 60 * 60 * 1000),
      horaInicio: '19:00',
      responsavel: 'Secretaria de Educação',
      secretaria: 'Secretaria de Educação',
      publicoEsperado: 200,
      destaque: false,
      ativo: true,
    },
  ]

  let criadas = 0
  let criados = 0

  // Criar notícias (pular se já existir pelo slug)
  for (const n of noticias) {
    const existe = await prisma.noticia.findFirst({
      where: { municipioId: mun.id, slug: n.slug },
    })
    if (!existe) {
      await prisma.noticia.create({
        data: { ...n, municipioId: mun.id },
      })
      criadas++
    }
  }

  // Criar eventos (pular se título já existir)
  for (const e of eventos) {
    const existe = await prisma.eventoAgenda.findFirst({
      where: { municipioId: mun.id, titulo: e.titulo },
    })
    if (!existe) {
      await prisma.eventoAgenda.create({
        data: { ...e, municipioId: mun.id },
      })
      criados++
    }
  }

  return NextResponse.json({
    ok: true,
    noticiasCriadas: criadas,
    eventosCriados: criados,
    municipio: mun.nome,
    mensagem: `Conteúdo inicial criado: ${criadas} notícias e ${criados} eventos.`,
  })
}
