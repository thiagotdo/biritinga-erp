-- CreateTable
CREATE TABLE IF NOT EXISTS `Municipio` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `uf` CHAR(2) NOT NULL,
    `ibge` VARCHAR(191) NOT NULL,
    `cnpj` VARCHAR(191) NULL,
    `slug` VARCHAR(191) NOT NULL,
    `dominio` VARCHAR(191) NULL,
    `logoUrl` LONGTEXT NULL,
    `brasaoUrl` LONGTEXT NULL,
    `favicon` LONGTEXT NULL,
    `corPrimaria` CHAR(7) NULL,
    `corSecundaria` CHAR(7) NULL,
    `corAcento` CHAR(7) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `plano` VARCHAR(191) NOT NULL DEFAULT 'basico',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Municipio_ibge_key`(`ibge`),
    UNIQUE INDEX `Municipio_cnpj_key`(`cnpj`),
    UNIQUE INDEX `Municipio_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Usuario` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `senhaHash` VARCHAR(191) NOT NULL,
    `cpf` VARCHAR(191) NULL,
    `telefone` VARCHAR(191) NULL,
    `cargo` VARCHAR(191) NULL,
    `secretaria` VARCHAR(191) NULL,
    `perfil` ENUM('SUPER_ADMIN', 'ADMIN_MUNICIPIO', 'GESTOR', 'OPERADOR', 'VISUALIZADOR', 'PORTAL_CIDADAO') NOT NULL DEFAULT 'OPERADOR',
    `perfilId` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `mfaAtivado` BOOLEAN NOT NULL DEFAULT false,
    `mfaSegredo` VARCHAR(191) NULL,
    `ultimoLogin` DATETIME(3) NULL,
    `tentativasFalhas` INTEGER NOT NULL DEFAULT 0,
    `bloqueadoAte` DATETIME(3) NULL,
    `avatarUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Usuario_municipioId_perfil_idx`(`municipioId`, `perfil`),
    INDEX `Usuario_municipioId_secretaria_idx`(`municipioId`, `secretaria`),
    UNIQUE INDEX `Usuario_municipioId_email_key`(`municipioId`, `email`),
    UNIQUE INDEX `Usuario_municipioId_cpf_key`(`municipioId`, `cpf`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Perfil` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NULL,
    `permissoes` TEXT NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Perfil_municipioId_idx`(`municipioId`),
    UNIQUE INDEX `Perfil_municipioId_nome_key`(`municipioId`, `nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Sessao` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `usuarioId` VARCHAR(191) NOT NULL,
    `refreshToken` TEXT NOT NULL,
    `userAgent` VARCHAR(191) NULL,
    `ip` VARCHAR(191) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Sessao_usuarioId_idx`(`usuarioId`),
    INDEX `Sessao_municipioId_expiresAt_idx`(`municipioId`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `usuarioId` VARCHAR(191) NULL,
    `acao` VARCHAR(191) NOT NULL,
    `modulo` VARCHAR(191) NOT NULL,
    `recurso` VARCHAR(191) NOT NULL,
    `registroId` VARCHAR(191) NULL,
    `dadosAntigos` LONGTEXT NULL,
    `dadosNovos` LONGTEXT NULL,
    `ip` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_municipioId_modulo_createdAt_idx`(`municipioId`, `modulo`, `createdAt`),
    INDEX `AuditLog_municipioId_usuarioId_idx`(`municipioId`, `usuarioId`),
    INDEX `AuditLog_registroId_idx`(`registroId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `TokenResetSenha` (
    `id` VARCHAR(191) NOT NULL,
    `usuarioId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usadoEm` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `TokenResetSenha_token_key`(`token`),
    INDEX `TokenResetSenha_usuarioId_idx`(`usuarioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `modulo_config` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NULL,
    `icone` VARCHAR(191) NULL,
    `rota` VARCHAR(191) NOT NULL,
    `categoria` VARCHAR(191) NULL,
    `ordem` INTEGER NOT NULL DEFAULT 0,
    `estado` ENUM('PUBLICO', 'ADMIN', 'DESATIVADO') NOT NULL DEFAULT 'ADMIN',
    `atualizadoPor` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `modulo_config_municipioId_estado_idx`(`municipioId`, `estado`),
    UNIQUE INDEX `modulo_config_municipioId_slug_key`(`municipioId`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `secretarias` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `sigla` VARCHAR(10) NOT NULL,
    `descricao` TEXT NULL,
    `cor` VARCHAR(191) NULL,
    `icone` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `ordem` INTEGER NOT NULL DEFAULT 0,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `secretarias_municipioId_idx`(`municipioId`),
    UNIQUE INDEX `secretarias_municipioId_sigla_key`(`municipioId`, `sigla`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `departamentos` (
    `id` VARCHAR(191) NOT NULL,
    `secretariaId` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `sigla` VARCHAR(10) NULL,
    `descricao` TEXT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `departamentos_secretariaId_idx`(`secretariaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `coordenacoes` (
    `id` VARCHAR(191) NOT NULL,
    `departamentoId` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` TEXT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `coordenacoes_departamentoId_idx`(`departamentoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `setores` (
    `id` VARCHAR(191) NOT NULL,
    `coordenacaoId` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` TEXT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `setores_coordenacaoId_idx`(`coordenacaoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `unidades` (
    `id` VARCHAR(191) NOT NULL,
    `setorId` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `tipo` ENUM('ADMINISTRATIVA', 'ESCOLA', 'UBS', 'CRAS', 'CREAS', 'ALMOXARIFADO', 'DEPOSITO', 'OUTRO') NOT NULL DEFAULT 'ADMINISTRATIVA',
    `endereco` VARCHAR(191) NULL,
    `telefone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `unidades_setorId_idx`(`setorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `cargos` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `cbo` VARCHAR(10) NULL,
    `nivel` ENUM('ESTRATEGICO', 'TATICO', 'OPERACIONAL') NOT NULL DEFAULT 'OPERACIONAL',
    `descricao` TEXT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `cargos_municipioId_nome_key`(`municipioId`, `nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `usuario_permissoes` (
    `id` VARCHAR(191) NOT NULL,
    `usuarioId` VARCHAR(191) NOT NULL,
    `permissao` VARCHAR(191) NOT NULL,
    `concedidoPor` VARCHAR(191) NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiradoEm` DATETIME(3) NULL,

    INDEX `usuario_permissoes_usuarioId_idx`(`usuarioId`),
    UNIQUE INDEX `usuario_permissoes_usuarioId_permissao_key`(`usuarioId`, `permissao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `documentos` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `secretariaId` VARCHAR(191) NULL,
    `usuarioId` VARCHAR(191) NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `descricao` TEXT NULL,
    `tipo` ENUM('OFICIO', 'MEMORANDO', 'DESPACHO', 'PORTARIA', 'DECRETO', 'LEI', 'CONTRATO', 'CONVENIO', 'ATA', 'RELATORIO', 'LAUDO', 'CERTIDAO', 'REQUERIMENTO', 'PARECER', 'NOTA_FISCAL', 'OUTRO') NOT NULL,
    `categoria` VARCHAR(191) NULL,
    `tags` TEXT NULL,
    `urlStorage` VARCHAR(191) NOT NULL,
    `nomeArquivo` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `tamanhoBytes` INTEGER NOT NULL,
    `versao` INTEGER NOT NULL DEFAULT 1,
    `hash` VARCHAR(191) NULL,
    `ocr` LONGTEXT NULL,
    `assinado` BOOLEAN NOT NULL DEFAULT false,
    `assinadoEm` DATETIME(3) NULL,
    `assinadoPor` VARCHAR(191) NULL,
    `restrito` BOOLEAN NOT NULL DEFAULT false,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `documentos_municipioId_idx`(`municipioId`),
    INDEX `documentos_secretariaId_idx`(`secretariaId`),
    FULLTEXT INDEX `documentos_titulo_descricao_idx`(`titulo`, `descricao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `documento_versoes` (
    `id` VARCHAR(191) NOT NULL,
    `documentoId` VARCHAR(191) NOT NULL,
    `versao` INTEGER NOT NULL,
    `urlStorage` VARCHAR(191) NOT NULL,
    `hash` VARCHAR(191) NULL,
    `criadoPor` VARCHAR(191) NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `protocolos` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `solicitanteId` VARCHAR(191) NOT NULL,
    `secretariaId` VARCHAR(191) NULL,
    `responsavelId` VARCHAR(191) NULL,
    `assunto` VARCHAR(191) NOT NULL,
    `descricao` TEXT NULL,
    `categoria` VARCHAR(191) NOT NULL,
    `prioridade` ENUM('BAIXA', 'NORMAL', 'ALTA', 'URGENTE') NOT NULL DEFAULT 'NORMAL',
    `status` ENUM('ABERTO', 'EM_ANDAMENTO', 'AGUARDANDO', 'EM_ANALISE', 'DEFERIDO', 'INDEFERIDO', 'ARQUIVADO', 'CANCELADO') NOT NULL DEFAULT 'ABERTO',
    `prazo` DATETIME(3) NULL,
    `resolvidoEm` DATETIME(3) NULL,
    `origem` ENUM('INTERNO', 'CIDADAO', 'EMAIL', 'BALCAO', 'ESIC', 'OUVIDORIA') NOT NULL DEFAULT 'INTERNO',
    `cpfSolicitante` VARCHAR(191) NULL,
    `nomeSolicitante` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `protocolos_municipioId_idx`(`municipioId`),
    INDEX `protocolos_status_idx`(`status`),
    UNIQUE INDEX `protocolos_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `tramitacoes` (
    `id` VARCHAR(191) NOT NULL,
    `protocoloId` VARCHAR(191) NOT NULL,
    `usuarioId` VARCHAR(191) NOT NULL,
    `acao` VARCHAR(191) NOT NULL,
    `descricao` TEXT NOT NULL,
    `despacho` TEXT NULL,
    `status` ENUM('ABERTO', 'EM_ANDAMENTO', 'AGUARDANDO', 'EM_ANALISE', 'DEFERIDO', 'INDEFERIDO', 'ARQUIVADO', 'CANCELADO') NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `tramitacoes_protocoloId_idx`(`protocoloId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `patrimonio_itens` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `categoria` ENUM('MOVEL', 'IMOVEL', 'VEICULO', 'EQUIPAMENTO_TI', 'EQUIPAMENTO_MEDICO', 'MAQUINARIO', 'OUTRO') NOT NULL,
    `marca` VARCHAR(191) NULL,
    `modelo` VARCHAR(191) NULL,
    `serie` VARCHAR(191) NULL,
    `qrCode` VARCHAR(191) NULL,
    `valor` DECIMAL(15, 2) NOT NULL,
    `dataAquisicao` DATETIME(3) NOT NULL,
    `fornecedor` VARCHAR(191) NULL,
    `notaFiscal` VARCHAR(191) NULL,
    `estado` ENUM('OTIMO', 'BOM', 'REGULAR', 'RUIM', 'INSERVIVEL') NOT NULL DEFAULT 'BOM',
    `secretariaId` VARCHAR(191) NULL,
    `unidadeId` VARCHAR(191) NULL,
    `responsavel` VARCHAR(191) NULL,
    `localizacao` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    UNIQUE INDEX `patrimonio_itens_qrCode_key`(`qrCode`),
    INDEX `patrimonio_itens_municipioId_idx`(`municipioId`),
    UNIQUE INDEX `patrimonio_itens_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `veiculos` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `placa` VARCHAR(191) NOT NULL,
    `renavam` VARCHAR(191) NULL,
    `chassi` VARCHAR(191) NULL,
    `marca` VARCHAR(191) NOT NULL,
    `modelo` VARCHAR(191) NOT NULL,
    `ano` INTEGER NOT NULL,
    `cor` VARCHAR(191) NULL,
    `tipo` ENUM('CARRO', 'CAMINHONETE', 'VAN', 'ONIBUS', 'CAMINHAO', 'MOTO', 'TRATOR', 'MAQUINA_AGRICOLA', 'OUTRO') NOT NULL,
    `combustivel` VARCHAR(191) NULL,
    `km` INTEGER NOT NULL DEFAULT 0,
    `secretariaId` VARCHAR(191) NULL,
    `status` ENUM('DISPONIVEL', 'EM_USO', 'MANUTENCAO', 'INATIVO') NOT NULL DEFAULT 'DISPONIVEL',
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `veiculos_municipioId_idx`(`municipioId`),
    UNIQUE INDEX `veiculos_municipioId_placa_key`(`municipioId`, `placa`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `notificacoes` (
    `id` VARCHAR(191) NOT NULL,
    `destinoId` VARCHAR(191) NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `mensagem` TEXT NOT NULL,
    `tipo` ENUM('INFO', 'ALERTA', 'URGENTE', 'VENCIMENTO', 'APROVACAO', 'REJEICAO', 'TRAMITACAO') NOT NULL,
    `canal` ENUM('SISTEMA', 'EMAIL', 'PUSH', 'SMS', 'WHATSAPP') NOT NULL DEFAULT 'SISTEMA',
    `referencia` VARCHAR(191) NULL,
    `lida` BOOLEAN NOT NULL DEFAULT false,
    `lidaEm` DATETIME(3) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notificacoes_destinoId_lida_idx`(`destinoId`, `lida`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Manifestacao` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `protocolo` VARCHAR(191) NOT NULL,
    `tipo` ENUM('RECLAMACAO', 'DENUNCIA', 'SUGESTAO', 'ELOGIO', 'SOLICITACAO_INFO', 'RECURSO_LAI') NOT NULL,
    `situacao` ENUM('RECEBIDA', 'EM_ANALISE', 'ENCAMINHADA', 'EM_RESPOSTA', 'RESPONDIDA', 'ARQUIVADA', 'CANCELADA') NOT NULL DEFAULT 'RECEBIDA',
    `prioridade` ENUM('URGENTE', 'ALTA', 'MEDIA', 'BAIXA') NOT NULL DEFAULT 'MEDIA',
    `anonimo` BOOLEAN NOT NULL DEFAULT false,
    `cidadaoNome` VARCHAR(191) NULL,
    `cidadaoCPF` VARCHAR(191) NULL,
    `cidadaoEmail` VARCHAR(191) NULL,
    `cidadaoTelefone` VARCHAR(191) NULL,
    `cidadaoEndereco` VARCHAR(191) NULL,
    `assunto` VARCHAR(191) NOT NULL,
    `descricao` TEXT NOT NULL,
    `orgaoRelacionado` VARCHAR(191) NULL,
    `localOcorrencia` VARCHAR(191) NULL,
    `dataOcorrencia` DATETIME(3) NULL,
    `analista` VARCHAR(191) NULL,
    `priorizado` BOOLEAN NOT NULL DEFAULT false,
    `sigiloso` BOOLEAN NOT NULL DEFAULT false,
    `resposta` TEXT NULL,
    `dataResposta` DATETIME(3) NULL,
    `satisfacao` INTEGER NULL,
    `prazoResposta` DATETIME(3) NULL,
    `dataLimite` DATETIME(3) NULL,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `Manifestacao_municipioId_situacao_idx`(`municipioId`, `situacao`),
    INDEX `Manifestacao_municipioId_tipo_idx`(`municipioId`, `tipo`),
    INDEX `Manifestacao_municipioId_cidadaoCPF_idx`(`municipioId`, `cidadaoCPF`),
    UNIQUE INDEX `Manifestacao_municipioId_protocolo_key`(`municipioId`, `protocolo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `AnexoManifestacao` (
    `id` VARCHAR(191) NOT NULL,
    `manifestacaoId` VARCHAR(191) NOT NULL,
    `nomeArquivo` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `tamanho` INTEGER NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `TramitacaoManifestacao` (
    `id` VARCHAR(191) NOT NULL,
    `manifestacaoId` VARCHAR(191) NOT NULL,
    `situacaoAnterior` VARCHAR(191) NULL,
    `situacaoNova` VARCHAR(191) NOT NULL,
    `descricao` TEXT NOT NULL,
    `responsavel` VARCHAR(191) NULL,
    `dataTramitacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TramitacaoManifestacao_manifestacaoId_idx`(`manifestacaoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ServicoCidadao` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `tipo` ENUM('DOCUMENTO', 'LICENCA', 'FISCAL', 'INFRAESTRUTURA', 'SAUDE', 'EDUCACAO', 'ASSISTENCIA_SOCIAL', 'OUTROS') NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` TEXT NOT NULL,
    `requisitos` TEXT NULL,
    `etapas` TEXT NULL,
    `prazoAtendimento` VARCHAR(191) NULL,
    `taxas` DECIMAL(10, 2) NULL,
    `canais` VARCHAR(191) NULL,
    `unidadeResponsavel` VARCHAR(191) NULL,
    `horarioAtendimento` VARCHAR(191) NULL,
    `legislacao` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `destaque` BOOLEAN NOT NULL DEFAULT false,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ServicoCidadao_municipioId_tipo_idx`(`municipioId`, `tipo`),
    INDEX `ServicoCidadao_municipioId_ativo_idx`(`municipioId`, `ativo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `SolicitacaoServico` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `protocolo` VARCHAR(191) NOT NULL,
    `servicoId` VARCHAR(191) NOT NULL,
    `situacao` ENUM('RECEBIDA', 'EM_ANALISE', 'EM_ATENDIMENTO', 'AGUARDANDO_CIDADAO', 'CONCLUIDA', 'INDEFERIDA', 'CANCELADA') NOT NULL DEFAULT 'RECEBIDA',
    `cidadaoNome` VARCHAR(191) NOT NULL,
    `cidadaoCPF` VARCHAR(191) NOT NULL,
    `cidadaoEmail` VARCHAR(191) NULL,
    `cidadaoTelefone` VARCHAR(191) NULL,
    `descricaoSolicitacao` TEXT NULL,
    `documentosAnexados` TEXT NULL,
    `analista` VARCHAR(191) NULL,
    `resposta` TEXT NULL,
    `motivoIndeferimento` TEXT NULL,
    `dataPrevAtendimento` DATETIME(3) NULL,
    `dataAtendimento` DATETIME(3) NULL,
    `satisfacao` INTEGER NULL,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `SolicitacaoServico_municipioId_situacao_idx`(`municipioId`, `situacao`),
    INDEX `SolicitacaoServico_municipioId_cidadaoCPF_idx`(`municipioId`, `cidadaoCPF`),
    UNIQUE INDEX `SolicitacaoServico_municipioId_protocolo_key`(`municipioId`, `protocolo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `PedidoLAI` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `protocolo` VARCHAR(191) NOT NULL,
    `requerenteNome` VARCHAR(191) NOT NULL,
    `requerenteCPF` VARCHAR(191) NULL,
    `requerenteEmail` VARCHAR(191) NOT NULL,
    `requerenteTelefone` VARCHAR(191) NULL,
    `requerenteEndereco` VARCHAR(191) NULL,
    `assunto` VARCHAR(191) NOT NULL,
    `descricao` TEXT NOT NULL,
    `formatoResposta` VARCHAR(191) NOT NULL DEFAULT 'DIGITAL',
    `finalidade` VARCHAR(191) NULL,
    `situacao` VARCHAR(191) NOT NULL DEFAULT 'RECEBIDO',
    `resposta` TEXT NULL,
    `dataResposta` DATETIME(3) NULL,
    `motivoNegativa` TEXT NULL,
    `formatoRespostaFinal` VARCHAR(191) NULL,
    `dataLimiteResposta` DATETIME(3) NULL,
    `dataLimiteProrrogado` DATETIME(3) NULL,
    `recurso1` TEXT NULL,
    `dataRecurso1` DATETIME(3) NULL,
    `respostaRecurso1` TEXT NULL,
    `recurso2` TEXT NULL,
    `dataRecurso2` DATETIME(3) NULL,
    `respostaRecurso2` TEXT NULL,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `PedidoLAI_municipioId_situacao_idx`(`municipioId`, `situacao`),
    UNIQUE INDEX `PedidoLAI_municipioId_protocolo_key`(`municipioId`, `protocolo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Servidor` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `matricula` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `cpf` VARCHAR(191) NOT NULL,
    `rg` VARCHAR(191) NULL,
    `dataNascimento` DATETIME(3) NULL,
    `sexo` VARCHAR(191) NULL,
    `estadoCivil` VARCHAR(191) NULL,
    `nomeMae` VARCHAR(191) NULL,
    `naturalidade` VARCHAR(191) NULL,
    `nacionalidade` VARCHAR(191) NOT NULL DEFAULT 'Brasileira',
    `email` VARCHAR(191) NULL,
    `telefone` VARCHAR(191) NULL,
    `celular` VARCHAR(191) NULL,
    `enderecoRua` VARCHAR(191) NULL,
    `enderecoNumero` VARCHAR(191) NULL,
    `enderecoBairro` VARCHAR(191) NULL,
    `enderecoMunicipio` VARCHAR(191) NULL,
    `enderecoUF` VARCHAR(191) NULL,
    `enderecoCEP` VARCHAR(191) NULL,
    `cargoId` VARCHAR(191) NOT NULL,
    `departamentoId` VARCHAR(191) NULL,
    `regimeJuridico` ENUM('ESTATUTARIO', 'CLT', 'COMISSIONADO', 'ESTAGIARIO', 'TEMPORARIO') NOT NULL DEFAULT 'ESTATUTARIO',
    `vinculoFuncional` ENUM('EFETIVO', 'COMISSAO', 'DESIGNACAO_FUNCAO', 'CONTRATO_TEMPORARIO') NOT NULL DEFAULT 'EFETIVO',
    `situacao` ENUM('ATIVO', 'AFASTADO', 'FERIAS', 'CEDIDO', 'LICENCA', 'APOSENTADO', 'EXONERADO', 'DEMITIDO', 'FALECIDO') NOT NULL DEFAULT 'ATIVO',
    `dataAdmissao` DATETIME(3) NOT NULL,
    `dataExoneracao` DATETIME(3) NULL,
    `numeroPIS` VARCHAR(191) NULL,
    `numeroCtps` VARCHAR(191) NULL,
    `serieCtps` VARCHAR(191) NULL,
    `salarioBruto` DECIMAL(10, 2) NOT NULL,
    `salarioBase` DECIMAL(10, 2) NULL,
    `bancoNome` VARCHAR(191) NULL,
    `bancoCodigo` VARCHAR(191) NULL,
    `agencia` VARCHAR(191) NULL,
    `contaCorrente` VARCHAR(191) NULL,
    `tipoConta` VARCHAR(191) NULL,
    `regimePrevidencia` VARCHAR(191) NOT NULL DEFAULT 'RPPS',
    `aliquotaPrevidencia` DOUBLE NOT NULL DEFAULT 14.0,
    `cargaHorariaSemanal` DOUBLE NOT NULL DEFAULT 40,
    `foto` VARCHAR(191) NULL,
    `observacoes` TEXT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `Servidor_municipioId_situacao_idx`(`municipioId`, `situacao`),
    INDEX `Servidor_municipioId_departamentoId_idx`(`municipioId`, `departamentoId`),
    UNIQUE INDEX `Servidor_municipioId_matricula_key`(`municipioId`, `matricula`),
    UNIQUE INDEX `Servidor_municipioId_cpf_key`(`municipioId`, `cpf`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `AfastamentoServidor` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `servidorId` VARCHAR(191) NOT NULL,
    `tipo` ENUM('LICENCA_MEDICA', 'LICENCA_MATERNIDADE', 'LICENCA_PATERNIDADE', 'LICENCA_GALA', 'LICENCA_LUTO', 'LICENCA_INTERESSE_PARTICULAR', 'CEDENCIA', 'MANDATO_ELETIVO', 'MANDATO_CLASSISTA', 'SUSPENSAO_DISCIPLINAR', 'OUTROS') NOT NULL,
    `dataInicio` DATETIME(3) NOT NULL,
    `dataFim` DATETIME(3) NULL,
    `diasAfastamento` INTEGER NULL,
    `cid` VARCHAR(191) NULL,
    `motivoDetalhado` TEXT NULL,
    `peritoNome` VARCHAR(191) NULL,
    `documentoNumero` VARCHAR(191) NULL,
    `prorrogavel` BOOLEAN NOT NULL DEFAULT false,
    `remunerado` BOOLEAN NOT NULL DEFAULT true,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `AfastamentoServidor_municipioId_servidorId_idx`(`municipioId`, `servidorId`),
    INDEX `AfastamentoServidor_municipioId_tipo_idx`(`municipioId`, `tipo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `FeriasServidor` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `servidorId` VARCHAR(191) NOT NULL,
    `periodoAquisitivo` VARCHAR(191) NOT NULL,
    `dataInicioGozo` DATETIME(3) NULL,
    `dataFimGozo` DATETIME(3) NULL,
    `diasDireito` INTEGER NOT NULL DEFAULT 30,
    `diasGozo` INTEGER NOT NULL DEFAULT 30,
    `diasAbono` INTEGER NOT NULL DEFAULT 0,
    `situacao` ENUM('PROGRAMADA', 'EM_GOZO', 'CONCLUIDA', 'CANCELADA', 'CONVERTIDA_PECUNIA') NOT NULL DEFAULT 'PROGRAMADA',
    `valorAbono` DECIMAL(10, 2) NULL,
    `dataVencimento` DATETIME(3) NULL,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `FeriasServidor_municipioId_situacao_idx`(`municipioId`, `situacao`),
    UNIQUE INDEX `FeriasServidor_municipioId_servidorId_periodoAquisitivo_key`(`municipioId`, `servidorId`, `periodoAquisitivo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Rubrica` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `tipo` ENUM('PROVENTO', 'DESCONTO', 'INFORMATIVO') NOT NULL DEFAULT 'PROVENTO',
    `calculoAutomatico` BOOLEAN NOT NULL DEFAULT false,
    `baseCalculo` VARCHAR(191) NULL,
    `percentual` DOUBLE NULL,
    `valorFixo` DECIMAL(10, 2) NULL,
    `incideINSS` BOOLEAN NOT NULL DEFAULT true,
    `incideIRRF` BOOLEAN NOT NULL DEFAULT true,
    `incideFGTS` BOOLEAN NOT NULL DEFAULT true,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Rubrica_municipioId_idx`(`municipioId`),
    UNIQUE INDEX `Rubrica_municipioId_codigo_key`(`municipioId`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `FolhaPagamento` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `competencia` VARCHAR(191) NOT NULL,
    `tipo` ENUM('MENSAL', 'DECIMO_TERCEIRO_PRIMEIRO', 'DECIMO_TERCEIRO_SEGUNDO', 'FERIAS', 'RESCISAO', 'COMPLEMENTAR') NOT NULL DEFAULT 'MENSAL',
    `situacao` ENUM('RASCUNHO', 'PROCESSADA', 'FECHADA', 'PAGA', 'RETIFICADA') NOT NULL DEFAULT 'RASCUNHO',
    `totalProventos` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `totalDescontos` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `totalLiquido` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `totalINSS` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `totalIRRF` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `totalFGTS` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `quantidadeServid` INTEGER NOT NULL DEFAULT 0,
    `dataProcessamento` DATETIME(3) NULL,
    `dataFechamento` DATETIME(3) NULL,
    `dataPagamento` DATETIME(3) NULL,
    `observacoes` TEXT NULL,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `FolhaPagamento_municipioId_situacao_idx`(`municipioId`, `situacao`),
    UNIQUE INDEX `FolhaPagamento_municipioId_numero_key`(`municipioId`, `numero`),
    UNIQUE INDEX `FolhaPagamento_municipioId_competencia_tipo_key`(`municipioId`, `competencia`, `tipo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Contracheque` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `folhaId` VARCHAR(191) NOT NULL,
    `servidorId` VARCHAR(191) NOT NULL,
    `competencia` VARCHAR(191) NOT NULL,
    `salarioBruto` DECIMAL(10, 2) NOT NULL,
    `totalProventos` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `totalDescontos` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `totalLiquido` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `inssServidor` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `inssPatronal` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `irrfRetido` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `fgtsDeposito` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `baseINSS` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `baseIRRF` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `Contracheque_municipioId_servidorId_idx`(`municipioId`, `servidorId`),
    INDEX `Contracheque_municipioId_folhaId_idx`(`municipioId`, `folhaId`),
    UNIQUE INDEX `Contracheque_municipioId_folhaId_servidorId_key`(`municipioId`, `folhaId`, `servidorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ItemFolha` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `contrachequeId` VARCHAR(191) NOT NULL,
    `rubricaId` VARCHAR(191) NOT NULL,
    `valor` DECIMAL(10, 2) NOT NULL,
    `referencia` VARCHAR(191) NULL,

    INDEX `ItemFolha_municipioId_contrachequeId_idx`(`municipioId`, `contrachequeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `folha_competencia` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `mes` INTEGER NOT NULL,
    `ano` INTEGER NOT NULL,
    `status` ENUM('ABERTA', 'EM_CALCULO', 'CALCULADA', 'FECHADA', 'CANCELADA') NOT NULL DEFAULT 'ABERTA',
    `totalBruto` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `totalDescontos` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `totalLiquido` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `totalServidores` INTEGER NOT NULL DEFAULT 0,
    `observacao` TEXT NULL,
    `fechadaEm` DATETIME(3) NULL,
    `fechadaPor` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `folha_competencia_municipioId_status_idx`(`municipioId`, `status`),
    UNIQUE INDEX `folha_competencia_municipioId_mes_ano_key`(`municipioId`, `mes`, `ano`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `folha_rubrica` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `tipo` ENUM('PROVENTO', 'DESCONTO', 'INFORMATIVO') NOT NULL,
    `natureza` ENUM('FIXO', 'VARIAVEL', 'AUTOMATICO') NOT NULL DEFAULT 'FIXO',
    `formula` TEXT NULL,
    `percentual` DECIMAL(6, 4) NULL,
    `valor` DECIMAL(12, 2) NULL,
    `incideInss` BOOLEAN NOT NULL DEFAULT false,
    `incideIrpf` BOOLEAN NOT NULL DEFAULT false,
    `incideFgts` BOOLEAN NOT NULL DEFAULT false,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `folha_rubrica_municipioId_codigo_key`(`municipioId`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `folha_holerite` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `competenciaId` VARCHAR(191) NOT NULL,
    `servidorId` VARCHAR(191) NOT NULL,
    `matricula` VARCHAR(191) NOT NULL,
    `nomeServidor` VARCHAR(191) NOT NULL,
    `cargo` VARCHAR(191) NULL,
    `lotacao` VARCHAR(191) NULL,
    `regimeJuridico` ENUM('ESTATUTARIO', 'CLT', 'COMISSIONADO', 'ESTAGIARIO', 'TEMPORARIO') NOT NULL DEFAULT 'ESTATUTARIO',
    `totalProventos` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `totalDescontos` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `totalLiquido` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `baseFgts` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `baseInss` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `baseIrpf` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `diasTrabalhados` INTEGER NOT NULL DEFAULT 30,
    `diasFaltas` INTEGER NOT NULL DEFAULT 0,
    `diasAfastamento` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('RASCUNHO', 'CALCULADO', 'CONFIRMADO', 'ESTORNADO') NOT NULL DEFAULT 'RASCUNHO',
    `observacao` TEXT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `folha_holerite_municipioId_competenciaId_idx`(`municipioId`, `competenciaId`),
    INDEX `folha_holerite_municipioId_servidorId_idx`(`municipioId`, `servidorId`),
    UNIQUE INDEX `folha_holerite_competenciaId_servidorId_key`(`competenciaId`, `servidorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `folha_holerite_item` (
    `id` VARCHAR(191) NOT NULL,
    `holeriteId` VARCHAR(191) NOT NULL,
    `rubricaId` VARCHAR(191) NOT NULL,
    `referencia` VARCHAR(191) NULL,
    `valor` DECIMAL(12, 2) NOT NULL,
    `tipo` ENUM('PROVENTO', 'DESCONTO', 'INFORMATIVO') NOT NULL,

    INDEX `folha_holerite_item_holeriteId_idx`(`holeriteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `fornecedor` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `cnpj` VARCHAR(191) NOT NULL,
    `razaoSocial` VARCHAR(191) NOT NULL,
    `nomeFantasia` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `telefone` VARCHAR(191) NULL,
    `endereco` VARCHAR(191) NULL,
    `cidade` VARCHAR(191) NULL,
    `uf` VARCHAR(191) NULL,
    `cep` VARCHAR(191) NULL,
    `contato` VARCHAR(191) NULL,
    `tipoPorte` ENUM('ME', 'EPP', 'OUTROS') NOT NULL DEFAULT 'OUTROS',
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `fornecedor_municipioId_ativo_idx`(`municipioId`, `ativo`),
    UNIQUE INDEX `fornecedor_municipioId_cnpj_key`(`municipioId`, `cnpj`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `categoria_compra` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `categoria_compra_municipioId_nome_key`(`municipioId`, `nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `requisicao` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `justificativa` TEXT NOT NULL,
    `secretaria` VARCHAR(191) NOT NULL,
    `solicitante` VARCHAR(191) NOT NULL,
    `prioridade` ENUM('BAIXA', 'NORMAL', 'ALTA', 'URGENTE') NOT NULL DEFAULT 'NORMAL',
    `status` ENUM('RASCUNHO', 'AGUARDANDO_APROVACAO', 'APROVADA', 'EM_COTACAO', 'CONCLUIDA', 'REJEITADA', 'CANCELADA') NOT NULL DEFAULT 'RASCUNHO',
    `dataRequisicao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dataLimite` DATETIME(3) NULL,
    `dataAprovacao` DATETIME(3) NULL,
    `aprovadoPor` VARCHAR(191) NULL,
    `motivoRejeicao` VARCHAR(191) NULL,
    `valorEstimado` DECIMAL(12, 2) NULL,
    `observacao` TEXT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `requisicao_municipioId_status_prioridade_idx`(`municipioId`, `status`, `prioridade`),
    UNIQUE INDEX `requisicao_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `item_requisicao` (
    `id` VARCHAR(191) NOT NULL,
    `requisicaoId` VARCHAR(191) NOT NULL,
    `categoriaId` VARCHAR(191) NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `unidade` VARCHAR(191) NOT NULL,
    `quantidade` DECIMAL(10, 3) NOT NULL,
    `valorUnitEstimado` DECIMAL(10, 2) NULL,
    `especificacao` TEXT NULL,
    `catalogoId` VARCHAR(191) NULL,

    INDEX `item_requisicao_requisicaoId_idx`(`requisicaoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `cotacao` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `requisicaoId` VARCHAR(191) NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `status` ENUM('ABERTA', 'EM_ANALISE', 'CONCLUIDA', 'CANCELADA') NOT NULL DEFAULT 'ABERTA',
    `dataAbertura` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dataFechamento` DATETIME(3) NULL,
    `responsavel` VARCHAR(191) NOT NULL,
    `observacao` TEXT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `cotacao_municipioId_status_idx`(`municipioId`, `status`),
    UNIQUE INDEX `cotacao_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `item_cotacao` (
    `id` VARCHAR(191) NOT NULL,
    `cotacaoId` VARCHAR(191) NOT NULL,
    `fornecedorId` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `unidade` VARCHAR(191) NOT NULL,
    `quantidade` DECIMAL(10, 3) NOT NULL,
    `valorUnitario` DECIMAL(10, 2) NOT NULL,
    `valorTotal` DECIMAL(12, 2) NOT NULL,
    `marca` VARCHAR(191) NULL,
    `prazoEntrega` INTEGER NULL,
    `melhorPreco` BOOLEAN NOT NULL DEFAULT false,

    INDEX `item_cotacao_cotacaoId_idx`(`cotacaoId`),
    INDEX `item_cotacao_fornecedorId_idx`(`fornecedorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `pedido_compra` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `cotacaoId` VARCHAR(191) NULL,
    `status` ENUM('EMITIDO', 'ENVIADO_FORNECEDOR', 'CONFIRMADO_FORNECEDOR', 'EM_TRANSITO', 'RECEBIDO_PARCIAL', 'RECEBIDO_TOTAL', 'CANCELADO') NOT NULL DEFAULT 'EMITIDO',
    `dataEmissao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dataEntregaPrev` DATETIME(3) NULL,
    `dataEntregaReal` DATETIME(3) NULL,
    `secretaria` VARCHAR(191) NOT NULL,
    `responsavel` VARCHAR(191) NOT NULL,
    `observacao` TEXT NULL,
    `valorTotal` DECIMAL(12, 2) NOT NULL,
    `empenhoNumero` VARCHAR(191) NULL,
    `contaContabil` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `pedido_compra_municipioId_status_idx`(`municipioId`, `status`),
    UNIQUE INDEX `pedido_compra_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `item_pedido` (
    `id` VARCHAR(191) NOT NULL,
    `pedidoId` VARCHAR(191) NOT NULL,
    `fornecedorId` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `unidade` VARCHAR(191) NOT NULL,
    `quantidade` DECIMAL(10, 3) NOT NULL,
    `qtdRecebida` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `valorUnitario` DECIMAL(10, 2) NOT NULL,
    `valorTotal` DECIMAL(12, 2) NOT NULL,

    INDEX `item_pedido_pedidoId_idx`(`pedidoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `processos_licitatorios` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `modalidade` ENUM('PREGAO_ELETRONICO', 'PREGAO_PRESENCIAL', 'CONCORRENCIA', 'CONCURSO', 'LEILAO', 'DISPENSA', 'INEXIGIBILIDADE', 'CHAMAMENTO_PUBLICO') NOT NULL,
    `tipoObjeto` ENUM('OBRAS', 'SERVICOS_ENGENHARIA', 'COMPRAS_BENS', 'SERVICOS_CONTINUADOS', 'LOCACOES', 'CONCESSOES') NOT NULL,
    `objeto` TEXT NOT NULL,
    `justificativa` TEXT NULL,
    `valorEstimado` DOUBLE NOT NULL,
    `dotacaoOrca` VARCHAR(191) NULL,
    `exercicio` INTEGER NOT NULL,
    `dataPublicacao` DATETIME(3) NULL,
    `dataAbertura` DATETIME(3) NULL,
    `dataJulgamento` DATETIME(3) NULL,
    `dataHomologacao` DATETIME(3) NULL,
    `situacao` ENUM('RASCUNHO', 'PUBLICADO', 'EM_ANDAMENTO', 'SUSPENSO', 'DESERTO', 'FRACASSADO', 'HOMOLOGADO', 'REVOGADO', 'ANULADO', 'CONCLUIDO') NOT NULL DEFAULT 'RASCUNHO',
    `criterioJulgamento` VARCHAR(191) NOT NULL DEFAULT 'MENOR_PRECO',
    `exclusivoMePP` BOOLEAN NOT NULL DEFAULT false,
    `margemPreferencia` DOUBLE NULL,
    `responsavelId` VARCHAR(191) NOT NULL,
    `comissao` VARCHAR(191) NULL,
    `editalUrl` VARCHAR(191) NULL,
    `observacoes` TEXT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,
    `usuarioId` VARCHAR(191) NOT NULL,

    INDEX `processos_licitatorios_municipioId_situacao_idx`(`municipioId`, `situacao`),
    INDEX `processos_licitatorios_municipioId_exercicio_idx`(`municipioId`, `exercicio`),
    UNIQUE INDEX `processos_licitatorios_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `itens_licitacao` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `processoId` VARCHAR(191) NOT NULL,
    `numero` INTEGER NOT NULL,
    `descricao` TEXT NOT NULL,
    `unidade` VARCHAR(191) NOT NULL,
    `quantidade` DOUBLE NOT NULL,
    `valorUnitEstimado` DOUBLE NOT NULL,
    `valorTotalEstimado` DOUBLE NOT NULL,
    `situacao` ENUM('PENDENTE', 'COTADO', 'ADJUDICADO', 'CANCELADO') NOT NULL DEFAULT 'PENDENTE',
    `categoriaMaterial` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `itens_licitacao_processoId_idx`(`processoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `propostas` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `processoId` VARCHAR(191) NOT NULL,
    `fornecedorId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `valorTotal` DOUBLE NOT NULL,
    `prazoEntrega` INTEGER NULL,
    `validade` INTEGER NOT NULL DEFAULT 60,
    `situacao` ENUM('RECEBIDA', 'EM_ANALISE', 'HABILITADA', 'INABILITADA', 'CLASSIFICADA', 'DESCLASSIFICADA', 'VENCEDORA', 'SEGUNDA_COLOCADA') NOT NULL DEFAULT 'RECEBIDA',
    `motivoInabilitacao` VARCHAR(191) NULL,
    `observacoes` TEXT NULL,
    `dataRecebimento` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usuarioId` VARCHAR(191) NOT NULL,

    INDEX `propostas_processoId_situacao_idx`(`processoId`, `situacao`),
    UNIQUE INDEX `propostas_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `proposta_itens` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `propostaId` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `valorUnitario` DOUBLE NOT NULL,
    `valorTotal` DOUBLE NOT NULL,
    `marca` VARCHAR(191) NULL,

    INDEX `proposta_itens_propostaId_idx`(`propostaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `contratos` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `processoId` VARCHAR(191) NOT NULL,
    `fornecedorId` VARCHAR(191) NOT NULL,
    `propostaId` VARCHAR(191) NULL,
    `objeto` TEXT NOT NULL,
    `valorInicial` DOUBLE NOT NULL,
    `valorAtual` DOUBLE NOT NULL,
    `dataAssinatura` DATETIME(3) NULL,
    `dataInicio` DATETIME(3) NULL,
    `dataFim` DATETIME(3) NULL,
    `situacao` ENUM('MINUTA', 'ASSINADO', 'VIGENTE', 'SUSPENSO', 'RESCINDIDO', 'ENCERRADO', 'PRORROGADO') NOT NULL DEFAULT 'MINUTA',
    `dotacaoOrca` VARCHAR(191) NULL,
    `responsavelId` VARCHAR(191) NOT NULL,
    `gestorId` VARCHAR(191) NULL,
    `fiscalId` VARCHAR(191) NULL,
    `contratoUrl` VARCHAR(191) NULL,
    `motivoRescisao` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,
    `usuarioId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `contratos_propostaId_key`(`propostaId`),
    INDEX `contratos_municipioId_situacao_idx`(`municipioId`, `situacao`),
    UNIQUE INDEX `contratos_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `aditivos_contrato` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `contratoId` VARCHAR(191) NOT NULL,
    `numero` INTEGER NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `descricao` TEXT NOT NULL,
    `valorAcrescimo` DOUBLE NOT NULL DEFAULT 0,
    `prazoDias` INTEGER NULL,
    `dataAssinatura` DATETIME(3) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usuarioId` VARCHAR(191) NOT NULL,

    INDEX `aditivos_contrato_contratoId_idx`(`contratoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `medicoes_contrato` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `contratoId` VARCHAR(191) NOT NULL,
    `numero` INTEGER NOT NULL,
    `periodo` VARCHAR(191) NOT NULL,
    `valorMedido` DOUBLE NOT NULL,
    `valorAprovado` DOUBLE NULL,
    `dataEnvio` DATETIME(3) NULL,
    `dataAprovacao` DATETIME(3) NULL,
    `situacao` VARCHAR(191) NOT NULL DEFAULT 'ENVIADA',
    `observacoes` TEXT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usuarioId` VARCHAR(191) NOT NULL,

    INDEX `medicoes_contrato_contratoId_idx`(`contratoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `atas_registro_preco` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `processoId` VARCHAR(191) NOT NULL,
    `objeto` TEXT NOT NULL,
    `dataAssinatura` DATETIME(3) NULL,
    `dataValidade` DATETIME(3) NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `atas_registro_preco_processoId_key`(`processoId`),
    UNIQUE INDEX `atas_registro_preco_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Licitacao` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `modalidade` ENUM('PREGAO_ELETRONICO', 'PREGAO_PRESENCIAL', 'CONCORRENCIA', 'CONCURSO', 'LEILAO', 'DISPENSA', 'INEXIGIBILIDADE', 'CHAMAMENTO_PUBLICO') NOT NULL,
    `forma` ENUM('MENOR_PRECO', 'MAIOR_DESCONTO', 'MELHOR_TECNICA', 'TECNICA_PRECO', 'MAIOR_LANCE', 'MAIOR_RETORNO') NOT NULL,
    `situacao` ENUM('RASCUNHO', 'PUBLICADA', 'EM_PRAZO', 'EM_JULGAMENTO', 'HOMOLOGADA', 'DESERTA', 'FRACASSADA', 'REVOGADA', 'ANULADA', 'ADJUDICADA') NOT NULL DEFAULT 'RASCUNHO',
    `objeto` VARCHAR(191) NOT NULL,
    `justificativa` TEXT NULL,
    `fundamentacao` VARCHAR(191) NULL,
    `valorEstimado` DECIMAL(15, 2) NOT NULL,
    `valorHomologado` DECIMAL(15, 2) NULL,
    `dataPublicacao` DATETIME(3) NULL,
    `dataAbertura` DATETIME(3) NULL,
    `dataJulgamento` DATETIME(3) NULL,
    `dataHomologacao` DATETIME(3) NULL,
    `dataAdjudicacao` DATETIME(3) NULL,
    `urlEdital` VARCHAR(191) NULL,
    `urlAta` VARCHAR(191) NULL,
    `urlResultado` VARCHAR(191) NULL,
    `pncpNumero` VARCHAR(191) NULL,
    `doeNumero` VARCHAR(191) NULL,
    `comissao` VARCHAR(191) NULL,
    `pregoeiro` VARCHAR(191) NULL,
    `exercicio` INTEGER NOT NULL,
    `unidadeGestora` VARCHAR(191) NULL,
    `dotacaoOrcamentaria` VARCHAR(191) NULL,
    `fonteCusteio` VARCHAR(191) NULL,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `Licitacao_municipioId_situacao_idx`(`municipioId`, `situacao`),
    INDEX `Licitacao_municipioId_exercicio_idx`(`municipioId`, `exercicio`),
    INDEX `Licitacao_municipioId_modalidade_idx`(`municipioId`, `modalidade`),
    UNIQUE INDEX `Licitacao_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `PropostaLicitacao` (
    `id` VARCHAR(191) NOT NULL,
    `licitacaoId` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `fornecedorNome` VARCHAR(191) NOT NULL,
    `fornecedorCNPJ` VARCHAR(191) NOT NULL,
    `porte` VARCHAR(191) NULL,
    `valorTotal` DECIMAL(15, 2) NOT NULL,
    `tecnica` TEXT NULL,
    `situacao` VARCHAR(191) NOT NULL DEFAULT 'RECEBIDA',
    `motivoDesclass` TEXT NULL,
    `colocacao` INTEGER NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PropostaLicitacao_licitacaoId_idx`(`licitacaoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `contas_contabeis` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `codigoPai` VARCHAR(191) NULL,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` TEXT NULL,
    `natureza` ENUM('ATIVO', 'PASSIVO', 'PATRIMONIO_LQUIDO', 'VARIACAO_PATRIMONIAL_AUMENTATIVA', 'VARIACAO_PATRIMONIAL_DIMINUTIVA', 'CONTROLE_ATIVO', 'CONTROLE_PASSIVO') NOT NULL,
    `nivel` INTEGER NOT NULL,
    `analitica` BOOLEAN NOT NULL DEFAULT false,
    `aceitaLancamento` BOOLEAN NOT NULL DEFAULT false,
    `codigoFuncional` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `contas_contabeis_municipioId_natureza_idx`(`municipioId`, `natureza`),
    INDEX `contas_contabeis_codigoPai_idx`(`codigoPai`),
    UNIQUE INDEX `contas_contabeis_municipioId_codigo_key`(`municipioId`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `exercicios_orcamentarios` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `exercicio` INTEGER NOT NULL,
    `descricao` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ABERTO',
    `dataInicio` DATETIME(3) NOT NULL,
    `dataFim` DATETIME(3) NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usuarioId` VARCHAR(191) NOT NULL,

    INDEX `exercicios_orcamentarios_municipioId_idx`(`municipioId`),
    UNIQUE INDEX `exercicios_orcamentarios_municipioId_exercicio_key`(`municipioId`, `exercicio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `dotacoes` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `exercicioId` VARCHAR(191) NOT NULL,
    `unidadeOrcamentaria` VARCHAR(191) NOT NULL,
    `funcao` VARCHAR(191) NOT NULL,
    `subfuncao` VARCHAR(191) NOT NULL,
    `programa` VARCHAR(191) NOT NULL,
    `acao` VARCHAR(191) NOT NULL,
    `elementoDespesa` VARCHAR(191) NOT NULL,
    `fonteRecurso` VARCHAR(191) NOT NULL,
    `descricaoUnidade` VARCHAR(191) NULL,
    `descricaoElemento` VARCHAR(191) NULL,
    `valorDotacaoInicial` DOUBLE NOT NULL DEFAULT 0,
    `valorSuplementacao` DOUBLE NOT NULL DEFAULT 0,
    `valorReducao` DOUBLE NOT NULL DEFAULT 0,
    `situacao` ENUM('ATIVA', 'BLOQUEADA', 'ENCERRADA') NOT NULL DEFAULT 'ATIVA',
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usuarioId` VARCHAR(191) NOT NULL,

    INDEX `dotacoes_municipioId_exercicioId_idx`(`municipioId`, `exercicioId`),
    UNIQUE INDEX `dotacoes_municipioId_exercicioId_unidadeOrcamentaria_funcao__key`(`municipioId`, `exercicioId`, `unidadeOrcamentaria`, `funcao`, `subfuncao`, `programa`, `acao`, `elementoDespesa`, `fonteRecurso`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `empenhos` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `exercicioId` VARCHAR(191) NOT NULL,
    `dotacaoId` VARCHAR(191) NOT NULL,
    `fornecedorNome` VARCHAR(191) NOT NULL,
    `fornecedorCpfCnpj` VARCHAR(191) NULL,
    `descricao` TEXT NOT NULL,
    `modalidade` ENUM('ORDINARIO', 'ESTIMATIVO', 'GLOBAL') NOT NULL DEFAULT 'ORDINARIO',
    `situacao` ENUM('EMITIDO', 'ANULADO', 'LIQUIDADO', 'PAGO', 'INSCRITO_RP') NOT NULL DEFAULT 'EMITIDO',
    `valorOriginal` DOUBLE NOT NULL,
    `valorAnulado` DOUBLE NOT NULL DEFAULT 0,
    `valorLiquidado` DOUBLE NOT NULL DEFAULT 0,
    `valorPago` DOUBLE NOT NULL DEFAULT 0,
    `dataEmissao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dataLiquidacao` DATETIME(3) NULL,
    `dataPagamento` DATETIME(3) NULL,
    `processoLicitatorio` VARCHAR(191) NULL,
    `contaContaId` VARCHAR(191) NULL,
    `observacoes` TEXT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usuarioId` VARCHAR(191) NOT NULL,

    INDEX `empenhos_municipioId_situacao_idx`(`municipioId`, `situacao`),
    INDEX `empenhos_dotacaoId_idx`(`dotacaoId`),
    UNIQUE INDEX `empenhos_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `lancamentos` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `exercicioId` VARCHAR(191) NOT NULL,
    `empenhoId` VARCHAR(191) NULL,
    `data` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `historico` TEXT NOT NULL,
    `valor` DOUBLE NOT NULL,
    `tipoLancamento` ENUM('DEBITO', 'CREDITO') NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usuarioId` VARCHAR(191) NOT NULL,

    INDEX `lancamentos_municipioId_data_idx`(`municipioId`, `data`),
    UNIQUE INDEX `lancamentos_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `lancamento_itens` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `lancamentoId` VARCHAR(191) NOT NULL,
    `contaDebitoId` VARCHAR(191) NOT NULL,
    `contaCreditoId` VARCHAR(191) NOT NULL,
    `tipo` ENUM('DEBITO', 'CREDITO') NOT NULL,
    `valor` DOUBLE NOT NULL,
    `ordem` INTEGER NOT NULL DEFAULT 0,

    INDEX `lancamento_itens_lancamentoId_idx`(`lancamentoId`),
    INDEX `lancamento_itens_contaDebitoId_idx`(`contaDebitoId`),
    INDEX `lancamento_itens_contaCreditoId_idx`(`contaCreditoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `regras_contabilizacao` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `contaDebitoId` VARCHAR(191) NULL,
    `contaCreditoId` VARCHAR(191) NULL,
    `contaDebito` VARCHAR(191) NULL,
    `contaCredito` VARCHAR(191) NULL,
    `naturezaDespesa` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `regras_contabilizacao_municipioId_codigo_key`(`municipioId`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `PPA` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `exercicioInicio` INTEGER NOT NULL,
    `exercicioFim` INTEGER NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `descricao` TEXT NULL,
    `situacao` VARCHAR(191) NOT NULL DEFAULT 'ELABORACAO',
    `urlLei` VARCHAR(191) NULL,
    `numeroLei` VARCHAR(191) NULL,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `PPA_municipioId_idx`(`municipioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ProgramaPPA` (
    `id` VARCHAR(191) NOT NULL,
    `ppaId` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `objetivo` TEXT NULL,
    `publicoAlvo` VARCHAR(191) NULL,
    `indicador` VARCHAR(191) NULL,
    `unidadeMedida` VARCHAR(191) NULL,

    INDEX `ProgramaPPA_ppaId_idx`(`ppaId`),
    INDEX `ProgramaPPA_municipioId_idx`(`municipioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `AcaoPPA` (
    `id` VARCHAR(191) NOT NULL,
    `programaId` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `unidadeResponsavel` VARCHAR(191) NULL,
    `meta2026` DECIMAL(15, 2) NULL,
    `meta2027` DECIMAL(15, 2) NULL,
    `meta2028` DECIMAL(15, 2) NULL,
    `meta2029` DECIMAL(15, 2) NULL,
    `valor2026` DECIMAL(15, 2) NULL,
    `valor2027` DECIMAL(15, 2) NULL,
    `valor2028` DECIMAL(15, 2) NULL,
    `valor2029` DECIMAL(15, 2) NULL,

    INDEX `AcaoPPA_programaId_idx`(`programaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `LDO` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `exercicio` INTEGER NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `situacao` ENUM('ELABORACAO', 'ENVIADA_CAMARA', 'APROVADA', 'VIGENTE', 'ENCERRADA') NOT NULL DEFAULT 'ELABORACAO',
    `urlLei` VARCHAR(191) NULL,
    `numeroLei` VARCHAR(191) NULL,
    `metaReceitaCorrente` DECIMAL(15, 2) NULL,
    `metaDespesaCorrente` DECIMAL(15, 2) NULL,
    `metaResultadoPrimario` DECIMAL(15, 2) NULL,
    `metaResultadoNominal` DECIMAL(15, 2) NULL,
    `metaDividaConsolidada` DECIMAL(15, 2) NULL,
    `limitePessoalPct` DECIMAL(5, 2) NULL,
    `metaInvestimento` DECIMAL(15, 2) NULL,
    `observacoes` TEXT NULL,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `LDO_municipioId_exercicio_idx`(`municipioId`, `exercicio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `MetaLDO` (
    `id` VARCHAR(191) NOT NULL,
    `ldoId` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `valor` DECIMAL(15, 2) NULL,
    `unidade` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `LOA` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `exercicio` INTEGER NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `situacao` ENUM('ELABORACAO', 'ENVIADA_CAMARA', 'APROVADA_CAMARA', 'PROMULGADA', 'VIGENTE', 'ENCERRADA') NOT NULL DEFAULT 'ELABORACAO',
    `urlLei` VARCHAR(191) NULL,
    `numeroLei` VARCHAR(191) NULL,
    `totalReceita` DECIMAL(15, 2) NULL,
    `totalDespesa` DECIMAL(15, 2) NULL,
    `observacoes` TEXT NULL,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `LOA_municipioId_idx`(`municipioId`),
    UNIQUE INDEX `LOA_municipioId_exercicio_key`(`municipioId`, `exercicio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `UnidadeOrcamentaria` (
    `id` VARCHAR(191) NOT NULL,
    `loaId` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `orgao` VARCHAR(191) NOT NULL,
    `unidade` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,

    INDEX `UnidadeOrcamentaria_loaId_idx`(`loaId`),
    INDEX `UnidadeOrcamentaria_municipioId_idx`(`municipioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Suplemento` (
    `id` VARCHAR(191) NOT NULL,
    `loaId` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `tipo` ENUM('SUPLEMENTAR', 'ESPECIAL', 'EXTRAORDINARIO', 'REMANEJAMENTO') NOT NULL,
    `fonte` ENUM('EXCESSO_ARRECADACAO', 'SUPERAVIT_FINANCEIRO', 'ANULACAO_DOTACAO', 'OPERACAO_CREDITO', 'RESERVA_CONTINGENCIA') NOT NULL,
    `justificativa` TEXT NOT NULL,
    `valor` DECIMAL(15, 2) NOT NULL,
    `urlDecreto` VARCHAR(191) NULL,
    `numeroDecreto` VARCHAR(191) NULL,
    `dataDecreto` DATETIME(3) NULL,
    `dotacoesOrigem` TEXT NULL,
    `dotacoesDestino` TEXT NULL,
    `situacao` VARCHAR(191) NOT NULL DEFAULT 'PENDENTE',
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Suplemento_loaId_idx`(`loaId`),
    INDEX `Suplemento_municipioId_idx`(`municipioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `LiquidacaoEmpenho` (
    `id` VARCHAR(191) NOT NULL,
    `empenhoId` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `valor` DECIMAL(15, 2) NOT NULL,
    `dataLiquidacao` DATETIME(3) NOT NULL,
    `notaFiscal` VARCHAR(191) NULL,
    `descricao` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LiquidacaoEmpenho_empenhoId_idx`(`empenhoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `PagamentoEmpenho` (
    `id` VARCHAR(191) NOT NULL,
    `empenhoId` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `valor` DECIMAL(15, 2) NOT NULL,
    `dataPagamento` DATETIME(3) NOT NULL,
    `formaPagamento` VARCHAR(191) NULL,
    `contaBancaria` VARCHAR(191) NULL,
    `numeroPagamento` VARCHAR(191) NULL,
    `observacao` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PagamentoEmpenho_empenhoId_idx`(`empenhoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Orcamento` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `exercicio` INTEGER NOT NULL,
    `situacao` ENUM('ELABORACAO', 'APROVADO_PL', 'VIGENTE', 'ENCERRADO') NOT NULL DEFAULT 'ELABORACAO',
    `totalDespesa` DECIMAL(14, 2) NOT NULL,
    `totalReceita` DECIMAL(14, 2) NOT NULL,
    `leiNumero` VARCHAR(191) NULL,
    `leiData` DATETIME(3) NULL,
    `decretoAbertura` VARCHAR(191) NULL,
    `observacoes` TEXT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `Orcamento_municipioId_idx`(`municipioId`),
    UNIQUE INDEX `Orcamento_municipioId_exercicio_key`(`municipioId`, `exercicio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Liquidacao` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `empenhoId` VARCHAR(191) NOT NULL,
    `tipo` ENUM('TOTAL', 'PARCIAL') NOT NULL DEFAULT 'TOTAL',
    `valor` DECIMAL(14, 2) NOT NULL,
    `notaFiscal` VARCHAR(191) NULL,
    `dataDocumento` DATETIME(3) NULL,
    `dataLiquidacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `descricao` VARCHAR(191) NULL,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Liquidacao_empenhoId_idx`(`empenhoId`),
    INDEX `Liquidacao_municipioId_idx`(`municipioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Pagamento` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `empenhoId` VARCHAR(191) NOT NULL,
    `valor` DECIMAL(14, 2) NOT NULL,
    `tipo` ENUM('TRANSFERENCIA_BANCARIA', 'BOLETO', 'CHEQUE', 'DINHEIRO', 'PIX') NOT NULL DEFAULT 'TRANSFERENCIA_BANCARIA',
    `dataPagamento` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `banco` VARCHAR(191) NULL,
    `agencia` VARCHAR(191) NULL,
    `conta` VARCHAR(191) NULL,
    `autenticacao` VARCHAR(191) NULL,
    `descricao` VARCHAR(191) NULL,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Pagamento_empenhoId_idx`(`empenhoId`),
    INDEX `Pagamento_municipioId_dataPagamento_idx`(`municipioId`, `dataPagamento`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ReceitaPrevista` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `orcamentoId` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `natureza` ENUM('TRIBUTARIA', 'CONTRIBUICOES', 'PATRIMONIAL', 'AGROPECUARIA', 'INDUSTRIAL', 'SERVICOS', 'TRANSFERENCIAS_CORRENTES', 'OUTRAS_CORRENTES', 'OPERACOES_CREDITO', 'ALIENACAO_BENS', 'TRANSFERENCIAS_CAPITAL', 'OUTRAS_CAPITAL') NOT NULL,
    `fonte` VARCHAR(191) NOT NULL DEFAULT '00',
    `valorPrevisto` DECIMAL(14, 2) NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ReceitaPrevista_municipioId_idx`(`municipioId`),
    UNIQUE INDEX `ReceitaPrevista_orcamentoId_codigo_key`(`orcamentoId`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `LancamentoReceita` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `receitaPrevistaId` VARCHAR(191) NOT NULL,
    `situacao` ENUM('PREVISTA', 'LANCADA', 'ARRECADADA', 'CANCELADA') NOT NULL DEFAULT 'ARRECADADA',
    `valor` DECIMAL(14, 2) NOT NULL,
    `dataArrecadacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `competencia` VARCHAR(191) NOT NULL,
    `documentoOrigem` VARCHAR(191) NULL,
    `descricao` VARCHAR(191) NULL,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LancamentoReceita_municipioId_competencia_idx`(`municipioId`, `competencia`),
    INDEX `LancamentoReceita_receitaPrevistaId_idx`(`receitaPrevistaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ImovelUrbano` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `inscricaoCadastral` VARCHAR(191) NOT NULL,
    `inscricaoAnterior` VARCHAR(191) NULL,
    `logradouro` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NULL,
    `complemento` VARCHAR(191) NULL,
    `bairro` VARCHAR(191) NOT NULL,
    `cep` VARCHAR(191) NULL,
    `quadra` VARCHAR(191) NULL,
    `lote` VARCHAR(191) NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `cpfCnpjProprietario` VARCHAR(191) NULL,
    `nomeProprietario` VARCHAR(191) NOT NULL,
    `enderecoCorrespondencia` VARCHAR(191) NULL,
    `tipoImovel` ENUM('RESIDENCIAL', 'COMERCIAL', 'INDUSTRIAL', 'RURAL', 'MISTO', 'ESPECIAL') NOT NULL DEFAULT 'RESIDENCIAL',
    `situacaoImovel` ENUM('ATIVO', 'ISENTO', 'IMUNE', 'INATIVO') NOT NULL DEFAULT 'ATIVO',
    `areaTerreno` DOUBLE NULL,
    `areaConstruida` DOUBLE NULL,
    `valorVenal` DECIMAL(14, 2) NULL,
    `valorTerreno` DECIMAL(14, 2) NULL,
    `valorConstrucao` DECIMAL(14, 2) NULL,
    `aliquota` DOUBLE NOT NULL DEFAULT 1.0,
    `motivoIsencao` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `ImovelUrbano_municipioId_situacaoImovel_idx`(`municipioId`, `situacaoImovel`),
    INDEX `ImovelUrbano_municipioId_bairro_idx`(`municipioId`, `bairro`),
    INDEX `ImovelUrbano_municipioId_cpfCnpjProprietario_idx`(`municipioId`, `cpfCnpjProprietario`),
    UNIQUE INDEX `ImovelUrbano_municipioId_inscricaoCadastral_key`(`municipioId`, `inscricaoCadastral`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `LancamentoIPTU` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `imovelId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `exercicio` INTEGER NOT NULL,
    `situacao` ENUM('EM_ABERTO', 'PAGO', 'PARCELADO', 'INSCRITO_DA', 'CANCELADO', 'REMIDO', 'PRESCRITO') NOT NULL DEFAULT 'EM_ABERTO',
    `valorVenal` DECIMAL(14, 2) NOT NULL,
    `aliquota` DOUBLE NOT NULL,
    `valorOriginal` DECIMAL(10, 2) NOT NULL,
    `valorDesconto` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `valorFinal` DECIMAL(10, 2) NOT NULL,
    `dataVencimento` DATETIME(3) NOT NULL,
    `dataPagamento` DATETIME(3) NULL,
    `valorPago` DECIMAL(10, 2) NULL,
    `formaPagamento` VARCHAR(191) NULL,
    `percentualMulta` DOUBLE NOT NULL DEFAULT 2.0,
    `percentualJuros` DOUBLE NOT NULL DEFAULT 1.0,
    `observacoes` TEXT NULL,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `LancamentoIPTU_municipioId_exercicio_situacao_idx`(`municipioId`, `exercicio`, `situacao`),
    INDEX `LancamentoIPTU_municipioId_imovelId_idx`(`municipioId`, `imovelId`),
    UNIQUE INDEX `LancamentoIPTU_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ParcelamentoIPTU` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `lancamentoId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `situacao` ENUM('EM_DIA', 'EM_ATRASO', 'QUITADO', 'CANCELADO', 'RENEGOCIADO') NOT NULL DEFAULT 'EM_DIA',
    `totalParcelas` INTEGER NOT NULL,
    `valorTotal` DECIMAL(10, 2) NOT NULL,
    `dataInicio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `observacoes` TEXT NULL,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ParcelamentoIPTU_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ParcelaIPTU` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `parcelamentoId` VARCHAR(191) NOT NULL,
    `numeroParcela` INTEGER NOT NULL,
    `valor` DECIMAL(10, 2) NOT NULL,
    `dataVencimento` DATETIME(3) NOT NULL,
    `dataPagamento` DATETIME(3) NULL,
    `valorPago` DECIMAL(10, 2) NULL,
    `pago` BOOLEAN NOT NULL DEFAULT false,

    INDEX `ParcelaIPTU_municipioId_parcelamentoId_idx`(`municipioId`, `parcelamentoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ContribuinteISS` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `cpfCnpj` VARCHAR(191) NOT NULL,
    `razaoSocial` VARCHAR(191) NOT NULL,
    `nomeFantasia` VARCHAR(191) NULL,
    `tipoContribuinte` ENUM('PESSOA_FISICA', 'PESSOA_JURIDICA', 'MEI', 'AUTONOMO') NOT NULL DEFAULT 'PESSOA_JURIDICA',
    `codigoAtividade` VARCHAR(191) NULL,
    `descricaoAtividade` VARCHAR(191) NULL,
    `aliquota` DOUBLE NOT NULL DEFAULT 2.0,
    `tipoAliquota` ENUM('FIXO', 'PERCENTUAL') NOT NULL DEFAULT 'PERCENTUAL',
    `valorFixoMensal` DECIMAL(10, 2) NULL,
    `email` VARCHAR(191) NULL,
    `telefone` VARCHAR(191) NULL,
    `endereco` VARCHAR(191) NULL,
    `bairro` VARCHAR(191) NULL,
    `simplesNacional` BOOLEAN NOT NULL DEFAULT false,
    `mei` BOOLEAN NOT NULL DEFAULT false,
    `inscricaoMunicipal` VARCHAR(191) NULL,
    `dataAbertura` DATETIME(3) NULL,
    `dataEncerramento` DATETIME(3) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `ContribuinteISS_municipioId_idx`(`municipioId`),
    UNIQUE INDEX `ContribuinteISS_municipioId_cpfCnpj_key`(`municipioId`, `cpfCnpj`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `GuiaISS` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `contribuinteId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `competencia` VARCHAR(191) NOT NULL,
    `situacao` ENUM('EM_ABERTO', 'PAGA', 'PARCELADA', 'INSCRITA_DA', 'CANCELADA', 'ISENTA') NOT NULL DEFAULT 'EM_ABERTO',
    `baseCalculo` DECIMAL(14, 2) NOT NULL,
    `aliquota` DOUBLE NOT NULL,
    `valorOriginal` DECIMAL(10, 2) NOT NULL,
    `valorDesconto` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `valorFinal` DECIMAL(10, 2) NOT NULL,
    `dataVencimento` DATETIME(3) NOT NULL,
    `dataPagamento` DATETIME(3) NULL,
    `valorPago` DECIMAL(10, 2) NULL,
    `formaPagamento` VARCHAR(191) NULL,
    `percentualMulta` DOUBLE NOT NULL DEFAULT 2.0,
    `percentualJuros` DOUBLE NOT NULL DEFAULT 1.0,
    `nfseNumero` VARCHAR(191) NULL,
    `nfseDataEmissao` DATETIME(3) NULL,
    `observacoes` TEXT NULL,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `GuiaISS_municipioId_competencia_situacao_idx`(`municipioId`, `competencia`, `situacao`),
    UNIQUE INDEX `GuiaISS_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ParcelamentoISS` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `guiaId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `situacao` ENUM('EM_DIA', 'EM_ATRASO', 'QUITADO', 'CANCELADO', 'RENEGOCIADO') NOT NULL DEFAULT 'EM_DIA',
    `totalParcelas` INTEGER NOT NULL,
    `valorTotal` DECIMAL(10, 2) NOT NULL,
    `dataInicio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `observacoes` TEXT NULL,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ParcelamentoISS_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ParcelaISS` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `parcelamentoId` VARCHAR(191) NOT NULL,
    `numeroParcela` INTEGER NOT NULL,
    `valor` DECIMAL(10, 2) NOT NULL,
    `dataVencimento` DATETIME(3) NOT NULL,
    `dataPagamento` DATETIME(3) NULL,
    `valorPago` DECIMAL(10, 2) NULL,
    `pago` BOOLEAN NOT NULL DEFAULT false,

    INDEX `ParcelaISS_municipioId_parcelamentoId_idx`(`municipioId`, `parcelamentoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `DividaAtiva` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `cpfCnpjDevedor` VARCHAR(191) NOT NULL,
    `nomeDevedor` VARCHAR(191) NOT NULL,
    `enderecoDevedor` VARCHAR(191) NULL,
    `tipoOrigem` ENUM('IPTU', 'ISS', 'TAXA_LIMPEZA', 'TAXA_ILUMINACAO', 'MULTA_AMBIENTAL', 'MULTA_SANITARIA', 'MULTA_OBRAS', 'OUTROS') NOT NULL,
    `origemId` VARCHAR(191) NULL,
    `exercicio` INTEGER NULL,
    `situacao` ENUM('ATIVA', 'PARCELADA', 'QUITADA', 'CANCELADA', 'AJUIZADA', 'PRESCRITA', 'SUSPENSA_DECISAO') NOT NULL DEFAULT 'ATIVA',
    `valorOriginal` DECIMAL(14, 2) NOT NULL,
    `valorCorrecao` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `valorJuros` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `valorMulta` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `valorHonorarios` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `valorTotal` DECIMAL(14, 2) NOT NULL,
    `valorPago` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `dataInscricao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dataAjuizamento` DATETIME(3) NULL,
    `dataQuitacao` DATETIME(3) NULL,
    `dataCancelamento` DATETIME(3) NULL,
    `numeroProcesso` VARCHAR(191) NULL,
    `varaJuizo` VARCHAR(191) NULL,
    `observacoes` TEXT NULL,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `DividaAtiva_municipioId_situacao_idx`(`municipioId`, `situacao`),
    INDEX `DividaAtiva_municipioId_cpfCnpjDevedor_idx`(`municipioId`, `cpfCnpjDevedor`),
    INDEX `DividaAtiva_municipioId_tipoOrigem_idx`(`municipioId`, `tipoOrigem`),
    UNIQUE INDEX `DividaAtiva_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ParcelamentoDA` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `dividaId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `situacao` ENUM('EM_DIA', 'EM_ATRASO', 'QUITADO', 'CANCELADO', 'RENEGOCIADO') NOT NULL DEFAULT 'EM_DIA',
    `totalParcelas` INTEGER NOT NULL,
    `valorTotal` DECIMAL(14, 2) NOT NULL,
    `valorEntrada` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `dataInicio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `observacoes` TEXT NULL,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ParcelamentoDA_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ParcelaDA` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `parcelamentoId` VARCHAR(191) NOT NULL,
    `numeroParcela` INTEGER NOT NULL,
    `valor` DECIMAL(10, 2) NOT NULL,
    `dataVencimento` DATETIME(3) NOT NULL,
    `dataPagamento` DATETIME(3) NULL,
    `valorPago` DECIMAL(10, 2) NULL,
    `pago` BOOLEAN NOT NULL DEFAULT false,

    INDEX `ParcelaDA_municipioId_parcelamentoId_idx`(`municipioId`, `parcelamentoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Contribuinte` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `tipo` ENUM('FISICA', 'JURIDICA') NOT NULL DEFAULT 'FISICA',
    `nome` VARCHAR(191) NOT NULL,
    `cpfCnpj` VARCHAR(191) NOT NULL,
    `inscricaoMunicipal` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `telefone` VARCHAR(191) NULL,
    `logradouro` VARCHAR(191) NULL,
    `numero` VARCHAR(191) NULL,
    `complemento` VARCHAR(191) NULL,
    `bairro` VARCHAR(191) NULL,
    `cep` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `simplesNacional` BOOLEAN NOT NULL DEFAULT false,
    `mei` BOOLEAN NOT NULL DEFAULT false,
    `cnae` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `Contribuinte_municipioId_idx`(`municipioId`),
    INDEX `Contribuinte_municipioId_tipo_idx`(`municipioId`, `tipo`),
    UNIQUE INDEX `Contribuinte_municipioId_cpfCnpj_key`(`municipioId`, `cpfCnpj`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `LancamentoTributario` (
    `id` VARCHAR(191) NOT NULL,
    `contribuinteId` VARCHAR(191) NOT NULL,
    `imovelId` VARCHAR(191) NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `tipo` ENUM('IPTU', 'ISSQN', 'ITBI', 'COSIP', 'TAXA_LIXO', 'TAXA_ALVARA', 'TAXA_PUBLICIDADE', 'CONTRIBUICAO_MELHORIA', 'MULTA_INFRACAO', 'OUTROS') NOT NULL,
    `exercicio` INTEGER NOT NULL,
    `parcela` INTEGER NULL,
    `totalParcelas` INTEGER NULL,
    `valorPrincipal` DECIMAL(15, 2) NOT NULL,
    `valorDesconto` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `valorMulta` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `valorJuros` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `valorTotal` DECIMAL(15, 2) NOT NULL,
    `dataVencimento` DATETIME(3) NOT NULL,
    `dataPagamento` DATETIME(3) NULL,
    `valorPago` DECIMAL(15, 2) NULL,
    `formaPagamento` VARCHAR(191) NULL,
    `situacao` ENUM('EM_ABERTO', 'PAGO', 'PARCELADO', 'INSCRITO_DA', 'CANCELADO', 'REMIDO', 'PRESCRITO') NOT NULL DEFAULT 'EM_ABERTO',
    `observacao` VARCHAR(191) NULL,
    `codigoBarras` VARCHAR(191) NULL,
    `linhaDigitavel` VARCHAR(191) NULL,
    `dividaAtivaId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `LancamentoTributario_contribuinteId_idx`(`contribuinteId`),
    INDEX `LancamentoTributario_municipioId_tipo_exercicio_idx`(`municipioId`, `tipo`, `exercicio`),
    INDEX `LancamentoTributario_municipioId_situacao_idx`(`municipioId`, `situacao`),
    INDEX `LancamentoTributario_municipioId_dataVencimento_idx`(`municipioId`, `dataVencimento`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Parcelamento` (
    `id` VARCHAR(191) NOT NULL,
    `dividaAtivaId` VARCHAR(191) NOT NULL,
    `contribuinteId` VARCHAR(191) NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `numeroParcelamento` VARCHAR(191) NOT NULL,
    `dataAcordo` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `valorTotal` DECIMAL(15, 2) NOT NULL,
    `totalParcelas` INTEGER NOT NULL,
    `valorParcela` DECIMAL(15, 2) NOT NULL,
    `diaVencimento` INTEGER NOT NULL,
    `situacao` ENUM('EM_DIA', 'EM_ATRASO', 'QUITADO', 'CANCELADO', 'RENEGOCIADO') NOT NULL DEFAULT 'EM_DIA',
    `parcelasQuitadas` INTEGER NOT NULL DEFAULT 0,
    `parcelasEmAtraso` INTEGER NOT NULL DEFAULT 0,
    `dataConclusao` DATETIME(3) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `Parcelamento_municipioId_situacao_idx`(`municipioId`, `situacao`),
    INDEX `Parcelamento_dividaAtivaId_idx`(`dividaAtivaId`),
    UNIQUE INDEX `Parcelamento_municipioId_numeroParcelamento_key`(`municipioId`, `numeroParcelamento`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ParcelaDivida` (
    `id` VARCHAR(191) NOT NULL,
    `parcelamentoId` VARCHAR(191) NOT NULL,
    `lancamentoId` VARCHAR(191) NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `numero` INTEGER NOT NULL,
    `valor` DECIMAL(15, 2) NOT NULL,
    `dataVencimento` DATETIME(3) NOT NULL,
    `dataPagamento` DATETIME(3) NULL,
    `valorPago` DECIMAL(15, 2) NULL,
    `paga` BOOLEAN NOT NULL DEFAULT false,

    INDEX `ParcelaDivida_parcelamentoId_idx`(`parcelamentoId`),
    INDEX `ParcelaDivida_municipioId_dataVencimento_idx`(`municipioId`, `dataVencimento`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `bens_patrimoniais` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `numeroBem` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `tipo` ENUM('IMOVEL', 'MOVEL', 'INTANGIVEL', 'SEMOVENTE', 'INFRAESTRUTURA') NOT NULL,
    `classificacao` ENUM('USO_COMUM', 'USO_ESPECIAL', 'DOMINICAL') NOT NULL DEFAULT 'DOMINICAL',
    `situacao` ENUM('ATIVO', 'EM_MANUTENCAO', 'CEDIDO', 'TRANSFERIDO', 'BAIXADO', 'TOMBADO') NOT NULL DEFAULT 'ATIVO',
    `setorId` VARCHAR(191) NULL,
    `localizacao` VARCHAR(191) NULL,
    `responsavelId` VARCHAR(191) NULL,
    `responsavelNome` VARCHAR(191) NULL,
    `valorAquisicao` DECIMAL(14, 2) NOT NULL,
    `dataAquisicao` DATETIME(3) NOT NULL,
    `valorAtual` DECIMAL(14, 2) NOT NULL,
    `valorResidual` DECIMAL(14, 2) NULL,
    `vidaUtilAnos` INTEGER NULL,
    `metodoDepreciacao` ENUM('LINHA_RETA', 'SOMA_DIGITOS', 'UNIDADES_PRODUCAO') NOT NULL DEFAULT 'LINHA_RETA',
    `taxaDepreciacaoAnual` DECIMAL(6, 4) NULL,
    `depreciacaoAcumulada` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `ultimaDepreciacao` DATETIME(3) NULL,
    `tombado` BOOLEAN NOT NULL DEFAULT false,
    `numeroTombamento` VARCHAR(191) NULL,
    `dataTombamento` DATETIME(3) NULL,
    `orgaoTombamento` VARCHAR(191) NULL,
    `motivoTombamento` VARCHAR(191) NULL,
    `fornecedor` VARCHAR(191) NULL,
    `notaFiscal` VARCHAR(191) NULL,
    `empenho` VARCHAR(191) NULL,
    `origemRecurso` VARCHAR(191) NULL,
    `numeroPlaquet` VARCHAR(191) NULL,
    `numeroChassi` VARCHAR(191) NULL,
    `numeroCertReg` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `bens_patrimoniais_municipioId_tipo_situacao_idx`(`municipioId`, `tipo`, `situacao`),
    INDEX `bens_patrimoniais_municipioId_setorId_idx`(`municipioId`, `setorId`),
    UNIQUE INDEX `bens_patrimoniais_municipioId_numeroBem_key`(`municipioId`, `numeroBem`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `setores_patrimonio` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `responsavel` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `setores_patrimonio_municipioId_codigo_key`(`municipioId`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `movimentacoes_patrimoniais` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `bemId` VARCHAR(191) NOT NULL,
    `tipo` ENUM('INCORPORACAO', 'TRANSFERENCIA', 'CESSAO', 'RETORNO_CESSAO', 'MANUTENCAO', 'BAIXA', 'TOMBAMENTO', 'REAVALIACAO', 'ENTRADA_NF', 'ENTRADA_DOACAO', 'ENTRADA_DEVOLUCAO', 'ENTRADA_PRODUCAO', 'SAIDA_REQUISICAO', 'SAIDA_DOACAO', 'SAIDA_DESCARTE', 'SAIDA_PERDA', 'AJUSTE_INVENTARIO') NOT NULL,
    `dataMovimento` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usuarioId` VARCHAR(191) NOT NULL,
    `usuarioNome` VARCHAR(191) NOT NULL,
    `setorOrigemId` VARCHAR(191) NULL,
    `setorOrigemNome` VARCHAR(191) NULL,
    `setorDestinoId` VARCHAR(191) NULL,
    `setorDestinoNome` VARCHAR(191) NULL,
    `responsavelAnterior` VARCHAR(191) NULL,
    `responsavelNovo` VARCHAR(191) NULL,
    `cessionario` VARCHAR(191) NULL,
    `prazoMeses` INTEGER NULL,
    `dataFimCessao` DATETIME(3) NULL,
    `motivoBaixa` VARCHAR(191) NULL,
    `valorBaixa` DECIMAL(14, 2) NULL,
    `autorizacaoBaixa` VARCHAR(191) NULL,
    `valorAnterior` DECIMAL(14, 2) NULL,
    `valorNovo` DECIMAL(14, 2) NULL,
    `laudoAvaliacao` VARCHAR(191) NULL,
    `observacao` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `movimentacoes_patrimoniais_municipioId_bemId_idx`(`municipioId`, `bemId`),
    INDEX `movimentacoes_patrimoniais_municipioId_tipo_dataMovimento_idx`(`municipioId`, `tipo`, `dataMovimento`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `registros_depreciacao` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `bemId` VARCHAR(191) NOT NULL,
    `competencia` VARCHAR(191) NOT NULL,
    `valorDepreciado` DECIMAL(14, 2) NOT NULL,
    `valorAcumulado` DECIMAL(14, 2) NOT NULL,
    `valorContabil` DECIMAL(14, 2) NOT NULL,
    `metodo` ENUM('LINHA_RETA', 'SOMA_DIGITOS', 'UNIDADES_PRODUCAO') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `registros_depreciacao_municipioId_competencia_idx`(`municipioId`, `competencia`),
    UNIQUE INDEX `registros_depreciacao_bemId_competencia_key`(`bemId`, `competencia`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `inventarios` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `exercicio` INTEGER NOT NULL,
    `dataInicio` DATETIME(3) NOT NULL,
    `dataFim` DATETIME(3) NULL,
    `responsavel` VARCHAR(191) NOT NULL,
    `situacao` VARCHAR(191) NOT NULL DEFAULT 'EM_ANDAMENTO',
    `totalBens` INTEGER NOT NULL DEFAULT 0,
    `bensLocalizados` INTEGER NOT NULL DEFAULT 0,
    `bensNaoLocalizados` INTEGER NOT NULL DEFAULT 0,
    `observacoes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `inventarios_municipioId_exercicio_key`(`municipioId`, `exercicio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `itens_inventario` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `inventarioId` VARCHAR(191) NOT NULL,
    `bemId` VARCHAR(191) NOT NULL,
    `localizado` BOOLEAN NULL,
    `condicao` VARCHAR(191) NULL,
    `localizacaoEncontrada` VARCHAR(191) NULL,
    `observacao` VARCHAR(191) NULL,
    `verificadoEm` DATETIME(3) NULL,
    `verificadoPor` VARCHAR(191) NULL,

    UNIQUE INDEX `itens_inventario_inventarioId_bemId_key`(`inventarioId`, `bemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `CatalogoMaterial` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `especificacao` TEXT NULL,
    `unidadeMedida` VARCHAR(191) NOT NULL,
    `natureza` ENUM('CONSUMO', 'PERMANENTE', 'SERVICO') NOT NULL DEFAULT 'CONSUMO',
    `grupoCatmat` VARCHAR(191) NULL,
    `classeCatmat` VARCHAR(191) NULL,
    `estoqueMinimo` DECIMAL(14, 4) NOT NULL DEFAULT 0,
    `estoqueMaximo` DECIMAL(14, 4) NULL,
    `pontoPedido` DECIMAL(14, 4) NULL,
    `custoUnitario` DECIMAL(14, 4) NOT NULL DEFAULT 0,
    `estoqueAtual` DECIMAL(14, 4) NOT NULL DEFAULT 0,
    `estoqueReservado` DECIMAL(14, 4) NOT NULL DEFAULT 0,
    `situacao` ENUM('ATIVO', 'DESCONTINUADO', 'SUSPENSO') NOT NULL DEFAULT 'ATIVO',
    `fornecedorHabitual` VARCHAR(191) NULL,
    `localizacao` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `CatalogoMaterial_municipioId_natureza_idx`(`municipioId`, `natureza`),
    INDEX `CatalogoMaterial_municipioId_situacao_idx`(`municipioId`, `situacao`),
    UNIQUE INDEX `CatalogoMaterial_municipioId_codigo_key`(`municipioId`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `EntradaEstoque` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `tipoEntrada` ENUM('INCORPORACAO', 'TRANSFERENCIA', 'CESSAO', 'RETORNO_CESSAO', 'MANUTENCAO', 'BAIXA', 'TOMBAMENTO', 'REAVALIACAO', 'ENTRADA_NF', 'ENTRADA_DOACAO', 'ENTRADA_DEVOLUCAO', 'ENTRADA_PRODUCAO', 'SAIDA_REQUISICAO', 'SAIDA_DOACAO', 'SAIDA_DESCARTE', 'SAIDA_PERDA', 'AJUSTE_INVENTARIO') NOT NULL DEFAULT 'ENTRADA_NF',
    `fornecedorNome` VARCHAR(191) NULL,
    `fornecedorCnpj` VARCHAR(191) NULL,
    `notaFiscalNum` VARCHAR(191) NULL,
    `notaFiscalSerie` VARCHAR(191) NULL,
    `notaFiscalData` DATETIME(3) NULL,
    `empenhoNumero` VARCHAR(191) NULL,
    `contratoNumero` VARCHAR(191) NULL,
    `valorTotalNF` DECIMAL(14, 2) NULL,
    `dataRecebimento` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `almoxarifadoId` VARCHAR(191) NULL,
    `setorDestino` VARCHAR(191) NULL,
    `observacao` TEXT NULL,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `EntradaEstoque_municipioId_dataRecebimento_idx`(`municipioId`, `dataRecebimento`),
    UNIQUE INDEX `EntradaEstoque_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ItemEntrada` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `entradaId` VARCHAR(191) NOT NULL,
    `materialId` VARCHAR(191) NOT NULL,
    `quantidade` DECIMAL(14, 4) NOT NULL,
    `custoUnitario` DECIMAL(14, 4) NOT NULL,
    `custoTotal` DECIMAL(14, 2) NOT NULL,
    `custoMedioPre` DECIMAL(14, 4) NULL,
    `custoMedioPos` DECIMAL(14, 4) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `MovimentacaoEstoque` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `materialId` VARCHAR(191) NOT NULL,
    `tipo` ENUM('INCORPORACAO', 'TRANSFERENCIA', 'CESSAO', 'RETORNO_CESSAO', 'MANUTENCAO', 'BAIXA', 'TOMBAMENTO', 'REAVALIACAO', 'ENTRADA_NF', 'ENTRADA_DOACAO', 'ENTRADA_DEVOLUCAO', 'ENTRADA_PRODUCAO', 'SAIDA_REQUISICAO', 'SAIDA_DOACAO', 'SAIDA_DESCARTE', 'SAIDA_PERDA', 'AJUSTE_INVENTARIO') NOT NULL,
    `quantidade` DECIMAL(14, 4) NOT NULL,
    `custoUnitario` DECIMAL(14, 4) NOT NULL,
    `custoTotal` DECIMAL(14, 2) NOT NULL,
    `estoqueAntes` DECIMAL(14, 4) NOT NULL,
    `estoqueDepois` DECIMAL(14, 4) NOT NULL,
    `entradaId` VARCHAR(191) NULL,
    `requisicaoId` VARCHAR(191) NULL,
    `setorDestino` VARCHAR(191) NULL,
    `observacao` VARCHAR(191) NULL,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MovimentacaoEstoque_municipioId_materialId_idx`(`municipioId`, `materialId`),
    INDEX `MovimentacaoEstoque_municipioId_tipo_idx`(`municipioId`, `tipo`),
    INDEX `MovimentacaoEstoque_municipioId_criadoEm_idx`(`municipioId`, `criadoEm`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `BemPatrimonial` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `plaqueta` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `especificacao` TEXT NULL,
    `materialId` VARCHAR(191) NULL,
    `marca` VARCHAR(191) NULL,
    `modelo` VARCHAR(191) NULL,
    `fabricante` VARCHAR(191) NULL,
    `serie` VARCHAR(191) NULL,
    `anoCriacao` INTEGER NULL,
    `corDescricao` VARCHAR(191) NULL,
    `contaContabil` VARCHAR(191) NULL,
    `grupoPatrimonial` VARCHAR(191) NULL,
    `subgrupo` VARCHAR(191) NULL,
    `setorResponsavel` VARCHAR(191) NULL,
    `responsavelNome` VARCHAR(191) NULL,
    `responsavelCpf` VARCHAR(191) NULL,
    `localizacao` VARCHAR(191) NULL,
    `valorAquisicao` DECIMAL(16, 2) NOT NULL,
    `dataAquisicao` DATETIME(3) NOT NULL,
    `fornecedorNome` VARCHAR(191) NULL,
    `fornecedorCnpj` VARCHAR(191) NULL,
    `empenhoNumero` VARCHAR(191) NULL,
    `metodoDepreciacao` ENUM('LINHA_RETA', 'SOMA_DIGITOS', 'UNIDADES_PRODUCAO') NOT NULL DEFAULT 'LINHA_RETA',
    `vidaUtilAnos` INTEGER NULL,
    `taxaDepreciacao` DECIMAL(8, 4) NULL,
    `valorResidual` DECIMAL(16, 2) NOT NULL DEFAULT 0,
    `valorDeprecAcum` DECIMAL(16, 2) NOT NULL DEFAULT 0,
    `valorLiquido` DECIMAL(16, 2) NOT NULL,
    `ultimaDeprecEm` DATETIME(3) NULL,
    `situacao` ENUM('ATIVO', 'EM_MANUTENCAO', 'CEDIDO', 'TRANSFERIDO', 'BAIXADO', 'TOMBADO') NOT NULL DEFAULT 'ATIVO',
    `dataAlienacao` DATETIME(3) NULL,
    `motivoAlienacao` VARCHAR(191) NULL,
    `valorAlienacao` DECIMAL(16, 2) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `BemPatrimonial_municipioId_situacao_idx`(`municipioId`, `situacao`),
    INDEX `BemPatrimonial_municipioId_setorResponsavel_idx`(`municipioId`, `setorResponsavel`),
    INDEX `BemPatrimonial_municipioId_grupoPatrimonial_idx`(`municipioId`, `grupoPatrimonial`),
    UNIQUE INDEX `BemPatrimonial_municipioId_plaqueta_key`(`municipioId`, `plaqueta`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `DepreciacaoBem` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `bemId` VARCHAR(191) NOT NULL,
    `exercicio` INTEGER NOT NULL,
    `mes` INTEGER NULL,
    `valorDepreciacao` DECIMAL(16, 2) NOT NULL,
    `valorDeprecAcum` DECIMAL(16, 2) NOT NULL,
    `valorLiquidoFim` DECIMAL(16, 2) NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DepreciacaoBem_bemId_idx`(`bemId`),
    INDEX `DepreciacaoBem_municipioId_exercicio_idx`(`municipioId`, `exercicio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `motoristas` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `cpf` VARCHAR(191) NOT NULL,
    `matricula` VARCHAR(191) NULL,
    `cargo` VARCHAR(191) NULL,
    `setor` VARCHAR(191) NULL,
    `situacao` ENUM('ATIVO', 'AFASTADO', 'FERIAS', 'INATIVO') NOT NULL DEFAULT 'ATIVO',
    `numeroCNH` VARCHAR(191) NOT NULL,
    `categoriaCNH` VARCHAR(191) NOT NULL,
    `vencimentoCNH` DATETIME(3) NOT NULL,
    `primeiraCNH` DATETIME(3) NULL,
    `emissaoCNH` DATETIME(3) NULL,
    `cnh2Via` BOOLEAN NOT NULL DEFAULT false,
    `cnh30Dias` BOOLEAN NOT NULL DEFAULT false,
    `cnh60Dias` BOOLEAN NOT NULL DEFAULT false,
    `telefone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `motoristas_municipioId_situacao_idx`(`municipioId`, `situacao`),
    UNIQUE INDEX `motoristas_municipioId_cpf_key`(`municipioId`, `cpf`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `abastecimentos` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `veiculoId` VARCHAR(191) NOT NULL,
    `motoristaId` VARCHAR(191) NULL,
    `motoristaNome` VARCHAR(191) NULL,
    `data` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `combustivel` ENUM('GASOLINA', 'ETANOL', 'DIESEL', 'DIESEL_S10', 'GNV', 'FLEX', 'ELETRICO') NOT NULL,
    `litros` DECIMAL(8, 3) NOT NULL,
    `valorLitro` DECIMAL(8, 4) NOT NULL,
    `valorTotal` DECIMAL(10, 2) NOT NULL,
    `kmAbastecimento` INTEGER NOT NULL,
    `kmAnterior` INTEGER NULL,
    `kmRodados` INTEGER NULL,
    `consumoRealizado` DECIMAL(6, 2) NULL,
    `fornecedor` VARCHAR(191) NULL,
    `nfNumero` VARCHAR(191) NULL,
    `empenho` VARCHAR(191) NULL,
    `observacao` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `abastecimentos_municipioId_veiculoId_data_idx`(`municipioId`, `veiculoId`, `data`),
    INDEX `abastecimentos_municipioId_data_idx`(`municipioId`, `data`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `manutencoes_frota` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `veiculoId` VARCHAR(191) NOT NULL,
    `tipo` ENUM('PREVENTIVA', 'CORRETIVA', 'REVISAO', 'PNEU', 'FUNILARIA', 'ELETRICA', 'OUTRO') NOT NULL,
    `status` ENUM('AGUARDANDO', 'EM_EXECUCAO', 'CONCLUIDA', 'CANCELADA') NOT NULL DEFAULT 'AGUARDANDO',
    `descricao` VARCHAR(191) NOT NULL,
    `dataAbertura` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dataInicio` DATETIME(3) NULL,
    `dataConclusao` DATETIME(3) NULL,
    `kmAbertura` INTEGER NOT NULL,
    `oficina` VARCHAR(191) NULL,
    `responsavel` VARCHAR(191) NULL,
    `valorOrcado` DECIMAL(10, 2) NULL,
    `valorFinal` DECIMAL(10, 2) NULL,
    `empenho` VARCHAR(191) NULL,
    `nfNumero` VARCHAR(191) NULL,
    `pecasUtilizadas` TEXT NULL,
    `diagnostico` TEXT NULL,
    `observacao` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `manutencoes_frota_municipioId_veiculoId_idx`(`municipioId`, `veiculoId`),
    INDEX `manutencoes_frota_municipioId_status_idx`(`municipioId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `utilizacoes_veiculo` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `veiculoId` VARCHAR(191) NOT NULL,
    `motoristaId` VARCHAR(191) NULL,
    `motoristaNome` VARCHAR(191) NULL,
    `dataHoraSaida` DATETIME(3) NOT NULL,
    `dataHoraRetorno` DATETIME(3) NULL,
    `kmSaida` INTEGER NOT NULL,
    `kmRetorno` INTEGER NULL,
    `kmRodados` INTEGER NULL,
    `destino` VARCHAR(191) NOT NULL,
    `finalidade` VARCHAR(191) NOT NULL,
    `setor` VARCHAR(191) NULL,
    `autorizado` BOOLEAN NOT NULL DEFAULT false,
    `autorizadoPor` VARCHAR(191) NULL,
    `observacao` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `utilizacoes_veiculo_municipioId_veiculoId_idx`(`municipioId`, `veiculoId`),
    INDEX `utilizacoes_veiculo_municipioId_motoristaId_idx`(`municipioId`, `motoristaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `multas` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `veiculoId` VARCHAR(191) NOT NULL,
    `motoristaId` VARCHAR(191) NULL,
    `numeroAIT` VARCHAR(191) NOT NULL,
    `dataInfracao` DATETIME(3) NOT NULL,
    `dataVencimento` DATETIME(3) NULL,
    `tipo` ENUM('LEVE', 'MEDIA', 'GRAVE', 'GRAVISSIMA') NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `pontos` INTEGER NOT NULL,
    `valorOriginal` DOUBLE NOT NULL,
    `valorComDesconto` DOUBLE NULL,
    `situacao` ENUM('PENDENTE', 'RECORRIDA', 'PAGA', 'CANCELADA', 'PRESCRITA') NOT NULL DEFAULT 'PENDENTE',
    `dataPagamento` DATETIME(3) NULL,
    `dataRecurso` DATETIME(3) NULL,
    `resultadoRecurso` VARCHAR(191) NULL,
    `observacoes` VARCHAR(191) NULL,
    `usuarioId` VARCHAR(191) NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `multas_veiculoId_idx`(`veiculoId`),
    INDEX `multas_municipioId_situacao_idx`(`municipioId`, `situacao`),
    UNIQUE INDEX `multas_municipioId_numeroAIT_key`(`municipioId`, `numeroAIT`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `viagens` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `veiculoId` VARCHAR(191) NOT NULL,
    `motoristaId` VARCHAR(191) NULL,
    `destino` VARCHAR(191) NOT NULL,
    `finalidade` VARCHAR(191) NOT NULL,
    `solicitanteNome` VARCHAR(191) NULL,
    `unidadeNome` VARCHAR(191) NULL,
    `dataSaida` DATETIME(3) NOT NULL,
    `dataRetorno` DATETIME(3) NULL,
    `kmSaida` DOUBLE NOT NULL,
    `kmRetorno` DOUBLE NULL,
    `kmRodados` DOUBLE NULL,
    `observacoes` VARCHAR(191) NULL,
    `usuarioId` VARCHAR(191) NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `viagens_veiculoId_idx`(`veiculoId`),
    INDEX `viagens_municipioId_dataSaida_idx`(`municipioId`, `dataSaida`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Obra` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `descricao` TEXT NULL,
    `tipo` ENUM('CONSTRUCAO_NOVA', 'REFORMA', 'AMPLIACAO', 'DEMOLICAO', 'RESTAURACAO', 'INFRAESTRUTURA_VIARIA', 'DRENAGEM', 'PAVIMENTACAO', 'CALCAMENTO', 'PRACA_PARQUE', 'ESCOLA', 'UBS', 'OUTROS') NOT NULL,
    `situacao` ENUM('PLANEJAMENTO', 'LICITACAO', 'CONTRATADA', 'EM_EXECUCAO', 'PARALISADA', 'CONCLUIDA', 'CANCELADA', 'EMBARGADA') NOT NULL DEFAULT 'PLANEJAMENTO',
    `logradouro` VARCHAR(191) NULL,
    `bairro` VARCHAR(191) NULL,
    `cep` VARCHAR(191) NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `secretariaResponsavel` VARCHAR(191) NULL,
    `nomeResponsavel` VARCHAR(191) NULL,
    `empresaExecutora` VARCHAR(191) NULL,
    `cnpjEmpresa` VARCHAR(191) NULL,
    `responsavelTecnico` VARCHAR(191) NULL,
    `creaResponsavel` VARCHAR(191) NULL,
    `artNumero` VARCHAR(191) NULL,
    `valorOrcado` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `valorContratado` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `valorExecutado` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `fonteCusteio` VARCHAR(191) NULL,
    `numeroConvenio` VARCHAR(191) NULL,
    `dataInicioPrevisto` DATETIME(3) NULL,
    `dataFimPrevisto` DATETIME(3) NULL,
    `dataInicioReal` DATETIME(3) NULL,
    `dataFimReal` DATETIME(3) NULL,
    `percentualFisico` INTEGER NOT NULL DEFAULT 0,
    `percentualFinanceiro` INTEGER NOT NULL DEFAULT 0,
    `areaConstruida` DOUBLE NULL,
    `extensaoMetros` DOUBLE NULL,
    `unidadesAtendidas` INTEGER NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `Obra_municipioId_situacao_idx`(`municipioId`, `situacao`),
    INDEX `Obra_municipioId_tipo_idx`(`municipioId`, `tipo`),
    UNIQUE INDEX `Obra_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `MedicaoObra` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `obraId` VARCHAR(191) NOT NULL,
    `periodo` VARCHAR(191) NOT NULL,
    `dataReferencia` DATETIME(3) NOT NULL,
    `dataMedicao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `valorMedido` DECIMAL(15, 2) NOT NULL,
    `percentualMedido` INTEGER NOT NULL,
    `percentualAcumulado` INTEGER NOT NULL,
    `bdi` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `retencoes` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `valorLiquido` DECIMAL(15, 2) NOT NULL,
    `observacoes` TEXT NULL,
    `medicidoPor` VARCHAR(191) NULL,
    `aprovado` BOOLEAN NOT NULL DEFAULT false,
    `aprovadoPor` VARCHAR(191) NULL,
    `aprovadoEm` DATETIME(3) NULL,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MedicaoObra_municipioId_obraId_idx`(`municipioId`, `obraId`),
    UNIQUE INDEX `MedicaoObra_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `LicencaObra` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `tipo` ENUM('LICENCA_CONSTRUCAO', 'LICENCA_DEMOLICAO', 'LICENCA_REFORMA', 'HABITE_SE', 'LICENCA_LOCALIZACAO', 'ALVARA_FUNCIONAMENTO', 'PARCELAMENTO_SOLO', 'REGULARIZACAO') NOT NULL,
    `situacao` ENUM('REQUERIDA', 'EM_ANALISE', 'APROVADA', 'INDEFERIDA', 'VENCIDA', 'CANCELADA', 'AGUARDANDO_CORRECAO') NOT NULL DEFAULT 'REQUERIDA',
    `nomeRequerente` VARCHAR(191) NOT NULL,
    `cpfCnpjRequerente` VARCHAR(191) NULL,
    `telefoneRequerente` VARCHAR(191) NULL,
    `emailRequerente` VARCHAR(191) NULL,
    `logradouro` VARCHAR(191) NULL,
    `numeroEndereco` VARCHAR(191) NULL,
    `bairro` VARCHAR(191) NULL,
    `cep` VARCHAR(191) NULL,
    `inscricaoCadastral` VARCHAR(191) NULL,
    `responsavelTecnico` VARCHAR(191) NULL,
    `creaRt` VARCHAR(191) NULL,
    `artNumeroLic` VARCHAR(191) NULL,
    `areaTotal` DOUBLE NULL,
    `areaConstruida` DOUBLE NULL,
    `numeroPavimentos` INTEGER NULL,
    `finalidade` VARCHAR(191) NULL,
    `dataRequerimento` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dataAnalise` DATETIME(3) NULL,
    `dataExpedicao` DATETIME(3) NULL,
    `dataVencimento` DATETIME(3) NULL,
    `motivoIndeferimento` TEXT NULL,
    `obraId` VARCHAR(191) NULL,
    `observacoes` TEXT NULL,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `LicencaObra_municipioId_situacao_idx`(`municipioId`, `situacao`),
    INDEX `LicencaObra_municipioId_tipo_idx`(`municipioId`, `tipo`),
    UNIQUE INDEX `LicencaObra_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `VistoriaObra` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `obraId` VARCHAR(191) NULL,
    `licencaId` VARCHAR(191) NULL,
    `tipo` ENUM('INICIAL', 'ANDAMENTO', 'CONCLUSAO', 'EMBARGO', 'ESPECIAL') NOT NULL,
    `dataVistoria` DATETIME(3) NOT NULL,
    `resultado` ENUM('APROVADO', 'APROVADO_COM_RESSALVAS', 'REPROVADO', 'EMBARGADO') NOT NULL,
    `fiscalNome` VARCHAR(191) NULL,
    `creaFiscal` VARCHAR(191) NULL,
    `observacoes` TEXT NULL,
    `laudoTecnico` TEXT NULL,
    `prazoCorrecao` DATETIME(3) NULL,
    `fotosUrls` TEXT NULL,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `VistoriaObra_municipioId_obraId_idx`(`municipioId`, `obraId`),
    UNIQUE INDEX `VistoriaObra_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `EmbargoObra` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `obraId` VARCHAR(191) NOT NULL,
    `situacao` ENUM('ATIVO', 'CUMPRIDO', 'SUSPENSO_LIMINAR', 'CANCELADO') NOT NULL DEFAULT 'ATIVO',
    `origem` ENUM('VISTORIA_FISCAL', 'DENUNCIA', 'DETERMINACAO_JUDICIAL', 'MINISTERIO_PUBLICO') NOT NULL,
    `motivoEmbargo` TEXT NOT NULL,
    `dispositivoLegal` VARCHAR(191) NULL,
    `dataEmbargo` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dataLevantamento` DATETIME(3) NULL,
    `motivoLevantamento` TEXT NULL,
    `fiscalNome` VARCHAR(191) NULL,
    `testemunha1` VARCHAR(191) NULL,
    `testemunha2` VARCHAR(191) NULL,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EmbargoObra_municipioId_obraId_situacao_idx`(`municipioId`, `obraId`, `situacao`),
    UNIQUE INDEX `EmbargoObra_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ObraPublica` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `tipo` ENUM('CONSTRUCAO_NOVA', 'REFORMA', 'AMPLIACAO', 'DEMOLICAO', 'RESTAURACAO', 'INFRAESTRUTURA_VIARIA', 'DRENAGEM', 'PAVIMENTACAO', 'CALCAMENTO', 'PRACA_PARQUE', 'ESCOLA', 'UBS', 'OUTROS') NOT NULL,
    `situacao` ENUM('PLANEJAMENTO', 'LICITACAO', 'CONTRATADA', 'EM_EXECUCAO', 'PARALISADA', 'CONCLUIDA', 'CANCELADA', 'EMBARGADA') NOT NULL DEFAULT 'PLANEJAMENTO',
    `nome` VARCHAR(191) NOT NULL,
    `descricao` TEXT NOT NULL,
    `bairro` VARCHAR(191) NULL,
    `logradouro` VARCHAR(191) NULL,
    `coordLatitude` DECIMAL(10, 7) NULL,
    `coordLongitude` DECIMAL(10, 7) NULL,
    `contratoId` VARCHAR(191) NULL,
    `licitacaoId` VARCHAR(191) NULL,
    `empenhoId` VARCHAR(191) NULL,
    `processoNumero` VARCHAR(191) NULL,
    `empresaNome` VARCHAR(191) NULL,
    `empresaCnpj` VARCHAR(191) NULL,
    `engenheiroNome` VARCHAR(191) NULL,
    `engeheiroArt` VARCHAR(191) NULL,
    `valorContratado` DECIMAL(14, 2) NULL,
    `valorAditivos` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `valorMedido` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `percentualFisico` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `dataOrdemServico` DATETIME(3) NULL,
    `dataInicioReal` DATETIME(3) NULL,
    `dataPrevistaConclusao` DATETIME(3) NULL,
    `dataConclusao` DATETIME(3) NULL,
    `prazoMeses` INTEGER NULL,
    `areaTotal` DECIMAL(10, 2) NULL,
    `extensao` DECIMAL(10, 2) NULL,
    `fonteCusteio` VARCHAR(191) NULL,
    `programaFederal` VARCHAR(191) NULL,
    `convenioNumero` VARCHAR(191) NULL,
    `fiscalId` VARCHAR(191) NULL,
    `fiscalNome` VARCHAR(191) NULL,
    `observacoes` TEXT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `ObraPublica_municipioId_situacao_idx`(`municipioId`, `situacao`),
    INDEX `ObraPublica_municipioId_tipo_idx`(`municipioId`, `tipo`),
    UNIQUE INDEX `ObraPublica_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `EtapaCronograma` (
    `id` VARCHAR(191) NOT NULL,
    `obraId` VARCHAR(191) NOT NULL,
    `ordem` INTEGER NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `responsavel` VARCHAR(191) NULL,
    `percentualFisico` DECIMAL(5, 2) NOT NULL,
    `valorPrevisto` DECIMAL(14, 2) NULL,
    `dataInicioPrevista` DATETIME(3) NULL,
    `dataFimPrevista` DATETIME(3) NULL,
    `dataInicioReal` DATETIME(3) NULL,
    `dataFimReal` DATETIME(3) NULL,
    `situacao` ENUM('NO_PRAZO', 'ATRASADA', 'ADIANTADA', 'CONCLUIDA') NOT NULL DEFAULT 'NO_PRAZO',
    `percentualConcluido` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EtapaCronograma_obraId_idx`(`obraId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `FotoObra` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `obraId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `legenda` VARCHAR(191) NULL,
    `dataFoto` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `medicaoId` VARCHAR(191) NULL,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FotoObra_obraId_idx`(`obraId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Alvara` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `tipo` ENUM('CONSTRUCAO', 'REFORMA', 'AMPLIACAO', 'DEMOLICAO', 'REGULARIZACAO', 'LOCALIZACAO_FUNCIONAMENTO', 'PUBLICIDADE', 'PARCELAMENTO_SOLO', 'EVENTOS') NOT NULL,
    `situacao` ENUM('SOLICITADO', 'EM_ANALISE', 'PENDENTE_DOCUMENTOS', 'APROVADO', 'EMITIDO', 'VENCIDO', 'SUSPENSO', 'CASSADO', 'INDEFERIDO') NOT NULL DEFAULT 'SOLICITADO',
    `requerenteNome` VARCHAR(191) NOT NULL,
    `requerenteCpfCnpj` VARCHAR(191) NOT NULL,
    `requerenteEmail` VARCHAR(191) NULL,
    `requerenteTelefone` VARCHAR(191) NULL,
    `logradouro` VARCHAR(191) NOT NULL,
    `numero_imovel` VARCHAR(191) NULL,
    `bairro` VARCHAR(191) NULL,
    `inscricaoImobiliaria` VARCHAR(191) NULL,
    `coordLatitude` DECIMAL(10, 7) NULL,
    `coordLongitude` DECIMAL(10, 7) NULL,
    `descricaoObra` TEXT NULL,
    `areaTotal` DECIMAL(10, 2) NULL,
    `areaConstruida` DECIMAL(10, 2) NULL,
    `numeroPavimentos` INTEGER NULL,
    `usoEdificacao` VARCHAR(191) NULL,
    `responsavelNome` VARCHAR(191) NULL,
    `responsavelCrea` VARCHAR(191) NULL,
    `artNumero` VARCHAR(191) NULL,
    `dataProtocolo` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dataAnalise` DATETIME(3) NULL,
    `dataAprovacao` DATETIME(3) NULL,
    `dataEmissao` DATETIME(3) NULL,
    `dataVencimento` DATETIME(3) NULL,
    `dataValidade` INTEGER NULL,
    `valorTaxa` DECIMAL(10, 2) NULL,
    `dataPagamentoTaxa` DATETIME(3) NULL,
    `nossaNumero` VARCHAR(191) NULL,
    `documentosExigidos` JSON NULL,
    `documentosRecebidos` JSON NULL,
    `motivoIndeferimento` TEXT NULL,
    `tecnicoResponsavel` VARCHAR(191) NULL,
    `observacoes` TEXT NULL,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `Alvara_municipioId_situacao_idx`(`municipioId`, `situacao`),
    INDEX `Alvara_municipioId_tipo_idx`(`municipioId`, `tipo`),
    INDEX `Alvara_municipioId_requerenteCpfCnpj_idx`(`municipioId`, `requerenteCpfCnpj`),
    UNIQUE INDEX `Alvara_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `FiscalizacaoObra` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `tipo` ENUM('ROTINA', 'DENUNCIA', 'AUTO_INFRACAO', 'EMBARGO', 'VERIFICACAO_CONCLUSAO', 'REINCIDENCIA') NOT NULL,
    `situacao` ENUM('ABERTA', 'EM_CAMPO', 'AGUARDANDO_PRAZO', 'CUMPRIDA', 'AUTO_INFRACAO_EMITIDO', 'EMBARGADA', 'ENCERRADA') NOT NULL DEFAULT 'ABERTA',
    `obraId` VARCHAR(191) NULL,
    `alvaraId` VARCHAR(191) NULL,
    `origemDenuncia` TEXT NULL,
    `logradouro` VARCHAR(191) NOT NULL,
    `numero_local` VARCHAR(191) NULL,
    `bairro` VARCHAR(191) NULL,
    `referencia` VARCHAR(191) NULL,
    `infratoresNomes` VARCHAR(191) NULL,
    `infratoresCpfCnpj` VARCHAR(191) NULL,
    `dataAbertura` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dataVistoria` DATETIME(3) NULL,
    `fiscalNome` VARCHAR(191) NOT NULL,
    `fiscalMatricula` VARCHAR(191) NULL,
    `relatorioVistoria` TEXT NULL,
    `fotosUrls` JSON NULL,
    `dataNotiicacao` DATETIME(3) NULL,
    `prazoRegularizacao` INTEGER NULL,
    `dataLimiteRegularizacao` DATETIME(3) NULL,
    `numeroAutoInfracao` VARCHAR(191) NULL,
    `valorMulta` DECIMAL(10, 2) NULL,
    `dataEmbargo` DATETIME(3) NULL,
    `motivoEmbargo` TEXT NULL,
    `dataLevantamento` DATETIME(3) NULL,
    `dataCumprimento` DATETIME(3) NULL,
    `dataEncerramento` DATETIME(3) NULL,
    `resultadoFinal` TEXT NULL,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `FiscalizacaoObra_municipioId_situacao_idx`(`municipioId`, `situacao`),
    INDEX `FiscalizacaoObra_municipioId_tipo_idx`(`municipioId`, `tipo`),
    INDEX `FiscalizacaoObra_obraId_idx`(`obraId`),
    INDEX `FiscalizacaoObra_alvaraId_idx`(`alvaraId`),
    UNIQUE INDEX `FiscalizacaoObra_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ProgramaAuditoria` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `exercicio` INTEGER NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `objetivo` TEXT NOT NULL,
    `metodologia` TEXT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProgramaAuditoria_municipioId_idx`(`municipioId`),
    UNIQUE INDEX `ProgramaAuditoria_municipioId_exercicio_key`(`municipioId`, `exercicio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Auditoria` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `programaId` VARCHAR(191) NULL,
    `tipo` ENUM('ORDINARIA', 'ESPECIAL', 'ACOMPANHAMENTO', 'GOVERNANCA', 'CONFORMIDADE', 'OPERACIONAL', 'CONTABIL') NOT NULL,
    `situacao` ENUM('PLANEJADA', 'EM_EXECUCAO', 'CONCLUIDA', 'ARQUIVADA', 'SUSPENSA') NOT NULL DEFAULT 'PLANEJADA',
    `titulo` VARCHAR(191) NOT NULL,
    `objeto` TEXT NOT NULL,
    `objetivo` TEXT NULL,
    `escopo` TEXT NULL,
    `criterios` TEXT NULL,
    `unidadeAuditada` VARCHAR(191) NOT NULL,
    `responsavelAuditado` VARCHAR(191) NULL,
    `auditorResponsavel` VARCHAR(191) NOT NULL,
    `equipe` TEXT NULL,
    `dataInicio` DATETIME(3) NULL,
    `dataPrevFim` DATETIME(3) NULL,
    `dataFim` DATETIME(3) NULL,
    `numeroBOAchados` INTEGER NOT NULL DEFAULT 0,
    `numeroBORecomend` INTEGER NOT NULL DEFAULT 0,
    `valorIrregularidade` DECIMAL(14, 2) NULL,
    `relatorioUrl` VARCHAR(191) NULL,
    `observacoes` TEXT NULL,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `Auditoria_municipioId_situacao_idx`(`municipioId`, `situacao`),
    INDEX `Auditoria_municipioId_tipo_idx`(`municipioId`, `tipo`),
    UNIQUE INDEX `Auditoria_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `AchadoAuditoria` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `auditoriaId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `tipo` ENUM('NAO_CONFORMIDADE', 'IRREGULARIDADE', 'FRAQUEZA_CONTROLE', 'INEFICIENCIA', 'RISCO', 'BOA_PRATICA') NOT NULL,
    `nivelRisco` ENUM('CRITICO', 'ALTO', 'MEDIO', 'BAIXO', 'INFORMATIVO') NOT NULL DEFAULT 'MEDIO',
    `situacao` ENUM('RASCUNHO', 'CONFIRMADO', 'COMUNICADO', 'EM_MONITORAMENTO', 'SANEADO', 'NAO_IMPLEMENTADO', 'CANCELADO') NOT NULL DEFAULT 'RASCUNHO',
    `titulo` VARCHAR(191) NOT NULL,
    `condicao` TEXT NOT NULL,
    `criterio` TEXT NULL,
    `causa` TEXT NULL,
    `efeito` TEXT NULL,
    `evidencias` TEXT NULL,
    `valorIrregularidade` DECIMAL(14, 2) NULL,
    `dataComunicacao` DATETIME(3) NULL,
    `prazoSanamento` DATETIME(3) NULL,
    `dataSanamento` DATETIME(3) NULL,
    `responstaGestor` TEXT NULL,
    `parecerAuditor` TEXT NULL,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `AchadoAuditoria_municipioId_situacao_idx`(`municipioId`, `situacao`),
    INDEX `AchadoAuditoria_municipioId_nivelRisco_idx`(`municipioId`, `nivelRisco`),
    UNIQUE INDEX `AchadoAuditoria_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Recomendacao` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `achadoId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `descricao` TEXT NOT NULL,
    `responsavel` VARCHAR(191) NOT NULL,
    `prazo` DATETIME(3) NULL,
    `prioridade` VARCHAR(191) NOT NULL DEFAULT 'MEDIA',
    `situacao` VARCHAR(191) NOT NULL DEFAULT 'PENDENTE',
    `resposta` TEXT NULL,
    `dataImplementacao` DATETIME(3) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `Recomendacao_municipioId_achadoId_idx`(`municipioId`, `achadoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Achado` (
    `id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `PAD` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL DEFAULT 'PAD',
    `situacao` ENUM('INSTAURADO', 'INSTRUCAO', 'RELATORIO', 'JULGAMENTO', 'RECURSO', 'ENCERRADO_ARQUIVADO', 'ENCERRADO_PENALIDADE', 'SUSPENSO') NOT NULL DEFAULT 'INSTAURADO',
    `achadoId` VARCHAR(191) NULL,
    `servidorNome` VARCHAR(191) NOT NULL,
    `servidorMatricula` VARCHAR(191) NULL,
    `cargo` VARCHAR(191) NULL,
    `presidenteComissao` VARCHAR(191) NOT NULL,
    `membrosComissao` TEXT NULL,
    `fatoApurado` TEXT NOT NULL,
    `fundamentoLegal` VARCHAR(191) NULL,
    `portariaInstauracao` VARCHAR(191) NULL,
    `dataInstauracao` DATETIME(3) NOT NULL,
    `prazoInstrucao` DATETIME(3) NULL,
    `dataRelatorio` DATETIME(3) NULL,
    `dataJulgamento` DATETIME(3) NULL,
    `penalidade` ENUM('ADVERTENCIA', 'SUSPENSAO', 'DEMISSAO', 'CASSACAO_APOSENTADORIA', 'DESTITUICAO_CARGO', 'MULTA', 'REPOSICAO_ERARIO', 'ARQUIVAMENTO') NULL,
    `fundamentoPenalidade` TEXT NULL,
    `valorMulta` DECIMAL(10, 2) NULL,
    `diasSuspensao` INTEGER NULL,
    `recurso` TEXT NULL,
    `dataRecurso` DATETIME(3) NULL,
    `decisaoRecurso` TEXT NULL,
    `observacoes` TEXT NULL,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `PAD_municipioId_situacao_idx`(`municipioId`, `situacao`),
    UNIQUE INDEX `PAD_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `LogConformidade` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `modulo` VARCHAR(191) NOT NULL,
    `evento` VARCHAR(191) NOT NULL,
    `entidade` VARCHAR(191) NULL,
    `entidadeId` VARCHAR(191) NULL,
    `usuarioNome` VARCHAR(191) NULL,
    `ipOrigem` VARCHAR(191) NULL,
    `nivelAlerta` VARCHAR(191) NOT NULL DEFAULT 'INFO',
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LogConformidade_municipioId_modulo_idx`(`municipioId`, `modulo`),
    INDEX `LogConformidade_municipioId_nivelAlerta_idx`(`municipioId`, `nivelAlerta`),
    INDEX `LogConformidade_municipioId_criadoEm_idx`(`municipioId`, `criadoEm`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `PedidoAcesso` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `protocolo` VARCHAR(191) NOT NULL,
    `situacao` ENUM('RECEBIDO', 'EM_TRAMITACAO', 'AGUARDANDO_SETOR', 'RESPONDIDO', 'RESPONDIDO_TARDIO', 'PRORROGADO', 'INDEFERIDO', 'PARCIALMENTE_ATENDIDO', 'RECURSO_ABERTO', 'ENCERRADO') NOT NULL DEFAULT 'RECEBIDO',
    `tipoSolicitante` ENUM('PESSOA_FISICA', 'PESSOA_JURIDICA', 'ANONIMO') NOT NULL DEFAULT 'PESSOA_FISICA',
    `nomeRequerente` VARCHAR(191) NULL,
    `cpfCnpjRequerente` VARCHAR(191) NULL,
    `emailRequerente` VARCHAR(191) NULL,
    `telefoneRequerente` VARCHAR(191) NULL,
    `enderecoRequerente` VARCHAR(191) NULL,
    `assunto` VARCHAR(191) NOT NULL,
    `descricaoPedido` TEXT NOT NULL,
    `palavrasChave` VARCHAR(191) NULL,
    `setorDestinatario` VARCHAR(191) NULL,
    `formaEntrega` ENUM('EMAIL', 'CORREIO', 'PORTAL_ESIC', 'PRESENCIAL') NOT NULL DEFAULT 'EMAIL',
    `dataProtocolo` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dataLimiteResposta` DATETIME(3) NOT NULL,
    `dataProrrogacaoFim` DATETIME(3) NULL,
    `dataResposta` DATETIME(3) NULL,
    `prorrogado` BOOLEAN NOT NULL DEFAULT false,
    `motivoProrrogacao` VARCHAR(191) NULL,
    `textoResposta` TEXT NULL,
    `formaResposta` ENUM('EMAIL', 'CORREIO', 'PORTAL_ESIC', 'PRESENCIAL') NULL,
    `urlDocumento` VARCHAR(191) NULL,
    `tecnicoResponsavel` VARCHAR(191) NULL,
    `setorResposavel` VARCHAR(191) NULL,
    `motivoIndeferimento` ENUM('INFORMACAO_SIGILOSA_GRAU_1', 'INFORMACAO_SIGILOSA_GRAU_2', 'INFORMACAO_SIGILOSA_GRAU_3', 'DADO_PESSOAL', 'SEGREDO_INDUSTRIA', 'PEDIDO_GENERICO', 'TRABALHO_PRODUCAO', 'INFORMACAO_INEXISTENTE', 'INFORMACAO_PUBLICA', 'OUTRO') NULL,
    `fundamentoLegal` VARCHAR(191) NULL,
    `diasResposta` INTEGER NULL,
    `dentroDoPrazo` BOOLEAN NULL,
    `tematico` VARCHAR(191) NULL,
    `observacoesInternas` TEXT NULL,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `PedidoAcesso_municipioId_situacao_idx`(`municipioId`, `situacao`),
    INDEX `PedidoAcesso_municipioId_dataLimiteResposta_idx`(`municipioId`, `dataLimiteResposta`),
    INDEX `PedidoAcesso_municipioId_setorDestinatario_idx`(`municipioId`, `setorDestinatario`),
    UNIQUE INDEX `PedidoAcesso_municipioId_protocolo_key`(`municipioId`, `protocolo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `TramitacaoPedido` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `pedidoId` VARCHAR(191) NOT NULL,
    `despacho` TEXT NOT NULL,
    `setorOrigem` VARCHAR(191) NULL,
    `setorDestino` VARCHAR(191) NULL,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TramitacaoPedido_pedidoId_idx`(`pedidoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `RecursoPedido` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `pedidoId` VARCHAR(191) NOT NULL,
    `instancia` ENUM('PRIMEIRA_INSTANCIA', 'SEGUNDA_INSTANCIA', 'TERCEIRA_INSTANCIA', 'CGM_TCM') NOT NULL,
    `situacao` ENUM('RECEBIDO', 'EM_ANALISE', 'PROVIDO', 'PARCIALMENTE_PROVIDO', 'IMPROVIDO', 'DESISTIDO') NOT NULL DEFAULT 'RECEBIDO',
    `numero` VARCHAR(191) NOT NULL,
    `nomeRecorrente` VARCHAR(191) NULL,
    `motivoRecurso` TEXT NOT NULL,
    `dataProtocolo` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dataLimiteDecisao` DATETIME(3) NOT NULL,
    `dataDecisao` DATETIME(3) NULL,
    `textoDecisao` TEXT NULL,
    `autoridade` VARCHAR(191) NULL,
    `dentroDoPrazo` BOOLEAN NULL,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `RecursoPedido_pedidoId_idx`(`pedidoId`),
    INDEX `RecursoPedido_municipioId_situacao_idx`(`municipioId`, `situacao`),
    UNIQUE INDEX `RecursoPedido_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `TransparenciaAtiva` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `tipo` ENUM('ESTRUTURA_ORGANIZACIONAL', 'ACOES_PROGRAMAS', 'LICITACOES_CONTRATOS', 'REPASSES_TRANSFERENCIAS', 'RECEITAS_DESPESAS', 'OBRAS_PUBLICAS', 'SERVIDORES', 'RESPOSTAS_PERGUNTAS_FREQUENTES', 'DIARIO_OFICIAL', 'RELATORIO_GESTAO', 'CONTAS_PUBLICAS', 'NOTA_IMPRENSA') NOT NULL,
    `situacao` ENUM('RASCUNHO', 'PUBLICADO', 'DESATUALIZADO', 'ARQUIVADO') NOT NULL DEFAULT 'RASCUNHO',
    `titulo` VARCHAR(191) NOT NULL,
    `descricao` TEXT NOT NULL,
    `conteudo` LONGTEXT NULL,
    `urlExterna` VARCHAR(191) NULL,
    `urlArquivo` VARCHAR(191) NULL,
    `periodoCoberto` VARCHAR(191) NULL,
    `periodicidade` VARCHAR(191) NULL,
    `dataProximaAtualizacao` DATETIME(3) NULL,
    `dataUltimaAtualizacao` DATETIME(3) NULL,
    `palavrasChave` VARCHAR(191) NULL,
    `secretaria` VARCHAR(191) NULL,
    `publicadoEm` DATETIME(3) NULL,
    `visualizacoes` INTEGER NOT NULL DEFAULT 0,
    `downloads` INTEGER NOT NULL DEFAULT 0,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `TransparenciaAtiva_municipioId_tipo_idx`(`municipioId`, `tipo`),
    INDEX `TransparenciaAtiva_municipioId_situacao_idx`(`municipioId`, `situacao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `RelatorioSIC` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `exercicio` INTEGER NOT NULL,
    `totalPedidos` INTEGER NOT NULL,
    `totalRespondidos` INTEGER NOT NULL,
    `totalIndeferidos` INTEGER NOT NULL,
    `totalRecursos` INTEGER NOT NULL,
    `mediaRespostaDias` DECIMAL(5, 2) NOT NULL,
    `percentualNoPrazo` DECIMAL(5, 2) NOT NULL,
    `porSetor` JSON NULL,
    `porTema` JSON NULL,
    `publicado` BOOLEAN NOT NULL DEFAULT false,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RelatorioSIC_municipioId_exercicio_key`(`municipioId`, `exercicio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `MovimentacaoManifestacao` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `manifestacaoId` VARCHAR(191) NOT NULL,
    `situacaoDe` ENUM('RECEBIDA', 'EM_ANALISE', 'ENCAMINHADA', 'EM_RESPOSTA', 'RESPONDIDA', 'ARQUIVADA', 'CANCELADA') NOT NULL,
    `situacaoPara` ENUM('RECEBIDA', 'EM_ANALISE', 'ENCAMINHADA', 'EM_RESPOSTA', 'RESPONDIDA', 'ARQUIVADA', 'CANCELADA') NOT NULL,
    `motivo` TEXT NULL,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MovimentacaoManifestacao_manifestacaoId_idx`(`manifestacaoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `RespostaManifestacao` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `manifestacaoId` VARCHAR(191) NOT NULL,
    `texto` TEXT NOT NULL,
    `tipo` VARCHAR(191) NOT NULL DEFAULT 'OFICIAL',
    `remetente` VARCHAR(191) NULL,
    `publica` BOOLEAN NOT NULL DEFAULT true,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RespostaManifestacao_manifestacaoId_idx`(`manifestacaoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `UnidadeSuas` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `tipo` ENUM('CRAS', 'CREAS', 'CENTRO_POP', 'CRAM', 'ABRIGO', 'OUTRO') NOT NULL,
    `codigo` VARCHAR(191) NULL,
    `logradouro` VARCHAR(191) NULL,
    `bairro` VARCHAR(191) NULL,
    `cep` VARCHAR(191) NULL,
    `telefone` VARCHAR(191) NULL,
    `responsavel` VARCHAR(191) NULL,
    `territorioCoberto` TEXT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UnidadeSuas_municipioId_idx`(`municipioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `FamiliaReferenciada` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `numeroProntuario` VARCHAR(191) NOT NULL,
    `responsavelNome` VARCHAR(191) NOT NULL,
    `responsavelCpf` VARCHAR(191) NULL,
    `responsavelNis` VARCHAR(191) NULL,
    `responsavelSexo` VARCHAR(191) NULL,
    `responsavelDatNasc` DATETIME(3) NULL,
    `logradouro` VARCHAR(191) NULL,
    `numero` VARCHAR(191) NULL,
    `complemento` VARCHAR(191) NULL,
    `bairro` VARCHAR(191) NULL,
    `cep` VARCHAR(191) NULL,
    `referencia` VARCHAR(191) NULL,
    `telefone` VARCHAR(191) NULL,
    `telefone2` VARCHAR(191) NULL,
    `nivelVulnerabilidade` ENUM('BAIXO', 'MEDIO', 'ALTO', 'MUITO_ALTO') NOT NULL DEFAULT 'MEDIO',
    `situacao` ENUM('ATIVA', 'INATIVA', 'TRANSFERIDA', 'DESLIGADA') NOT NULL DEFAULT 'ATIVA',
    `membrosJson` TEXT NULL,
    `rendaFamiliar` DECIMAL(10, 2) NULL,
    `percapita` DECIMAL(8, 2) NULL,
    `quantidadeMembros` INTEGER NOT NULL DEFAULT 1,
    `bolsaFamilia` BOOLEAN NOT NULL DEFAULT false,
    `bpc` BOOLEAN NOT NULL DEFAULT false,
    `cadunico` BOOLEAN NOT NULL DEFAULT false,
    `numeroCadunico` VARCHAR(191) NULL,
    `tipoMoradia` VARCHAR(191) NULL,
    `condicaoMoradia` TEXT NULL,
    `criancas` BOOLEAN NOT NULL DEFAULT false,
    `idosos` BOOLEAN NOT NULL DEFAULT false,
    `pcd` BOOLEAN NOT NULL DEFAULT false,
    `gestante` BOOLEAN NOT NULL DEFAULT false,
    `violencia` BOOLEAN NOT NULL DEFAULT false,
    `substancias` BOOLEAN NOT NULL DEFAULT false,
    `situacaoRua` BOOLEAN NOT NULL DEFAULT false,
    `unidadeId` VARCHAR(191) NULL,
    `tecnicoRefId` VARCHAR(191) NULL,
    `observacoes` TEXT NULL,
    `dataIngresso` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dataDesligamento` DATETIME(3) NULL,
    `motivoDesligamento` VARCHAR(191) NULL,
    `usuarioId` VARCHAR(191) NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `FamiliaReferenciada_municipioId_unidadeId_idx`(`municipioId`, `unidadeId`),
    UNIQUE INDEX `FamiliaReferenciada_municipioId_numeroProntuario_key`(`municipioId`, `numeroProntuario`),
    UNIQUE INDEX `FamiliaReferenciada_municipioId_responsavelCpf_key`(`municipioId`, `responsavelCpf`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `AtendimentoSuas` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `familiaId` VARCHAR(191) NOT NULL,
    `unidadeId` VARCHAR(191) NOT NULL,
    `tipo` ENUM('RECEPCAO_TRIAGEM', 'ATENDIMENTO_INDIVIDUAL', 'ATENDIMENTO_FAMILIAR', 'VISITA_DOMICILIAR', 'REUNIAO_GRUPO', 'OFICINA', 'ENCAMINHAMENTO', 'ACOMPANHAMENTO', 'CADASTRO_ATUALIZACAO') NOT NULL,
    `situacao` ENUM('AGENDADO', 'REALIZADO', 'FALTOU', 'CANCELADO', 'TRANSFERIDO') NOT NULL DEFAULT 'AGENDADO',
    `dataAtendimento` DATETIME(3) NOT NULL,
    `duracaoMinutos` INTEGER NULL,
    `tecnicoNome` VARCHAR(191) NULL,
    `tecnicoId` VARCHAR(191) NULL,
    `objetivo` TEXT NULL,
    `descricao` TEXT NULL,
    `encaminhamentos` TEXT NULL,
    `vulnerabilidadesIdentificadas` TEXT NULL,
    `planoAcao` TEXT NULL,
    `usuarioId` VARCHAR(191) NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `AtendimentoSuas_municipioId_familiaId_idx`(`municipioId`, `familiaId`),
    INDEX `AtendimentoSuas_municipioId_dataAtendimento_idx`(`municipioId`, `dataAtendimento`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `BeneficioFamilia` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `familiaId` VARCHAR(191) NOT NULL,
    `tipo` ENUM('BPC_IDOSO', 'BPC_PCD', 'BOLSA_FAMILIA', 'AUXILIO_BRASIL', 'VALE_GAS', 'BENEFICIO_EVENTUAL', 'BENEFICIO_MUNICIPAL', 'OUTRO') NOT NULL,
    `situacao` ENUM('ATIVO', 'SUSPENSO', 'CANCELADO', 'AGUARDANDO') NOT NULL DEFAULT 'ATIVO',
    `descricao` VARCHAR(191) NULL,
    `valor` DECIMAL(10, 2) NULL,
    `dataConcessao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dataVencimento` DATETIME(3) NULL,
    `dataRevogacao` DATETIME(3) NULL,
    `motivoRevogacao` VARCHAR(191) NULL,
    `referenciaExterna` VARCHAR(191) NULL,
    `observacoes` VARCHAR(191) NULL,
    `usuarioId` VARCHAR(191) NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BeneficioFamilia_municipioId_familiaId_idx`(`municipioId`, `familiaId`),
    INDEX `BeneficioFamilia_municipioId_tipo_situacao_idx`(`municipioId`, `tipo`, `situacao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `UnidadeSaude` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `tipo` ENUM('UBS', 'UBSF', 'UPA_24H', 'CAPS', 'CRAS', 'FARMACIA', 'LABORATORIO', 'CENTRO_ESPECIALIDADES', 'HOSPITAL_MUNICIPAL') NOT NULL,
    `cnes` VARCHAR(191) NULL,
    `cep` VARCHAR(191) NULL,
    `logradouro` VARCHAR(191) NULL,
    `bairro` VARCHAR(191) NULL,
    `telefone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `responsavel` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `horaAberturaLun` VARCHAR(191) NULL,
    `horaFechamentoLun` VARCHAR(191) NULL,
    `vagas` INTEGER NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `UnidadeSaude_municipioId_idx`(`municipioId`),
    INDEX `UnidadeSaude_municipioId_tipo_idx`(`municipioId`, `tipo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ProfissionalSaude` (
    `id` VARCHAR(191) NOT NULL,
    `unidadeId` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `tipo` ENUM('MEDICO', 'ENFERMEIRO', 'TECNICO_ENFERMAGEM', 'DENTISTA', 'FARMACEUTICO', 'PSICOLOGO', 'FISIOTERAPEUTA', 'NUTRICIONISTA', 'ASSISTENTE_SOCIAL', 'ACS', 'ACE', 'ADMINISTRATIVO') NOT NULL,
    `registro` VARCHAR(191) NULL,
    `cpf` VARCHAR(191) NULL,
    `especialidade` VARCHAR(191) NULL,
    `cbo` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProfissionalSaude_unidadeId_idx`(`unidadeId`),
    INDEX `ProfissionalSaude_municipioId_idx`(`municipioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Paciente` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `cpf` VARCHAR(191) NULL,
    `cns` VARCHAR(191) NULL,
    `dataNascimento` DATETIME(3) NULL,
    `sexo` VARCHAR(191) NULL,
    `raca` VARCHAR(191) NULL,
    `nomeMae` VARCHAR(191) NULL,
    `telefone` VARCHAR(191) NULL,
    `logradouro` VARCHAR(191) NULL,
    `bairro` VARCHAR(191) NULL,
    `microarea` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Paciente_cpf_key`(`cpf`),
    INDEX `Paciente_municipioId_idx`(`municipioId`),
    INDEX `Paciente_municipioId_bairro_idx`(`municipioId`, `bairro`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Agendamento` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `unidadeId` VARCHAR(191) NOT NULL,
    `profissionalId` VARCHAR(191) NULL,
    `pacienteId` VARCHAR(191) NOT NULL,
    `tipoAtendimento` ENUM('CONSULTA_MEDICA', 'CONSULTA_ENFERMAGEM', 'CONSULTA_ODONTOLOGICA', 'PROCEDIMENTO', 'VACINACAO', 'CURATIVOS', 'VISITA_DOMICILIAR', 'PRE_NATAL', 'PUERICULTURA', 'HIPERTENSAO_DIABETES', 'SAUDE_MENTAL', 'URGENCIA_EMERGENCIA') NOT NULL,
    `dataAgendamento` DATETIME(3) NOT NULL,
    `horaAgendamento` VARCHAR(191) NOT NULL,
    `situacao` ENUM('AGENDADO', 'CONFIRMADO', 'ATENDIDO', 'FALTOU', 'CANCELADO', 'REMARCADO') NOT NULL DEFAULT 'AGENDADO',
    `observacao` VARCHAR(191) NULL,
    `motivoCancelamento` VARCHAR(191) NULL,
    `criadoPor` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `Agendamento_municipioId_dataAgendamento_idx`(`municipioId`, `dataAgendamento`),
    INDEX `Agendamento_unidadeId_idx`(`unidadeId`),
    INDEX `Agendamento_pacienteId_idx`(`pacienteId`),
    INDEX `Agendamento_profissionalId_idx`(`profissionalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Atendimento` (
    `id` VARCHAR(191) NOT NULL,
    `agendamentoId` VARCHAR(191) NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `unidadeId` VARCHAR(191) NOT NULL,
    `profissionalId` VARCHAR(191) NULL,
    `pacienteId` VARCHAR(191) NOT NULL,
    `tipo` ENUM('CONSULTA_MEDICA', 'CONSULTA_ENFERMAGEM', 'CONSULTA_ODONTOLOGICA', 'PROCEDIMENTO', 'VACINACAO', 'CURATIVOS', 'VISITA_DOMICILIAR', 'PRE_NATAL', 'PUERICULTURA', 'HIPERTENSAO_DIABETES', 'SAUDE_MENTAL', 'URGENCIA_EMERGENCIA') NOT NULL,
    `situacao` ENUM('AGENDADO', 'REALIZADO', 'FALTOU', 'CANCELADO', 'TRANSFERIDO') NOT NULL DEFAULT 'AGENDADO',
    `dataAtendimento` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `queixaPrincipal` TEXT NULL,
    `historicoDoenca` TEXT NULL,
    `exameFisico` TEXT NULL,
    `hipoteseDiagnostica` VARCHAR(191) NULL,
    `cid10` VARCHAR(191) NULL,
    `conduta` TEXT NULL,
    `prescricao` TEXT NULL,
    `pressaoArterial` VARCHAR(191) NULL,
    `temperatura` DECIMAL(4, 1) NULL,
    `peso` DECIMAL(5, 2) NULL,
    `altura` DECIMAL(4, 1) NULL,
    `glicemia` INTEGER NULL,
    `encaminhamento` VARCHAR(191) NULL,
    `retorno` DATETIME(3) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Atendimento_agendamentoId_key`(`agendamentoId`),
    INDEX `Atendimento_municipioId_dataAtendimento_idx`(`municipioId`, `dataAtendimento`),
    INDEX `Atendimento_pacienteId_idx`(`pacienteId`),
    INDEX `Atendimento_unidadeId_idx`(`unidadeId`),
    INDEX `Atendimento_profissionalId_idx`(`profissionalId`),
    INDEX `Atendimento_cid10_idx`(`cid10`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `EquipeESF` (
    `id` VARCHAR(191) NOT NULL,
    `unidadeId` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `ine` VARCHAR(191) NULL,
    `nome` VARCHAR(191) NOT NULL,
    `area` VARCHAR(191) NULL,
    `microareas` VARCHAR(191) NULL,
    `populacaoTotal` INTEGER NULL,
    `familiasTotal` INTEGER NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EquipeESF_unidadeId_idx`(`unidadeId`),
    INDEX `EquipeESF_municipioId_idx`(`municipioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `MembroEquipeESF` (
    `id` VARCHAR(191) NOT NULL,
    `equipeId` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `tipo` ENUM('MEDICO', 'ENFERMEIRO', 'TECNICO_ENFERMAGEM', 'DENTISTA', 'FARMACEUTICO', 'PSICOLOGO', 'FISIOTERAPEUTA', 'NUTRICIONISTA', 'ASSISTENTE_SOCIAL', 'ACS', 'ACE', 'ADMINISTRATIVO') NOT NULL,
    `registro` VARCHAR(191) NULL,
    `microarea` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,

    INDEX `MembroEquipeESF_equipeId_idx`(`equipeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `VisitaACS` (
    `id` VARCHAR(191) NOT NULL,
    `equipeId` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `acsNome` VARCHAR(191) NOT NULL,
    `microarea` VARCHAR(191) NOT NULL,
    `mes` VARCHAR(191) NOT NULL,
    `familiasCadastradas` INTEGER NOT NULL,
    `familiasVisitadas` INTEGER NOT NULL,
    `gestantesAcomp` INTEGER NOT NULL DEFAULT 0,
    `criancasAcomp` INTEGER NOT NULL DEFAULT 0,
    `idososAcomp` INTEGER NOT NULL DEFAULT 0,
    `hipertensosAcomp` INTEGER NOT NULL DEFAULT 0,
    `diabeticosAcomp` INTEGER NOT NULL DEFAULT 0,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `VisitaACS_municipioId_mes_idx`(`municipioId`, `mes`),
    UNIQUE INDEX `VisitaACS_equipeId_acsNome_mes_key`(`equipeId`, `acsNome`, `mes`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `OcorrenciaEpidemiologica` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `tipo` ENUM('DENGUE', 'CHIKUNGUNYA', 'ZIKA', 'FEBRE_AMARELA', 'LEPTOSPIROSE', 'TUBERCULOSE', 'HANSENIASE', 'COVID_19', 'INFLUENZA', 'DOENCA_EXANTEMATICA', 'OUTROS') NOT NULL,
    `semanaEpidemiologica` INTEGER NOT NULL,
    `ano` INTEGER NOT NULL,
    `casos` INTEGER NOT NULL,
    `obitos` INTEGER NOT NULL DEFAULT 0,
    `bairro` VARCHAR(191) NULL,
    `confirmados` INTEGER NOT NULL DEFAULT 0,
    `suspeitos` INTEGER NOT NULL DEFAULT 0,
    `descartados` INTEGER NOT NULL DEFAULT 0,
    `observacao` TEXT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OcorrenciaEpidemiologica_municipioId_ano_idx`(`municipioId`, `ano`),
    INDEX `OcorrenciaEpidemiologica_municipioId_tipo_idx`(`municipioId`, `tipo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `RegistroVacinacao` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `unidadeId` VARCHAR(191) NULL,
    `vacina` VARCHAR(191) NOT NULL,
    `mes` VARCHAR(191) NOT NULL,
    `dosesTipo` VARCHAR(191) NOT NULL,
    `meta` INTEGER NOT NULL,
    `aplicadas` INTEGER NOT NULL,
    `pctCobertura` DECIMAL(5, 2) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RegistroVacinacao_municipioId_mes_idx`(`municipioId`, `mes`),
    UNIQUE INDEX `RegistroVacinacao_municipioId_vacina_mes_dosesTipo_key`(`municipioId`, `vacina`, `mes`, `dosesTipo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Escola` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `inep` VARCHAR(191) NULL,
    `situacao` ENUM('ATIVA', 'DESATIVADA', 'REFORMA') NOT NULL DEFAULT 'ATIVA',
    `cep` VARCHAR(191) NULL,
    `logradouro` VARCHAR(191) NULL,
    `bairro` VARCHAR(191) NULL,
    `zona` VARCHAR(191) NULL,
    `telefone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `diretor` VARCHAR(191) NULL,
    `secretario` VARCHAR(191) NULL,
    `salas` INTEGER NULL,
    `capacidadeTotal` INTEGER NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `Escola_municipioId_idx`(`municipioId`),
    INDEX `Escola_municipioId_situacao_idx`(`municipioId`, `situacao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ServidorEducacao` (
    `id` VARCHAR(191) NOT NULL,
    `escolaId` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `cpf` VARCHAR(191) NULL,
    `cargo` VARCHAR(191) NOT NULL,
    `disciplina` VARCHAR(191) NULL,
    `formacao` VARCHAR(191) NULL,
    `habilitacao` VARCHAR(191) NULL,
    `regime` VARCHAR(191) NULL,
    `cargaHoraria` INTEGER NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ServidorEducacao_escolaId_idx`(`escolaId`),
    INDEX `ServidorEducacao_municipioId_idx`(`municipioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Turma` (
    `id` VARCHAR(191) NOT NULL,
    `escolaId` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `etapa` ENUM('CRECHE', 'PRE_ESCOLA', 'FUNDAMENTAL_I', 'FUNDAMENTAL_II', 'EJA_FUNDAMENTAL', 'EJA_MEDIO', 'AEE') NOT NULL,
    `ano` INTEGER NOT NULL,
    `serie` VARCHAR(191) NULL,
    `turno` ENUM('MATUTINO', 'VESPERTINO', 'NOTURNO', 'INTEGRAL') NOT NULL,
    `capacidade` INTEGER NOT NULL,
    `sala` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `Turma_escolaId_idx`(`escolaId`),
    INDEX `Turma_municipioId_ano_idx`(`municipioId`, `ano`),
    INDEX `Turma_municipioId_etapa_idx`(`municipioId`, `etapa`),
    UNIQUE INDEX `Turma_escolaId_codigo_ano_key`(`escolaId`, `codigo`, `ano`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `TurmaServidor` (
    `id` VARCHAR(191) NOT NULL,
    `turmaId` VARCHAR(191) NOT NULL,
    `servidorId` VARCHAR(191) NOT NULL,
    `disciplina` VARCHAR(191) NULL,

    UNIQUE INDEX `TurmaServidor_turmaId_servidorId_key`(`turmaId`, `servidorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Aluno` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `cpf` VARCHAR(191) NULL,
    `dataNascimento` DATETIME(3) NULL,
    `sexo` VARCHAR(191) NULL,
    `nomeMae` VARCHAR(191) NULL,
    `nomePai` VARCHAR(191) NULL,
    `responsavel` VARCHAR(191) NULL,
    `telefoneResponsavel` VARCHAR(191) NULL,
    `logradouro` VARCHAR(191) NULL,
    `bairro` VARCHAR(191) NULL,
    `zona` VARCHAR(191) NULL,
    `nee` BOOLEAN NOT NULL DEFAULT false,
    `laudoNEE` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `Aluno_municipioId_idx`(`municipioId`),
    INDEX `Aluno_municipioId_bairro_idx`(`municipioId`, `bairro`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Matricula` (
    `id` VARCHAR(191) NOT NULL,
    `alunoId` VARCHAR(191) NOT NULL,
    `turmaId` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `anoLetivo` INTEGER NOT NULL,
    `situacao` ENUM('ATIVA', 'TRANSFERIDA', 'DESISTENTE', 'CONCLUINTE', 'CANCELADA', 'AGUARDANDO') NOT NULL DEFAULT 'ATIVA',
    `dataMatricula` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dataTransferencia` DATETIME(3) NULL,
    `motivoTransferencia` VARCHAR(191) NULL,
    `escolaDestino` VARCHAR(191) NULL,
    `numeroChamada` INTEGER NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `Matricula_turmaId_idx`(`turmaId`),
    INDEX `Matricula_municipioId_anoLetivo_idx`(`municipioId`, `anoLetivo`),
    INDEX `Matricula_municipioId_situacao_idx`(`municipioId`, `situacao`),
    UNIQUE INDEX `Matricula_alunoId_turmaId_anoLetivo_key`(`alunoId`, `turmaId`, `anoLetivo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `RegistroFrequencia` (
    `id` VARCHAR(191) NOT NULL,
    `turmaId` VARCHAR(191) NOT NULL,
    `alunoId` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `data` DATETIME(3) NOT NULL,
    `presente` BOOLEAN NOT NULL,
    `justificada` BOOLEAN NOT NULL DEFAULT false,
    `observacao` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RegistroFrequencia_turmaId_data_idx`(`turmaId`, `data`),
    INDEX `RegistroFrequencia_alunoId_idx`(`alunoId`),
    INDEX `RegistroFrequencia_municipioId_idx`(`municipioId`),
    UNIQUE INDEX `RegistroFrequencia_turmaId_alunoId_data_key`(`turmaId`, `alunoId`, `data`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `CardapioMerenda` (
    `id` VARCHAR(191) NOT NULL,
    `escolaId` VARCHAR(191) NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `semana` VARCHAR(191) NOT NULL,
    `diaSemana` VARCHAR(191) NOT NULL,
    `categoria` ENUM('CAFE_DA_MANHA', 'ALMOCO', 'LANCHE_TARDE', 'JANTAR') NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `calorias` INTEGER NULL,
    `agriculturaFamiliar` BOOLEAN NOT NULL DEFAULT false,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CardapioMerenda_municipioId_semana_idx`(`municipioId`, `semana`),
    UNIQUE INDEX `CardapioMerenda_municipioId_semana_diaSemana_categoria_key`(`municipioId`, `semana`, `diaSemana`, `categoria`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `VeiculoTransporte` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `placa` VARCHAR(191) NOT NULL,
    `tipo` ENUM('ONIBUS', 'VAN', 'MICRO_ONIBUS', 'BARCO') NOT NULL,
    `marca` VARCHAR(191) NULL,
    `modelo` VARCHAR(191) NULL,
    `anoFabricacao` INTEGER NULL,
    `capacidade` INTEGER NOT NULL,
    `motorista` VARCHAR(191) NULL,
    `monitorNome` VARCHAR(191) NULL,
    `rota` VARCHAR(191) NULL,
    `kmRota` DECIMAL(8, 2) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `vencimentoCNH` DATETIME(3) NULL,
    `vencimentoCRLV` DATETIME(3) NULL,
    `vencimentoVistoria` DATETIME(3) NULL,
    `aptoTransporte` BOOLEAN NOT NULL DEFAULT false,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `VeiculoTransporte_municipioId_idx`(`municipioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `TransporteAluno` (
    `id` VARCHAR(191) NOT NULL,
    `veiculoId` VARCHAR(191) NOT NULL,
    `alunoId` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `rota` VARCHAR(191) NULL,
    `pontoEmbarque` VARCHAR(191) NULL,

    INDEX `TransporteAluno_municipioId_idx`(`municipioId`),
    UNIQUE INDEX `TransporteAluno_veiculoId_alunoId_key`(`veiculoId`, `alunoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `RepaseFUNDEB` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `mes` VARCHAR(191) NOT NULL,
    `competencia` INTEGER NOT NULL,
    `valorRepasse` DECIMAL(15, 2) NOT NULL,
    `valorFundeb` DECIMAL(15, 2) NOT NULL,
    `saldo` DECIMAL(15, 2) NOT NULL,
    `matriculasApuradas` INTEGER NOT NULL,
    `valorPorAluno` DECIMAL(10, 4) NULL,
    `aplicacaoProfessores` DECIMAL(15, 2) NULL,
    `pctProfessores` DECIMAL(5, 2) NULL,
    `alertaProfessores` BOOLEAN NOT NULL DEFAULT false,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RepaseFUNDEB_municipioId_competencia_idx`(`municipioId`, `competencia`),
    UNIQUE INDEX `RepaseFUNDEB_municipioId_mes_key`(`municipioId`, `mes`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Noticia` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `titulo` VARCHAR(500) NOT NULL,
    `slug` VARCHAR(500) NOT NULL,
    `subtitulo` VARCHAR(500) NULL,
    `corpo` LONGTEXT NOT NULL,
    `resumo` TEXT NULL,
    `tipo` ENUM('NOTICIA', 'NOTA_OFICIAL', 'COMUNICADO', 'DECRETO', 'PORTARIA', 'EDITAL', 'RESULTADO') NOT NULL DEFAULT 'NOTICIA',
    `status` ENUM('RASCUNHO', 'REVISAO', 'PUBLICADA', 'ARQUIVADA') NOT NULL DEFAULT 'RASCUNHO',
    `destaque` BOOLEAN NOT NULL DEFAULT false,
    `imagemCapa` VARCHAR(500) NULL,
    `tags` VARCHAR(500) NULL,
    `secretaria` VARCHAR(255) NULL,
    `autor` VARCHAR(255) NOT NULL,
    `autorId` VARCHAR(191) NULL,
    `visualizacoes` INTEGER NOT NULL DEFAULT 0,
    `dataPublicacao` DATETIME(3) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `Noticia_municipioId_idx`(`municipioId`),
    INDEX `Noticia_status_idx`(`status`),
    INDEX `Noticia_tipo_idx`(`tipo`),
    INDEX `Noticia_dataPublicacao_idx`(`dataPublicacao`),
    UNIQUE INDEX `Noticia_slug_municipioId_key`(`slug`, `municipioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `EventoAgenda` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `titulo` VARCHAR(500) NOT NULL,
    `descricao` TEXT NULL,
    `tipo` ENUM('AUDIENCIA_PUBLICA', 'REUNIAO', 'SHOW', 'ESPORTE', 'CULTURAL', 'SAUDE', 'EDUCACAO', 'INAUGURACAO', 'OUTRO') NOT NULL DEFAULT 'OUTRO',
    `status` ENUM('PROGRAMADO', 'EM_ANDAMENTO', 'REALIZADO', 'CANCELADO', 'ADIADO') NOT NULL DEFAULT 'PROGRAMADO',
    `local` VARCHAR(500) NULL,
    `endereco` VARCHAR(500) NULL,
    `dataInicio` DATETIME(3) NOT NULL,
    `dataFim` DATETIME(3) NULL,
    `horaInicio` VARCHAR(10) NULL,
    `horaFim` VARCHAR(10) NULL,
    `responsavel` VARCHAR(255) NULL,
    `secretaria` VARCHAR(255) NULL,
    `publicoEsperado` INTEGER NULL,
    `linkTransmissao` VARCHAR(500) NULL,
    `destaque` BOOLEAN NOT NULL DEFAULT false,
    `imagemCapa` VARCHAR(500) NULL,
    `observacoes` TEXT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `EventoAgenda_municipioId_idx`(`municipioId`),
    INDEX `EventoAgenda_status_idx`(`status`),
    INDEX `EventoAgenda_dataInicio_idx`(`dataInicio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Midia` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `titulo` VARCHAR(500) NOT NULL,
    `descricao` TEXT NULL,
    `tipo` ENUM('FOTO', 'VIDEO', 'DOCUMENTO', 'AUDIO') NOT NULL DEFAULT 'FOTO',
    `categoria` ENUM('INFRAESTRUTURA', 'SAUDE', 'EDUCACAO', 'CULTURA', 'ESPORTE', 'EVENTO', 'INSTITUCIONAL', 'OUTRO') NOT NULL DEFAULT 'OUTRO',
    `url` VARCHAR(1000) NOT NULL,
    `urlThumb` VARCHAR(1000) NULL,
    `nomeArquivo` VARCHAR(500) NOT NULL,
    `tamanhoBytes` INTEGER NULL,
    `mimeType` VARCHAR(100) NULL,
    `largura` INTEGER NULL,
    `altura` INTEGER NULL,
    `duracao` INTEGER NULL,
    `albumId` VARCHAR(191) NULL,
    `tags` VARCHAR(500) NULL,
    `autor` VARCHAR(255) NULL,
    `dataCaptura` DATETIME(3) NULL,
    `destaque` BOOLEAN NOT NULL DEFAULT false,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `Midia_municipioId_idx`(`municipioId`),
    INDEX `Midia_tipo_idx`(`tipo`),
    INDEX `Midia_categoria_idx`(`categoria`),
    INDEX `Midia_albumId_idx`(`albumId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `AlbumMidia` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(255) NOT NULL,
    `descricao` TEXT NULL,
    `categoria` ENUM('INFRAESTRUTURA', 'SAUDE', 'EDUCACAO', 'CULTURA', 'ESPORTE', 'EVENTO', 'INSTITUCIONAL', 'OUTRO') NOT NULL DEFAULT 'OUTRO',
    `capaid` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `AlbumMidia_municipioId_idx`(`municipioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ProcessoJuridico` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `numeroInterno` VARCHAR(191) NOT NULL,
    `tipo` ENUM('ACAO_ORDINARIA', 'MANDADO_SEGURANCA', 'ACAO_POPULAR', 'EXECUCAO_FISCAL', 'DESAPROPRIACAO', 'ACAO_CIVIL_PUBLICA', 'RECURSO_ADMINISTRATIVO', 'IMPUGNACAO_LICITACAO', 'OUTROS') NOT NULL,
    `polo` ENUM('ATIVO', 'PASSIVO', 'TERCEIRO') NOT NULL,
    `status` ENUM('ATIVO', 'SUSPENSO', 'AGUARDANDO_PRAZO', 'JULGADO', 'ARQUIVADO', 'TRANSITADO_EM_JULGADO') NOT NULL DEFAULT 'ATIVO',
    `fase` ENUM('INICIAL', 'INSTRUCAO', 'ALEGACOES_FINAIS', 'JULGAMENTO', 'RECURSO', 'EXECUCAO', 'CUMPRIMENTO_SENTENCA') NOT NULL DEFAULT 'INICIAL',
    `resultado` ENUM('PROCEDENTE', 'IMPROCEDENTE', 'PARCIALMENTE_PROCEDENTE', 'ACORDO', 'EXTINCAO_SEM_JULGAMENTO') NULL,
    `assunto` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NULL,
    `vara` VARCHAR(191) NULL,
    `comarca` VARCHAR(191) NULL,
    `juiz` VARCHAR(191) NULL,
    `parteContraria` VARCHAR(191) NOT NULL,
    `advogadoExterno` VARCHAR(191) NULL,
    `procuradorId` VARCHAR(191) NULL,
    `valorCausa` DECIMAL(15, 2) NULL,
    `valorCondenacao` DECIMAL(15, 2) NULL,
    `dataDistribuicao` DATETIME(3) NOT NULL,
    `dataTransito` DATETIME(3) NULL,
    `proximoPrazo` DATETIME(3) NULL,
    `observacoes` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ProcessoJuridico_municipioId_status_idx`(`municipioId`, `status`),
    INDEX `ProcessoJuridico_municipioId_proximoPrazo_idx`(`municipioId`, `proximoPrazo`),
    INDEX `ProcessoJuridico_municipioId_tipo_idx`(`municipioId`, `tipo`),
    UNIQUE INDEX `ProcessoJuridico_municipioId_numeroInterno_key`(`municipioId`, `numeroInterno`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `MovimentoProcesso` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `processoId` VARCHAR(191) NOT NULL,
    `data` DATETIME(3) NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `tipoAto` VARCHAR(191) NULL,
    `prazoFim` DATETIME(3) NULL,
    `usuarioId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MovimentoProcesso_processoId_data_idx`(`processoId`, `data`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `DocumentoProcesso` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `processoId` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NULL,
    `usuarioId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DocumentoProcesso_processoId_idx`(`processoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ContratoJuridico` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `tipo` ENUM('ADMINISTRATIVO', 'CONVENIADO', 'CONSORCIO', 'LOCACAO', 'PRESTACAO_SERVICO', 'OBRA', 'FORNECIMENTO', 'OUTROS') NOT NULL,
    `status` ENUM('MINUTA', 'APROVADO', 'VIGENTE', 'VENCIDO', 'RESCINDIDO', 'SUSPENSO') NOT NULL DEFAULT 'MINUTA',
    `objeto` VARCHAR(191) NOT NULL,
    `parteContratada` VARCHAR(191) NOT NULL,
    `cnpjCpf` VARCHAR(191) NULL,
    `valor` DECIMAL(15, 2) NULL,
    `dataAssinatura` DATETIME(3) NULL,
    `dataInicio` DATETIME(3) NULL,
    `dataFim` DATETIME(3) NULL,
    `procuradorId` VARCHAR(191) NULL,
    `parecerEmitido` BOOLEAN NOT NULL DEFAULT false,
    `parecerFavoravel` BOOLEAN NULL,
    `clausulas` VARCHAR(191) NULL,
    `observacoes` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ContratoJuridico_municipioId_status_idx`(`municipioId`, `status`),
    INDEX `ContratoJuridico_municipioId_dataFim_idx`(`municipioId`, `dataFim`),
    UNIQUE INDEX `ContratoJuridico_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ParecerJuridico` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `tipo` ENUM('CONTRATO', 'LICITACAO', 'ATOS_ADMINISTRATIVOS', 'CONSULTA_JURIDICA', 'RECURSO', 'OUTROS') NOT NULL,
    `status` ENUM('SOLICITADO', 'EM_ANALISE', 'EMITIDO', 'RETIFICADO') NOT NULL DEFAULT 'SOLICITADO',
    `classificacao` ENUM('FAVORAVEL', 'DESFAVORAVEL', 'COM_RESSALVAS', 'INFORMATIVO') NULL,
    `assunto` VARCHAR(191) NOT NULL,
    `solicitante` VARCHAR(191) NOT NULL,
    `solicitanteId` VARCHAR(191) NULL,
    `procuradorId` VARCHAR(191) NULL,
    `dataSolicitacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `prazoResposta` DATETIME(3) NULL,
    `dataEmissao` DATETIME(3) NULL,
    `ementa` VARCHAR(191) NULL,
    `fundamentacao` VARCHAR(191) NULL,
    `conclusao` VARCHAR(191) NULL,
    `ressalvas` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ParecerJuridico_municipioId_status_idx`(`municipioId`, `status`),
    INDEX `ParecerJuridico_municipioId_prazoResposta_idx`(`municipioId`, `prazoResposta`),
    UNIQUE INDEX `ParecerJuridico_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `LoteLicitacao` (
    `id` VARCHAR(191) NOT NULL,
    `licitacaoId` VARCHAR(191) NOT NULL,
    `numero` INTEGER NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `unidade` VARCHAR(191) NOT NULL,
    `quantidade` DECIMAL(12, 4) NOT NULL,
    `valorUnitario` DECIMAL(14, 4) NULL,
    `valorTotal` DECIMAL(14, 2) NULL,
    `vencedorId` VARCHAR(191) NULL,
    `valorVencedor` DECIMAL(14, 2) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LoteLicitacao_licitacaoId_idx`(`licitacaoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ParticipanteLicitacao` (
    `id` VARCHAR(191) NOT NULL,
    `licitacaoId` VARCHAR(191) NOT NULL,
    `nomeEmpresa` VARCHAR(191) NOT NULL,
    `cnpj` VARCHAR(191) NOT NULL,
    `representante` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `telefone` VARCHAR(191) NULL,
    `habilitado` BOOLEAN NOT NULL DEFAULT true,
    `motivoInabilitacao` VARCHAR(191) NULL,
    `valorProposta` DECIMAL(14, 2) NULL,
    `classificacao` INTEGER NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ParticipanteLicitacao_licitacaoId_idx`(`licitacaoId`),
    UNIQUE INDEX `ParticipanteLicitacao_licitacaoId_cnpj_key`(`licitacaoId`, `cnpj`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `MovimentacaoBem` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `bemId` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `origemSetor` VARCHAR(191) NULL,
    `destinoSetor` VARCHAR(191) NULL,
    `origemResponsavel` VARCHAR(191) NULL,
    `destinoResponsavel` VARCHAR(191) NULL,
    `dataMovimentacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `motivoBaixa` ENUM('ALIENACAO_VENDA', 'ALIENACAO_DOACAO', 'PERMUTA', 'SINISTRO', 'SUCATA', 'EXTRAVIO') NULL,
    `valorBaixa` DECIMAL(14, 2) NULL,
    `justificativa` TEXT NULL,
    `documentoAutorizacao` VARCHAR(191) NULL,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MovimentacaoBem_bemId_idx`(`bemId`),
    INDEX `MovimentacaoBem_municipioId_idx`(`municipioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ManutencaoBem` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `bemId` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `descricao` TEXT NOT NULL,
    `fornecedorNome` VARCHAR(191) NULL,
    `valorManutencao` DECIMAL(14, 2) NULL,
    `dataInicio` DATETIME(3) NOT NULL,
    `dataConclusao` DATETIME(3) NULL,
    `empenhoId` VARCHAR(191) NULL,
    `concluida` BOOLEAN NOT NULL DEFAULT false,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ManutencaoBem_bemId_idx`(`bemId`),
    INDEX `ManutencaoBem_municipioId_idx`(`municipioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Familia` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `nomeReferencia` VARCHAR(191) NOT NULL,
    `cpfReferencia` VARCHAR(191) NOT NULL,
    `nis` VARCHAR(191) NULL,
    `prontuarioNum` VARCHAR(191) NULL,
    `unidadeId` VARCHAR(191) NULL,
    `tecnicoId` VARCHAR(191) NULL,
    `situacao` ENUM('ATIVA', 'INATIVA', 'TRANSFERIDA', 'DESLIGADA') NOT NULL DEFAULT 'ATIVA',
    `vulnerabilidade` ENUM('BAIXO', 'MEDIO', 'ALTO', 'MUITO_ALTO') NOT NULL DEFAULT 'MEDIO',
    `cep` VARCHAR(191) NULL,
    `logradouro` VARCHAR(191) NULL,
    `numero` VARCHAR(191) NULL,
    `complemento` VARCHAR(191) NULL,
    `bairro` VARCHAR(191) NULL,
    `referencia` VARCHAR(191) NULL,
    `tipoMoradia` ENUM('PROPRIA', 'ALUGADA', 'CEDIDA', 'OCUPACAO', 'SEM_MORADIA') NULL,
    `condicaoMoradia` ENUM('BOA', 'REGULAR', 'PRECARIA', 'INSALUBRE') NULL,
    `temAguaEncanada` BOOLEAN NULL,
    `temEsgoto` BOOLEAN NULL,
    `temEnergiaEletrica` BOOLEAN NULL,
    `temColetaLixo` BOOLEAN NULL,
    `rendaFamiliarTotal` DOUBLE NULL,
    `rendaPerCapita` DOUBLE NULL,
    `qtdPessoasRenda` INTEGER NULL,
    `microarea` VARCHAR(191) NULL,
    `agenteSaudeId` VARCHAR(191) NULL,
    `familiaRural` BOOLEAN NOT NULL DEFAULT false,
    `quilombola` BOOLEAN NOT NULL DEFAULT false,
    `indigena` BOOLEAN NOT NULL DEFAULT false,
    `cigana` BOOLEAN NOT NULL DEFAULT false,
    `violenciaDomestica` BOOLEAN NOT NULL DEFAULT false,
    `exploracaoInfantil` BOOLEAN NOT NULL DEFAULT false,
    `trabalhoInfantil` BOOLEAN NOT NULL DEFAULT false,
    `usoDrogas` BOOLEAN NOT NULL DEFAULT false,
    `semMoradia` BOOLEAN NOT NULL DEFAULT false,
    `migranteRefugiado` BOOLEAN NOT NULL DEFAULT false,
    `observacoes` TEXT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `Familia_municipioId_situacao_idx`(`municipioId`, `situacao`),
    INDEX `Familia_municipioId_vulnerabilidade_idx`(`municipioId`, `vulnerabilidade`),
    INDEX `Familia_municipioId_cpfReferencia_idx`(`municipioId`, `cpfReferencia`),
    UNIQUE INDEX `Familia_municipioId_codigo_key`(`municipioId`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `MembroFamilia` (
    `id` VARCHAR(191) NOT NULL,
    `familiaId` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `cpf` VARCHAR(191) NULL,
    `nis` VARCHAR(191) NULL,
    `dataNascimento` DATETIME(3) NULL,
    `sexo` VARCHAR(191) NULL,
    `relacao` ENUM('RESPONSAVEL', 'CONJUGE', 'FILHO', 'FILHA', 'PAI', 'MAE', 'IRMAO', 'IRMA', 'AVO', 'NETO', 'OUTRO') NOT NULL DEFAULT 'OUTRO',
    `situacao` ENUM('ATIVO', 'FALECIDO', 'AUSENTE') NOT NULL DEFAULT 'ATIVO',
    `deficiencia` BOOLEAN NOT NULL DEFAULT false,
    `tipoDeficiencia` VARCHAR(191) NULL,
    `gestante` BOOLEAN NOT NULL DEFAULT false,
    `idoso` BOOLEAN NOT NULL DEFAULT false,
    `crianca` BOOLEAN NOT NULL DEFAULT false,
    `adolescente` BOOLEAN NOT NULL DEFAULT false,
    `escolaridade` VARCHAR(191) NULL,
    `frequentaEscola` BOOLEAN NULL,
    `series` VARCHAR(191) NULL,
    `trabalhando` BOOLEAN NULL,
    `profissao` VARCHAR(191) NULL,
    `rendaMensal` DOUBLE NULL,
    `possuiCNS` VARCHAR(191) NULL,
    `condicaoSaude` VARCHAR(191) NULL,

    INDEX `MembroFamilia_familiaId_idx`(`familiaId`),
    INDEX `MembroFamilia_cpf_idx`(`cpf`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `UnidadeSemas` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `endereco` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `AtendimentoSocial` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `familiaId` VARCHAR(191) NOT NULL,
    `tecnicoId` VARCHAR(191) NOT NULL,
    `dataAtendimento` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `tipo` ENUM('CONSULTA_MEDICA', 'CONSULTA_ENFERMAGEM', 'CONSULTA_ODONTOLOGICA', 'PROCEDIMENTO', 'VACINACAO', 'CURATIVOS', 'VISITA_DOMICILIAR', 'PRE_NATAL', 'PUERICULTURA', 'HIPERTENSAO_DIABETES', 'SAUDE_MENTAL', 'URGENCIA_EMERGENCIA') NOT NULL,
    `status` ENUM('ABERTO', 'EM_ANDAMENTO', 'ENCERRADO', 'SUSPENSO') NOT NULL DEFAULT 'ABERTO',
    `demanda` TEXT NOT NULL,
    `intervencao` TEXT NULL,
    `resultadoParcial` TEXT NULL,
    `conclusao` TEXT NULL,
    `planoAcao` TEXT NULL,
    `situacaoRisco` BOOLEAN NOT NULL DEFAULT false,
    `acaoImediata` BOOLEAN NOT NULL DEFAULT false,
    `requerVisita` BOOLEAN NOT NULL DEFAULT false,
    `proximoAtend` DATETIME(3) NULL,
    `encerradoEm` DATETIME(3) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `AtendimentoSocial_municipioId_familiaId_idx`(`municipioId`, `familiaId`),
    INDEX `AtendimentoSocial_municipioId_dataAtendimento_idx`(`municipioId`, `dataAtendimento`),
    INDEX `AtendimentoSocial_municipioId_tecnicoId_idx`(`municipioId`, `tecnicoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `BeneficioSocial` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `familiaId` VARCHAR(191) NOT NULL,
    `membroId` VARCHAR(191) NULL,
    `tipo` ENUM('BPC_IDOSO', 'BPC_PCD', 'BOLSA_FAMILIA', 'AUXILIO_BRASIL', 'VALE_GAS', 'BENEFICIO_EVENTUAL', 'BENEFICIO_MUNICIPAL', 'OUTRO') NOT NULL,
    `status` ENUM('SOLICITADO', 'EM_ANALISE', 'APROVADO', 'NEGADO', 'CANCELADO', 'SUSPENSO') NOT NULL DEFAULT 'SOLICITADO',
    `dataRequerimento` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dataAnalise` DATETIME(3) NULL,
    `dataConcessao` DATETIME(3) NULL,
    `dataVencimento` DATETIME(3) NULL,
    `dataCancelamento` DATETIME(3) NULL,
    `valor` DOUBLE NULL,
    `quantidade` INTEGER NULL,
    `descricao` VARCHAR(191) NULL,
    `motivoNegativa` VARCHAR(191) NULL,
    `tecnicoId` VARCHAR(191) NULL,
    `aprovadoPor` VARCHAR(191) NULL,
    `observacoes` TEXT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `BeneficioSocial_municipioId_familiaId_idx`(`municipioId`, `familiaId`),
    INDEX `BeneficioSocial_municipioId_tipo_status_idx`(`municipioId`, `tipo`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `VisitaDomiciliar` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `familiaId` VARCHAR(191) NOT NULL,
    `tecnicoId` VARCHAR(191) NOT NULL,
    `dataVisita` DATETIME(3) NOT NULL,
    `tipo` ENUM('DIAGNOSTICO', 'ACOMPANHAMENTO', 'VERIFICACAO', 'EMERGENCIA') NOT NULL DEFAULT 'ACOMPANHAMENTO',
    `resultado` ENUM('POSITIVO', 'NEGATIVO', 'PARCIAL', 'FAMILIA_AUSENTE') NULL,
    `objetivo` TEXT NULL,
    `observacoes` TEXT NULL,
    `condicoesMoradia` TEXT NULL,
    `situacaoFamilia` TEXT NULL,
    `acoesTomadas` TEXT NULL,
    `proximosPassos` TEXT NULL,
    `requerRetorno` BOOLEAN NOT NULL DEFAULT false,
    `dataRetorno` DATETIME(3) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `VisitaDomiciliar_municipioId_familiaId_idx`(`municipioId`, `familiaId`),
    INDEX `VisitaDomiciliar_municipioId_dataVisita_idx`(`municipioId`, `dataVisita`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `EncaminhamentoSocial` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `familiaId` VARCHAR(191) NOT NULL,
    `atendimentoId` VARCHAR(191) NULL,
    `tipo` ENUM('SAUDE', 'EDUCACAO', 'TRABALHO_RENDA', 'HABITACAO', 'JURIDICO', 'CRAS', 'CREAS', 'MINISTERIO_PUBLICO', 'CONSELHO_TUTELAR', 'OUTROS') NOT NULL,
    `status` ENUM('AGUARDANDO', 'REALIZADO', 'SEM_RETORNO', 'CANCELADO') NOT NULL DEFAULT 'AGUARDANDO',
    `destino` VARCHAR(191) NOT NULL,
    `responsavel` VARCHAR(191) NULL,
    `dataSolicitacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dataRealizacao` DATETIME(3) NULL,
    `observacoes` TEXT NULL,
    `retorno` TEXT NULL,

    INDEX `EncaminhamentoSocial_municipioId_familiaId_idx`(`municipioId`, `familiaId`),
    INDEX `EncaminhamentoSocial_municipioId_status_idx`(`municipioId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `EvolucaoFamiliar` (
    `id` VARCHAR(191) NOT NULL,
    `familiaId` VARCHAR(191) NOT NULL,
    `tecnicoId` VARCHAR(191) NOT NULL,
    `dataRegistro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `registro` TEXT NOT NULL,
    `tipo` VARCHAR(191) NULL,

    INDEX `EvolucaoFamiliar_familiaId_idx`(`familiaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `licenca_ambiental` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `tipo` ENUM('LICENCA_CONSTRUCAO', 'LICENCA_DEMOLICAO', 'LICENCA_REFORMA', 'HABITE_SE', 'LICENCA_LOCALIZACAO', 'ALVARA_FUNCIONAMENTO', 'PARCELAMENTO_SOLO', 'REGULARIZACAO') NOT NULL,
    `status` ENUM('EM_ANALISE', 'AGUARDANDO_VISTORIA', 'AGUARDANDO_DOCUMENTOS', 'AGUARDANDO_PAGAMENTO', 'EMITIDA', 'VENCIDA', 'CASSADA', 'INDEFERIDA', 'CANCELADA') NOT NULL DEFAULT 'EM_ANALISE',
    `requerenteNome` VARCHAR(191) NOT NULL,
    `requerenteCpfCnpj` VARCHAR(191) NOT NULL,
    `requerenteTelefone` VARCHAR(191) NULL,
    `requerenteEmail` VARCHAR(191) NULL,
    `empreendimentoNome` VARCHAR(191) NOT NULL,
    `atividadePrincipal` VARCHAR(191) NOT NULL,
    `localizacao` VARCHAR(191) NOT NULL,
    `coordLat` DECIMAL(10, 7) NULL,
    `coordLng` DECIMAL(10, 7) NULL,
    `areaHectares` DECIMAL(10, 4) NULL,
    `dataRequerimento` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dataEmissao` DATETIME(3) NULL,
    `dataVencimento` DATETIME(3) NULL,
    `valorTaxa` DECIMAL(10, 2) NULL,
    `dataPagamento` DATETIME(3) NULL,
    `condicionantes` TEXT NULL,
    `observacao` TEXT NULL,
    `parecerTecnico` TEXT NULL,
    `tecnicoResponsavel` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `licenca_ambiental_municipioId_tipo_status_idx`(`municipioId`, `tipo`, `status`),
    UNIQUE INDEX `licenca_ambiental_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `auto_infracao_ambiental` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `dataAuto` DATETIME(3) NOT NULL,
    `fiscal` VARCHAR(191) NOT NULL,
    `autuadoNome` VARCHAR(191) NOT NULL,
    `autuadoCpfCnpj` VARCHAR(191) NOT NULL,
    `localizacao` VARCHAR(191) NULL,
    `tipoInfracao` ENUM('DESMATAMENTO', 'QUEIMADA', 'POLUICAO_AGUA', 'POLUICAO_AR', 'POLUICAO_SOLO', 'CACA_PESCA_ILEGAL', 'CONSTRUCAO_APP', 'EXTRATIVISMO_ILEGAL', 'RESIDUOS_IRREGULARES', 'OUTRO') NOT NULL,
    `descricao` TEXT NOT NULL,
    `artLegal` VARCHAR(191) NULL,
    `valorMulta` DECIMAL(12, 2) NOT NULL,
    `valorMultaReducao` DECIMAL(12, 2) NULL,
    `status` ENUM('LAVRADO', 'NOTIFICADO', 'EM_DEFESA', 'JULGADO_PROCEDENTE', 'JULGADO_IMPROCEDENTE', 'PAGO', 'INSCRITO_DIVIDA') NOT NULL DEFAULT 'LAVRADO',
    `dataDefesa` DATETIME(3) NULL,
    `resultadoDefesa` TEXT NULL,
    `dataPagamento` DATETIME(3) NULL,
    `licencaId` VARCHAR(191) NULL,
    `observacao` TEXT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `auto_infracao_ambiental_municipioId_status_idx`(`municipioId`, `status`),
    UNIQUE INDEX `auto_infracao_ambiental_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `arvore_urbana` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `especie` VARCHAR(191) NOT NULL,
    `nomePopular` VARCHAR(191) NULL,
    `localizacao` VARCHAR(191) NOT NULL,
    `coordLat` DECIMAL(10, 7) NULL,
    `coordLng` DECIMAL(10, 7) NULL,
    `situacao` ENUM('BOA', 'ATENCAO', 'RISCO', 'MORTA', 'SUPRIMIDA') NOT NULL DEFAULT 'BOA',
    `alturaMetros` DECIMAL(5, 2) NULL,
    `dapCm` DECIMAL(6, 2) NULL,
    `idadeAnos` INTEGER NULL,
    `ultimaPoda` DATETIME(3) NULL,
    `proximaPoda` DATETIME(3) NULL,
    `suprimida` BOOLEAN NOT NULL DEFAULT false,
    `dataSuppressao` DATETIME(3) NULL,
    `motivoSuppressao` VARCHAR(191) NULL,
    `observacao` TEXT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `arvore_urbana_municipioId_situacao_idx`(`municipioId`, `situacao`),
    UNIQUE INDEX `arvore_urbana_municipioId_codigo_key`(`municipioId`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ProdutorRural` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `cpfCnpj` VARCHAR(191) NOT NULL,
    `dataNascimento` DATETIME(3) NULL,
    `sexo` VARCHAR(191) NULL,
    `telefone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `endereco` VARCHAR(191) NULL,
    `bairro` VARCHAR(191) NULL,
    `situacao` ENUM('ATIVO', 'INATIVO', 'FALECIDO', 'TRANSFERIDO') NOT NULL DEFAULT 'ATIVO',
    `dap` VARCHAR(191) NULL,
    `dapVencimento` DATETIME(3) NULL,
    `car` VARCHAR(191) NULL,
    `pronafCategoria` VARCHAR(191) NULL,
    `observacoes` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ProdutorRural_municipioId_situacao_idx`(`municipioId`, `situacao`),
    UNIQUE INDEX `ProdutorRural_municipioId_cpfCnpj_key`(`municipioId`, `cpfCnpj`),
    UNIQUE INDEX `ProdutorRural_municipioId_codigo_key`(`municipioId`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `PropriedadeRural` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `produtorId` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `tipo` ENUM('RURAL', 'CHACARA', 'SITIO', 'FAZENDA', 'ASSENTAMENTO', 'QUILOMBOLA', 'OUTROS') NOT NULL DEFAULT 'RURAL',
    `areaTotal` DOUBLE NOT NULL,
    `areaAgricultavel` DOUBLE NULL,
    `areaPreservacao` DOUBLE NULL,
    `nirf` VARCHAR(191) NULL,
    `car` VARCHAR(191) NULL,
    `logradouro` VARCHAR(191) NULL,
    `comunidade` VARCHAR(191) NULL,
    `coordLat` DOUBLE NULL,
    `coordLng` DOUBLE NULL,
    `atividades` TEXT NULL,
    `principaisCulturas` VARCHAR(191) NULL,
    `sistemaIrrigacao` BOOLEAN NOT NULL DEFAULT false,
    `aguaDisponivel` VARCHAR(191) NULL,
    `observacoes` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PropriedadeRural_produtorId_idx`(`produtorId`),
    INDEX `PropriedadeRural_municipioId_idx`(`municipioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ProducaoAgricola` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `propriedadeId` VARCHAR(191) NOT NULL,
    `safra` VARCHAR(191) NOT NULL,
    `cultura` VARCHAR(191) NOT NULL,
    `areaPlantada` DOUBLE NOT NULL,
    `producaoKg` DOUBLE NULL,
    `produtividadeKg` DOUBLE NULL,
    `valorVendaTotal` DECIMAL(15, 2) NULL,
    `destinoProducao` VARCHAR(191) NULL,
    `observacoes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProducaoAgricola_propriedadeId_idx`(`propriedadeId`),
    INDEX `ProducaoAgricola_municipioId_safra_idx`(`municipioId`, `safra`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ProgramaAgricola` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `tipo` ENUM('ASSISTENCIA_TECNICA', 'CREDITO_RURAL', 'DISTRIBUICAO_INSUMOS', 'CAPACITACAO', 'CERTIFICACAO', 'REGULARIZACAO_AMBIENTAL', 'OUTROS') NOT NULL,
    `status` ENUM('ABERTO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO', 'SUSPENSO') NOT NULL DEFAULT 'ABERTO',
    `descricao` VARCHAR(191) NULL,
    `publicoAlvo` VARCHAR(191) NULL,
    `vagas` INTEGER NULL,
    `dataInicio` DATETIME(3) NOT NULL,
    `dataFim` DATETIME(3) NULL,
    `responsavelId` VARCHAR(191) NULL,
    `orcamento` DECIMAL(15, 2) NULL,
    `parceiro` VARCHAR(191) NULL,
    `resultados` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ProgramaAgricola_municipioId_status_idx`(`municipioId`, `status`),
    UNIQUE INDEX `ProgramaAgricola_municipioId_codigo_key`(`municipioId`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `InscricaoPrograma` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `programaId` VARCHAR(191) NOT NULL,
    `produtorId` VARCHAR(191) NOT NULL,
    `status` ENUM('AGUARDANDO', 'APROVADA', 'EM_ATENDIMENTO', 'CONCLUIDA', 'CANCELADA', 'LISTA_ESPERA') NOT NULL DEFAULT 'AGUARDANDO',
    `dataInscricao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dataAtendimento` DATETIME(3) NULL,
    `observacoes` VARCHAR(191) NULL,
    `tecnicoId` VARCHAR(191) NULL,
    `resultadoAtendimento` VARCHAR(191) NULL,

    INDEX `InscricaoPrograma_produtorId_idx`(`produtorId`),
    INDEX `InscricaoPrograma_programaId_status_idx`(`programaId`, `status`),
    UNIQUE INDEX `InscricaoPrograma_programaId_produtorId_key`(`programaId`, `produtorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `EventoCultural` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `tipo` ENUM('AUDIENCIA_PUBLICA', 'REUNIAO', 'SHOW', 'ESPORTE', 'CULTURAL', 'SAUDE', 'EDUCACAO', 'INAUGURACAO', 'OUTRO') NOT NULL,
    `status` ENUM('PROGRAMADO', 'EM_ANDAMENTO', 'REALIZADO', 'CANCELADO', 'ADIADO') NOT NULL DEFAULT 'PROGRAMADO',
    `descricao` VARCHAR(191) NULL,
    `local` VARCHAR(191) NULL,
    `espacoId` VARCHAR(191) NULL,
    `dataInicio` DATETIME(3) NOT NULL,
    `dataFim` DATETIME(3) NULL,
    `horario` VARCHAR(191) NULL,
    `gratuito` BOOLEAN NOT NULL DEFAULT true,
    `valorIngresso` DECIMAL(10, 2) NULL,
    `capacidade` INTEGER NULL,
    `publicoEsperado` INTEGER NULL,
    `publicoRealizado` INTEGER NULL,
    `orcamento` DECIMAL(15, 2) NULL,
    `responsavelId` VARCHAR(191) NULL,
    `parceiros` VARCHAR(191) NULL,
    `fotos` VARCHAR(191) NULL,
    `transmissaoLink` VARCHAR(191) NULL,
    `observacoes` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `EventoCultural_municipioId_status_idx`(`municipioId`, `status`),
    INDEX `EventoCultural_municipioId_dataInicio_idx`(`municipioId`, `dataInicio`),
    UNIQUE INDEX `EventoCultural_municipioId_codigo_key`(`municipioId`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `EspacoCultural` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `tipo` ENUM('CENTRO_CULTURAL', 'TEATRO', 'ESTADIO', 'QUADRA', 'GINASIO', 'PRACA', 'PARQUE', 'MUSEU', 'BIBLIOTECA', 'ARENA', 'OUTROS') NOT NULL,
    `status` ENUM('DISPONIVEL', 'OCUPADO', 'MANUTENCAO', 'INTERDITADO') NOT NULL DEFAULT 'DISPONIVEL',
    `endereco` VARCHAR(191) NULL,
    `bairro` VARCHAR(191) NULL,
    `capacidade` INTEGER NULL,
    `areaM2` DOUBLE NULL,
    `responsavel` VARCHAR(191) NULL,
    `telefone` VARCHAR(191) NULL,
    `horarioFuncionamento` VARCHAR(191) NULL,
    `acessivel` BOOLEAN NOT NULL DEFAULT false,
    `comodidades` VARCHAR(191) NULL,
    `observacoes` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `EspacoCultural_municipioId_tipo_idx`(`municipioId`, `tipo`),
    INDEX `EspacoCultural_municipioId_status_idx`(`municipioId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ReservaEspaco` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `espacoId` VARCHAR(191) NOT NULL,
    `solicitante` VARCHAR(191) NOT NULL,
    `finalidade` VARCHAR(191) NOT NULL,
    `dataInicio` DATETIME(3) NOT NULL,
    `dataFim` DATETIME(3) NOT NULL,
    `aprovada` BOOLEAN NOT NULL DEFAULT false,
    `responsavelId` VARCHAR(191) NULL,
    `observacoes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ReservaEspaco_espacoId_dataInicio_idx`(`espacoId`, `dataInicio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Atleta` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `cpf` VARCHAR(191) NOT NULL,
    `dataNascimento` DATETIME(3) NOT NULL,
    `sexo` VARCHAR(191) NOT NULL,
    `telefone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `responsavel` VARCHAR(191) NULL,
    `modalidade` ENUM('FUTEBOL', 'FUTSAL', 'VOLEIBOL', 'BASQUETE', 'ATLETISMO', 'NATACAO', 'JUDO', 'KARATE', 'XADREZ', 'CICLISMO', 'OUTROS') NOT NULL,
    `categoria` ENUM('INFANTIL', 'JUVENIL', 'ADULTO', 'MASTER', 'PARADESPORTO') NOT NULL,
    `situacao` ENUM('ATIVO', 'INATIVO', 'SUSPENSO', 'LESIONADO') NOT NULL DEFAULT 'ATIVO',
    `clube` VARCHAR(191) NULL,
    `tecnicoId` VARCHAR(191) NULL,
    `numeroCbf` VARCHAR(191) NULL,
    `observacoes` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Atleta_municipioId_modalidade_idx`(`municipioId`, `modalidade`),
    INDEX `Atleta_municipioId_situacao_idx`(`municipioId`, `situacao`),
    UNIQUE INDEX `Atleta_municipioId_cpf_key`(`municipioId`, `cpf`),
    UNIQUE INDEX `Atleta_municipioId_codigo_key`(`municipioId`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ResultadoEsportivo` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `atletaId` VARCHAR(191) NOT NULL,
    `competicao` VARCHAR(191) NOT NULL,
    `modalidade` ENUM('FUTEBOL', 'FUTSAL', 'VOLEIBOL', 'BASQUETE', 'ATLETISMO', 'NATACAO', 'JUDO', 'KARATE', 'XADREZ', 'CICLISMO', 'OUTROS') NOT NULL,
    `categoria` ENUM('INFANTIL', 'JUVENIL', 'ADULTO', 'MASTER', 'PARADESPORTO') NOT NULL,
    `data` DATETIME(3) NOT NULL,
    `local` VARCHAR(191) NULL,
    `colocacao` INTEGER NULL,
    `medalha` VARCHAR(191) NULL,
    `marca` VARCHAR(191) NULL,
    `observacoes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ResultadoEsportivo_atletaId_idx`(`atletaId`),
    INDEX `ResultadoEsportivo_municipioId_data_idx`(`municipioId`, `data`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `PontoTuristico` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `tipo` ENUM('ATTRACAO_NATURAL', 'PATRIMONIO_HISTORICO', 'PATRIMONIO_RELIGIOSO', 'GASTRONOMIA', 'ARTESANATO', 'ECOTURISMO', 'OUTROS') NOT NULL,
    `descricao` VARCHAR(191) NULL,
    `historia` VARCHAR(191) NULL,
    `endereco` VARCHAR(191) NULL,
    `bairro` VARCHAR(191) NULL,
    `coordLat` DOUBLE NULL,
    `coordLng` DOUBLE NULL,
    `horarioVisita` VARCHAR(191) NULL,
    `valorEntrada` DECIMAL(10, 2) NULL,
    `capacidadeDiaria` INTEGER NULL,
    `contato` VARCHAR(191) NULL,
    `site` VARCHAR(191) NULL,
    `fotos` VARCHAR(191) NULL,
    `destaque` BOOLEAN NOT NULL DEFAULT false,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PontoTuristico_municipioId_tipo_idx`(`municipioId`, `tipo`),
    INDEX `PontoTuristico_municipioId_destaque_idx`(`municipioId`, `destaque`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `OrdemServico` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `tipo` ENUM('COLETA_LIXO', 'COLETA_SELETIVA', 'CAPINA', 'ROCAGEM', 'PODA_ARVORE', 'TAPA_BURACO', 'MANUTENCAO_CALCADA', 'LIMPEZA_VALA', 'LIMPEZA_LOGRADOURO', 'DEDETIZACAO', 'MANUTENCAO_PRACA', 'ILUMINACAO_PUBLICA', 'SINALIZACAO_VIARIA', 'MANUTENCAO_ESTRADA_RURAL', 'OUTROS') NOT NULL,
    `prioridade` ENUM('BAIXA', 'NORMAL', 'ALTA', 'URGENTE') NOT NULL DEFAULT 'NORMAL',
    `situacao` ENUM('ABERTA', 'EM_ATENDIMENTO', 'AGUARDANDO_MATERIAL', 'CONCLUIDA', 'CANCELADA', 'REABERTA') NOT NULL DEFAULT 'ABERTA',
    `origem` ENUM('PROGRAMADA', 'DEMANDA_CIDADAO', 'OUVIDORIA', 'DETERMINACAO_SUPERIOR', 'VISTORIA', 'EMERGENCIA') NOT NULL DEFAULT 'PROGRAMADA',
    `logradouro` VARCHAR(191) NULL,
    `bairro` VARCHAR(191) NULL,
    `referencia` VARCHAR(191) NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `descricao` TEXT NOT NULL,
    `observacoes` TEXT NULL,
    `solicitante` VARCHAR(191) NULL,
    `telefone` VARCHAR(191) NULL,
    `equipeResponsavel` VARCHAR(191) NULL,
    `veiculoId` VARCHAR(191) NULL,
    `dataAbertura` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dataLimite` DATETIME(3) NULL,
    `dataInicio` DATETIME(3) NULL,
    `dataConclusao` DATETIME(3) NULL,
    `materiaisUsados` TEXT NULL,
    `avaliacao` INTEGER NULL,
    `feedbackCidadao` TEXT NULL,
    `protocoloOuvidoria` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `OrdemServico_municipioId_situacao_idx`(`municipioId`, `situacao`),
    INDEX `OrdemServico_municipioId_tipo_idx`(`municipioId`, `tipo`),
    INDEX `OrdemServico_municipioId_bairro_idx`(`municipioId`, `bairro`),
    UNIQUE INDEX `OrdemServico_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ManutencaoVeiculo` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `veiculoId` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `descricao` TEXT NOT NULL,
    `oficina` VARCHAR(191) NULL,
    `kmMedicao` INTEGER NULL,
    `valor` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `dataEntrada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dataSaida` DATETIME(3) NULL,
    `observacoes` TEXT NULL,
    `concluida` BOOLEAN NOT NULL DEFAULT false,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ManutencaoVeiculo_municipioId_veiculoId_idx`(`municipioId`, `veiculoId`),
    UNIQUE INDEX `ManutencaoVeiculo_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `AbastecimentoVeiculo` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `veiculoId` VARCHAR(191) NOT NULL,
    `dataAbastecimento` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `combustivel` VARCHAR(191) NOT NULL,
    `litros` DOUBLE NOT NULL,
    `valorLitro` DECIMAL(6, 3) NOT NULL,
    `valorTotal` DECIMAL(10, 2) NOT NULL,
    `kmAtual` INTEGER NULL,
    `posto` VARCHAR(191) NULL,
    `condutorNome` VARCHAR(191) NULL,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AbastecimentoVeiculo_municipioId_veiculoId_idx`(`municipioId`, `veiculoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `RoteiroColeta` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `situacao` ENUM('PROGRAMADO', 'EM_EXECUCAO', 'CONCLUIDO', 'CANCELADO', 'INTERROMPIDO') NOT NULL DEFAULT 'PROGRAMADO',
    `diaSemana` VARCHAR(191) NULL,
    `periocidade` VARCHAR(191) NULL,
    `dataHoraInicio` DATETIME(3) NULL,
    `dataHoraFim` DATETIME(3) NULL,
    `responsavelNome` VARCHAR(191) NULL,
    `toneladas` DOUBLE NULL,
    `kmPercorrido` DOUBLE NULL,
    `observacoes` TEXT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RoteiroColeta_municipioId_situacao_idx`(`municipioId`, `situacao`),
    UNIQUE INDEX `RoteiroColeta_municipioId_numero_key`(`municipioId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ItemRoteiro` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `roteiroId` VARCHAR(191) NOT NULL,
    `veiculoId` VARCHAR(191) NULL,
    `logradouro` VARCHAR(191) NOT NULL,
    `bairro` VARCHAR(191) NULL,
    `sequencia` INTEGER NOT NULL,
    `estimativaKg` DOUBLE NULL,
    `concluido` BOOLEAN NOT NULL DEFAULT false,
    `kgColetado` DOUBLE NULL,
    `horaConclusao` DATETIME(3) NULL,

    INDEX `ItemRoteiro_municipioId_roteiroId_idx`(`municipioId`, `roteiroId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `PublicacaoTransparencia` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `tipo` ENUM('RECEITA_PREVISTA', 'RECEITA_REALIZADA', 'DESPESA_ORCADA', 'DESPESA_EMPENHADA', 'DESPESA_LIQUIDADA', 'DESPESA_PAGA', 'LICITACAO', 'CONTRATO', 'CONVENIO', 'FOLHA_PAGAMENTO', 'BALANCETE', 'BALANCO_ANUAL', 'RELATORIO_LRF', 'DIARIO_OFICIAL', 'ATA_CAMARA', 'DECRETO', 'PORTARIA', 'RESOLUCAO') NOT NULL,
    `situacao` ENUM('RASCUNHO', 'PUBLICADA', 'RETIFICADA', 'REVOGADA') NOT NULL DEFAULT 'PUBLICADA',
    `titulo` VARCHAR(191) NOT NULL,
    `descricao` TEXT NULL,
    `periodo` VARCHAR(191) NULL,
    `exercicio` INTEGER NULL,
    `valorTotal` DECIMAL(15, 2) NULL,
    `urlArquivo` VARCHAR(191) NULL,
    `nomeArquivo` VARCHAR(191) NULL,
    `tamanho` INTEGER NULL,
    `tags` VARCHAR(191) NULL,
    `publicadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `PublicacaoTransparencia_municipioId_tipo_idx`(`municipioId`, `tipo`),
    INDEX `PublicacaoTransparencia_municipioId_exercicio_idx`(`municipioId`, `exercicio`),
    INDEX `PublicacaoTransparencia_municipioId_situacao_idx`(`municipioId`, `situacao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `ReceitaOrcamentaria` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `exercicio` INTEGER NOT NULL,
    `mes` INTEGER NOT NULL,
    `competencia` VARCHAR(191) NOT NULL,
    `codigoReceita` VARCHAR(191) NOT NULL,
    `natureza` ENUM('TRIBUTARIA', 'CONTRIBUICOES', 'PATRIMONIAL', 'AGROPECUARIA', 'INDUSTRIAL', 'SERVICOS', 'TRANSFERENCIAS_CORRENTES', 'OUTRAS_CORRENTES', 'OPERACOES_CREDITO', 'ALIENACAO_BENS', 'TRANSFERENCIAS_CAPITAL', 'OUTRAS_CAPITAL') NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `fonte` VARCHAR(191) NULL,
    `unidadeGestora` VARCHAR(191) NULL,
    `previsto` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `arrecadado` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `ReceitaOrcamentaria_municipioId_exercicio_idx`(`municipioId`, `exercicio`),
    INDEX `ReceitaOrcamentaria_municipioId_competencia_idx`(`municipioId`, `competencia`),
    INDEX `ReceitaOrcamentaria_municipioId_natureza_idx`(`municipioId`, `natureza`),
    UNIQUE INDEX `ReceitaOrcamentaria_municipioId_competencia_codigoReceita_key`(`municipioId`, `competencia`, `codigoReceita`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `DespesaOrcamentaria` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `exercicio` INTEGER NOT NULL,
    `mes` INTEGER NOT NULL,
    `competencia` VARCHAR(191) NOT NULL,
    `orgao` VARCHAR(191) NOT NULL,
    `unidade` VARCHAR(191) NULL,
    `funcao` VARCHAR(191) NULL,
    `subfuncao` VARCHAR(191) NULL,
    `programa` VARCHAR(191) NULL,
    `acao` VARCHAR(191) NULL,
    `natureza` ENUM('PESSOAL_ENCARGOS', 'JUROS_ENCARGOS_DIVIDA', 'OUTRAS_CORRENTES', 'INVESTIMENTOS', 'INVERSOES_FINANCEIRAS', 'AMORTIZACAO_DIVIDA', 'RESERVA_CONTINGENCIA') NOT NULL,
    `elementoDespesa` VARCHAR(191) NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `fonte` VARCHAR(191) NULL,
    `orcado` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `empenhado` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `liquidado` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `pago` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `credorNome` VARCHAR(191) NULL,
    `credorCPFCNPJ` VARCHAR(191) NULL,
    `numeroEmpenho` VARCHAR(191) NULL,
    `documentoFiscal` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `DespesaOrcamentaria_municipioId_exercicio_idx`(`municipioId`, `exercicio`),
    INDEX `DespesaOrcamentaria_municipioId_competencia_idx`(`municipioId`, `competencia`),
    INDEX `DespesaOrcamentaria_municipioId_natureza_idx`(`municipioId`, `natureza`),
    INDEX `DespesaOrcamentaria_municipioId_credorCPFCNPJ_idx`(`municipioId`, `credorCPFCNPJ`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `RelatorioLRF` (
    `id` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `periodo` ENUM('BIMESTRAL_1', 'BIMESTRAL_2', 'BIMESTRAL_3', 'BIMESTRAL_4', 'BIMESTRAL_5', 'BIMESTRAL_6', 'QUADRIMESTRAL_1', 'QUADRIMESTRAL_2', 'QUADRIMESTRAL_3', 'ANUAL') NOT NULL,
    `exercicio` INTEGER NOT NULL,
    `situacao` ENUM('RASCUNHO', 'PUBLICADA', 'RETIFICADA', 'REVOGADA') NOT NULL DEFAULT 'RASCUNHO',
    `receitaRealizada` DECIMAL(15, 2) NULL,
    `despesaRealizada` DECIMAL(15, 2) NULL,
    `resultadoPrimario` DECIMAL(15, 2) NULL,
    `dividaConsolidada` DECIMAL(15, 2) NULL,
    `despesaPessoal` DECIMAL(15, 2) NULL,
    `limitePessoal` DECIMAL(15, 2) NULL,
    `dividaConsolidadaLiquida` DECIMAL(15, 2) NULL,
    `receitaCorrenteLiquida` DECIMAL(15, 2) NULL,
    `urlArquivo` VARCHAR(191) NULL,
    `observacoes` TEXT NULL,
    `publicadoEm` DATETIME(3) NULL,
    `dataEnvioSIAPE` DATETIME(3) NULL,
    `dataEnvioSIAFIC` DATETIME(3) NULL,
    `usuarioId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `RelatorioLRF_municipioId_exercicio_idx`(`municipioId`, `exercicio`),
    UNIQUE INDEX `RelatorioLRF_municipioId_tipo_periodo_exercicio_key`(`municipioId`, `tipo`, `periodo`, `exercicio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `_SecretariaToUsuario` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_SecretariaToUsuario_AB_unique`(`A`, `B`),
    INDEX `_SecretariaToUsuario_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `_DepartamentoToUsuario` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_DepartamentoToUsuario_AB_unique`(`A`, `B`),
    INDEX `_DepartamentoToUsuario_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `_CoordenacaoToUsuario` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_CoordenacaoToUsuario_AB_unique`(`A`, `B`),
    INDEX `_CoordenacaoToUsuario_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `_SetorToUsuario` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_SetorToUsuario_AB_unique`(`A`, `B`),
    INDEX `_SetorToUsuario_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `_UnidadeToUsuario` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_UnidadeToUsuario_AB_unique`(`A`, `B`),
    INDEX `_UnidadeToUsuario_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `_CargoToUsuario` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_CargoToUsuario_AB_unique`(`A`, `B`),
    INDEX `_CargoToUsuario_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `_ItemLicitacaoToLicitacao` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_ItemLicitacaoToLicitacao_AB_unique`(`A`, `B`),
    INDEX `_ItemLicitacaoToLicitacao_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `_ContratoToLicitacao` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_ContratoToLicitacao_AB_unique`(`A`, `B`),
    INDEX `_ContratoToLicitacao_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `_DotacaoToOrcamento` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_DotacaoToOrcamento_AB_unique`(`A`, `B`),
    INDEX `_DotacaoToOrcamento_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `_DotacaoToUnidadeOrcamentaria` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_DotacaoToUnidadeOrcamentaria_AB_unique`(`A`, `B`),
    INDEX `_DotacaoToUnidadeOrcamentaria_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `_OrcamentoToSuplemento` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_OrcamentoToSuplemento_AB_unique`(`A`, `B`),
    INDEX `_OrcamentoToSuplemento_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `_MedicaoObraToObraPublica` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_MedicaoObraToObraPublica_AB_unique`(`A`, `B`),
    INDEX `_MedicaoObraToObraPublica_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `_AchadoAuditoriaToRecomendacao` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_AchadoAuditoriaToRecomendacao_AB_unique`(`A`, `B`),
    INDEX `_AchadoAuditoriaToRecomendacao_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `_LicencaAmbientalToProdutorRural` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_LicencaAmbientalToProdutorRural_AB_unique`(`A`, `B`),
    INDEX `_LicencaAmbientalToProdutorRural_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Usuario` ADD CONSTRAINT `Usuario_municipioId_fkey` FOREIGN KEY (`municipioId`) REFERENCES `Municipio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Usuario` ADD CONSTRAINT `Usuario_perfilId_fkey` FOREIGN KEY (`perfilId`) REFERENCES `Perfil`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Perfil` ADD CONSTRAINT `Perfil_municipioId_fkey` FOREIGN KEY (`municipioId`) REFERENCES `Municipio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sessao` ADD CONSTRAINT `Sessao_municipioId_fkey` FOREIGN KEY (`municipioId`) REFERENCES `Municipio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sessao` ADD CONSTRAINT `Sessao_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_municipioId_fkey` FOREIGN KEY (`municipioId`) REFERENCES `Municipio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `secretarias` ADD CONSTRAINT `secretarias_municipioId_fkey` FOREIGN KEY (`municipioId`) REFERENCES `Municipio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `departamentos` ADD CONSTRAINT `departamentos_secretariaId_fkey` FOREIGN KEY (`secretariaId`) REFERENCES `secretarias`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coordenacoes` ADD CONSTRAINT `coordenacoes_departamentoId_fkey` FOREIGN KEY (`departamentoId`) REFERENCES `departamentos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `setores` ADD CONSTRAINT `setores_coordenacaoId_fkey` FOREIGN KEY (`coordenacaoId`) REFERENCES `coordenacoes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `unidades` ADD CONSTRAINT `unidades_setorId_fkey` FOREIGN KEY (`setorId`) REFERENCES `setores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cargos` ADD CONSTRAINT `cargos_municipioId_fkey` FOREIGN KEY (`municipioId`) REFERENCES `Municipio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuario_permissoes` ADD CONSTRAINT `usuario_permissoes_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documentos` ADD CONSTRAINT `documentos_municipioId_fkey` FOREIGN KEY (`municipioId`) REFERENCES `Municipio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documentos` ADD CONSTRAINT `documentos_secretariaId_fkey` FOREIGN KEY (`secretariaId`) REFERENCES `secretarias`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documentos` ADD CONSTRAINT `documentos_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documento_versoes` ADD CONSTRAINT `documento_versoes_documentoId_fkey` FOREIGN KEY (`documentoId`) REFERENCES `documentos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `protocolos` ADD CONSTRAINT `protocolos_municipioId_fkey` FOREIGN KEY (`municipioId`) REFERENCES `Municipio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `protocolos` ADD CONSTRAINT `protocolos_solicitanteId_fkey` FOREIGN KEY (`solicitanteId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `protocolos` ADD CONSTRAINT `protocolos_secretariaId_fkey` FOREIGN KEY (`secretariaId`) REFERENCES `secretarias`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `protocolos` ADD CONSTRAINT `protocolos_responsavelId_fkey` FOREIGN KEY (`responsavelId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tramitacoes` ADD CONSTRAINT `tramitacoes_protocoloId_fkey` FOREIGN KEY (`protocoloId`) REFERENCES `protocolos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `patrimonio_itens` ADD CONSTRAINT `patrimonio_itens_municipioId_fkey` FOREIGN KEY (`municipioId`) REFERENCES `Municipio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `veiculos` ADD CONSTRAINT `veiculos_municipioId_fkey` FOREIGN KEY (`municipioId`) REFERENCES `Municipio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnexoManifestacao` ADD CONSTRAINT `AnexoManifestacao_manifestacaoId_fkey` FOREIGN KEY (`manifestacaoId`) REFERENCES `Manifestacao`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TramitacaoManifestacao` ADD CONSTRAINT `TramitacaoManifestacao_manifestacaoId_fkey` FOREIGN KEY (`manifestacaoId`) REFERENCES `Manifestacao`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SolicitacaoServico` ADD CONSTRAINT `SolicitacaoServico_servicoId_fkey` FOREIGN KEY (`servicoId`) REFERENCES `ServicoCidadao`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Servidor` ADD CONSTRAINT `Servidor_cargoId_fkey` FOREIGN KEY (`cargoId`) REFERENCES `cargos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Servidor` ADD CONSTRAINT `Servidor_departamentoId_fkey` FOREIGN KEY (`departamentoId`) REFERENCES `departamentos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AfastamentoServidor` ADD CONSTRAINT `AfastamentoServidor_servidorId_fkey` FOREIGN KEY (`servidorId`) REFERENCES `Servidor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeriasServidor` ADD CONSTRAINT `FeriasServidor_servidorId_fkey` FOREIGN KEY (`servidorId`) REFERENCES `Servidor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contracheque` ADD CONSTRAINT `Contracheque_folhaId_fkey` FOREIGN KEY (`folhaId`) REFERENCES `FolhaPagamento`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contracheque` ADD CONSTRAINT `Contracheque_servidorId_fkey` FOREIGN KEY (`servidorId`) REFERENCES `Servidor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItemFolha` ADD CONSTRAINT `ItemFolha_contrachequeId_fkey` FOREIGN KEY (`contrachequeId`) REFERENCES `Contracheque`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItemFolha` ADD CONSTRAINT `ItemFolha_rubricaId_fkey` FOREIGN KEY (`rubricaId`) REFERENCES `Rubrica`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `folha_holerite` ADD CONSTRAINT `folha_holerite_competenciaId_fkey` FOREIGN KEY (`competenciaId`) REFERENCES `folha_competencia`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `folha_holerite_item` ADD CONSTRAINT `folha_holerite_item_holeriteId_fkey` FOREIGN KEY (`holeriteId`) REFERENCES `folha_holerite`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `folha_holerite_item` ADD CONSTRAINT `folha_holerite_item_rubricaId_fkey` FOREIGN KEY (`rubricaId`) REFERENCES `folha_rubrica`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `item_requisicao` ADD CONSTRAINT `item_requisicao_requisicaoId_fkey` FOREIGN KEY (`requisicaoId`) REFERENCES `requisicao`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `item_requisicao` ADD CONSTRAINT `item_requisicao_categoriaId_fkey` FOREIGN KEY (`categoriaId`) REFERENCES `categoria_compra`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `item_requisicao` ADD CONSTRAINT `item_requisicao_catalogoId_fkey` FOREIGN KEY (`catalogoId`) REFERENCES `CatalogoMaterial`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cotacao` ADD CONSTRAINT `cotacao_requisicaoId_fkey` FOREIGN KEY (`requisicaoId`) REFERENCES `requisicao`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `item_cotacao` ADD CONSTRAINT `item_cotacao_cotacaoId_fkey` FOREIGN KEY (`cotacaoId`) REFERENCES `cotacao`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `item_cotacao` ADD CONSTRAINT `item_cotacao_fornecedorId_fkey` FOREIGN KEY (`fornecedorId`) REFERENCES `fornecedor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `item_pedido` ADD CONSTRAINT `item_pedido_pedidoId_fkey` FOREIGN KEY (`pedidoId`) REFERENCES `pedido_compra`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `item_pedido` ADD CONSTRAINT `item_pedido_fornecedorId_fkey` FOREIGN KEY (`fornecedorId`) REFERENCES `fornecedor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `itens_licitacao` ADD CONSTRAINT `itens_licitacao_processoId_fkey` FOREIGN KEY (`processoId`) REFERENCES `processos_licitatorios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `propostas` ADD CONSTRAINT `propostas_processoId_fkey` FOREIGN KEY (`processoId`) REFERENCES `processos_licitatorios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `propostas` ADD CONSTRAINT `propostas_fornecedorId_fkey` FOREIGN KEY (`fornecedorId`) REFERENCES `fornecedor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `proposta_itens` ADD CONSTRAINT `proposta_itens_propostaId_fkey` FOREIGN KEY (`propostaId`) REFERENCES `propostas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `proposta_itens` ADD CONSTRAINT `proposta_itens_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `itens_licitacao`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contratos` ADD CONSTRAINT `contratos_processoId_fkey` FOREIGN KEY (`processoId`) REFERENCES `processos_licitatorios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contratos` ADD CONSTRAINT `contratos_fornecedorId_fkey` FOREIGN KEY (`fornecedorId`) REFERENCES `fornecedor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contratos` ADD CONSTRAINT `contratos_propostaId_fkey` FOREIGN KEY (`propostaId`) REFERENCES `propostas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `aditivos_contrato` ADD CONSTRAINT `aditivos_contrato_contratoId_fkey` FOREIGN KEY (`contratoId`) REFERENCES `contratos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `medicoes_contrato` ADD CONSTRAINT `medicoes_contrato_contratoId_fkey` FOREIGN KEY (`contratoId`) REFERENCES `contratos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `atas_registro_preco` ADD CONSTRAINT `atas_registro_preco_processoId_fkey` FOREIGN KEY (`processoId`) REFERENCES `processos_licitatorios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PropostaLicitacao` ADD CONSTRAINT `PropostaLicitacao_licitacaoId_fkey` FOREIGN KEY (`licitacaoId`) REFERENCES `Licitacao`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dotacoes` ADD CONSTRAINT `dotacoes_exercicioId_fkey` FOREIGN KEY (`exercicioId`) REFERENCES `exercicios_orcamentarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `empenhos` ADD CONSTRAINT `empenhos_exercicioId_fkey` FOREIGN KEY (`exercicioId`) REFERENCES `exercicios_orcamentarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `empenhos` ADD CONSTRAINT `empenhos_dotacaoId_fkey` FOREIGN KEY (`dotacaoId`) REFERENCES `dotacoes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lancamentos` ADD CONSTRAINT `lancamentos_exercicioId_fkey` FOREIGN KEY (`exercicioId`) REFERENCES `exercicios_orcamentarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lancamentos` ADD CONSTRAINT `lancamentos_empenhoId_fkey` FOREIGN KEY (`empenhoId`) REFERENCES `empenhos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lancamento_itens` ADD CONSTRAINT `lancamento_itens_lancamentoId_fkey` FOREIGN KEY (`lancamentoId`) REFERENCES `lancamentos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lancamento_itens` ADD CONSTRAINT `lancamento_itens_contaDebitoId_fkey` FOREIGN KEY (`contaDebitoId`) REFERENCES `contas_contabeis`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lancamento_itens` ADD CONSTRAINT `lancamento_itens_contaCreditoId_fkey` FOREIGN KEY (`contaCreditoId`) REFERENCES `contas_contabeis`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProgramaPPA` ADD CONSTRAINT `ProgramaPPA_ppaId_fkey` FOREIGN KEY (`ppaId`) REFERENCES `PPA`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AcaoPPA` ADD CONSTRAINT `AcaoPPA_programaId_fkey` FOREIGN KEY (`programaId`) REFERENCES `ProgramaPPA`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MetaLDO` ADD CONSTRAINT `MetaLDO_ldoId_fkey` FOREIGN KEY (`ldoId`) REFERENCES `LDO`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UnidadeOrcamentaria` ADD CONSTRAINT `UnidadeOrcamentaria_loaId_fkey` FOREIGN KEY (`loaId`) REFERENCES `LOA`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Suplemento` ADD CONSTRAINT `Suplemento_loaId_fkey` FOREIGN KEY (`loaId`) REFERENCES `LOA`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LiquidacaoEmpenho` ADD CONSTRAINT `LiquidacaoEmpenho_empenhoId_fkey` FOREIGN KEY (`empenhoId`) REFERENCES `empenhos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PagamentoEmpenho` ADD CONSTRAINT `PagamentoEmpenho_empenhoId_fkey` FOREIGN KEY (`empenhoId`) REFERENCES `empenhos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Liquidacao` ADD CONSTRAINT `Liquidacao_empenhoId_fkey` FOREIGN KEY (`empenhoId`) REFERENCES `empenhos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pagamento` ADD CONSTRAINT `Pagamento_empenhoId_fkey` FOREIGN KEY (`empenhoId`) REFERENCES `empenhos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReceitaPrevista` ADD CONSTRAINT `ReceitaPrevista_orcamentoId_fkey` FOREIGN KEY (`orcamentoId`) REFERENCES `Orcamento`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LancamentoReceita` ADD CONSTRAINT `LancamentoReceita_receitaPrevistaId_fkey` FOREIGN KEY (`receitaPrevistaId`) REFERENCES `ReceitaPrevista`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LancamentoIPTU` ADD CONSTRAINT `LancamentoIPTU_imovelId_fkey` FOREIGN KEY (`imovelId`) REFERENCES `ImovelUrbano`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ParcelamentoIPTU` ADD CONSTRAINT `ParcelamentoIPTU_lancamentoId_fkey` FOREIGN KEY (`lancamentoId`) REFERENCES `LancamentoIPTU`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ParcelaIPTU` ADD CONSTRAINT `ParcelaIPTU_parcelamentoId_fkey` FOREIGN KEY (`parcelamentoId`) REFERENCES `ParcelamentoIPTU`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuiaISS` ADD CONSTRAINT `GuiaISS_contribuinteId_fkey` FOREIGN KEY (`contribuinteId`) REFERENCES `ContribuinteISS`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ParcelamentoISS` ADD CONSTRAINT `ParcelamentoISS_guiaId_fkey` FOREIGN KEY (`guiaId`) REFERENCES `GuiaISS`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ParcelaISS` ADD CONSTRAINT `ParcelaISS_parcelamentoId_fkey` FOREIGN KEY (`parcelamentoId`) REFERENCES `ParcelamentoISS`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ParcelamentoDA` ADD CONSTRAINT `ParcelamentoDA_dividaId_fkey` FOREIGN KEY (`dividaId`) REFERENCES `DividaAtiva`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ParcelaDA` ADD CONSTRAINT `ParcelaDA_parcelamentoId_fkey` FOREIGN KEY (`parcelamentoId`) REFERENCES `ParcelamentoDA`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LancamentoTributario` ADD CONSTRAINT `LancamentoTributario_contribuinteId_fkey` FOREIGN KEY (`contribuinteId`) REFERENCES `Contribuinte`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LancamentoTributario` ADD CONSTRAINT `LancamentoTributario_imovelId_fkey` FOREIGN KEY (`imovelId`) REFERENCES `ImovelUrbano`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LancamentoTributario` ADD CONSTRAINT `LancamentoTributario_dividaAtivaId_fkey` FOREIGN KEY (`dividaAtivaId`) REFERENCES `DividaAtiva`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Parcelamento` ADD CONSTRAINT `Parcelamento_dividaAtivaId_fkey` FOREIGN KEY (`dividaAtivaId`) REFERENCES `DividaAtiva`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ParcelaDivida` ADD CONSTRAINT `ParcelaDivida_parcelamentoId_fkey` FOREIGN KEY (`parcelamentoId`) REFERENCES `Parcelamento`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ParcelaDivida` ADD CONSTRAINT `ParcelaDivida_lancamentoId_fkey` FOREIGN KEY (`lancamentoId`) REFERENCES `LancamentoTributario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bens_patrimoniais` ADD CONSTRAINT `bens_patrimoniais_setorId_fkey` FOREIGN KEY (`setorId`) REFERENCES `setores_patrimonio`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimentacoes_patrimoniais` ADD CONSTRAINT `movimentacoes_patrimoniais_bemId_fkey` FOREIGN KEY (`bemId`) REFERENCES `bens_patrimoniais`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registros_depreciacao` ADD CONSTRAINT `registros_depreciacao_bemId_fkey` FOREIGN KEY (`bemId`) REFERENCES `bens_patrimoniais`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `itens_inventario` ADD CONSTRAINT `itens_inventario_inventarioId_fkey` FOREIGN KEY (`inventarioId`) REFERENCES `inventarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `itens_inventario` ADD CONSTRAINT `itens_inventario_bemId_fkey` FOREIGN KEY (`bemId`) REFERENCES `bens_patrimoniais`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItemEntrada` ADD CONSTRAINT `ItemEntrada_entradaId_fkey` FOREIGN KEY (`entradaId`) REFERENCES `EntradaEstoque`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItemEntrada` ADD CONSTRAINT `ItemEntrada_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `CatalogoMaterial`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimentacaoEstoque` ADD CONSTRAINT `MovimentacaoEstoque_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `CatalogoMaterial`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimentacaoEstoque` ADD CONSTRAINT `MovimentacaoEstoque_entradaId_fkey` FOREIGN KEY (`entradaId`) REFERENCES `EntradaEstoque`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimentacaoEstoque` ADD CONSTRAINT `MovimentacaoEstoque_requisicaoId_fkey` FOREIGN KEY (`requisicaoId`) REFERENCES `requisicao`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BemPatrimonial` ADD CONSTRAINT `BemPatrimonial_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `CatalogoMaterial`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DepreciacaoBem` ADD CONSTRAINT `DepreciacaoBem_bemId_fkey` FOREIGN KEY (`bemId`) REFERENCES `BemPatrimonial`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `abastecimentos` ADD CONSTRAINT `abastecimentos_veiculoId_fkey` FOREIGN KEY (`veiculoId`) REFERENCES `veiculos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `manutencoes_frota` ADD CONSTRAINT `manutencoes_frota_veiculoId_fkey` FOREIGN KEY (`veiculoId`) REFERENCES `veiculos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `utilizacoes_veiculo` ADD CONSTRAINT `utilizacoes_veiculo_veiculoId_fkey` FOREIGN KEY (`veiculoId`) REFERENCES `veiculos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `utilizacoes_veiculo` ADD CONSTRAINT `utilizacoes_veiculo_motoristaId_fkey` FOREIGN KEY (`motoristaId`) REFERENCES `motoristas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `multas` ADD CONSTRAINT `multas_veiculoId_fkey` FOREIGN KEY (`veiculoId`) REFERENCES `veiculos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `multas` ADD CONSTRAINT `multas_motoristaId_fkey` FOREIGN KEY (`motoristaId`) REFERENCES `motoristas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `viagens` ADD CONSTRAINT `viagens_veiculoId_fkey` FOREIGN KEY (`veiculoId`) REFERENCES `veiculos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `viagens` ADD CONSTRAINT `viagens_motoristaId_fkey` FOREIGN KEY (`motoristaId`) REFERENCES `motoristas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MedicaoObra` ADD CONSTRAINT `MedicaoObra_obraId_fkey` FOREIGN KEY (`obraId`) REFERENCES `Obra`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LicencaObra` ADD CONSTRAINT `LicencaObra_obraId_fkey` FOREIGN KEY (`obraId`) REFERENCES `Obra`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VistoriaObra` ADD CONSTRAINT `VistoriaObra_obraId_fkey` FOREIGN KEY (`obraId`) REFERENCES `Obra`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VistoriaObra` ADD CONSTRAINT `VistoriaObra_licencaId_fkey` FOREIGN KEY (`licencaId`) REFERENCES `LicencaObra`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmbargoObra` ADD CONSTRAINT `EmbargoObra_obraId_fkey` FOREIGN KEY (`obraId`) REFERENCES `Obra`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EtapaCronograma` ADD CONSTRAINT `EtapaCronograma_obraId_fkey` FOREIGN KEY (`obraId`) REFERENCES `ObraPublica`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FotoObra` ADD CONSTRAINT `FotoObra_obraId_fkey` FOREIGN KEY (`obraId`) REFERENCES `ObraPublica`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FiscalizacaoObra` ADD CONSTRAINT `FiscalizacaoObra_obraId_fkey` FOREIGN KEY (`obraId`) REFERENCES `ObraPublica`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FiscalizacaoObra` ADD CONSTRAINT `FiscalizacaoObra_alvaraId_fkey` FOREIGN KEY (`alvaraId`) REFERENCES `Alvara`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Auditoria` ADD CONSTRAINT `Auditoria_programaId_fkey` FOREIGN KEY (`programaId`) REFERENCES `ProgramaAuditoria`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AchadoAuditoria` ADD CONSTRAINT `AchadoAuditoria_auditoriaId_fkey` FOREIGN KEY (`auditoriaId`) REFERENCES `Auditoria`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Recomendacao` ADD CONSTRAINT `Recomendacao_achadoId_fkey` FOREIGN KEY (`achadoId`) REFERENCES `Achado`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PAD` ADD CONSTRAINT `PAD_achadoId_fkey` FOREIGN KEY (`achadoId`) REFERENCES `AchadoAuditoria`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TramitacaoPedido` ADD CONSTRAINT `TramitacaoPedido_pedidoId_fkey` FOREIGN KEY (`pedidoId`) REFERENCES `PedidoAcesso`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecursoPedido` ADD CONSTRAINT `RecursoPedido_pedidoId_fkey` FOREIGN KEY (`pedidoId`) REFERENCES `PedidoAcesso`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimentacaoManifestacao` ADD CONSTRAINT `MovimentacaoManifestacao_manifestacaoId_fkey` FOREIGN KEY (`manifestacaoId`) REFERENCES `Manifestacao`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RespostaManifestacao` ADD CONSTRAINT `RespostaManifestacao_manifestacaoId_fkey` FOREIGN KEY (`manifestacaoId`) REFERENCES `Manifestacao`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FamiliaReferenciada` ADD CONSTRAINT `FamiliaReferenciada_unidadeId_fkey` FOREIGN KEY (`unidadeId`) REFERENCES `UnidadeSuas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AtendimentoSuas` ADD CONSTRAINT `AtendimentoSuas_familiaId_fkey` FOREIGN KEY (`familiaId`) REFERENCES `FamiliaReferenciada`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AtendimentoSuas` ADD CONSTRAINT `AtendimentoSuas_unidadeId_fkey` FOREIGN KEY (`unidadeId`) REFERENCES `UnidadeSuas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BeneficioFamilia` ADD CONSTRAINT `BeneficioFamilia_familiaId_fkey` FOREIGN KEY (`familiaId`) REFERENCES `FamiliaReferenciada`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfissionalSaude` ADD CONSTRAINT `ProfissionalSaude_unidadeId_fkey` FOREIGN KEY (`unidadeId`) REFERENCES `UnidadeSaude`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Agendamento` ADD CONSTRAINT `Agendamento_unidadeId_fkey` FOREIGN KEY (`unidadeId`) REFERENCES `UnidadeSaude`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Agendamento` ADD CONSTRAINT `Agendamento_profissionalId_fkey` FOREIGN KEY (`profissionalId`) REFERENCES `ProfissionalSaude`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Agendamento` ADD CONSTRAINT `Agendamento_pacienteId_fkey` FOREIGN KEY (`pacienteId`) REFERENCES `Paciente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Atendimento` ADD CONSTRAINT `Atendimento_unidadeId_fkey` FOREIGN KEY (`unidadeId`) REFERENCES `UnidadeSaude`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Atendimento` ADD CONSTRAINT `Atendimento_profissionalId_fkey` FOREIGN KEY (`profissionalId`) REFERENCES `ProfissionalSaude`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Atendimento` ADD CONSTRAINT `Atendimento_pacienteId_fkey` FOREIGN KEY (`pacienteId`) REFERENCES `Paciente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Atendimento` ADD CONSTRAINT `Atendimento_agendamentoId_fkey` FOREIGN KEY (`agendamentoId`) REFERENCES `Agendamento`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EquipeESF` ADD CONSTRAINT `EquipeESF_unidadeId_fkey` FOREIGN KEY (`unidadeId`) REFERENCES `UnidadeSaude`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MembroEquipeESF` ADD CONSTRAINT `MembroEquipeESF_equipeId_fkey` FOREIGN KEY (`equipeId`) REFERENCES `EquipeESF`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VisitaACS` ADD CONSTRAINT `VisitaACS_equipeId_fkey` FOREIGN KEY (`equipeId`) REFERENCES `EquipeESF`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServidorEducacao` ADD CONSTRAINT `ServidorEducacao_escolaId_fkey` FOREIGN KEY (`escolaId`) REFERENCES `Escola`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Turma` ADD CONSTRAINT `Turma_escolaId_fkey` FOREIGN KEY (`escolaId`) REFERENCES `Escola`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TurmaServidor` ADD CONSTRAINT `TurmaServidor_turmaId_fkey` FOREIGN KEY (`turmaId`) REFERENCES `Turma`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TurmaServidor` ADD CONSTRAINT `TurmaServidor_servidorId_fkey` FOREIGN KEY (`servidorId`) REFERENCES `ServidorEducacao`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Matricula` ADD CONSTRAINT `Matricula_alunoId_fkey` FOREIGN KEY (`alunoId`) REFERENCES `Aluno`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Matricula` ADD CONSTRAINT `Matricula_turmaId_fkey` FOREIGN KEY (`turmaId`) REFERENCES `Turma`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RegistroFrequencia` ADD CONSTRAINT `RegistroFrequencia_turmaId_fkey` FOREIGN KEY (`turmaId`) REFERENCES `Turma`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RegistroFrequencia` ADD CONSTRAINT `RegistroFrequencia_alunoId_fkey` FOREIGN KEY (`alunoId`) REFERENCES `Aluno`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransporteAluno` ADD CONSTRAINT `TransporteAluno_veiculoId_fkey` FOREIGN KEY (`veiculoId`) REFERENCES `VeiculoTransporte`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Midia` ADD CONSTRAINT `Midia_albumId_fkey` FOREIGN KEY (`albumId`) REFERENCES `AlbumMidia`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimentoProcesso` ADD CONSTRAINT `MovimentoProcesso_processoId_fkey` FOREIGN KEY (`processoId`) REFERENCES `ProcessoJuridico`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentoProcesso` ADD CONSTRAINT `DocumentoProcesso_processoId_fkey` FOREIGN KEY (`processoId`) REFERENCES `ProcessoJuridico`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LoteLicitacao` ADD CONSTRAINT `LoteLicitacao_licitacaoId_fkey` FOREIGN KEY (`licitacaoId`) REFERENCES `Licitacao`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ParticipanteLicitacao` ADD CONSTRAINT `ParticipanteLicitacao_licitacaoId_fkey` FOREIGN KEY (`licitacaoId`) REFERENCES `Licitacao`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimentacaoBem` ADD CONSTRAINT `MovimentacaoBem_bemId_fkey` FOREIGN KEY (`bemId`) REFERENCES `BemPatrimonial`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ManutencaoBem` ADD CONSTRAINT `ManutencaoBem_bemId_fkey` FOREIGN KEY (`bemId`) REFERENCES `BemPatrimonial`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Familia` ADD CONSTRAINT `Familia_unidadeId_fkey` FOREIGN KEY (`unidadeId`) REFERENCES `UnidadeSemas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MembroFamilia` ADD CONSTRAINT `MembroFamilia_familiaId_fkey` FOREIGN KEY (`familiaId`) REFERENCES `Familia`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AtendimentoSocial` ADD CONSTRAINT `AtendimentoSocial_familiaId_fkey` FOREIGN KEY (`familiaId`) REFERENCES `Familia`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BeneficioSocial` ADD CONSTRAINT `BeneficioSocial_familiaId_fkey` FOREIGN KEY (`familiaId`) REFERENCES `Familia`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VisitaDomiciliar` ADD CONSTRAINT `VisitaDomiciliar_familiaId_fkey` FOREIGN KEY (`familiaId`) REFERENCES `Familia`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EncaminhamentoSocial` ADD CONSTRAINT `EncaminhamentoSocial_familiaId_fkey` FOREIGN KEY (`familiaId`) REFERENCES `Familia`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EncaminhamentoSocial` ADD CONSTRAINT `EncaminhamentoSocial_atendimentoId_fkey` FOREIGN KEY (`atendimentoId`) REFERENCES `AtendimentoSocial`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EvolucaoFamiliar` ADD CONSTRAINT `EvolucaoFamiliar_familiaId_fkey` FOREIGN KEY (`familiaId`) REFERENCES `Familia`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auto_infracao_ambiental` ADD CONSTRAINT `auto_infracao_ambiental_licencaId_fkey` FOREIGN KEY (`licencaId`) REFERENCES `licenca_ambiental`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PropriedadeRural` ADD CONSTRAINT `PropriedadeRural_produtorId_fkey` FOREIGN KEY (`produtorId`) REFERENCES `ProdutorRural`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProducaoAgricola` ADD CONSTRAINT `ProducaoAgricola_propriedadeId_fkey` FOREIGN KEY (`propriedadeId`) REFERENCES `PropriedadeRural`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InscricaoPrograma` ADD CONSTRAINT `InscricaoPrograma_programaId_fkey` FOREIGN KEY (`programaId`) REFERENCES `ProgramaAgricola`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InscricaoPrograma` ADD CONSTRAINT `InscricaoPrograma_produtorId_fkey` FOREIGN KEY (`produtorId`) REFERENCES `ProdutorRural`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventoCultural` ADD CONSTRAINT `EventoCultural_espacoId_fkey` FOREIGN KEY (`espacoId`) REFERENCES `EspacoCultural`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReservaEspaco` ADD CONSTRAINT `ReservaEspaco_espacoId_fkey` FOREIGN KEY (`espacoId`) REFERENCES `EspacoCultural`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ResultadoEsportivo` ADD CONSTRAINT `ResultadoEsportivo_atletaId_fkey` FOREIGN KEY (`atletaId`) REFERENCES `Atleta`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrdemServico` ADD CONSTRAINT `OrdemServico_veiculoId_fkey` FOREIGN KEY (`veiculoId`) REFERENCES `veiculos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ManutencaoVeiculo` ADD CONSTRAINT `ManutencaoVeiculo_veiculoId_fkey` FOREIGN KEY (`veiculoId`) REFERENCES `veiculos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AbastecimentoVeiculo` ADD CONSTRAINT `AbastecimentoVeiculo_veiculoId_fkey` FOREIGN KEY (`veiculoId`) REFERENCES `veiculos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItemRoteiro` ADD CONSTRAINT `ItemRoteiro_roteiroId_fkey` FOREIGN KEY (`roteiroId`) REFERENCES `RoteiroColeta`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItemRoteiro` ADD CONSTRAINT `ItemRoteiro_veiculoId_fkey` FOREIGN KEY (`veiculoId`) REFERENCES `veiculos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_SecretariaToUsuario` ADD CONSTRAINT `_SecretariaToUsuario_A_fkey` FOREIGN KEY (`A`) REFERENCES `secretarias`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_SecretariaToUsuario` ADD CONSTRAINT `_SecretariaToUsuario_B_fkey` FOREIGN KEY (`B`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_DepartamentoToUsuario` ADD CONSTRAINT `_DepartamentoToUsuario_A_fkey` FOREIGN KEY (`A`) REFERENCES `departamentos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_DepartamentoToUsuario` ADD CONSTRAINT `_DepartamentoToUsuario_B_fkey` FOREIGN KEY (`B`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CoordenacaoToUsuario` ADD CONSTRAINT `_CoordenacaoToUsuario_A_fkey` FOREIGN KEY (`A`) REFERENCES `coordenacoes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CoordenacaoToUsuario` ADD CONSTRAINT `_CoordenacaoToUsuario_B_fkey` FOREIGN KEY (`B`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_SetorToUsuario` ADD CONSTRAINT `_SetorToUsuario_A_fkey` FOREIGN KEY (`A`) REFERENCES `setores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_SetorToUsuario` ADD CONSTRAINT `_SetorToUsuario_B_fkey` FOREIGN KEY (`B`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_UnidadeToUsuario` ADD CONSTRAINT `_UnidadeToUsuario_A_fkey` FOREIGN KEY (`A`) REFERENCES `unidades`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_UnidadeToUsuario` ADD CONSTRAINT `_UnidadeToUsuario_B_fkey` FOREIGN KEY (`B`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CargoToUsuario` ADD CONSTRAINT `_CargoToUsuario_A_fkey` FOREIGN KEY (`A`) REFERENCES `cargos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CargoToUsuario` ADD CONSTRAINT `_CargoToUsuario_B_fkey` FOREIGN KEY (`B`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ItemLicitacaoToLicitacao` ADD CONSTRAINT `_ItemLicitacaoToLicitacao_A_fkey` FOREIGN KEY (`A`) REFERENCES `itens_licitacao`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ItemLicitacaoToLicitacao` ADD CONSTRAINT `_ItemLicitacaoToLicitacao_B_fkey` FOREIGN KEY (`B`) REFERENCES `Licitacao`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ContratoToLicitacao` ADD CONSTRAINT `_ContratoToLicitacao_A_fkey` FOREIGN KEY (`A`) REFERENCES `contratos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ContratoToLicitacao` ADD CONSTRAINT `_ContratoToLicitacao_B_fkey` FOREIGN KEY (`B`) REFERENCES `Licitacao`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_DotacaoToOrcamento` ADD CONSTRAINT `_DotacaoToOrcamento_A_fkey` FOREIGN KEY (`A`) REFERENCES `dotacoes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_DotacaoToOrcamento` ADD CONSTRAINT `_DotacaoToOrcamento_B_fkey` FOREIGN KEY (`B`) REFERENCES `Orcamento`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_DotacaoToUnidadeOrcamentaria` ADD CONSTRAINT `_DotacaoToUnidadeOrcamentaria_A_fkey` FOREIGN KEY (`A`) REFERENCES `dotacoes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_DotacaoToUnidadeOrcamentaria` ADD CONSTRAINT `_DotacaoToUnidadeOrcamentaria_B_fkey` FOREIGN KEY (`B`) REFERENCES `UnidadeOrcamentaria`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_OrcamentoToSuplemento` ADD CONSTRAINT `_OrcamentoToSuplemento_A_fkey` FOREIGN KEY (`A`) REFERENCES `Orcamento`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_OrcamentoToSuplemento` ADD CONSTRAINT `_OrcamentoToSuplemento_B_fkey` FOREIGN KEY (`B`) REFERENCES `Suplemento`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_MedicaoObraToObraPublica` ADD CONSTRAINT `_MedicaoObraToObraPublica_A_fkey` FOREIGN KEY (`A`) REFERENCES `MedicaoObra`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_MedicaoObraToObraPublica` ADD CONSTRAINT `_MedicaoObraToObraPublica_B_fkey` FOREIGN KEY (`B`) REFERENCES `ObraPublica`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_AchadoAuditoriaToRecomendacao` ADD CONSTRAINT `_AchadoAuditoriaToRecomendacao_A_fkey` FOREIGN KEY (`A`) REFERENCES `AchadoAuditoria`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_AchadoAuditoriaToRecomendacao` ADD CONSTRAINT `_AchadoAuditoriaToRecomendacao_B_fkey` FOREIGN KEY (`B`) REFERENCES `Recomendacao`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_LicencaAmbientalToProdutorRural` ADD CONSTRAINT `_LicencaAmbientalToProdutorRural_A_fkey` FOREIGN KEY (`A`) REFERENCES `licenca_ambiental`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_LicencaAmbientalToProdutorRural` ADD CONSTRAINT `_LicencaAmbientalToProdutorRural_B_fkey` FOREIGN KEY (`B`) REFERENCES `ProdutorRural`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

