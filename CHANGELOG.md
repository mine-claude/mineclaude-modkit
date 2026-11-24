# Mudanças do modkit

## 0.2.0 — 2026-11-24

A API do jogo andou bastante desde a 0.1.0. Esta versão traz o contrato em dia: a casca, os tipos, as regras e a
documentação saíram todos da mesma fonte, de uma vez.

**Novo na API (tipado e documentado, com exemplo em `docs/ctx.md`):**

- **`ctx.modifiers` — os modificadores de mundo.** Os interruptores com nome da tela "Criar mundo", as predefinições
  e o que cada um embrulha: `register`, `preset`, `gate`, `get`, `enabled`, `has`, `list`, `presets`, `categories`,
  a árvore por `parent`, `legacy` e as regras de jogo embrulhadas. A mudança de um modificador chega pelo evento de
  servidor `worldModifierChanged` (`name`, `value`, `old`) — este grupo não tem `onChange`.
- **`ctx.gases` cresceu.** O `register` aceita `spectrum` e `visibility.nakedEye` (o gás que se vê a olho nu);
  `source`, `field`, `device` (com `power`, `filter` e `pending`), a semântica de pendência de `sample`, `room` e
  `volumeAt`, mais `view` e `outdoor`.
- **Telas de controle.** O esquema `controls` de uma tela: `switch`, `button`, `selector`, `slider`, `slot`,
  `readout` e `graph`, com `readControls`, `onControl` e `controlsHint` — o painel de uma máquina.
- **O clique agachado.** `e.sneaking` em `onInteract` / `onUse`: a ação rápida, em vez de abrir o painel.
- **A propriedade de bloco `trunk`.** Troncos naturais de árvore: um cubo sólido para o jogo, desenhado como tronco
  detalhado pelo navegador.
- **O mundo sem teto de altura.** Não há mais altura fixa de construção; acima da faixa gerada o mundo vai em seções
  verticais de 16³.
- **`ctx.render.graphics().planetCurve`.** A curvatura do planeta, que faltava nas declarações de tipo.
- **As regras de jogo** que o mod base registra, por `ctx.rules`.

**Protocolo de rede:** versão **107** (modificadores de mundo no `welcome`).

**O que NÃO faz parte do kit:** o apelido e o login do jogador. Um mod não cria contas nem lê senhas.

**O kit em si:**

- **Escrito em TypeScript estrito.** As fontes são `src/*.ts` com `strict: true`, e o pacote leva o compilado
  (`dist/`: JavaScript mais os `.d.ts`), então roda no Bun e no Node sem passo de build na máquina de quem usa.
  O `tsc --noEmit` é verde na CI, e a CI só publica a Release se a prova de ponta a ponta passar.
- **Consumível como pacote.** `package.json` com `name` `@mineclaude/modkit`, mapa de `exports` por módulo
  (`/pack`, `/check`, `/rules`, `/versions`, `/sdk`, `/mod-types`) e o executável `mineclaude-modkit`.
  A Release traz o `.tgz` (`bun pm pack`) e o `.zip` do kit inteiro; dá para instalar direto do repositório com
  `bun add github:mine-claude/mineclaude-modkit#v0.2.0`. **Não** é publicado no npm.
- **`modkit new` cria o mod em TypeScript** por padrão (`--js` para JavaScript). Os mods de exemplo também são TS.
- **A CLI é a mesma coisa como biblioteca:** `import { checkMod } from '@mineclaude/modkit/check'`.
- Documentação em português: o guia longo, a referência do `ctx` grupo por grupo, começar, empacotar e versionar.

**Empacotamento:**

- `animations/` entrou na lista de pastas de recurso. Um mob com `animations: "animations/<nome>.animation.json"`
  tinha o arquivo deixado de fora do pacote em silêncio, e só falhava no servidor.
- Os lados em `scripts` saem no pacote na ordem em que o autor os escreveu, igual ao empacotador do jogo: o
  `package.json` é serializado, então outra ordem seria outro arquivo.
- O empacotador deste kit, o `tools/pack.mjs` que viaja dentro de cada mod e o empacotador do próprio jogo são
  comparados byte a byte por uma suíte no repositório do jogo, nos mods publicados e num mod recém-criado.
- **Corrigido:** o build passou a rodar com a pasta do mod como raiz. O Bun escreve o caminho de cada módulo num
  comentário do pacote, relativo à raiz, então montar de outro lugar mudava os bytes do `.mcmod` (a Release deixava
  de ser reproduzível) e ainda escrevia o caminho da máquina do autor dentro do arquivo publicado.

## 0.1.0

Primeira separação do contrato público: a casca `mineclaude-sdk.js`, as declarações de tipo, a CLI (`new`, `build`,
`pack`, `check`), o modelo de mod e o workflow de Release por tag.
