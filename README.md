# Controle de Contratos de Crédito Imobiliário

Sistema interno de **protocolo de entrega e devolução de contratos de crédito imobiliário** em
agência bancária. Responsivo, com desenho *mobile-first*: os gerentes usam tanto na mesa quanto
em atendimento externo, pelo celular.

Responde, a qualquer momento:

- onde o contrato está fisicamente (status dentro da agência);
- quem entregou e quem recebeu em cada movimentação;
- quais das 4 assinaturas já foram coletadas;
- todo o histórico do contrato, em ordem cronológica, exportável em PDF.

---

## Sumário

- [Stack](#stack)
- [Requisitos](#requisitos)
- [Instalação rápida](#instalação-rápida)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Rodando em desenvolvimento](#rodando-em-desenvolvimento)
- [Trocando de banco de dados](#trocando-de-banco-de-dados)
- [Usuários de exemplo](#usuários-de-exemplo)
- [Modelo de dados](#modelo-de-dados)
- [Regras de negócio](#regras-de-negócio)
- [API REST](#api-rest)
- [Telas](#telas)
- [Responsividade e PWA](#responsividade-e-pwa)
- [⚠️ Pontos de atenção de segurança e LGPD](#️-pontos-de-atenção-de-segurança-e-lgpd)
- [Estrutura de pastas](#estrutura-de-pastas)

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + TypeScript + Vite + TailwindCSS (mobile-first) + React Router |
| Assinatura | `react-signature-canvas` (canvas com suporte a toque) |
| Backend | Node.js + Express + TypeScript |
| Validação | Zod em todas as rotas de escrita |
| ORM | Prisma |
| Banco | PostgreSQL (Neon serverless neste ambiente; também roda em Postgres local ou SQLite) |
| PDF | PDFKit (histórico com as imagens das assinaturas embutidas) |
| Sessão | JWT (`Authorization: Bearer`) |

### Sobre o banco de dados

Este ambiente está configurado com **Neon** (Postgres serverless) — ver `backend/.env`. O schema
Prisma também roda **sem alteração de código** em Postgres local ou em SQLite; só troca a
`DATABASE_URL`/`DIRECT_URL` e, para SQLite, o `provider` do datasource. Ver
[Trocando de banco de dados](#trocando-de-banco-de-dados).

Por causa dessa portabilidade, campos de domínio fechado (cargo, status, origem, tipo) são
`String` no banco em vez de `enum` nativo — o SQLite não suporta enums. Os valores permitidos
ficam centralizados em [`backend/src/lib/constants.ts`](backend/src/lib/constants.ts) e são
validados com Zod em **todas** as rotas de escrita — a garantia de domínio fechado continua
existindo, na camada de aplicação.

---

## Requisitos

- Node.js 20 ou superior
- npm 10 ou superior
- *(opcional)* Docker, apenas se quiser rodar PostgreSQL local

---

## Instalação rápida

```bash
# na raiz do projeto
cp backend/.env.example backend/.env      # Windows: copy backend\.env.example backend\.env

npm --prefix backend install
npm --prefix frontend install

npm --prefix backend run prisma:migrate -- --name init
npm --prefix backend run seed
```

Depois, em dois terminais:

```bash
npm --prefix backend run dev     # API   -> http://localhost:3333
npm --prefix frontend run dev    # Web   -> http://localhost:5173
```

Ou, com as dependências da raiz instaladas (`npm install`), os dois de uma vez:

```bash
npm run dev
```

Abra <http://localhost:5173> e entre com um dos [usuários de exemplo](#usuários-de-exemplo).

---

## Variáveis de ambiente

Todas ficam em `backend/.env` (modelo em `backend/.env.example`). O frontend não precisa de `.env`
em desenvolvimento — o Vite faz proxy de `/api` para a porta 3333.

| Variável | Padrão | Descrição |
|---|---|---|
| `DATABASE_PROVIDER` | `postgresql` | `postgresql` ou `sqlite`. Ajusta a busca case-insensitive. |
| `DATABASE_URL` | *(Neon, endpoint `-pooler`)* | String de conexão usada pela aplicação em runtime. |
| `DIRECT_URL` | *(Neon, endpoint direto)* | String de conexão usada só pelo Prisma CLI (migrate/studio). Em Postgres sem pooler, pode ser igual a `DATABASE_URL`. Não existe em SQLite. |
| `PORT` | `3333` | Porta da API. |
| `NODE_ENV` | `development` | Em `production`, exige `JWT_SECRET` com 32+ caracteres. |
| `JWT_SECRET` | *(dev tem padrão)* | Segredo do token de sessão. **Gere um valor aleatório em produção.** |
| `JWT_EXPIRES_IN` | `8h` | Validade da sessão. |
| `CORS_ORIGIN` | `http://localhost:5173` | Origens liberadas, separadas por vírgula. |
| `ALERTA_DIAS_PARADO` | `5` | Dias sem mudança de status para o contrato entrar no alerta do dashboard. |

Em produção o frontend usa `VITE_API_URL` (ex.: `https://api.seu-dominio/api`) definida no build.

---

## Rodando em desenvolvimento

| Comando | O que faz |
|---|---|
| `npm --prefix backend run dev` | API com recarga automática (`tsx watch`) |
| `npm --prefix frontend run dev` | Vite em `0.0.0.0:5173` (acessível pelo IP da máquina, para testar no celular) |
| `npm --prefix backend run seed` | Recria os dados de exemplo |
| `npm --prefix backend run db:reset` | Apaga o banco, reaplica migrações e roda o seed |
| `npm --prefix backend run prisma:studio` | Interface visual do banco |
| `npm run typecheck` | TypeScript nos dois projetos |
| `npm run build` | Build de produção dos dois projetos |

### Testando no celular na mesma rede

O Vite já sobe com `host: true`. Descubra o IP da máquina (`ipconfig`), acesse
`http://SEU_IP:5173` no celular e ajuste `CORS_ORIGIN` no `.env` do backend para incluir esse
endereço.

---

## Trocando de banco de dados

### Para Neon (Postgres serverless) — configuração atual deste ambiente

1. Crie um projeto em [console.neon.tech](https://console.neon.tech) e abra **Connect** /
   **Connection string**.
2. Em `backend/.env`, use o endpoint com `-pooler` em `DATABASE_URL` (para a aplicação) e o mesmo
   endpoint **sem** `-pooler` em `DIRECT_URL` (para o Prisma Migrate):
   ```env
   DATABASE_URL="postgresql://usuario:senha@ep-xxxx-pooler.regiao.aws.neon.tech/neondb?sslmode=require&channel_binding=require&pgbouncer=true"
   DIRECT_URL="postgresql://usuario:senha@ep-xxxx.regiao.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
   ```
3. `backend/prisma/schema.prisma` já usa `provider = "postgresql"` com `directUrl` — nenhuma
   alteração de schema é necessária.
4. Rode as migrações e o seed:
   ```bash
   npm --prefix backend run prisma:deploy   # aplica as migrações existentes (sem shadow database)
   npm --prefix backend run seed
   ```

### Para PostgreSQL local

1. Suba um Postgres (`docker compose up -d` usa o `docker-compose.yml` da raiz, ou uma instalação
   local).
2. Em `backend/.env`, aponte `DATABASE_URL` e `DIRECT_URL` para a mesma string:
   ```env
   DATABASE_URL="postgresql://usuario:senha@localhost:5432/contratos_imobiliarios?schema=public"
   DIRECT_URL="postgresql://usuario:senha@localhost:5432/contratos_imobiliarios?schema=public"
   ```
3. Rode:
   ```bash
   npm --prefix backend run prisma:migrate -- --name init
   npm --prefix backend run seed
   ```

### Para SQLite (não exige nenhum servidor)

1. Em `backend/prisma/schema.prisma`, no bloco `datasource db`, troque `provider = "postgresql"`
   por `provider = "sqlite"` e remova a linha `directUrl` (o SQLite não usa).
2. Em `backend/.env`: `DATABASE_PROVIDER="sqlite"` e `DATABASE_URL="file:./dev.db"` (remova
   `DIRECT_URL`).
3. Apague `backend/prisma/migrations/` (o histórico de migração é por provider) e rode:
   ```bash
   npm --prefix backend run prisma:migrate -- --name init
   npm --prefix backend run seed
   ```

Em qualquer um dos três casos, nenhuma alteração de código de aplicação é necessária: o helper
`contemTexto()` já adiciona `mode: 'insensitive'` automaticamente quando o provider é PostgreSQL.

---

## Usuários de exemplo

Criados pelo seed. **O login não usa senha** — basta o e-mail (ver
[pontos de atenção](#️-pontos-de-atenção-de-segurança-e-lgpd)).

| E-mail | Cargo | Pode assinar |
|---|---|---|
| `ana.ribeiro@exemplo.com.br` | GERENTE GERAL | Gerente Geral, Cliente |
| `carlos.nunes@exemplo.com.br` | GERENTE ADM | Gerente ADM, Cliente |
| `fernanda.souza@exemplo.com.br` | GNS E SUPERVISOR | Supervisor, Cliente |
| `marcos.alves@exemplo.com.br` | GERENTE PF PRIME | Cliente |
| `juliana.dias@exemplo.com.br` | GERENTE PF PRIME | Cliente |

Auditoria é visível apenas para **Gerente ADM** e **Gerente Geral**.

O seed cria 3 parceiros, 4 empreendimentos e 8 contratos cobrindo todos os cenários: sem
protocolo de entrada, em cada etapa de assinatura, parados há mais de 5 dias, liberado para
envio e finalizado com saída. **Todos os dados são fictícios.**

---

## Modelo de dados

```
Usuario                 id, nomeCompleto, email (único), cargo, ativo
ParceiroImobiliario     id, nome, contato
Empreendimento          id, nome, endereco, parceiroImobiliarioId → Parceiro
Cliente (contrato)      id, nomeCompleto, numeroContrato (único), numeroProposta,
                        gerenteResponsavelId → Usuario,
                        origem (EMPREENDIMENTO | CAPTACAO_LIVRE),
                        empreendimentoId (nulo em captação livre),
                        statusAtual, statusDesde, observacoes
Movimentacao        ▲   id, clienteId, tipo (ENTRADA|SAIDA), entreguePor, usuarioId,
                        recebidoPor, origemDestino, observacoes, dataHora
Assinatura              id, clienteId, tipo, status, responsavelNome, responsavelEmail,
                        usuarioId, assinaturaDigital (PNG base64), dataHora
StatusHistorico     ▲   id, clienteId, statusAnterior, statusNovo, usuarioId, motivo, dataHora
LogAuditoria        ▲   id, usuarioId, usuarioNome/Email/Cargo, acao, entidadeAfetada,
                        entidadeId, detalhes, ip, userAgent, dataHora

▲ = append-only (ver "Imutabilidade" abaixo)
```

Diferenças em relação ao rascunho do prompt, e o porquê:

- **`statusAtual` + `statusDesde` no Cliente** — sem guardar desde quando o status vale, o alerta
  de "contratos parados há mais de X dias" do dashboard seria impossível sem varrer o histórico
  inteiro a cada consulta.
- **`StatusHistorico`** — o rascunho previa só `Movimentacao`, que cobre entrada e saída. As
  mudanças de status *dentro* da agência (fila de assinaturas, liberação para envio) precisavam de
  trilha própria para a timeline ficar completa.
- **`statusAtual` nulo** enquanto não há protocolo de entrada — o contrato pode ser cadastrado
  antes de chegar fisicamente. O dashboard conta esses casos à parte.

### Imutabilidade

`LogAuditoria`, `Movimentacao` e `StatusHistorico` são **append-only**. Não há endpoint de
atualização ou exclusão, e a garantia não depende disso: um middleware do Prisma
([`backend/src/lib/prisma.ts`](backend/src/lib/prisma.ts)) rejeita `update`, `updateMany`,
`delete`, `deleteMany` e `upsert` nesses modelos por qualquer caminho de código — rota, script ou
console. Uma assinatura já coletada também não pode ser sobrescrita (HTTP 409).

---

## Regras de negócio

**Status do contrato** (os 8 do prompt):

`RECEBIDO_NA_AGENCIA` → `AGUARDANDO_ASSINATURA_GERENTE_ADM` → `AGUARDANDO_ASSINATURA_GERENTE_GERAL`
→ `AGUARDANDO_ASSINATURA_SUPERVISOR` → `AGUARDANDO_ASSINATURA_CLIENTE` →
`TODAS_ASSINATURAS_COLETADAS` → `AGUARDANDO_ENVIO_DEVOLUCAO` → `SAIDA_DA_AGENCIA`

Quem controla o quê:

| Status | Definido por |
|---|---|
| `RECEBIDO_NA_AGENCIA` | Protocolo de entrada |
| `AGUARDANDO_ASSINATURA_*` | Automático a cada assinatura, ou manualmente pela tela do contrato |
| `TODAS_ASSINATURAS_COLETADAS` | **Só o sistema**, quando as 4 assinaturas existem |
| `AGUARDANDO_ENVIO_DEVOLUCAO` | Manual, e **bloqueado** enquanto houver assinatura pendente |
| `SAIDA_DA_AGENCIA` | Protocolo de saída |

**Permissão de assinatura** (pelo cargo do usuário logado):

| Campo | Quem pode registrar |
|---|---|
| Gerente ADM | GERENTE ADM |
| Gerente Geral | GERENTE GERAL |
| Supervisor | GNS E SUPERVISOR |
| Cliente | qualquer cargo — o cliente assina presencialmente no aparelho do gerente, e o sistema grava o nome do cliente **e** quem operou a coleta |

**Saída antecipada.** Se o contrato ainda não tem as 4 assinaturas, a saída não é simplesmente
bloqueada: a devolução ao cartório para correção é um caso real de agência. A API exige uma
**justificativa** escrita, registra a ação como `PROTOCOLO_SAIDA_ANTECIPADA` na auditoria e grava
a justificativa no histórico de status.

**Confirmação explícita** é exigida no frontend antes de: registrar entrada, registrar saída,
gravar assinatura e excluir cadastro.

---

## API REST

Base: `http://localhost:3333/api`. Exceto `/health`, `/metadados` e as rotas de `auth`, todas
exigem `Authorization: Bearer <token>`.

### Autenticação

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/auth/lookup?email=` | Pré-preenche nome/cargo de usuário já cadastrado. Não devolve token. |
| `POST` | `/auth/login` | `{ nomeCompleto, email, cargo }`. Cadastra no primeiro acesso (201) ou reconhece pelo e-mail (200). |
| `GET` | `/auth/me` | Usuário da sessão. |
| `POST` | `/auth/logout` | Registra o logout na auditoria. |

### Cadastros

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/usuarios?cargo=` | Lista para o select de gerente responsável. |
| `GET` `POST` | `/parceiros` | Lista / cria parceiro imobiliário. |
| `GET` `PUT` `DELETE` | `/parceiros/:id` | Detalhe / edição / exclusão (bloqueada se houver empreendimento vinculado). |
| `GET` `POST` | `/empreendimentos?q=&parceiroId=` | Lista / cria empreendimento. |
| `GET` `PUT` `DELETE` | `/empreendimentos/:id` | Detalhe / edição / exclusão (bloqueada se houver contrato vinculado). |

### Contratos

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/clientes` | Busca paginada. Filtros: `q`, `status`, `origem`, `gerenteId`, `empreendimentoId`, `parceiroId`, `semProtocolo`, `page`, `pageSize`. |
| `GET` | `/clientes/:id` | Ficha completa (assinaturas + movimentações). |
| `POST` | `/clientes` | Cadastra e já cria as 4 assinaturas pendentes. |
| `PUT` | `/clientes/:id` | Edita dados cadastrais (travado após a saída). |

### Protocolo

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/protocolo/entrada` | `{ clienteId, entreguePor, origem, observacoes }` |
| `POST` | `/protocolo/saida` | `{ clienteId, recebidoPor, destino, observacoes, justificativa }` |
| `PATCH` | `/protocolo/:clienteId/status` | `{ status, observacoes }` — apenas status manuais. |
| `GET` | `/protocolo/movimentacoes?clienteId=&limite=` | Movimentações recentes. |

### Assinaturas, histórico e indicadores

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/clientes/:id/assinaturas` | As 4 assinaturas do contrato. |
| `POST` | `/clientes/:id/assinaturas` | `{ tipo, responsavelNome, responsavelEmail, assinaturaDigital }` (data URL PNG). |
| `GET` | `/clientes/:id/historico` | Timeline cronológica unificada. |
| `GET` | `/clientes/:id/historico/pdf` | Mesma timeline em PDF, com as assinaturas embutidas. |
| `GET` | `/dashboard?dias=` | Indicadores do painel. |
| `GET` | `/auditoria?q=&entidade=&page=` | Log de auditoria (Gerente ADM / Gerente Geral). |
| `GET` | `/metadados` | Dicionários de domínio (cargos, status, permissões). |

### Códigos de erro

`400` validação · `401` sessão ausente/expirada · `403` cargo sem permissão · `404` não encontrado
· `409` conflito de regra (assinatura já coletada, contrato já na agência, saída já registrada).
O corpo sempre traz `{ "erro": "mensagem em português" }`.

---

## Telas

| Rota | Tela |
|---|---|
| `/login` | Login sem senha (nome, e-mail, cargo) com pré-preenchimento pelo e-mail |
| `/` | Dashboard: indicadores, contratos parados, por status, por gerente, por origem |
| `/contratos` | Consulta com busca e filtros — cartões no celular, tabela no desktop |
| `/contratos/novo`, `/contratos/:id/editar` | Cadastro de cliente/contrato com origem empreendimento × captação livre |
| `/contratos/:id` | Ficha: dados, assinaturas, protocolo (entrada/saída/status), movimentações |
| `/contratos/:id/assinaturas` | Os 4 campos de assinatura com captura em canvas |
| `/contratos/:id/historico` | Timeline + exportação em PDF |
| `/protocolo` | Busca rápida do contrato + movimentações recentes |
| `/cadastros` | Empreendimentos e parceiros imobiliários |
| `/auditoria` | Log de auditoria (restrito) |

---

## Responsividade e PWA

- Layout **mobile-first**, validado a partir de 375px de largura.
- Navegação inferior fixa no celular; barra lateral no desktop (`lg:`).
- Tabelas viram cartões empilhados no celular.
- Alvos de toque de no mínimo 44×44px (classe utilitária `.toque`).
- Campos com `font-size: 16px` e `maximum-scale=1` para evitar o zoom automático do iOS ao focar.
- O canvas de assinatura usa `touch-action: none` (o dedo desenha, não rola a página) e se
  redimensiona junto com a tela.
- **PWA**: `manifest.webmanifest` + ícones + service worker que cacheia apenas a casca do app.
  Chamadas a `/api` **nunca** são cacheadas — uma resposta velha de protocolo induziria o gerente
  a erro. Os ícones são gerados por `node frontend/scripts/gerar-icones.mjs`.

---

## ⚠️ Pontos de atenção de segurança e LGPD

Levar à área de segurança da informação e compliance **antes** de qualquer uso com dados reais.

### 1. Login sem senha — risco relevante

Requisito explícito do cliente, implementado como pedido. Consequência: **o sistema não comprova
a identidade de quem entra.** Qualquer pessoa que saiba o e-mail de um gerente pode assumir a
identidade dele e, com isso, registrar assinaturas em nome desse cargo — inclusive as do Gerente
Geral e do Gerente ADM. O log de auditoria registra a ação, mas registra a identidade *alegada*.

Recomendação mínima antes de produção: segundo fator simples (código por e-mail corporativo ou
SMS), ou integração com o diretório corporativo (SSO / LDAP). O aviso aparece também na tela de
login, para que o usuário não confunda a facilidade de acesso com segurança.

### 2. Outros pontos

- **`JWT_SECRET`**: gere um valor aleatório longo em produção. Em `NODE_ENV=production` a
  aplicação recusa segredos com menos de 32 caracteres.
- **Sem revogação de sessão**: o JWT vale até expirar (`JWT_EXPIRES_IN`, padrão 8h). Não há
  blacklist — o logout só descarta o token no cliente. Para uso bancário real, avaliar tokens
  curtos com refresh e revogação no servidor.
- **HTTPS obrigatório** em produção: o token trafega no cabeçalho `Authorization`.
- **Assinaturas manuscritas são dado pessoal (LGPD)** — biometria comportamental. Definir base
  legal, prazo de retenção e política de descarte. Hoje ficam no banco em base64, sem cifra em
  repouso: avaliar criptografia de coluna ou armazenamento em storage cifrado.
- **Retenção do log de auditoria**: definir por quanto tempo os registros são mantidos. Eles são
  imutáveis por construção — o expurgo precisa ser um processo administrado, fora da aplicação.
- **Escopo de acesso**: hoje qualquer usuário autenticado vê todos os contratos. Se a política do
  banco exigir segregação por carteira, isso precisa ser adicionado.
- **Marca e identidade visual**: a paleta é neutra e propositalmente genérica. Não use logotipo,
  nome ou identidade visual de instituição financeira sem autorização de TI/compliance.
- **Dados de exemplo**: o seed usa nomes e contratos fictícios. Nunca popule ambiente de
  desenvolvimento com dados reais de clientes.

---

## Estrutura de pastas

```
.
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # modelo de dados (Postgres/Neon; portável para SQLite)
│   │   ├── migrations/
│   │   ├── seed.ts                # dados de exemplo
│   │   └── assinatura-demo.ts     # gerador de PNG das assinaturas do seed
│   └── src/
│       ├── config/env.ts          # variáveis de ambiente validadas
│       ├── lib/                   # prisma, jwt, auditoria, constantes, datas, erros
│       ├── middleware/            # autenticação, permissão por cargo, erros
│       ├── modules/               # auth, usuarios, parceiros, empreendimentos,
│       │                          # clientes, protocolo, assinaturas, historico,
│       │                          # dashboard, auditoria
│       ├── services/              # regras de status do contrato
│       ├── routes.ts              # montagem da API
│       ├── app.ts                 # Express (CORS, JSON 8mb para as assinaturas)
│       └── server.ts              # bootstrap
├── frontend/
│   ├── public/                    # manifest, ícones, service worker
│   ├── scripts/gerar-icones.mjs
│   └── src/
│       ├── components/            # AppShell, SignaturePad, ConfirmDialog, ui, toasts
│       ├── contexts/AuthContext.tsx
│       ├── hooks/useApi.ts
│       ├── lib/                   # api, domínio, formatação, tipos
│       └── pages/                 # Login, Dashboard, Contratos, ContratoForm,
│                                  # ContratoDetalhe, Assinaturas, Historico,
│                                  # Protocolo, Cadastros, Auditoria
├── docker-compose.yml             # PostgreSQL opcional
└── package.json                   # scripts que orquestram os dois projetos
```
