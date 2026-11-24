# Guia de mods do MineClaude

O MineClaude é um jogo voxel multiplayer que roda no navegador, em https://mineclaude.com. Um **mod** é uma
pasta com um `mod.json` e um arquivo JavaScript que acrescenta coisas ao jogo — blocos, itens, receitas,
texturas, mobs, comandos, telas, sons, geração de mundo — sem mexer no código do jogo. Você não precisa
conhecer o código do jogo para escrever um: tudo passa por uma API só, o `ctx`.

O ponto de entrada de um mod é uma função (ou um método de classe) que recebe esse `ctx`. **O mesmo
`register(ctx)` roda nos dois lados**: no processo do servidor e na página do navegador de cada jogador. É por
isso que o conteúdo (blocos, itens, receitas) tem de ser declarado igual nos dois — os dois lados precisam da
mesma lista, na mesma ordem — e é por isso que `ctx.isServer()` e `ctx.isClient()` existem, para separar o que
só faz sentido de um lado.

Este arquivo é o guia completo, em ordem de seção: consulte pela seção (o sumário está logo abaixo) em vez de
ler de ponta a ponta. A referência da API do `ctx`, grupo por grupo, está em [ctx.md](ctx.md). Nunca fez um
mod? Comece por [comece-aqui.md](comece-aqui.md). Para empacotar e publicar, veja
[empacotar.md](empacotar.md); para versões e compatibilidade, [versoes.md](versoes.md).

As ferramentas são uma CLI só. Instale o [Bun](https://bun.sh) e use `mineclaude-modkit`:

```sh
modkit new meumod --dir meumod     # cria um mod novo a partir do modelo (--ts para fontes em TypeScript)
modkit check meumod                # confere as regras do servidor, sem precisar do jogo
modkit build meumod                # monta as entradas declaradas em scripts._sources para dist/
modkit pack meumod                 # monta e empacota em meumod.mcmod
modkit sdk meumod                  # atualiza o mineclaude-sdk.js e os tipos dentro de um mod existente
modkit help
```

> **Aviso de segurança (leia primeiro).** A API de mods é uma **fronteira de estabilidade**, **não um sandbox**.
> Ela existe para o jogo não quebrar por engano, não para impedir um mod malicioso. Um mod é um arquivo `.js`
> carregado dentro do processo do servidor, com os **mesmos privilégios do servidor**: lê e apaga arquivos, abre
> rede, lê variáveis de ambiente. **Instale só mods em que você confia**, como instalaria qualquer programa.
> Dentro do seu mod, **nunca confie em dados vindos dos clientes**: o texto do chat, por exemplo, é digitado
> pelo jogador; valide o que for usar.
> Exceção opt-in: um mod com `"sandbox": true` no `mod.json` roda a lógica de servidor num processo separado e
> restrito (seção 29), com os limites e as garantias descritos lá. O código `main`/`client` de **qualquer** mod
> roda no navegador dos jogadores; o sandbox protege o **servidor**, não o navegador.

**Sumário**

- [1. O que é um mod](#1-o-que-é-um-mod)
- [2. Pasta, `mod.json` e instalação](#2-pasta-modjson-e-instalação)
- [3. `register(ctx)`](#3-registerctx)
- [4. Nomes e ordem de carga](#4-nomes-e-ordem-de-carga)
- [5. Blocos: `ctx.blocks.register(path, props)`](#5-blocos-ctxblocksregisterpath-props)
- [6. Itens e receitas](#6-itens-e-receitas)
- [7. Texturas: `ctx.textures`](#7-texturas-ctxtextures)
- [8. Ganchos (hooks) de bloco e item](#8-ganchos-hooks-de-bloco-e-item)
- [9. Eventos: `ctx.events.on(name, fn, { priority })`](#9-eventos-ctxeventsonname-fn-priority)
- [10. A API do mod: `e.world`, `e.player`, `e.server`](#10-a-api-do-mod-eworld-eplayer-eserver)
- [11. Salvamento: por nome](#11-salvamento-por-nome)
- [12. O que roda onde](#12-o-que-roda-onde)
- [13. Limites](#13-limites)
- [14. Exemplo completo](#14-exemplo-completo)
- [15. Rede: `ctx.net`](#15-rede-ctxnet)
- [16. Interface: `ctx.ui` (só no navegador)](#16-interface-ctxui-só-no-navegador)
- [17. Exemplo: a loja](#17-exemplo-a-loja)
- [18. A CLI do modkit](#18-a-cli-do-modkit)
- [19. Comandos de chat: `ctx.commands.register(name, def)`](#19-comandos-de-chat-ctxcommandsregistername-def)
- [20. Configuração: `ctx.config` e `mod.json`](#20-configuração-ctxconfig-e-modjson)
- [21. Mobs: `ctx.mobs.register(path, desc)`](#21-mobs-ctxmobsregisterpath-desc)
- [22. Geração do mundo: `ctx.worldgen`](#22-geração-do-mundo-ctxworldgen)
- [23. Sons: `ctx.sounds`](#23-sons-ctxsounds)
- [24. Recursos remotos (texturas, sons e código)](#24-recursos-remotos-texturas-sons-e-código)
- [25. Instalação por link: `/mod previa` e `/mod confirmar`](#25-instalação-por-link-mod-previa-e-mod-confirmar)
- [26. Dependências](#26-dependências)
- [27. Modpacks](#27-modpacks)
- [28. Chaves de ambiente e segurança](#28-chaves-de-ambiente-e-segurança)
- [29. Mods em sandbox (`"sandbox": true`)](#29-mods-em-sandbox-sandbox-true)
- [30. Dados persistentes: `ctx.storage` (só servidor)](#30-dados-persistentes-ctxstorage-só-servidor)
- [31. Dados por bloco: `data` no bloco (só servidor)](#31-dados-por-bloco-data-no-bloco-só-servidor)
- [32. Renderização 3D extensível (`ctx.render`, API 1)](#32-renderização-3d-extensível-ctxrender-api-1)
- [33. Runtime, escopos e tarefas (`ctx.runtime`, API 1)](#33-runtime-escopos-e-tarefas-ctxruntime-api-1)
- [34. Áudio extensível (`ctx.audio`, API 1)](#34-áudio-extensível-ctxaudio-api-1)
- [35. Salas e minigames: `ctx.rooms` (só servidor)](#35-salas-e-minigames-ctxrooms-só-servidor)
- [36. Telas com slots: `ctx.screens` (`ScreenHandlerType`, `Slot`)](#36-telas-com-slots-ctxscreens-screenhandlertype-slot)
- [37. Mais API de sala: avisos, times, mobs, loja e dano](#37-mais-api-de-sala-avisos-times-mobs-loja-e-dano)
- [38. Trocas do mercador: `ctx.trades` (`TradeSetType`)](#38-trocas-do-mercador-ctxtrades-tradesettype)
- [39. Estadias: `ctx.stays` (`StayType`, só servidor)](#39-estadias-ctxstays-staytype-só-servidor)
- [40. Primeira sessão de uma conta: `ctx.progress.firstSession` (`FirstSessionType`, só servidor)](#40-primeira-sessão-de-uma-conta-ctxprogressfirstsession-firstsessiontype-só-servidor)
- [41. Grupos: `ctx.parties` (`PartyType`, só servidor)](#41-grupos-ctxparties-partytype-só-servidor)
- [42. Vitrine da home: `ctx.showcase` (`ShowcaseSceneType`, os dois lados)](#42-vitrine-da-home-ctxshowcase-showcasescenetype-os-dois-lados)
- [43. Regras do servidor: `ctx.serverRules` (`ServerRuleType`)](#43-regras-do-servidor-ctxserverrules-serverruletype)
- [44. NPCs que vivem no mundo: `ctx.npcs`](#44-npcs-que-vivem-no-mundo-ctxnpcs)
- [45. Combate corpo a corpo como dado: `ctx.combat` (movesets)](#45-combate-corpo-a-corpo-como-dado-ctxcombat-movesets)
- [46. Gases, altitude e frio: `ctx.gases`](#46-gases-altitude-e-frio-ctxgases)
- [47. Modificadores de mundo: `ctx.modifiers` (`WorldModifierType`, `ModifierPresetType`)](#47-modificadores-de-mundo-ctxmodifiers-worldmodifiertype-modifierpresettype)

## 1. O que é um mod

Uma pasta com um `mod.json` e um arquivo JavaScript (ES module) cujo `export default` é uma classe que estende
`ModInitializer`, importada de `./mineclaude-sdk.js`. A forma antiga, uma função `register(ctx)`, continua aceita, e os
exemplos abaixo ainda a usam. O servidor chama a entrada uma vez no boot; nela o mod registra o que quer acrescentar.
Depois do boot o conteúdo fica **congelado**: não se registra mais nada em jogo.

O jogo base usa o mesmo sistema e é carregado **por último**, depois de todos os mods. Por isso o conteúdo novo dele
entra depois do dos mods (os ids numéricos salvos não se mexem) e, num empate de nome, é ele que fica com o nome.
Seu mod nunca pode ter o id `mineclaude`.

## 2. Pasta, `mod.json` e instalação

```text
meumod/
  mod.json
  main.js
  textures/
    rubi.png
```

`mod.json`:

```json
{ "id": "meumod", "name": "Meu mod", "version": "0.0.1", "main": "main.js" }
```

- `id` (obrigatório): `[a-z0-9_]+` e **igual ao nome da pasta**. Vira o prefixo de tudo (`meumod:rubi`).
- `main` (opcional, padrão `main.js`): um arquivo `.js` na pasta do mod (só o nome, sem subpastas; letras, números,
  `_`, `.` e `-`).
- `entrypoints` (opcional): divide o mod em arquivos por lado (estilo Fabric), ver **Entrypoints** logo abaixo.
- `name` é informativo; `version` (padrão `0.0.0`) entra no id dos passos de geração, a menos que haja `worldgenVersion` (ver seção 22).
- `config` (opcional): padrões de configuração do mod (seção 20).

Instalar um mod num servidor tem três caminhos:

- empacote com `modkit pack` e ponha o `.mcmod` na pasta de mods do servidor — ela é a variável de ambiente
  `MODS_DIR` (padrão `./mods`);
- dentro do jogo, `/mod previa <link>` carrega um pacote publicado para experimentar;
- a tela **Mods** do jogo.

O servidor lê uma pasta por mod antes de abrir a porta e **sai com erro** (`[mods] ERRO ao carregar mods: ...`) se
algum mod for inválido: id ruim, `main` ausente, nome duplicado, textura inexistente, receita citando item que não
existe. O navegador baixa os mods de `/mods/<id>/...` e roda o mesmo `register`. Quem instala os mods é o dono do
servidor.

Antes de instalar, `modkit check` confere as regras do servidor sem precisar do jogo.

### 2.1 Entrada única e ambiente de execução (recomendado)

O manifesto precisa apenas de `"main": "main.js"` (também é o padrão quando
`main` é omitido). O `modkit new` gera esse formato. Organize os arquivos com
imports JavaScript, sem listar cada módulo no JSON:

```js
export default async function register(ctx) {
  // Declare conteúdo comum aqui: blocos, itens, receitas, sons, geração etc.
  if (ctx.isServer()) {
    const { default: registerServer } = await import('./server/index.js');
    await registerServer(ctx);
  }
  if (ctx.isClient()) {
    const { default: registerClient } = await import('./client/index.js');
    await registerClient(ctx);
  }
}
```

- `isServer()`: processo do servidor; `isClient()`: página do navegador;
  `isWorker()`: worker de malhas. `ctx.environment` identifica os três valores.
- `ctx.side` continua existindo por compatibilidade; no worker ainda é
  `'client'`. Para código que depende de DOM, use `isClient()`.
- O worker roda o mesmo main, com o conteúdo comum. **Não coloque registros
  de conteúdo dentro das condições de ambiente.** O SDK compara nomes/ordem dos
  registros e receitas entre os três hosts para mods com código local; não é
  uma prova de equivalência de callbacks, shaders ou definições arbitrárias.
  Código remoto empacotado continua com a validação anterior, sem essa comparação.
- Imports de servidor/cliente são **dinâmicos e dentro da condição**. Um import
  estático no topo seria avaliado em todos os hosts antes de `register` executar.
- A pasta `server/` permanece privada (404). Um `if` sozinho não torna privado
  o código escrito no main ou em outro arquivo público. Helpers de servidor
  também devem morar em `server/`.
- O register pode ser async; use await nos imports e inicializadores. O loader
  só congela os registros depois da conclusão. Falha aborta o boot e não deixa
  o jogo começar com parte dos mods registrados.

### 2.2 Entrypoints por listas (`main`, `server`, `client` — compatibilidade)

O formato anterior continua aceito para mods existentes:

```json
{ "id": "meumod", "version": "0.1.0",
  "entrypoints": { "main": ["main.js"], "server": ["server/logic.js"], "client": ["client/ui.js"] } }
```

- Cada lista é opcional, mas não vazia, com até 16 arquivos `.js` dentro da pasta do mod (subpastas valem, `..` e
  caminho absoluto não). Basta ter pelo menos um arquivo em alguma lista.
- `"main": "main.js"` é o atalho de `entrypoints.main`; usar os dois ao mesmo tempo é recusado ("pick one"). Dá para
  combinar o atalho com `server`/`client`. Novos mods usam a entrada única acima.
- Ordem por mod: todos os `main` (na ordem da lista), depois os do lado atual: `server` no servidor, `client` na
  página do navegador. O Worker do mesher roda só os `main`. Todo arquivo exporta `default register(ctx)` e todos
  recebem **o mesmo `ctx`**.
- **Conteúdo só no `main`:** blocos, itens, receitas, texturas, mobs, geração do mundo e `ctx.sounds.synth`/`file`
  chamados de uma entrada `server` ou `client` derrubam o boot (`mod "x": server entry "server/logic.js" cannot call
  ctx.blocks.register: ...`): os ids têm que ser iguais nos dois lados. Comandos, eventos e `ctx.net` do servidor vão no
  `main` ou no `server`; `ctx.ui` e `ctx.net` do navegador, no `main` ou no `client`. `ctx.config` funciona em todos.
- **Privacidade:** os arquivos das entradas `server` e **tudo na pasta `server/` do mod** nunca são servidos por
  `/mods/` (404) nem aparecem em `/mods/manifest.json`. Entradas `main`/`client` não podem morar em `server/`.
  Todo o resto, inclusive o que um arquivo `main` ou `client` importa, é **público**: qualquer jogador pode ler. Atenção: um arquivo
  **fora** de `server/` continua público mesmo se só uma entrada `server` o importa (só o arquivo listado em
  `entrypoints.server` fica protegido). Recomendação: ponha **todo** o código do servidor (entradas e o que elas
  importam) dentro de `server/`. Links simbólicos que saem da pasta do mod nunca são servidos.

## 3. `register(ctx)`

```js
export default function register(ctx) {
  // ctx.id      -> "meumod"
  // ctx.side    -> 'server' ou 'client'
  // ctx.blocks, ctx.items, ctx.recipes, ctx.textures, ctx.events
}
```

`register` pode ser `async`. O `ctx` é congelado. O **mesmo código roda no servidor e no navegador**, por isso:

- `ctx.side` diz onde você está. Quase nunca precisa: `ctx.events.on` já é ignorado no navegador (a assinatura é
  checada, mas o handler só roda no servidor) e os ganchos (seção 8) só executam no servidor.
- Não use `node:*` nem `process` no `main.js`: o navegador não tem.
- Se `register` lançar erro, o boot falha e o erro cita o mod.

## 4. Nomes e ordem de carga

- Todo registro usa um *path* `[a-z0-9_]+`, **sem** `:`. O nome completo é `<id do mod>:<path>`.
- Nomes completos de itens e blocos têm a forma `mod:nome` (`[a-z0-9_]+:[a-z0-9_]+`). Receitas, `drop` e eventos
  falam em nome completo (`meumod:rubi`, `mineclaude:stone`). A API (seção 10) também aceita o nome curto de um
  item/bloco base (`stone`).
- Os mods carregam em **ordem alfabética do id**. Um mod só enxerga texturas dos mods que carregaram antes dele (e
  as do base). **Registre a textura antes do item/bloco que a usa**, no mesmo mod ou num mod anterior.
- Itens e blocos de mod ganham ids numéricos depois dos do base, na ordem de carga. **Não dependa de ids**: o jogo
  guarda mundo e inventários por nome (seção 11).

## 5. Blocos: `ctx.blocks.register(path, props)`

```js
ctx.blocks.register('bloco_rubi', {
  name: 'Bloco de rubi', solid: true, hardness: 1.5, tool: 'pickaxe',
  tiles: { top: 'meumod:bloco_rubi', side: 'meumod:bloco_rubi', bottom: 'meumod:bloco_rubi' },
});
```

Propriedades usadas pelo jogo (as mesmas que os blocos do jogo base declaram):

| Prop | Significado |
|---|---|
| `name` | nome mostrado ao jogador |
| `tiles` | `{ top, side, bottom }` (e `front` opcional): nome completo de textura registrada, ou nome curto de tile base (`'stone'`). Textura desconhecida recusa o bloco |
| `solid` | bloco sólido (colide); `noCollide` atravessável; `cutout` sólido com pixels transparentes |
| `translucent`, `doubleSided` | vidro: `{ alpha, color? }` manda o bloco para o passe misturado do terreno; `doubleSided` desenha também o lado de dentro de cada face |
| `hardness` | segundos-base para quebrar (0 = instantâneo) |
| `tool`, `minTier`, `needsTool` | ferramenta que acelera (`pickaxe`...), nível mínimo (1 madeira, 2 pedra, 3 ferro), sem ela não dropa |
| `chanceDrop` | `{ item: 'mod:item', chance }`: um item que cai só às vezes ao quebrar (um sorteio contra `chance`, de 0 a 1); as folhas e a grama alta do jogo base o usam. Sem ele, só vale o `drop` |
| `drop` | **nome completo** de item (`'meumod:rubi'`) ou `null` (nada). Omitido: dropa o próprio bloco. Item inexistente falha o boot |
| `light` | emite luz, 0 a 14 |
| `shape`, `top`, `replaceable`, `liquid` | formas especiais e comportamento, como nos blocos base |
| `onInteract`, `onBreak`, `onPlace` | ganchos (seção 8) |
| `interactive` | booleano; o loader liga sozinho quando há `onInteract` |
| `trunk` | `{ of, style, accent? }`: tronco **natural** de árvore — cubo sólido para o jogo, desenhado em 3D pelo navegador; quebrado dá `of` (5.1) |

Recusado com erro: path inválido, `props` que não é objeto, `tiles` mal formado, gancho que não é função, e as
props **reservadas** `key`, `id` e `registryName` (o loader define). Gancho de item (`onUse`) em bloco também é
recusado, e o contrário.

O jogo cria sozinho o **item** que coloca o bloco (mesmo nome completo).

### 5.1 Troncos naturais: `trunk` (o tronco 3D das árvores)

O tronco de uma árvore do mundo é um bloco **natural** à parte do tronco que o jogador constrói. Para o jogo ele é um cubo
sólido inteiro (colisão, mira, luz, física e servidor iguais ao tronco comum); só o **desenho** muda: o navegador
o desenha como um tronco 3D, escolhido pelos vizinhos de cada célula:

- **miolo** um pouco mais fino que a célula, **afinando para o topo**; colado rente a outra célula de tronco que corre ao
  lado (um tronco grosso de várias células vira uma peça só) e ligado por um **braço** a um galho ou ao
  degrau de um tronco inclinado (a palmeira, a dobra do ipê);
- **casca em relevo** nos lados abertos (placas, tiras, a espiral do ipê, os anéis da palmeira), **nó** de vez em quando,
  **musgo** (o tile `accent`) no tronco musgoso;
- no **pé** (chão embaixo): **raízes** que descem em degraus para o chão das células vizinhas abertas — desenhadas lá, sem
  colidir (o jogo só conhece o cubo);
- onde **começa a copa** (folhas ao lado): **galhos curtos** entrando nas folhas, e uma **forquilha** no topo sob a copa.

```js
ctx.blocks.register('carvalho_natural', {
  name: 'Tronco', solid: true, hidden: true, hardness: 2, tool: 'axe',
  tiles: { top: 'meumod:carvalho_top', side: 'meumod:carvalho_side', bottom: 'meumod:carvalho_top' },
  trunk: { of: 'meumod:carvalho', style: 'oak' },              // accent?: 'meumod:musgo' (manchas)
});
```

- `of`: o tronco **comum** de que este é a forma natural. É o `drop` padrão (quebrado, dá o tronco comum: construir não muda) e
  é o que o gerador troca: num gerador que pede troncos naturais (`naturalTrunks` no `ChunkGenerator`; o do jogo base pede só
  no **terreno 2**), depois de todos os estágios e passos de mod de um chunk, cada `of` que as árvores puseram vira este bloco.
  Os estágios e features continuam lendo e escrevendo o tronco comum. O terreno 1 (e todo mundo antigo) fica com os cubos,
  byte a byte; todo tronco que o jogador põe é o comum.
- `style`: `oak`, `conifer`, `ipe`, `savanna`, `palm`, `mossy`, `canopy` (raízes de escora) ou `dead` (topo quebrado).
- Exige `solid: true`; recusa `geometry`, `model`, `connections`, `states`, `shape`, `cutout`, `noCollide`, `translucent`.
  Use `hidden: true` (sem item próprio: o item é o do `of`).
- **Custo e LOD:** o tronco detalhado gasta mais quads que o cubo comum (bem mais na célula do pé, por causa das raízes).
  O detalhe só vale até 3 chunks da câmera e volta a cubo além de 4, com histerese — longe, o tronco é o cubo de sempre;
  o mundo refaz só as seções com tronco quando a distância muda. A sombra é sempre o cubo da célula. Um tronco não esconde
  a face de nenhum vizinho (o chão sob ele e as folhas ao lado continuam com as suas). `?trunkcubes` na URL desenha tudo
  como cubo, para comparar.
- O jogo base tem um tronco natural para o carvalho, e os biomas têm variantes (ipê, abeto, savana, palmeira, musgoso,
  copa, morto). O **item** do tronco comum tem um modelo 3D (`ctx.render.itemModel` num item de bloco: na mão, no
  ícone 3D e no chão).

## 6. Itens e receitas

```js
ctx.items.register('rubi', { name: 'Rubi', icon: 'meumod:rubi' });
ctx.items.register('varinha', { name: 'Varinha', icon: 'stick', stack: 1, maxDur: 100, onUse: (e) => { /* ... */ } });
```

| Prop | Significado |
|---|---|
| `name` | obrigatório, texto não vazio |
| `icon` | obrigatório: um ícone embutido (`apple`, `stick`, `gem`, `sword`... a lista de ícones embutidos do jogo) **ou** o nome de uma textura já registrada (`'meumod:rubi'`). A textura aparece chapada; registre-a **antes** do item |
| `stack` | inteiro de 1 a 64 (padrão 64) |
| `maxDur` | durabilidade máxima, inteiro positivo |
| `onUse` | gancho (seção 8) |
| `attributes` | `[{ attribute, amount, operation, slot? }]` modificadores de atributo (16.17) que valem com o item **na mão** (ou **vestido**, se for armadura) ou no `slot` pedido; ou o jeito antigo `{ speed?, attack?, defense? }` (multiplicadores 0,2..3). Os `AttributeModifiers` de item do Fabric |
| `foodEffects` | com `food`: até 4 `{ effect: 'mod:efeito', seconds, level?, chance? }` aplicados ao comer (os `statusEffects` do FoodComponent do Fabric) |
| `lore` | até 6 linhas (80 caracteres) mostradas abaixo do nome |
| `rarity` | `common` (padrão), `uncommon`, `rare` ou `epic`: rótulo no nome e borda colorida no slot |
| `onTooltip(e)` | no navegador, ao desenhar o slot: devolve linhas a mais a partir da pilha (`count`, `durability`, `maxDurability`, `components`). Equivale ao `appendTooltip` do Fabric; erro só tira essas linhas |

Props reservadas: `key`, `id`, `registryName`, `block`. Nome completo repetido é recusado.

Receitas:

```js
ctx.recipes.add({ out: 'meumod:bloco_rubi', n: 1, in: [['meumod:rubi', 9]], station: 'crafting_table' });
ctx.recipes.add({ out: 'meumod:rubi', n: 9, in: [['meumod:bloco_rubi', 1]] }); // station padrão: null (mochila)
```

**Com formato** (como o `crafting_shaped` do Minecraft): `pattern` (1 a 3 linhas de até 3 letras, `.` = casa vazia;
o espaço também vale, como no Minecraft, mas o ponto deixa ver a largura e as casas vazias)
e `legend` (`{ letra: 'mod:item' }`); os materiais saem do desenho, então `in` é opcional. Vale também o desenho
espelhado. Sem `pattern` a receita é **sem formato** (os materiais em qualquer casa). Também aceita uma classe
(`RecipeType`, `RecipeBookCategoryType` e `ItemGroupType` vêm de `./mineclaude-sdk.js`):

```js
import { RecipeType } from './mineclaude-sdk.js';

class PicaretaRubi extends RecipeType {
  key = 'picareta_rubi'; type = 'shaped'; station = 'crafting_table';
  pattern = ['RRR', '.S.', '.S.']; legend = { R: 'meumod:rubi', S: 'mineclaude:stick' };
  out = 'meumod:picareta_rubi'; n = 1;
}
ctx.recipes.add(new PicaretaRubi());
```

As receitas do jogo base são assim também: uma classe por receita.

**Livro de receitas: abas e grupos** (como o Minecraft 1.21.4: `RecipeBookCategory` é um registro, e a receita tem
`category` e `group`). As abas do jogo são `building_blocks`, `redstone`, `equipment` e `misc` (crafting), e
`furnace_food`, `furnace_blocks` e `furnace_misc` (fornalha). Um mod cria uma aba nova ou põe a receita numa das que
já existem:

```js
class Magia extends RecipeBookCategoryType { id = 'magia'; name = 'Magia'; icon = 'mineclaude:diamond'; order = 25; station = 'crafting'; }
ctx.recipes.category(new Magia());                       // -> 'meumod:magia', entre Mecanismos (20) e Equipamento (30)
ctx.recipes.add({ out: 'meumod:varinha', n: 1, in: [['mineclaude:diamond', 1]], category: 'magia', group: 'varinhas' });
ctx.recipes.add({ out: 'meumod:telha', n: 4, in: [['mineclaude:stone', 2]], category: 'mineclaude:building_blocks' });
```

**Abas do criativo** (como o `ItemGroup` do Fabric): `ctx.items.group({ id, name, icon, order })` (ou uma classe
`ItemGroupType`) registra uma aba e o item (ou o bloco) a nomeia em `group` (`group = 'magia'` é do próprio mod,
`'mineclaude:gear'` é uma aba do jogo). As abas do jogo base são `blocks`, `items` e `gear` (ordem 10, 20, 30), e ele
marca os itens dele por família. Item sem grupo não está em aba nenhuma: só a busca o acha.

```js
class Magia extends ItemGroupType { id = 'magia'; name = 'Magia'; icon = 'meumod:varinha'; order = 25; }
ctx.items.group(new Magia());              // -> 'meumod:magia'; o ícone é um item (conferido no boot)
ctx.items.register('varinha', { name: 'Varinha', icon: 'stick', group: 'magia' });
```

O id curto em `category` é do próprio mod. Receitas com o mesmo `group` viram um card só, que vai alternando entre
elas (tintas, lãs). Receita sem `category` fica fora das abas e aparece só na busca. Uma categoria que não existe, um
ícone que não é item ou uma aba repetida falham o boot.

A lista "Criar" (a tela antiga, com abas fixas `basico`, `ferramentas`, `combate`, `construcao`, `fornalha`) escolhe a aba
pelo que a receita fabrica; `craftTab: 'ferramentas'` na receita (como o balde, que não tem `tool`) pede uma aba, antes do
palpite. Outro nome é ignorado.

`out` e cada item de `in` são nomes completos; `n` e as quantidades vão de 1 a 64; `station` é `null`,
`'crafting_table'` ou `'furnace'`; `key` (opcional, `[a-z0-9_]+`) distingue duas receitas com a mesma saída. Os
nomes são resolvidos só depois que todos os itens existem, então uma receita pode citar item de mod que carrega
depois; um nome inexistente falha o boot.

### 6.1 Itens que põem um bloco: `places`

`places: 'mod:bloco'` faz o clique direito do item num bloco pôr aquele bloco (as sementes do jogo põem `mineclaude:wheat_0`).
Diferente de um item de bloco (que põe o próprio bloco), o item é outro: tem nome, textura e pilha próprios. Onde o bloco cabe é
do bloco: o `canPlaceAt` dele (o trigo só vai em terra arada). Bloco desconhecido impede o servidor de subir. O navegador prevê a
colocação (como qualquer bloco); se o `canPlaceAt` recusar no servidor, o bloco some de volta, como em toda recusa.

## 7. Texturas: `ctx.textures`

Há dois caminhos. Ambos aceitam `{ size }` em 16, 32, 64, 128 ou 256 (padrão 16).

**Pintar por código** (`paint`), sem arquivo. A função roda **só no navegador** e recebe as ferramentas do pintor:

```js
ctx.textures.paint('bloco_rubi', (t) => {
  const E = t.S - 1;                          // t.S = lado (16 por padrão, ou o size pedido)
  t.fill(['#9c1b2c', '#a81f31', '#921727']);  // cada pixel com uma cor aleatória da paleta
  t.speckle(['#d8263a', '#ff8a96'], 0.2);     // pontilhado: chance 0..1 por pixel
  for (let i = 0; i < t.S; i++) { t.set(i, 0, '#5f0f1a'); t.set(i, E, '#5f0f1a'); } // bordas
}, { size: 32 });
```

| Ferramenta | O que faz |
|---|---|
| `t.S` | lado da textura |
| `set(x, y, color, alpha = 255)` | pinta um pixel. `color` é `'#rrggbb'` ou `[r, g, b]`. Coordenadas dão a volta (`x & (S-1)`) |
| `fill(palette)` | todos os pixels, cor aleatória da paleta (array) |
| `speckle(palette, chance)` | cada pixel, com a chance dada (0..1), recebe uma cor da paleta |
| `ore(color, shade)` | fundo de pedra mais 4 aglomerados de `color` (30% usa `shade`) |
| `voronoi(n, palette, edge)` | `n` células que se repetem sem emenda, bordas em `edge` |
| `pick(array)` | elemento aleatório |
| `rand()` | aleatório determinístico em [0,1), semeado pela textura (igual em toda carga) |
| `DIRT`, `GRASS`, `STONE`, `SNOW` | paletas prontas |

**PNG** da pasta do mod (`png`): `ctx.textures.png('rubi', 'textures/rubi.png')`. O arquivo é um nome
`[a-z0-9_]+(/[a-z0-9_]+)*.png` dentro da pasta do mod (sem `..`, sem `/` inicial). A imagem deve ser **quadrada, de
16, 32, 64, 128 ou 256 px, e o `size` declarado deve ser igual** ao tamanho real. O servidor confere no boot
(arquivo existe, fica dentro da pasta, é PNG, tamanho certo) e **recusa o boot** citando mod e arquivo; o navegador
recusa a imagem decodificada de tamanho diferente do declarado.

Comportamento "faltando": se uma pintura lançar erro, ou um PNG não carregar/decodificar, o navegador mostra o
padrão de textura ausente e escreve um aviso no console. O jogo não cai.

Texturas menores são ampliadas sem suavizar até o tamanho do quadro do atlas (o maior `size` registrado, limitado
ao que a GPU aguenta; o navegador avisa se reduzir). Um mod de 256 px aumenta o atlas inteiro: use HD com
moderação. O total é no máximo 1024 texturas (as do base contam; acima de 256 o atlas vira grade quase quadrada e o
tile encolhe se passar de 4096 px). A arte do jogo base é 100% original e procedural; PNG é recurso só de mods.

## 8. Ganchos (hooks) de bloco e item

São funções nas props do bloco/item. Rodam **só no servidor**, na hora, com um evento `e`:

| Gancho | Em | Quando | Campos de `e` |
|---|---|---|---|
| `onInteract(e)` | bloco | clique direito no bloco | `pos`, `block`, `item` (o que está na mão ou `null`), `sneaking` |
| `onPlace(e)` | bloco | depois de colocado | `pos`, `block`, `item` |
| `onBreak(e)` | bloco | depois de removido | `pos`, `block` |
| `onUse(e)` | **item** | clique direito com o item na mão, num bloco ou no ar | `pos`, `block`, `item` (no ar: `pos` e `block` = `null`), `sneaking` |
| `canPlaceAt(e)` | bloco | **antes** de um jogador pôr o bloco (depois das regras do jogo e antes do evento `blockPlace`) | `pos`, `block`, `item`, `placement`, `stack` |

Todos recebem também `e.player`, `e.world` e `e.server` (seção 10). `pos` é `{x,y,z}` inteiro; `block` e `item` são
nomes completos.

`e.sneaking` é o **clique agachado**: `true` quando o jogador estava agachado no clique. Use-o para dar uma ação
rápida em vez do painel — a máquina despeja o resultado direto na mão do jogador, por exemplo, e o clique normal
abre a tela.

- **Ordem** no clique direito: evento `blockInteract` (pode cancelar) -> `onUse` do item -> `onInteract` do bloco.
- **Forma:** os ganchos de item (`onUse`, `onEaten`, `onDamage`, `onTooltip`) valem no objeto literal de `ctx.items.register('x', { ..., onUse(e) {} })` e numa classe `extends ItemType` (método `onUse`); os dois são o mesmo gancho. Ter `onUse` liga `interactive` sozinho.
- **`return 'success'`** diz "tratei" e `'fail'` recusa: nos dois casos o jogo para ali (um `onUse` que responde assim impede o
  `onInteract` do bloco). `true` ainda vale como `'success'`. Qualquer outro retorno, ou erro, continua o fluxo normal.
- `onUse` também dispara **no ar** (nada sob a mira): aí `e.block` e `e.pos` são `null` e não há `onInteract` depois.
  Vale o mesmo limite de ritmo das edições e a mesma regra de área do clique em bloco (na área do lobby, só dentro
  da sua partida); itens base nunca recebem esse clique.
- `onBreak` roda depois do bloco já ter sido removido (`e.world.getBlock(e.pos)` já dá o ar) e `onPlace` depois de
  posto. Eles não cancelam; para impedir, use os eventos `blockBreak`/`blockPlace`.
- `canPlaceAt(e)` devolve `false` para recusar (o jogo responde como a qualquer recusa: devolve o bloco e o inventário); erro
  ou valor que não é booleano também recusa (falha fechada). É síncrono e sem efeitos: serve para olhar a célula de cima
  (a porta do jogo), o chão (`world.isSolid`), a área (`player.canEdit`). O resto da peça (a metade de cima) se põe em
  `onPlace`. Em classe, `canPlaceAt` e os outros `on*`/`can*` são ganchos; qualquer outro método é auxiliar (`this`).
- O jogo base usa os mesmos ganchos: a cama (`onInteract`: `player.setSpawnPoint`), a porta (`canPlaceAt` + `onPlace` +
  `onInteract` + `onBreak`), o portão (`onInteract`), o trigo (`canPlaceAt`: só em terra arada) e, declarando
  `placement: { support: 'floor', requireHit: false }`, a tocha e as flores. O exemplo `descanso` (saco de dormir e
  alçapão) é um mod pronto que faz isso.
- **O que o navegador prevê.** O navegador só manda o clique se o bloco/item é `interactive`; os blocos do jogo base não são
  (eles têm a previsão própria pelas propriedades abaixo, que o servidor não lê). Num bloco de mod, `onInteract` liga
  `interactive`: o servidor decide e responde, e `player.resyncBlock(pos)` desfaz o que o navegador já tivesse desenhado.
  Para o navegador prever **igual ao do jogo**, o bloco declara o dado — e aí um bloco de mod com a mesma propriedade é
  previsto do mesmo jeito, sem o cliente conhecer bloco nenhum pelo nome:

  | Propriedade | O que o navegador faz com ela |
  |---|---|
  | `toggle: { to: 'mod:outro', sound?: 'mod:bloco' }` | troca para `to` na hora e toca o som de colocar de `sound` (padrão: o próprio bloco). Exige `onInteract` (quem decide é o servidor). Bloco que se emparelha para cima e para baixo (`door`) troca as duas metades e deixa o servidor desfazer; uma célula só é prevista quando o jogador não está dentro do que fecharia nele. A porta e o portão do jogo são isto |
  | `lighters: ['mod:item', ...]` | com um desses na mão, manda o clique em vez de colocar o que está na mão (o barril de pólvora com tocha ou graveto, a TNT só com o graveto). Exige `onInteract` |
  | `placement: { on: ['mod:bloco'] }` | só põe o bloco se o de baixo for um desses — a **mesma** função que o servidor usa para validar (`canPlaceWithSupport`). É como a semente do jogo vai só em terra arada. Não combina com `placement.support` |
  | `needsFloor` | quebrando o bloco de baixo, o de cima some na hora na tela (a tocha, as plantas, o trigo) |
  | `door` | ao colocar, a célula de cima tem de estar livre e recebe a outra metade |
  | a estação de criação do bloco (`ctx.screens`: `crafting.block`, `ctx.screens.station`) | o clique direito abre a mochila com a grade daquela estação (a bancada e a fornalha do jogo) |
- Um gancho que lança erro é registrado no log (`[mods] mod "id": ... threw`) e conta como "não tratei".
- Ter `onInteract` (bloco) ou `onUse` (item) liga `interactive: true` automaticamente, para o cliente enviar o clique.
- Com um item `interactive` na mão, clicar numa porta/portão **não** alterna na hora no navegador: o cliente espera o
  servidor (o `onUse` pode tratar o clique e a porta não mudar; uma previsão errada piscaria). É de propósito: a porta
  muda uma ida e volta depois (~ping). Sem item `interactive`, a porta continua prevista na hora.

## 9. Eventos: `ctx.events.on(name, fn, { priority })`

```js
ctx.events.on('chat', (e) => { e.text = e.text.replaceAll('feio', '***'); }, { priority: 10 });
```

Cada evento traz os campos da linha dele na tabela (`e.player`, `e.world` e `e.server` aparecem nos que têm jogador, mundo ou servidor: `serverStarting`, por exemplo, só traz `e.mods`, sem `e.player`, `e.world` nem `e.server`). Os **canceláveis** ganham `e.cancel()` e `e.cancelled`.

> Os eventos ampliados (ciclo de vida do servidor, dimensão, chunk, armadura, bloco-entidade, renascer) estão nas
> seções 16.23 e 16.24 deste guia. A lista de nomes e campos, assinatura por assinatura, está em
> [`ctx.events` em ctx.md](ctx.md).

| Evento | Cancelável | Campos | Editável |
|---|---|---|---|
| `blockBreak` | sim | `pos`, `block`, `drops` (`[{ item, n }]`) | `e.drops`: lista do que cairia; troque, esvazie (`[]`) ou acrescente |
| `blockPlace` | sim | `pos`, `block`, `item` | nada |
| `blockInteract` | sim | `pos`, `block`, `item` (ou `null`) | nada |
| `attackBlock` | sim | `pos`, `block`, `item` | nada — cancelar impede a quebra |
| `attackEntity` | sim | `target` (`{ mob, player }`, um dos dois `null`), `item` | nada — cancelar impede o golpe |
| `pickBlock` / `pickEntity` | sim | `pos`, `block` / `target` | nada — botão do meio |
| `useEntity` | sim | `target`, `item` | nada — clique direito em entidade, antes do `onInteract` do mob |
| `blockBreakCanceled` | não | `pos`, `block`, `item`, `reason` | nada |
| `allowHotbarChange` | sim | `from`, `to` | nada — cancelar devolve o slot |
| `playerJoin` | não | `link` (o nome que veio no link de convite, `?com=`, ou `null`) | nada |
| `playerLeave` | não | nenhum extra | nada |
| `playerStats` | não | `uuid`, `name` (a conta mostrada — pode estar OFFLINE: `/stats <nome>`), `lines` | `e.lines`: empurre texto (ou texto traduzível) e cada item vira uma linha do `/stats`, depois das do jogo (até 8). `e.player` é quem pediu |
| `matchWon` | não | `room`, `foes` (jogadores) | uma vitória de partida que contou. `e.player` é o vencedor |
| `goalCompleted` | não | `goal` (nome da meta), `when` (`de estreia`, `do dia`, `da semana`), `stat` | uma meta cumprida (a meta só conta: não paga nada) |
| `allowPartyInvite` | sim | `party` (nome completo), `target` (nome) | nada — cancelar não deixa o convite sair |
| `partyInvite` | não | `party`, `target`, `seconds`, `reason` | nada |
| `allowPartyJoin` | sim | `party`, `leader` (nome) | nada — cancelar não deixa ele entrar |
| `partyJoin` | não | `party`, `leader`, `size` | nada |
| `partyLeave` | não | `party`, `reason` (`command`, `kick`, `mod`), `by` (nome ou `null`), `over` | nada |
| `playerDeath` | não | `cause` (texto; hoje: `armadilha`, `arrow` (flecha, inclusive do esqueleto), `borda`, `boar` (javali), `cactus`, `combatlog`, `dog` (cachorro), `drown`, `explosion`, `fall`, `mod` (o `player.damage(n)` da API de mod), `mob:<nome completo>` (golpe de mob de mod, ex.: `mob:meumod:slime`), `pvp`, `spider` (aranha), `starve`, `suffocate`, `suicide`, `void`, `warden` (Guardião de Pedra), `zombie` (zumbi); a lista pode crescer), `killer` (jogador ou `null`) | nada |
| `chat` | sim | `text` | `e.text`: reescreve a mensagem |
| `allowCommand` | sim | `command`, `args` | nada — cancelar descarta o `/comando` em silêncio, antes de rodar (os do motor também) |
| `permissionRequest` | não (é **respondido**) | `node`, `default`, `player` | `e.allow()` / `e.deny()` ou devolver `true` / `false`: o primeiro que responde vence, os de trás não rodam, sem resposta vale o padrão do nó (o `PermissionEvents.ON_REQUEST` do Fabric). Não vale em sandbox |
| `mobDeath` | não | `mob` (nome completo), `pos`, `killer` (jogador ou `null`), `drops` (`[{ item, n }]`); **sem** `e.player` | `e.drops`, como no `blockBreak` |

Regras:

- **Prioridade**: `priority` numérico (padrão 0); maior roda primeiro; empate: ordem de registro (de carga).
- **`cancel()` não interrompe os outros handlers**: os seguintes ainda rodam e veem `e.cancelled === true`; não dá
  para "descancelar". Cancelar `blockBreak`/`blockPlace`/`blockInteract` devolve o bloco ao cliente. Cancelar `chat`
  descarta a mensagem em silêncio.
- **`drops`** (`blockBreak`): cada entrada é `{ item: 'mod:item', n: 1..64 }`; entradas inválidas são ignoradas e só
  as 16 primeiras valem; trocar `e.drops` por algo que não é lista (em `blockBreak` e `mobDeath`) = nada cai. No modo criativo e no bloco da sorte `drops` é ignorado.
- **`chat`**: depois dos handlers, o texto passa de novo pela limpeza do jogo (sem caracteres de controle, cortado no
  limite do chat).
- Os eventos disparam depois das regras do jogo (alcance, lobby protegido, partidas): se o jogo já recusou, o mod
  nem é consultado.
- `playerDeath` dispara quando a morte é confirmada, **antes** dos drops e da mensagem de morte. Perder um duelo ou
  partida (que não é morte de verdade) não dispara. Ao sair em combate, `playerDeath` (`combatlog`) dispara antes de
  `playerLeave`.
- `mobDeath` dispara para qualquer mob (do jogo ou de mod) que morre, depois do sorteio do saque e antes de entregá-lo; filhote chega com `drops` vazio. Mob que **some** (sol, distância, queda no vazio) não dispara: quem vê todas as saídas, com o motivo, é o `entityUnload` (16.24).
- `chat` nunca recebe comandos (`/...`): eles são tratados antes.
- Ganchos (seção 8) não têm o aviso de lentidão dos handlers de evento.
- Um handler que lança erro é registrado com o id do mod e o nome do evento, e o próximo handler roda. Um handler
  que leva mais de 50 ms é avisado uma vez no log.
- A profundidade conta **qualquer** emissão aninhada (um handler cuja ação dispara outro evento, igual ou não):
  passando de 8 níveis, o evento é ignorado com aviso.
- `ctx.events.on` só funciona dentro de `register`; depois é recusado dos dois lados. Nome de evento desconhecido,
  handler que não é função ou `priority` não numérica lançam erro.
- Os eventos de ciclo de vida do servidor, de dimensão, de chunk descarregado, de armadura, de bloco-entidade, do
  renascer e as linhas que o **servidor** manda estão na seção 16.24.
- Os eventos desta seção são **do servidor**. O navegador tem os seus (`clientTickStart`, `clientChunkLoad`,
  `allowReceiveChat`...) no mesmo `ctx.events.on`: ver a seção 16.23 e
  [`ctx.events` em ctx.md](ctx.md). Cada lado registra os seus e **ignora os do outro**, então uma entrada
  `main` registra os dois sem checar `ctx.side`.

## 10. A API do mod: `e.world`, `e.player`, `e.server`

A API fala em **nomes** e esconde os objetos internos do servidor.

**Regra geral de erros:** posição fora do mundo ou em chunk **não carregado** não é erro (`getBlock` devolve `null`,
`setBlock` devolve `false` e nada acontece; a API nunca gera chunks). Argumento ruim (nome desconhecido, coordenada
não inteira, quantidade fora do limite) **lança `Error`**: o evento/gancho registra no log com o id do mod e o jogo
segue.

`e.world`:

| Método | Resultado |
|---|---|
| `dimension()` | a dimensão em que este mundo age (`'mineclaude:overworld'`...). `ctx.dimensions.world(id)` devolve um objeto novo a cada chamada: guarde estado por mundo pela dimensão, não pelo objeto |
| `getBlock({x,y,z})` | nome completo do bloco, ou `null` fora do mundo/não carregado. Coordenadas inteiras |
| `spawnMob(pos, nome)` | cria um mob registrado (`'mod:chave'`) no chão perto de `pos` (como o `world.spawnEntity` do Fabric); devolve as informações dele ou `null` |
| `setBlock({x,y,z}, name)` | `true` se colocou, `false` se fora do mundo/não carregado. Avisa os jogadores. Nome desconhecido ou bloco interno (`mineclaude:unknown`) lança erro (de propósito: nome errado é bug do mod; fora do mundo é situação normal) |
| `explode({x,y,z}, { radius, damage, damageRadius, knockback, maxDrops, dropChance, breakBlocks, kind, cause, source })` | explosão com os números do mod: só `radius` (em (0, 8]) é obrigatório |
| `explode({x,y,z}, power)` | forma antiga: `power` em (0, 8] só **escolhe** o explosivo registrado de menor raio que o alcance (com os do jogo: barril até 3, TNT acima); não define o raio |
| `ignite({x,y,z}, player?)` | acende o bloco explosivo da célula (um bloco que declara `explosive`); devolve `{ ok }` ou `{ ok: false, reason, limit? }` |
| `growBlock({x,y,z}, name)` | como `setBlock`, mas pergunta antes ao evento `blockGrow`; `false` se um mod cancelou |
| `dropItem({x,y,z}, name, n = 1)` | solta item no chão; `n` de 1 a 2304 |
| `setBlocks([{ pos, block, properties?, expected? }])` | de 1 a 64 células de uma vez, **atômico**: é com ele que um mod ergue uma estrutura pequena (ver abaixo) |
| `fill(from, to, block)` | o paralelepípedo inteiro entre dois cantos, até **32 × 32 × 32 = 32.768 células** por chamada; devolve quantas **mudaram**. `block` é um nome ou uma função `(x, y, z) -> nome \| null` (ver 10.2) |
| `getSign({x,y,z})` / `setSign({x,y,z}, text)` | lê e escreve o **texto da placa** daquela célula (ver abaixo) |
| `chunkSigns({x,y,z})` | todas as placas do **chunk** daquela célula, como `[{ pos, text }]` |
| `chunkEdited({x,y,z})` | o chunk daquela célula já tem edição salva? (pergunte **antes** de erguer algo no mundo aberto) |
| `topBlock({x,z})` | o `y` do bloco mais alto da coluna que não é ar, ou −1 (o `getTopY(WORLD_SURFACE)` do Fabric); **lê** a coluna, então gera o chunk se preciso |

`e.player` (um objeto por jogador; dá para comparar com `===`):

| Membro | Resultado |
|---|---|
| `name`, `pos` (`{x,y,z}`), `room` | nome, posição, sala (`mundo`...) |
| `message(text)` | mensagem de sistema só para ele |
| `give(name, n = 1)` | **tudo ou nada**: `true` se coube, `false` se faltou espaço (nada é adicionado) |
| `take(name, n = 1)` | `true` se tinha e removeu, `false` se não tinha o bastante |
| `has(name, n = 1)` | booleano |
| `count(name)` | quantas unidades do item ele tem no inventário (armadura e mão secundária não contam) |
| `heldItem()` | nome completo do item na mão, ou `null` |
| `teleport({x,y,z})` | coordenadas finitas, y ≥ 0 (o mundo não tem altura fixa; só a trava numérica `e.world.buildLimit` = 2²⁴) |
| `damage(n)` | dano, número em (0, 20] (causa `mod`) |

`e.server`: `broadcast(text)` (mensagem para todos), `players()` (lista dos jogadores online, no mesmo formato de
`e.player`) e o **relógio de calendário** do servidor: `clock()` é o instante (ms) pelo qual se decide o DIA e a
SEMANA de tudo o que vira sozinho (os escopos de `ctx.progress.stat`, o período de uma meta) e `day` é a chave de dia
dele (`'AAAA-MM-DD'`). É `Date.now()` mais o deslocamento do servidor — um servidor de teste pode **andar** com ele —,
então quem vira com o dia pergunta aqui em vez de ler o relógio da máquina.

`e.world` também responde **o que é deste mundo**: `seed` (a semente, o `getSeed()` do Fabric: inteiro de 32 bits, o
mesmo em toda a vida do mundo) e `spawn` (o nascimento, `{ x, y, z }`). Com a semente e o `seededRandom` do SDK um mod
sorteia o que tem de ser **igual neste mundo e diferente em outro** sem guardar nada: é assim que o Marco do Dia do
jogo base acha o ponto de hoje (`seededRandom('marco:' + e.world.seed + ':' + e.server.day)`).

### 10.1 Erguer uma estrutura pequena e escrever uma placa

Um mod não precisa pedir ao motor que construa nada: ele escolhe o lugar, ergue a estrutura e escreve o que está
escrito na placa. Foi assim que o Marco do Dia do jogo base saiu do motor e virou conteúdo de mod.

```js
const { x, z } = alvo;
if (e.world.chunkEdited({ x, y: 0, z })) return;      // o chunk já tem construção de alguém: escolha outro lugar
const topo = e.world.topBlock({ x, z });              // o bloco mais alto que não é ar, em QUALQUER altura (gera o chunk se preciso)
// o mundo não tem altura fixa: e.world.minY (0), e.world.generatedTop (96: até onde o gerador preenche),
// e.world.buildLimit (2^24, trava numérica). O antigo WORLD_HEIGHT continua exportado valendo 96, mas está obsoleto.
const yPlaca = topo + 12;
const cells = [];
for (let y = topo + 1; y < yPlaca; y++) cells.push({ pos: { x, y, z }, block: 'meumod:coluna' });
cells.push({ pos: { x, y: yPlaca, z }, block: 'mineclaude:sign' });
if (!e.world.setBlocks(cells)) return;                 // atômico: ou todas as células, ou nenhuma
e.world.setSign({ x, y: yPlaca, z }, 'Aqui é o meu lugar');
```

- `setSign` só escreve na célula que tem um bloco que **declara `sign`** (no jogo base, o `mineclaude:sign`): é o
  papel do bloco, não um nome que o motor conhece. Sem placa ali devolve `false` — não é erro.
- `setSign(pos, null)` esquece o texto; escrever o **mesmo** texto devolve `false` (nada muda, ninguém é avisado).
  O texto é cortado em 48 caracteres, o que o mundo salvo guarda, e vale o teto de 256 placas por chunk (passou, `false`).
- Quem escreve é avisado: todo jogador por perto recebe a placa nova na hora, como se um jogador a tivesse escrito.
- `chunkSigns` é como o mod **reencontra** a estrutura num boot seguinte (a placa dele, num `y` que ele não guardou)
  sem ler as 128 células da coluna.
- O que a estrutura ocupa é por conta do mod: o `setBlocks` não pergunta a ninguém se a célula era de alguém. Para
  não estragar construção de jogador, use o `chunkEdited` antes (é o que o Marco do Dia faz: candidato com edição
  salva passa a vez para o seguinte).

### 10.2 Erguer um LUGAR: `fill` no mundo aberto

O `setBlocks` é atômico e por isso para em 64 células — é a medida de uma estrutura pequena. Um **lugar** (um salão, uma
praça, uma caixa de ar limpa) tem milhares, e quem faz isso é o `fill`, o gêmeo no mundo aberto do `room.world.fill`
que as salas já tinham:

```js
// o lobby do jogo base, como ele é hoje
const n = e.world.fill({ x: cx - R, y: Y - 6, z: cz - R }, { x: cx + R, y: Y + 5, z: cz + R }, (x, y, z) => {
  const borda = Math.abs(x - cx) === R || Math.abs(z - cz) === R;
  if (y === Y) return x === cx && z === cz ? 'claude' : borda ? 'stone' : (x + z) % 2 ? 'planks' : 'bricks';
  if (borda && (y === Y + 1 || y === Y + 2)) return 'glass';
  return 'air';                        // o resto da caixa fica limpo
});
```

- **Duas formas.** `fill(a, b, 'stone')` é a caixa toda de um bloco; `fill(a, b, (x, y, z) => ...)` é um desenho **com
  padrão** numa chamada só, e `null`/`undefined` na função **deixa a célula como está**. A forma com função roda no
  processo do servidor e **não vale num mod em sandbox** (uma função não atravessa): lá use a forma com nome.
- **Teto por chamada:** 32.768 células (32 × 32 × 32). Caixa maior é recusada com erro dizendo o número — fatiar é do
  mod, e é de propósito: ninguém escreve meio mundo sem perceber.
- **Só o que mudou vai aos jogadores**, numa mensagem só. Uma caixa de 7.500 células quase toda de ar que já era ar não
  manda nada e devolve 0.
- Não é atômico (ao contrário do `setBlocks`): se um nome estiver errado, o erro sai na primeira célula que o cita e o
  que já foi escrito fica escrito. Nome desconhecido, bloco interno do motor, canto que não é célula inteira e `y` fora
  do mundo lançam erro.
- **Lê e escreve a coluna**, então gera os chunks que toca (como o `topBlock`) — é o que deixa um mod erguer no
  `worldLoad`, antes de qualquer jogador entrar.
- O lugar é por conta do mod: pergunte ao `chunkEdited` antes se ele pode cair sobre construção de alguém.

Quando erguer? O lobby do jogo base usa o **`worldLoad`** do Overworld, e não o `serverStarted`: o motor emite o
`worldLoad` antes de instalar as salas de mod, que põem arenas, placas e placar **dentro** do lobby. No
`serverStarted` a camada de ar do desenho apagaria o que elas acabaram de pôr. E, como num `worldLoad` a ordem é
prioridade maior primeiro e depois ordem de carga — com o jogo base rodando **depois** de todo mod —, um
mod que queira desenhar **por cima** do lobby põe o gancho dele com prioridade negativa.

Limites: `n` de itens 1..2304 (um inventário cheio de pilhas de 64), `power` até 8, `damage` até 20. Fora da API
(arquivos, rede, `process`...) o seu JavaScript continua podendo tudo; isso é responsabilidade sua (veja o aviso de
segurança no topo).

## 11. Salvamento: por nome

Blocos de mod vão para o `world.json` pelo **nome** (`meumod:bloco_rubi`) e itens de mod para o `players.json` (e
baús) por nome; os ids numéricos mudam quando entra outro mod ou o jogo ganha um bloco. Se você **remover um mod**,
o que era dele não se perde: o bloco vira `mineclaude:unknown` (um bloco que lembra o nome original) e o item vira
`mineclaude:unknown_item` (guardando o nome e a durabilidade). Reinstalando o mod, tudo volta. Esses blocos internos
não podem ser colocados por mods. Por isso, renomear o `id` do mod ou de um bloco **rompe** o vínculo: trate nomes
como definitivos depois de publicar.

### 11.1 O que o servidor confere com o navegador: registros sincronizados

O que viaja pela rede por **id** (o índice de um registro: o `ptc` de uma partícula, o `effects` de um efeito, o `snd`
de um som, a capa que a conta salva) só quer dizer a mesma coisa nos dois lados se o servidor e o navegador têm **os
mesmos nomes, na mesma ordem**. Um mod que só o servidor tem desloca todos os ids depois dele, e o jogo desenharia,
soaria e salvaria errado, sem avisar. É o que o Fabric chama de `RegistryAttribute.SYNCED`/`RegistrySyncManager`; aqui o
mecanismo é um só:

- Um registro **declara** que é sincronizado quando é criado, e os dois lados carregam a mesma lista de registros
  sincronizados.
- A mensagem de entrada (`welcome`) leva `sync` = `{ registro: selo }`, **um selo por registro**
  (`"<quantos>.<hash dos nomes em ordem>"`, ~12 bytes), no lugar das listas de nomes.
- O navegador compara cada selo com o que carregou. Se algum difere, ele pede os **nomes** só dos registros que
  divergiram (mensagem `registros`), recusa o login e diz qual registro e qual id: *"Versão diferente do servidor
  (registro "effect", id 0: servidor "meumod:brisa", navegador vazio). Recarregue a página (Ctrl+F5)."*. A vitrine da
  home confere os mesmos selos e, se divergirem, fica desligada.
- Ficam sincronizados: `block`, `item`, `mob`, `sound`, `effect`, `particle`, `projectile`, `enchantment`, `damage_type`,
  `attribute`, `weather`, `cape`, `fluid`, `movement_mode`, `movement_profile` (com os números), `zone`, `dimension`,
  `worldgen` e `biome` (só num mundo de biomas de mod). Os que só existem de um lado (receitas, loot, ajuda, regras do
  servidor, estatísticas, ícones, texturas) não entram.

Para o autor de mod nada muda: registrar bloco, efeito, capa ou zona continua igual. O que muda é que **servidor e
navegador precisam ter os mesmos mods** — instalar o `.mcmod` no servidor já garante isso, porque o navegador baixa os
mods do próprio servidor. Um mod só de um lado é recusado no login, com o nome do registro, em vez de funcionar torto.

## 12. O que roda onde

| | Servidor | Navegador |
|---|---|---|
| `register(ctx)` | sim | sim (mesmo código) |
| `blocks/items/recipes/textures` | registra | registra |
| `textures.paint` (a função) | só guarda o nome | executa a pintura |
| `textures.png` | confere o arquivo no boot | baixa e decodifica |
| `events.on` | handlers rodam aqui | assinatura checada, handler ignorado |
| ganchos `onInteract/onBreak/onPlace/onUse`, `onHit/onDeath` de mob | rodam aqui | nunca rodam |
| API `world/player/server` | sim | não existe |
| `ctx.net` (seção 15) | `on(ch, (player, d))`, `send(player, ch, d)`, `broadcast`, `channel`, `canSend(player, ch)` | `on(ch, (d))`, `send(ch, d)`, `channel` |
| `ctx.server` (seção 15.3) | `players`, `playersNear`, `playersTracking` | lança erro |
| `ctx.attachments` (seção 15.4) | `register` + `get/set/modify/delete/has/onSet` | `register` + `get/has/onSet` (só leitura) |
| `ctx.ui` (seção 16) | lança erro | painel e linha de HUD |
| `ctx.sounds.synth/file` (seção 23) | guarda o nome; confere o arquivo no boot | toca; baixa e decodifica o arquivo |
| `ctx.sounds.play` | lança erro (use `e.player.playSound`) | toca (som de interface) |

## 13. Limites

| Coisa | Limite |
|---|---|
| id de mod, path | `[a-z0-9_]+` (`mineclaude` é reservado) |
| nome completo | `[a-z0-9_]+:[a-z0-9_]+` |
| blocos (base + mods) | 4096 no total (ids acima de 255 funcionam; o item de um bloco com id >= 256 ganha outro id de item) |
| texturas no atlas | 1024 no total |
| tamanhos de textura | 16, 32, 64, 128, 256 (quadradas) |
| `stack` de item | 1 a 64 |
| `maxDur` | 1 a 1.000.000 |
| quantidade em receita | 1 a 64 |
| itens em `e.drops` | 16 entradas, `n` 1 a 64 |
| `n` em `give/take/has/dropItem` | 1 a 2304 |
| `explode` (`radius` ou `power`) / `damage` | até 8 / até 20 |
| eventos aninhados | 8 níveis |
| aviso de lentidão | handler > 50 ms (uma vez) |
| canal de `ctx.net` | `[a-z0-9_]{1,32}` |
| dados de `ctx.net` | 4 KB de JSON, 16 níveis, sem chave `__proto__` |
| saída de `ctx.net` (servidor) | 32 KB/s por mod por jogador; o excesso é descartado |
| mensagens `mod` do cliente | 20/s por jogador, rajada de 40 (o excesso é descartado) |
| canais tipados (`ctx.net.channel`) | 32 por mod; `version` 1..65535; `maxBytes` 1..4096; `rate` (0, 100] msg/s por jogador |
| anexos (`ctx.attachments`) | 32 por mod; 8 KB por valor; 64 KB por mod por conta e 64 KB por mod no mundo; 8 ouvintes de `onSet` |
| esquema de valor (canal e anexo) | 8 níveis, 32 campos por nível, 256 itens por lista, 4096 caracteres por texto; `any`: 512 valores |
| elementos por painel | 200 (filhos de `row` contam), `row` aninhado até 4 |
| texto em painel/HUD | 2000 caracteres por string |
| som sintetizado | 1 a 8 camadas; `freq`/`end` 40–4000 Hz, `dur` 0.01–2 s, `gain` 0–0.5, `delay` 0–1 s, `q` 0.1–20 |
| arquivo de som | `.ogg`/`.mp3`/`.wav`, até 256 KB; toca no máximo 4 s |
| sons recebidos | 20 por segundo por jogador (o excesso é descartado); raio de `server.playSound` até 32 |

## 14. Exemplo completo

Um mod `rubis` com bloco, item, receitas, lâmpada que liga e desliga, varinha e eventos. Pasta `rubis/` com
`mod.json` (`{ "id": "rubis", "main": "main.js" }`), `main.js` e `textures/rubi.png` (16x16).

```js
// rubis/main.js
export default function register(ctx) {
  // --- texturas (antes dos blocos/itens que as usam)
  ctx.textures.png('rubi', 'textures/rubi.png');
  ctx.textures.paint('bloco_rubi', (t) => {
    const E = t.S - 1;
    t.fill(['#9c1b2c', '#a81f31', '#921727']);
    t.speckle(['#d8263a', '#ff8a96'], 0.2);
    for (let i = 0; i < t.S; i++) { t.set(i, 0, '#5f0f1a'); t.set(i, E, '#5f0f1a'); t.set(0, i, '#5f0f1a'); t.set(E, i, '#5f0f1a'); }
  }, { size: 32 });
  const lampada = (acesa) => (t) => {
    t.fill(acesa ? ['#ffd36b', '#ffe08a'] : ['#5a2a30', '#4e242a']);
    for (let i = 5; i < 11; i++) for (let j = 5; j < 11; j++) t.set(i, j, acesa ? '#fff4c8' : '#9c1b2c');
  };
  ctx.textures.paint('lampada', lampada(false));
  ctx.textures.paint('lampada_acesa', lampada(true));
  ctx.textures.paint('varinha', (t) => {
    for (let i = 3; i < 13; i++) t.set(i, 15 - i, '#6b4a2b');
    for (const [x, y] of [[12, 2], [13, 2], [12, 3]]) t.set(x, y, '#e84a5c');
  });

  // --- itens e receitas
  ctx.items.register('rubi', { name: 'Rubi', icon: 'rubis:rubi' });
  ctx.recipes.add({ out: 'rubis:bloco_rubi', n: 1, in: [['rubis:rubi', 9]], station: 'crafting_table' });
  ctx.recipes.add({ out: 'rubis:rubi', n: 9, in: [['rubis:bloco_rubi', 1]] });

  // --- blocos
  const face = (n) => ({ top: `rubis:${n}`, side: `rubis:${n}`, bottom: `rubis:${n}` });
  ctx.blocks.register('bloco_rubi', { name: 'Bloco de rubi', solid: true, hardness: 1.5, tool: 'pickaxe', tiles: face('bloco_rubi') });
  const troca = (para) => (e) => { e.world.setBlock(e.pos, para); return true; }; // true: tratei, nada mais acontece
  ctx.blocks.register('lampada', {
    name: 'Lâmpada de rubi', solid: true, hardness: 0.3, tiles: face('lampada'),
    onInteract: troca('rubis:lampada_acesa'),
    onPlace: (e) => e.player.message('Lâmpada colocada!'),
  });
  ctx.blocks.register('lampada_acesa', {
    name: 'Lâmpada acesa', solid: true, hardness: 0.3, light: 12, tiles: face('lampada_acesa'),
    drop: 'rubis:rubi', // quebrar solta um rubi
    onInteract: troca('rubis:lampada'),
  });

  // --- item com gancho: varinha
  ctx.items.register('varinha', {
    name: 'Varinha de rubi', icon: 'rubis:varinha', stack: 1,
    onUse: (e) => { e.player.message(`A varinha tocou em ${e.block}`); return true; },
  });

  // --- eventos
  ctx.events.on('playerJoin', (e) => e.player.message(`Bem-vindo, ${e.player.name}!`));
  ctx.events.on('blockBreak', (e) => {
    if (e.block === 'mineclaude:bricks') e.cancel();                              // tijolos não quebram
    if (e.block === 'mineclaude:stone') e.drops = [{ item: 'rubis:rubi', n: 1 }]; // pedra solta rubi
  });
  ctx.events.on('chat', (e) => {
    if (e.text.includes('segredo')) return e.cancel();    // some em silêncio
    e.text = e.text.replaceAll('feio', '***');
  });
}
```

## 15. Rede: `ctx.net`

Cada mod tem o seu canal entre servidor e navegador. A mensagem viaja como `{ t: 'mod', ns, ch, d }`; `ns` é
**sempre** o id do seu mod (você não fala no canal de outro mod) e `ch` é o nome do canal que você escolhe.

| Lado | Método | O que faz |
|---|---|---|
| servidor | `ctx.net.on(ch, (player, data) => {})` | recebe do navegador; `player` é o mesmo objeto de `e.player` |
| servidor | `ctx.net.send(player, ch, data)` | manda para um jogador |
| servidor | `ctx.net.broadcast(ch, data)` | manda para todos os jogadores (bots não) |
| navegador | `ctx.net.on(ch, (data) => {})` | recebe do servidor |
| navegador | `ctx.net.send(ch, data)` | manda para o servidor |

- `on` só dentro de `register(ctx)`; depois disso lança erro. Vários `on` no mesmo canal rodam todos, na ordem.
- `data` é qualquer valor JSON (objeto, número, texto, lista, `null`); sem `data` chega `null`. Limites: **4 KB** de
  JSON, 16 níveis de aninhamento, nenhuma chave `__proto__`, nada circular. `send` com dado fora disso **lança**.
- Canal: `[a-z0-9_]{1,32}`. Canal inválido lança no `on`/`send`; mensagem do cliente com canal inválido, de outro mod
  ou sem handler é ignorada (o servidor registra uma vez por canal).
- No navegador, `ctx.net.send` **antes do login** (ou depois de cair a conexão) **lança** `not connected`: não há
  fila. Mande a partir de algo que o servidor disparou ou de um clique.
- O servidor aceita do cliente **20 mensagens `mod` por segundo, rajada de 40**, por jogador; o excesso é descartado
  em silêncio (uma linha de log por minuto), sem derrubar o jogador.
- Handler que lança erro é registrado (`[mods] mod "id": net handler of "ch" threw`) e o jogo segue.

### 15.1 Segurança da rede

- **Nunca confie no que vem do cliente.** Qualquer jogador pode mandar qualquer `{ t: 'mod' }` à mão, com qualquer
  `data`. Confira tipo, faixa e permissão **no servidor** antes de agir (numa loja, por exemplo, o índice da oferta é
  checado com `Number.isInteger` e a faixa, e o preço é cobrado no servidor; o cliente só pede).
- O navegador só mostra; quem decide é o servidor. Não mande segredos para o cliente.
- **Orçamento de saída:** cada mod pode mandar até **32 KB/s por jogador** (`send` e `broadcast` somados; uma
  rajada de até 32 KB, contados em bytes UTF-8; uma mensagem sozinha tem no máximo 4 KB, então nunca é recusada
  sozinha). O que passar disso é **descartado em silêncio** (o servidor escreve uma linha de log por mod
  por minuto). Não faça `broadcast` a cada tick nem um para cada mensagem recebida.
- Os handlers do mesmo canal recebem o **mesmo** objeto `data` (uma cópia só): não o altere se houver outro handler.

### 15.2 Canal tipado, versão e `canSend`: `ctx.net.channel`

`ctx.net.channel(nome, { version, schema, direction, maxBytes, rate, bulk, bytesPerSecond })` declara o canal **uma vez** e põe o contrato
nos dois hosts: o payload é validado pelo esquema **antes** de chegar ao mod (o que não bate é recusado, com uma
linha de log por canal por minuto nomeando o mod), a **versão** é negociada na entrada (`chans` no `hello`,
`modChannels` no `welcome`), `ctx.net.canSend(player, canal)` e `ctx.client.net.canSend(canal)` dizem se o outro
lado tem o canal compatível, e `onOpen`/`onClose` avisam quando há (e deixou de haver) outro lado.
`ctx.net.channelsOf(player)` devolve a lista `[{ name, version }]` dos canais que o navegador **daquele** jogador
declarou (o `getSendable`/`getReceived` do Fabric; `ctx.client.net.channels()` é o par do navegador).
`ctx.net.on`/`send`/`broadcast` continuam valendo e passam pela mesma validação num canal declarado.
Assinaturas completas em [`ctx.net` em ctx.md](ctx.md).

Um campo do esquema pode ser **bytes** (`{ type: 'bytes', maxBytes }`): o mod dá e recebe `Uint8Array` e o campo
viaja em base64 dentro do mesmo JSON. E `bulk: true` é a **faixa de alto volume**: o canal sai do balde global de 20
mensagens por segundo por jogador e paga o `rate` e o `bytesPerSecond` que declarou, por jogador e por sentido (o
anti-flood da conexão, 80 msg/s somando tudo, **continua valendo** — um mod de alto volume agrupa).

### 15.3 Quem está perto, quem está vendo: `ctx.server` (só no servidor)

`ctx.server.players()`, `ctx.server.playersNear(alvo, raio)` e `ctx.server.playersTracking(alvo)` são o
`PlayerLookup` do Fabric: as mesmas três respostas que o motor usa para decidir o que manda. O alvo é uma posição,
qualquer coisa com `pos` (`e.player`, `e.mob`), `{ mob: id }` ou `{ chunk: { x, z } }`. Assinaturas em
[`ctx.server` em ctx.md](ctx.md).

### 15.4 Um valor pregado em algo do jogo: `ctx.attachments`

`ctx.attachments.register(path, { default, persistent, sync, schema, codec })` é o `AttachmentRegistry` do Fabric:
um valor com nome anexado a um **jogador**, a uma **conta offline** (pelo uuid), a um **mob**, a um **chunk** ou a um
**bloco de qualquer mod** — com `get` / `set` / `modify` (atômico) / `delete` / `has` e `onSet`. `persistent: true`
entra no save do alvo (a conta, o `world.json`) e `sync: true` manda o valor ao navegador do dono (ou a quem vê a
entidade) **sem o mod escrever rede**; no navegador o mesmo anexo é só leitura. Quotas iguais às do `ctx.storage`.
Assinaturas em [`ctx.attachments` em ctx.md](ctx.md).

## 16. Interface: `ctx.ui` (só no navegador)

No servidor `ctx.ui.panel`/`ctx.ui.hud` lançam erro: teste `ctx.side === 'client'` antes. Tudo é desenhado com
**texto puro** (`textContent`, nunca HTML): um nome `<script>alert(1)</script>` aparece escrito, não roda.

**Painel:** `const h = ctx.ui.panel({ title, body })` devolve um controle:

| Membro | O que faz |
|---|---|
| `h.open()` | mostra o painel no centro e solta o mouse. Só um painel de mod por vez: abrir outro fecha o anterior |
| `h.close()` | fecha (nada acontece se não for o painel aberto) |
| `h.update(body)` | troca o corpo; se estiver aberto, redesenha mantendo o que foi digitado nos campos |
| `h.isOpen` | se está aberto agora |

`body` é uma lista de elementos, cada um com **uma** chave de tipo:

| Elemento | Mostra |
|---|---|
| `{ text }` | um parágrafo de texto |
| `{ button, onClick(values) }` | botão; `values` = `{ idDoCampo: texto }` de todos os campos do painel |
| `{ input: true, id, placeholder, value }` | campo de texto (`id` `[a-z0-9_]{1,32}`, único no painel) |
| `{ row: [...] }` | elementos lado a lado (aninha até 4) |
| `{ item: 'mod:item', n }` | ícone do item (32 px) com a quantidade (`n` de 0 a 1e9; 1 não aparece) |

- Limites: 200 elementos por painel (os de dentro de `row` contam), 2000 caracteres por texto. Elemento desconhecido
  ou fora do limite lança erro com o id do mod. Um `onClick` que lança vira `console.warn` e o painel segue.
- **Ciclo de vida:** `open()` durante o `register` lança (o jogo ainda não começou) e, fora do jogo (no menu ou
  morto), **não abre** (só um aviso no console). O painel fecha sozinho com **Esc**, o botão **Fechar** ou um clique
  fora dele, e também ao morrer, ao cair para o menu ou quando o jogo abre outra tela (chat, inventário, troca, loja,
  pausa...). Ao fechar, o mouse volta ao jogo.

**Linha de HUD:** `const l = ctx.ui.hud({ id, text, corner })` (`corner`: `top-right` (padrão), `top-left` ou
`bottom-right`) põe uma linha de texto no canto da tela; o mesmo `id` de novo substitui a linha. `l.set(text)` troca
o texto e `l.remove()` tira.

### 16.1 `ctx.ui.gui`: a camada de GUI do jogo (pixel art)

O HUD do jogo é desenhado num canvas sobre o 3D, em pixels inteiros (escala 1×–4×). Um mod desenha **no mesmo lugar e do
mesmo jeito** — o próprio HUD do jogo é conteúdo do mod base (uma classe por peça, uma por ícone e a fonte), registrado
pelo `main.js` dele por este mesmo caminho; o motor só desenha o que está registrado:

- `ctx.ui.gui.layer(nome, { draw(ctx, frame), priority?, animates?() })`: camada depois do HUD (maior prioridade por
  cima). `frame = { scale, width, height, time, font: { drawText, textWidth }, itemIcon(id) }`. Até 16 por mod; a que
  lança é desligada (uma linha no log).
- `ctx.ui.gui.hudPart(id, draw)`: troca uma peça do HUD — `hotbar`, `health`, `food`, `armor`, `air`, `xp`, `effects`,
  `itemName` (um tema). `frame.hud = { state, layout, drawStack }` traz o estado e onde o jogo desenha. É o mesmo que
  `gui.hud.replace` (abaixo): vários mods formam cadeia, e se a sua lançar, o jogo volta a desenhar a de baixo.

#### 16.1.1 O HUD é uma lista ordenada de peças com nome: `ctx.ui.gui.hud`

Como o `HudElementRegistry`/`VanillaHudElements` do Fabric. **O motor não tem HUD nenhum**: o mod base registra, em
ordem de desenho, cada peça que o jogador vê, e um mod alcança qualquer uma pelo id:

| Chamada | O que faz |
|---|---|
| `hud.add(nome, draw, opts?)` | peça nova **por cima de tudo**. O id vira `seumod:nome` |
| `hud.addFirst(nome, draw, opts?)` | peça nova **debaixo de tudo** |
| `hud.addBefore(ancora, nome, draw, opts?)` | peça nova logo **antes** de `ancora` (de qualquer mod, ou do jogo) |
| `hud.addAfter(ancora, nome, draw, opts?)` | peça nova logo **depois** |
| `hud.replace(id, draw, opts?)` | desenha no lugar da peça; a de baixo continua em `frame.previous` |
| `hud.remove(id)` | tira a peça do HUD |
| `hud.ids()` | os ids na ordem de desenho |

Os ids do jogo, em ordem: `miscOverlays`, `crosshair`, `breakBar`, `blockName`, `hotbar`, `xp`, `effects`, `health`,
`food`, `armor`, `air`, `itemName`, `modeBadge`, `zoneTitle`, `bigTitle`, `voteBar`, `gamesBanner`, `shopHud`,
`debug`, `online`, `chat`, `playerList`.

As oito do meio (`hotbar` até `itemName`) são desenhadas na camada de GUI; as outras ainda são um nó HTML montado pelo
motor, e algumas têm os dois lados (a barra rápida, os corações, a fome, a armadura e o ar). **No celular o HUD inteiro
é o lado HTML** (a camada de lá desenha só as telas e os menus), então `ctx.ui.gui.layer` e as peças de HUD registradas
não aparecem no telefone; `ctx.ui.dom` e `ctx.ui.hud` aparecem. Tirar uma esconde os **dois** lados: um mod que faz
`hud.remove('chat')` tira o chat que o jogador vê, com `?domui` e no celular também. Só o jogo aponta nó HTML; um mod
desenha na camada de GUI ou usa `ctx.ui.dom`.

A camada de GUI **só se redesenha quando algo a suja**. Uma peça que muda sozinha (um relógio, um nível de microfone,
o indicador de quem está falando) diz isso com `animates` em `opts` — o mesmo `animates` de `ctx.ui.gui.layer`. Sem
ele a peça só aparece quando outra coisa qualquer manda redesenhar, que é não aparecer. Devolva `true` **também no
quadro em que ela acabou de sumir**, senão o que estava desenhado fica na tela.

```js
// um relógio entre a barra rápida e a barra de XP
ctx.ui.gui.hud.addAfter('hotbar', 'relogio', (c, f) => {
  const { x0, y0, px } = f.hud.layout;
  f.font.drawText(c, new Date().toLocaleTimeString(), x0, y0 - 11 * px, { px, color: '#ffffff' });
}, { animates: () => true }); // o relógio muda sozinho: peça o quadro
// a vida com uma barra em cima dos corações do jogo (previous desenha os corações)
ctx.ui.gui.hud.replace('health', (c, f) => { f.previous?.(c, f); minhaBarra(c, f); });
ctx.ui.gui.hud.remove('online'); // some com o contador de quem está online
```

**Vários mods na mesma peça** não lançam: formam uma **cadeia**. Ganha a de maior `priority` (-1000 a 1000; o jogo
base registra em -1000) e, no empate, a **última** registrada; ela alcança a de baixo por `frame.previous`, então dá
para embrulhar em vez de refazer. `opts.exclusive: true` toma a vaga para o seu mod — ninguém registra nela depois, e
não dá para tomar se outro mod já registrou. O mesmo vale para `ctx.ui.gui.screen` e `ctx.ui.gui.hudLayout`
(o segundo argumento do `hudLayout` é o layout de baixo).

A âncora é guardada **pelo nome** e resolvida só na leitura: o `main.js` do jogo base roda **depois** de todo mod
(os ids salvos dele não podem mexer), então quando o seu `addAfter('hotbar', ...)` roda a peça ainda não existe —
e tudo bem. Âncora (ou `replace`/`remove`) de uma peça que nunca apareceu derruba o boot no fim da carga, com o nome
do seu mod.
- `ctx.ui.gui.font({ glyphs: { A: ['#..', ...7 linhas] } })`: glifos da fonte pixel (7 linhas de `#`/`.`, largura 1..8).
- `ctx.ui.gui.icon('heart' | 'food' | 'armor' | 'air', { rows: 9 × 9, colors: { '#', o, h } })`: os ícones de status.

- `ctx.ui.gui.screen(id, { draw, onPointer?, onKey?, onOpen?, onClose? })`: uma **tela** na mesma camada (o inventário do
  jogo é uma tela registrada pelo mod base, como qualquer outra). Enquanto aberta, o canvas pega o mouse. `frame.ui` traz
  os componentes em pixel (`panel`, `inset`, `slot` com ícone/contagem/durabilidade/tooltip, `button`, `arrow`, `text`,
  `tooltip`, `input` — um campo HTML por cima, para busca —, `list`, `textField`, `hit` e `center`); cada componente
  deixa uma região, e o clique chega ao `onPointer` com a região sob o cursor. `frame.data` é o que o jogo passou ao
  abrir. Vários mods no mesmo id formam cadeia (como as peças do HUD): o de cima desenha e alcança o de baixo por
  `frame.previous` / `e.previous`. `onKey({ code, key, shift, ctrl, action, region })` recebe a tecla, a ação a que o
  jogador a ligou (`inventory`, `drop`...) e a região sob o cursor (para "1-9 sobre uma casa"); devolve `true` se tratou.

#### 16.1.2 Os menus do jogo e as páginas da pausa: `ctx.ui.gui.menu` e `ctx.ui.gui.pausePage`

Os seis menus que o **motor hospeda** (`entry`, `pause`, `options`, `death`, `shop`, `trade`) são **registrados pelo mod
base**, não embutidos no motor: deles o motor tem os nós de HTML e o trabalho de DOM (o `host` de cada menu) e pergunta
ao registro quem conduz.

**E o registro é aberto a ids NOVOS:** esses seis não são a lista toda. Um mod (e o mod base) registra uma **tela nova
com id próprio**, e ela entra na mesma cadeia e responde aos mesmos ganchos.

- `ctx.ui.gui.menu(id, { kind?, open?, close?, render?, onKey?, draw?, onPointer?, dom?, title? }, { priority?, exclusive? })` —
  a mesma cadeia do `gui.screen`: o de maior `priority` ganha, o empate vai para o último registrado, o mod base fica em
  `-1000` e `e.previous` alcança o de baixo (um mod **embrulha** a tela de morte em vez de jogá-la fora).
  O `id` é **um dos seis do motor** ou **um nome seu** — e aí o id vira `seumod:nome` (o do mod base fica sem prefixo,
  como uma página da pausa). Uma tela nova **tem de se desenhar**: ou `draw` (pixel) ou `dom` (HTML); ela não tem nó nem
  `host` no motor.
- `kind` diz **o que a tela é** para o motor, e pertence à tela, não a um registro (o primeiro que declara fixa; outro
  só pode repetir):

  | `kind` | O que é |
  |---|---|
  | `modal` (padrão) | toma a tela e o mouse enquanto está aberta: a pausa, a loja, a tela de morte, o **editor de placa**, a lista **Criar** do inventário |
  | `card` | fica **sobre o HUD sem parar o jogo e sem tomar o mouse** — o cartão do guia. Em pixel quem o desenha é a camada de cartões, que nunca responde a clique; as teclas que ele quer chegam no `onKey` do mesmo jeito |
  | `pregame` | tela de **antes de entrar**: a entrada e a tela de mods. Não há mundo nem HUD atrás |

- `ctx.ui.gui.menus.replace(id, desc, opts?)` alcança a tela que **outro** declarou, pelo id inteiro (a do jogo base,
  `guia`, ou a de outro mod, `outromod:loja`), com a antiga em `previous` — é o gêmeo do `pausePages.replace`, e
  espera pela tela, porque o mod base registra depois de todo mod. `menus.remove(id)` tira uma tela (a do jogo base
  também: um modpack sem loja) e `menus.ids()` dá os ids na ordem em que o motor os mostra.
- **Abrir a SUA tela pelo cliente:** `ctx.ui.gui.menus.open(id, data?)` e `ctx.ui.gui.menus.close(id, data?)` abrem e
  fecham um menu **do próprio mod** (`id` curto ou `seumod:nome`) a partir de um botão, uma tecla ou uma mensagem de
  rede; `data` chega aos ganchos (`open`, `render`, `mount`, `draw`). Devolvem `false` fora do jogo, na tela de morte ou
  com outra tela na frente. O id de **outro mod** e os menus **do jogo** são recusados com erro (quem os abre é o
  motor ou o dono); um id que o mod nunca declarou também. Só no navegador: no servidor lança "browser-only".
- Registrar (ou tirar) numa tela que **ninguém nunca declarou** é erro no fim da carga, com o nome do seu mod — senão
  um id com erro de digitação viraria uma tela que o jogador nunca vê. Teto: 8 telas próprias por mod, 64 no total.

```js
// uma tela nova, desenhada em pixel, que fica sobre o HUD enquanto o jogo roda
ctx.ui.gui.menu('aviso', { kind: 'card', draw: (c, f) => { f.ui.panel(4, 4, 90, 28); f.ui.text('Seu turno!', 8, 10); } });
// ... e outro mod embrulha o cartão do jogo base em vez de jogá-lo fora
ctx.ui.gui.menus.replace('guia', { draw: (c, f) => { f.previous?.draw?.(c, f); minhaMarca(c, f); } });
ctx.ui.gui.menus.remove('guia'); // ou some com ele
```

O **guia de primeiros passos** do jogo base é exatamente isso: um `card` registrado pelo mod base, com os cinco passos,
os ícones e os textos dentro dele. O motor tem o nó de HTML e o trabalho de DOM (montar o cartão, pintar, lembrar onde
o jogador parou) e conduz tudo pelo `e.host`.

#### 16.1.3 A LISTA DE JOGOS: cartões DESCRITOS pelo registro

A lista de jogos do lobby (`games`) é o caso em que o conteúdo não é só texto: é **o que cada cartão mostra**. O motor
entrega os modos e as salas **registrados** como dado e o menu devolve a **descrição** de cada cartão, que o motor
desenha — ninguém monta nó nenhum do lado do mod:

```js
render(e) {
  const rows = e.host.rows();          // uma linha por modo/sala REGISTRADO: kind, cmd, icon, name, desc, a fila...
  e.host.refresh({
    labels: { title: e.host.tr('games.title'), sub: '…', stay: '…', room: '…', opts: '…', hint: '…' },
    all: { label: '▶ Jogar agora', secondary: false },   // o botão de entrar em todas as filas (ou null)
    cards: rows.map((m) => ({
      icon: m.icon, name: m.name, desc: m.desc, queued: m.queued,
      state: 'Fila 3/8 · faltam 2 para começar',          // a linha de estado é SUA
      hot: m.startsIn != null,                            // em destaque
      buttons: [{ label: 'Entrar na fila', cmd: m.cmd, close: true }],  // `cmd` é o comando de chat que o botão manda
      picker: { names: m.lobby, cmd: m.cmd, label: 'Desafiar' },        // ... ou a lista de quem desafiar
    })),
  });
}
```

- `kind` de cada linha é **o que o registro da sala diz que ela é**: `solo` (entra na hora: o Parkour), `challenge`
  (por convite: o Duelo) ou `queue` (por fila). Um cartão sem `buttons` e sem `picker` é só informação.
- `cmd` é o **comando da sala**, e é o único contrato: um botão que mande outra coisa não funciona. `close: true` fecha
  o painel depois, `secondary: true` desenha o botão discreto e `disabled: true` o desliga (a fila cheia).
- `e.host.rows()`, `inLobby()`, `queues()`, `allQueued()`, `tr(chave)` e `how()` são o que o motor sabe: os modos
  registrados, se o jogador está no lobby, quantas filas existem, se ele está em todas, o dicionário de tela no idioma
  dele e a tecla (ou o botão, no celular) que abre o painel. **Nenhuma palavra do jogo vem do motor.**
- A mesma descrição leva o `banner`: a faixa do topo do HUD, para o painel e a faixa não dizerem a mesma coisa de duas
  maneiras.
- Um mod troca a tela inteira (`menus.replace('games', …)`), embrulha (`e.previous`) ou muda só um cartão.

#### 16.1.4 O EDITOR DE PLACA: uma caixa `modal` com as palavras em chave de idioma

Depois de pôr uma placa o jogo abre `sign` com `openMenu('sign', { x, y, z })`. É um `modal`: a caixa toma o teclado e o
mouse enquanto o jogador escreve e o controle do personagem para. O motor tem o nó de HTML e o mecanismo — o foco, o
**limite de caracteres que o servidor valida** (`e.host.max`, 48) e o envio do texto — e o mod diz as **palavras** como
chaves de idioma (`mineclaude:ui.sign.title`, `placeholder` com `{max}`, `hint`, `ok` em `lang/pt_br.json` e
`lang/en_us.json`), resolvidas por `e.host.tr(chave)`. O `open` entrega ao motor
`e.host.show({ at: {x, y, z}, textos: { title, placeholder, hint, ok } })`; um mod troca a caixa
(`menus.replace('sign', …)`), embrulha (`e.previous`) ou a tira (`menus.remove('sign')`).

#### 16.1.5 A LISTA "CRIAR": o menu `crafting` entrega as abas, a regra e as frases

Ao abrir o inventário o motor chama `openMenu('crafting')` (`modal`, `dom: 'inventory'`): é a aba de receitas **dentro**
do inventário. O motor ficou com o mecanismo — o que dá para criar, quantas vezes, a busca, a fundição de 1 e de 8 numa
linha só, o envio de `craft` — e o menu diz o conteúdo, por `e.host.show({ tabs, classify, texts, stationNames })`:
`tabs` são as abas `{ id, label }` na ordem (`label` é a chave de idioma `mineclaude:ui.cat.*`),
`classify(recipe, item, { hasTag })` é a regra de qual aba é a da receita (o `craftTab` que a **receita** pede vale
antes, se a aba existe), `texts` são as frases do "o que falta" (`{list}`, `{station}`) e `stationNames` o nome de cada
estação. Os itens "básicos" são a **tag de item `mineclaude:basic_craft`**: um mod põe o item dele na aba Básico só
pondo-o na tag. Um mod troca a lista inteira (`menus.replace('crafting', …)`), embrulha (`e.previous`) ou a tira
(`menus.remove('crafting')`: sem abas, só a busca e sem frase).

#### 16.1.6 Um `card` que só se mostra ao abrir pode omitir o `render`

Um `kind: 'card'` não precisa de `render`: se ele só se desenha quando abre, `draw` (ou `dom`) basta.

- O menu responde como tela `menu:<id>` em `gui.screenEvents('menu:pause', ...)` e `gui.widgets('menu:pause', fn)` —
  é assim que um mod põe **um botão a mais** na pausa sem trocar o menu. No menu em HTML o `ui` do `widgets` monta nós
  (`ui.row()`, `ui.label(texto, linha)`, `ui.button({ label, icon, hint, onClick, secondary }, linha)`).
- `ctx.ui.gui.pausePage(nome, { title, icon?, hint?, controls?, config?, open?, close?, render? }, opts?)` — uma
  **página (aba)** da pausa. As quatro do jogo (Aparência, Opções, Atalhos, Regras) são do mod base, vêm primeiro e
  são **desenhadas em pixel** (`draw(ctx, f)`, com o retângulo delas em `f.box`); as de cada mod vêm depois. `controls`
  é uma lista **declarada** que o motor desenha, então o mod não toca em DOM:
  `{ key, kind, label, hint?, min?, max?, step?, options?, value?(), onChange?(v), onClick?() }` com `kind` em
  `toggle`, `range`, `number`, `text`, `select`, `button`, `label`.
- `config: true` monta essa lista **sozinho** a partir do `"config"` do `mod.json` do próprio mod (booleano → interruptor,
  número → faixa, texto → campo): uma tela de configuração de graça. O que o jogador muda ali vale **no navegador**
  (fica no `localStorage` e dispara os `ctx.config.onChange`); o arquivo do dono do servidor continua mandando no lado
  servidor.
- **Um menu é DESENHADO EM PIXEL (`draw`) ou montado em HTML (`dom`)** — nunca os dois pelo mesmo mod.
  `draw(ctx, f)` + `onPointer(e)` fazem o menu virar uma **tela da camada de GUI** sob o id `menu:<id>`: o kit inteiro
  em `f.ui`, `f.state` para o que ele lembra, `f.host` para o que o motor sabe fazer com aquele menu, `f.tr` para o
  idioma do jogador e `f.previous` para o registro de baixo — e, de graça, a ordem do Tab, as áreas de toque do
  celular, os `gui.screenEvents('menu:pause')` e os `gui.widgets('menu:pause')` de qualquer tela. É assim que o **jogo
  base** desenha os menus dele. O `dom` que o jogo base declara ao lado do `draw` é o **gêmeo em HTML**: é o que o
  `?domui` mostra (lá a camada de GUI é desligada), como uma peça do HUD que tem os dois lados. **No celular os menus
  também são em pixel**: a camada existe lá, só que desenha apenas as telas e os menus — o HUD e o inventário seguem
  em HTML, porque as casas do inventário e os botões de toque são tocados com o dedo.
- **Quais menus são desenhados em pixel.** Além de `pause`, `death`, `shop` e `trade`, têm `draw` a **placa** (`sign`,
  `modal`: título, `ui.textField` com `autofocus` e o limite do servidor, a dica e o botão; Enter grava, Esc solta o
  campo e depois desiste), o **guia** (`guia`, `card`: o ícone do passo em pixel-art, o cabeçalho, o texto quebrado, os
  pontos de progresso e a dica das duas teclas, tudo lido de `f.host.estado()`) e a **lista de jogos** (`games`,
  `modal`: o título, o subtítulo, o "Jogar agora" — só com duas filas ou mais —, uma lista com rolagem com um cartão por
  modo (nome, descrição, estado em destaque e os botões que a descrição do cartão trouxe; o Duelo traz o `ui.dropdown`
  de quem desafiar), os três botões do pé e a dica com a tecla do jogador; as palavras vêm de `host.tr` com as chaves
  `games.*`, mais o `textos` do mod, e cada botão chama o mesmo que o do HTML: `host.cmd`, `leave`, `all`, `world`,
  `opts`, `setPick`). O `card` só desenha: a camada dele nunca toma o clique do jogo, então o guia mostra as teclas em
  vez de botões. Em `?domui` e no celular vale o nó HTML de sempre.
- **Quais seguem em HTML, e por quê.** `crafting` não tem tela própria (é a descrição das abas e das frases da lista
  "Criar", que o **inventário em pixel** já desenha — um `draw` abriria uma segunda tela por cima dele, e a camada tem
  uma tela por vez); `options` é a aba da pausa (a página `opts` já é em pixel e o menu avulso nunca abre sozinho);
  `entry` (nome e senha, `<input>` que o navegador preenche e que o gerenciador de senhas conhece) fica em HTML **de
  propósito**; `mods` (`pregame`, um `<dialog>` com busca e ficha) ainda não foi levado para pixel, e nada o impede. A
  camada de GUI nasce no boot, antes do login, então ela já existe para qualquer um deles.
- **`dom` tem duas formas**, como no `gui.screen`. `dom: 'paused'` é o id de um nó que **o jogo já tem** (só o jogo
  base: aquele HTML é do motor, e os ganchos o conduzem por `e.host`). `dom: { mount, update?, unmount? }` é de
  **qualquer mod**: o motor dá um nó **vazio** (um painel na frente de tudo para um menu, o painel da aba para uma
  página) e o **mesmo kit em DOM das telas** em `e.ui` — `column`, `row`, `label`, `button`, `iconButton`, `checkbox`,
  `slider`, `dropdown`, `progress`, `textField`, `tabs`, `tip` —, com as cores do tema registrado. Um gancho de `dom`
  que estoura é desligado com o nome do mod no console, como os outros ganchos, e o registro de baixo assume. Uma
  página montada assim **desenha a si mesma**: não aceita `controls` nem `config: true` junto.
- `ctx.ui.gui.pausePages.replace(id, desc, opts?)` troca uma página (a do jogo base também, com a antiga em `previous`;
  o registro espera por ela, porque o mod base registra depois de todo mod), `.remove(id)` tira uma e `.ids()` dá a
  ordem desenhada.

```js
ctx.ui.gui.pausePage('config', { title: 'Opções do meu mod', icon: '🧩', config: true });
ctx.ui.gui.widgets('menu:pause', ({ ui }) => {
  ui.button({ label: 'Meu painel', icon: '🧩', onClick: () => abrir() });
});
// a mesma página, montada em HTML pelo mod (o kit em DOM chega em e.ui)
ctx.ui.gui.pausePage('html', {
  title: 'Página em HTML',
  dom: {
    mount(e) {
      const col = e.ui.column();
      e.ui.label({ text: 'Montada pelo mod, com o kit em DOM.' }, col);
      e.ui.checkbox({ label: 'Ligado', value: ligado, onChange: (v) => { ligado = v; } }, col);
    },
  },
});
```

O exemplo `menu_extra` mostra isso inteiro.

#### 16.1.7 Alcançar a tela de OUTRO mod: `screenEvents` e `widgets`

O `fabric-screen-api-v1` deste jogo. Nenhum dos dois mexe no código da tela.

- `ctx.ui.gui.screenEvents(id, handlers, { priority? })` — `id` é a tela (`'mineclaude:inventory'`) ou `'*'` para todas:

  | Gancho | Quando |
  |---|---|
  | `afterInit({ screen, data, state, mod })` | a tela abriu (`ScreenEvents.AFTER_INIT`) |
  | `remove({ screen, data, state })` | a tela fechou |
  | `beforeTick(frame)` | uma vez por quadro, antes de qualquer desenho (a tela aberta redesenha todo quadro) |
  | `beforeRender(frame)` / `afterRender(frame)` | antes e depois do desenho da tela; `frame.ui` é o mesmo kit |
  | `allowPointer(e)` / `allowKey(e)` | devolver `false` **cancela**: a tela não vê o clique nem a tecla |
  | `beforePointer(e)` / `afterPointer(e)` | antes e depois; o `afterPointer` recebe `e.consumed` |
  | `beforeKey(e)` / `afterKey(e)` | idem, para teclas (`ScreenKeyboardEvents`) |
  | `allowScroll(e)` / `beforeScroll(e)` / `afterScroll(e)` | a roda do mouse (`allowMouseScroll`...); `e.dir` (-1 sobe, 1 desce), `e.deltaX/deltaY`, `e.shift`, `e.region`, `e.x/y`. `false` cancela: a tela (e a lista que rolaria) não vê a roda |
  | `allowDrag(e)` / `beforeDrag(e)` / `afterDrag(e)` | mover o mouse COM um botão apertado desde um clique na tela (`allowMouseDrag`); `e.button`, `e.dx/dy` (pixels de GUI desde o último movimento), `e.region` |
  | `allowRelease(e)` / `beforeRelease(e)` / `afterRelease(e)` | soltar esse botão (`allowMouseRelease`); `e.button`, `e.region`; o botão apertado fora da tela ainda solta aqui (o ponteiro é capturado) |

  O `afterScroll` / `afterDrag` / `afterRelease` recebem `e.consumed`. Quem registra a tela recebe o arrasto e o soltar em
  `onDrag(e)` e `onRelease(e)` (opcionais, ao lado do `onPointer`; a roda continua chegando ao `onPointer` como `e.wheel`).
  Mover o mouse sem botão não é evento de tela: só atualiza o cursor.

  Até 32 por mod; o gancho que lança é desligado com uma linha no log, e os outros seguem.

- `ctx.ui.gui.widgets(id, fn, { priority? })` — o `Screens.getWidgets`: `fn(frame)` desenha **depois** da tela, com o
  mesmo `frame.ui`. Um componente com `onClick` fica com o clique (a tela nem vê), e com `onWheel`, com a roda.

```js
// um botão na tela de inventário do jogo base
ctx.ui.gui.widgets('mineclaude:inventory', (f) => {
  const p = f.ui.center(198, 170);
  f.ui.button(p.x + 202, p.y, 58, 12, 'Pedidos', { tip: ['Abre a fila'], onClick: () => abrirFila() });
});
ctx.ui.gui.screenEvents('mineclaude:inventory', { allowKey: (e) => e.code !== 'KeyK' }); // K não faz nada ali
```

#### 16.1.8 Kit de widgets: dez componentes prontos

O contrato completo de cada um está aqui mesmo, logo abaixo. Para o que o conjunto painel/slot/botão não cobre:
`ui.label`, `ui.iconButton`, `ui.dropdown`, `ui.progress`, `ui.tip`, `ui.checkbox`, `ui.slider`, `ui.tabs`, `ui.list` e
`ui.textField`. O estado da lista e do campo mora **na tela** (`frame.state`), não no motor; a caixa, o deslizador e as
abas recebem o valor de agora e devolvem a mudança por `onChange`. O exemplo `kit_widgets` usa todos eles (comando
`/kitui`).

- `ui.list({ x, y, w, h, rowH, count, state, row(i, rx, ry, over, innerW), data?, bar?, inset? })`: desenha **só as
  linhas à vista** — centenas de itens custam as que cabem na caixa —, com barra de rolagem, roda do mouse (que uma
  região dentro da linha não engole) e o clique que você puser em cada linha. `state` guarda `{ scroll }`. Devolve
  `{ first, last, count, maxScroll, over }`.
- `ui.textField({ x, y, w, h?, state, placeholder?, max?, onChange? })`: campo de texto desenhado no canvas, com foco
  (um clique põe o cursor onde você clicou), cursor que pisca, seleção (Shift+seta/Home/End, Ctrl+A), Ctrl+seta por
  palavra, teto de caracteres (`max`, padrão 256) e **colar/copiar/cortar** pelos eventos do navegador. `state` guarda
  `{ value, cursor, sel }`. As teclas que ele usa não chegam ao `onKey` da tela; **Esc** solta o campo (e aí o Esc
  seguinte é da tela), e Enter e Tab são sempre da tela.

```js
state.busca ??= { value: '', cursor: 0, sel: 0 };
state.lista ??= { scroll: 0 };
ui.textField({ x: 7, y: 16, w: 184, state: state.busca, placeholder: 'Buscar...', onChange: () => { state.lista.scroll = 0; } });
const itens = catalogo.filter((i) => i.nome.includes(state.busca.value));
ui.list({ x: 7, y: 32, w: 184, h: 72, rowH: 12, count: itens.length, state: state.lista,
  row: (i, rx, ry, over, innerW) => {
    ui.text(itens[i].nome, rx + 2, ry + 3, { color: over ? ui.theme.text : ui.theme.textDim });
    ui.hit(rx, ry, innerW, 12, null, { onClick: () => pedir(itens[i]) });
  } });
```

- `ui.checkbox({ x, y, label, value, onChange, w?, disabled?, data? })`: caixa de marcar 9×9 com o rótulo à direita; a
  linha inteira é clicável. O valor mora onde você quiser (o motor não guarda nada).
- `ui.slider({ x, y, w, min, max, value, onChange, step?, label?, unit?, data? })`: trilho com punho e o valor escrito
  ao lado; clique no trilho leva o valor para onde se clicou e a roda anda de `step` em `step`. Arrastar ainda não.
- `ui.tabs({ x, y, w, tabs, active, onPick, h?, gap? })`: fileira de abas (`tabs` = `[{ id, label, icon?, hint? }]`),
  a ativa acesa; devolve o id clicado. É o que desenha as páginas da pausa.
- `ui.label({ x, y, text, w?, align?, color?, dim?, lines? })`: uma linha de texto (com dica opcional em `lines`);
  devolve a largura desenhada.
- `ui.iconButton({ x, y, size?, icon?, glyph?, tip?, onClick, focus? })`: botão quadrado (18×18 por padrão, do tamanho
  de um slot) com o ícone de um item (`icon`) ou um glifo da fonte (`glyph`).
- `ui.dropdown({ x, y, w, options, value, onPick, state, focus? })`: lista que abre. `state.open` diz se está aberta,
  o painel aberto fica por cima de tudo e, enquanto está aberto, um clique em qualquer outro lugar **só fecha** (a tela
  não vê esse clique). Devolve `{ open, over, value, index }`.
- `ui.progress({ x, y, w?, h?, value, max?, label?, text?, color? })`: barra que enche; `text: true` escreve a
  porcentagem. Devolve a fração.
- `ui.tip({ x, y, w?, h?, lines, fixed? })`: a dica do jogo na área apontada, ou, com `fixed: true`, a caixa de dica
  desenhada ali mesmo (uma nota presa na tela).

**Layout, teclado e toque.** `ui.column({ x, y, w, gap })` e `ui.row({ x, y, w, h, gap })` são um cursor:
`place(tamanho)` devolve o retângulo do próximo componente e anda (`col.row(h)` abre uma linha dentro da coluna,
`linha.even(n)` dá a largura de `n` células iguais). `focus: 'um_id'` em qualquer componente do kit o põe na ordem do
**Tab** daquela tela: Tab/Shift+Tab andam, Enter/Espaço acionam, as setas ajustam e Esc solta o foco; clicar também dá
o foco. No **celular** as áreas de clique do kit crescem para `ui.minTap` sem mudar o desenho.

**O kit é um registro, e isso é o ponto:** `ctx.ui.gui.widget('medidor', Medidor)` acrescenta um componente seu
(`ui.widget('seumod:medidor', spec)`), o mesmo `widget` com um dos **nomes padrão** toma a vaga dele em toda tela que o
usa, `widget.modify(id, Classe)` embrulha o que já está lá (o de baixo chega em `g.previous(spec)`, e no fundo da
cadeia está o desenho do motor) e `widget.remove(id)` tira o componente de outro mod. A cadeia é a mesma do
`gui.screen` (prioridade, `previous`, `exclusive`).

```js
import { WidgetType } from './mineclaude-sdk.js';

class ComFracao extends WidgetType {              // embrulha a barra de progresso de TODAS as telas
  draw(g, spec) {
    const ratio = g.previous(spec);               // o motor desenha a barra
    g.ui.text(`${Math.round(ratio * 100)}%`, spec.x + spec.w + 4, spec.y, { color: g.theme.textDim });
    return ratio;
  }
}
ctx.ui.gui.widget.modify('progress', ComFracao);
```

O kit é **ajuda, não exigência**: o motor não pede widget nenhum para registrar uma tela — `draw(ctx, frame)` pode
pintar pixel na mão, e uma tela em HTML monta o que quiser. O kit existe para as telas ficarem parecidas entre si e
para seguirem o tema registrado (`gui.theme` / `gui.skin`), que um mod troca.

#### 16.1.9 A mesma tela em HTML: `gui.screen(id, { dom })`

O jogo base desenha os menus dele em pixel, mas um mod pode fazer o dele em HTML — **a mesma tela, registrada da outra
forma**, no mesmo `gui.screen`:

```js
ctx.ui.gui.screen('mineclaude:inventory', {
  dom: {
    mount(e) { const el = document.createElement('div'); el.textContent = 'minha tela'; e.host.append(el); },
    update(e) {},   // a cada quadro, se você quiser acompanhar algo
    unmount(e) {},  // ao fechar; o motor esvazia o host sozinho
  },
}, { priority: 20 });
```

`e.ui` é **o mesmo kit em HTML** (`e.ui.column()`, `e.ui.checkbox(...)`, `e.ui.slider(...)`, `e.ui.progress(...)`...,
com `<button>`/`<input>`/`<select>` de verdade e as cores do tema), para não ter de montar cada nó à mão.
`e.host` é um nó vazio sobre a camada de GUI, `e.theme` são as cores registradas, e `e.data`/`e.state` são
os mesmos da tela desenhada. Um registro é de **uma forma só** (`draw` ou `dom`, nunca os dois), mas os dois entram na
**mesma cadeia** — prioridade, `previous` e `exclusive` —, valem nas mesmas páginas da pausa e recebem os mesmos
`onOpen`/`onClose`, `screenEvents` e `widgets`. Então um mod troca uma tela em pixel do jogo por uma em HTML dele, e
outro mod troca a tela em HTML desse por uma em pixel.

Dois exemplos inteiros: `terminal_pedidos` (terminal de busca, elemento de HUD, botão e ganchos na tela do jogo) e
`menu_extra` (tela em HTML no lugar de uma em pixel, página da pausa e botão no menu).
- `ctx.ui.gui.theme({ panel, slot, text, button, tooltip, ... })`: as cores dos componentes; o jogo registra as dele,
  um mod sobrepõe chaves.

- `ctx.ui.gui.skin({ panel, inset, slot, button, arrow, pageArrow, tooltip })`: a **forma** dos componentes (o tema são
  só as cores). Cada parte é `draw(g, ...args, theme)` com `g = { rect, text, textWidth, item, ctx, px }` em pixels de
  GUI (ex.: `panel(g, x, y, w, h, theme)`, `slot(g, x, y, stack, { picked, ghost, over, empty }, theme)`,
  `tooltip(g, x, y, w, h, lines, theme)`); o motor só calcula posição, região de clique e hover e chama a parte
  registrada. O jogo registra a dele (uma classe por parte); um mod sobrepõe parte por parte.

- `ctx.ui.gui.hudLayout(({ width, height, px, count }) => ({ x0, y0, barW, slot, gap, rowY }))`: a linha da barra rápida de
  onde toda peça do HUD mede; um mod troca. Sem layout o HUD não é desenhado.
- `ctx.ui.gui.accent(ch, { base, above?, below? })`: como um caractere acentuado é desenhado — o glifo de `base` mais
  `above` (até 3 linhas de `#`/`.` sobre o glifo) e/ou `below` (pontos `[dx, dy]`, como a cedilha). O jogo registra as
  do português.

Tudo é registrado na carga (depois congela). O exemplo `tema_hud` inclui um skin de painel e tooltip planos. O
inventário em pixel (mochila, livro de receitas e paleta do criativo) é o padrão no computador; o inventário HTML fica
só com `?domui` e no celular.

### 16.2 Componentes visuais e HUD com cartões

Painéis e HUDs também aceitam `card`, `stat` e `progress`. São componentes com
estilo do jogo, não uma API de HTML/CSS livre. Não há HTML, estilos CSS,
URLs de ícones nem classes arbitrárias nesses descritores.

```js
const indicador = ctx.ui.hud({ id: 'condicao', corner: 'top-right', body: [
  { card: { title: 'Condição vital', badge: 'Confortável', tone: 'success', body: [
    { stat: { label: 'Temperatura corporal', value: '36,6', unit: '°C', icon: 'temperature', tone: 'success' } },
    { progress: { label: 'Umidade', value: 25, max: 100, icon: 'drop', tone: 'info' } },
  ] } },
] });
indicador.update([{ stat: { label: 'Temperatura', value: '36,8', unit: '°C' } }]);
// O formato antigo continua funcionando; set troca o cartão por texto simples.
indicador.set('Temperatura: 36,8 °C');
```

- `card: { title?, subtitle?, badge?, tone?, body }`: agrupa componentes num cartão.
- `stat: { label, value, unit?, hint?, icon?, tone? }`: valor em destaque, com ícone opcional.
- `progress: { label, value, max?, text?, icon?, tone? }`: barra acessível; `max` padrão 100.
  `value` e `max` devem ser números finitos, `max > 0` e `0 <= value <= max`.
- Tons: `neutral`, `info`, `success`, `warning`, `danger`.
- Ícones vetoriais embutidos: `temperature`, `drop`, `activity`, `shield`, `sun`, `snow`.
- HUD: escolha `text` **ou** `body`. `handle.update(body)` troca os componentes;
  `set(text)` retorna ao texto simples. Botões e inputs são exclusivos de painéis,
  pois o HUD não captura cliques. Os componentes restantes podem ser combinados com `row`.
- O total de 200 elementos inclui filhos dos cartões; `row` e `card` compartilham
  o teto de quatro níveis de contêineres. Todo texto continua sendo texto puro.

Esses componentes exigem uma versão mínima do jogo e do SDK — veja
[versoes.md](versoes.md). Um pacote de mod não leva consigo o renderizador nem os
estilos do jogo. Para design livre, use as APIs das seções seguintes.

### 16.3 HTML/CSS e Canvas livres, inclusive no mundo

`ctx.ui.dom(desc)` monta HTML/CSS próprio em um ShadowRoot. `ctx.ui.canvas(desc)`
entrega um contexto Canvas 2D para desenhar qualquer medidor, radar ou animação.
Os dois suportam `mode: 'hud' | 'panel' | 'world'`:

- `hud` (padrão): aparece automaticamente num dos três `corner` existentes.
- `panel`: abre por `handle.open()`, libera o mouse e recebe cliques/toque.
  Esc, clique fora, outras telas, morte e saída fecham como nos painéis comuns.
  O mod desenha seus próprios botões, incluindo um botão de fechar se desejar.
- `world`: etiqueta flutuante que acompanha uma posição, jogador ou mob.
  Oculta atrás da câmera, fora do alcance e, por padrão, atrás de blocos.
  É uma interface de tela projetada na posição 3D, não uma textura colada numa face.

HUD e world não capturam input, para preservar os controles do jogo.
O handle tem `open()`, `close()`, `remove()`, `update(data)`, `setAnchor(anchor)`
e `isOpen`. `remove()` é definitivo; `close()` permite remontar com `open()`.
Use ids `[a-z0-9_]{1,32}`; o mesmo id substitui a superfície anterior do mod.
Há até 32 superfícies por mod. `width` e `height` são dimensões CSS de 16 a 1024
(padrões 280×160); o CSS pode ajustar o layout responsivo. `css` aceita até 32 KB.

```js
const painel = ctx.ui.dom({
  id: 'meu_painel', mode: 'panel', width: 400, height: 220,
  css: ':host{background:#142638;border-radius:20px;padding:24px}button{color:teal}',
  data: { titulo: 'Minha interface' },
  mount(root, initialData) {
    const title = root.ownerDocument.createElement('h2');
    title.textContent = initialData.titulo;
    const button = root.ownerDocument.createElement('button');
    button.textContent = 'Fechar';
    button.onclick = () => painel.close();
    root.append(title, button);
    return {
      update(data) { title.textContent = data.titulo; },
      destroy() { /* limpar timers, observadores e listeners externos criados pelo mod */ },
    };
  },
});
// Chame a partir de um evento de rede ou interação, depois de entrar no jogo.
painel.open();
painel.update({ titulo: 'Atualizado sem remontar' });
```

`mount(root, data)` é síncrono e pode devolver `{ update?, destroy? }`, somente
uma função de limpeza ou nada. Fecha/remoção/desconexão executam a limpeza.
Reabrir chama `mount` de novo com os dados mais recentes. O SDK remove o DOM;
listeners globais, timers próprios e observadores devem ser limpos por `destroy`.
O Shadow DOM isola CSS; **não é sandbox de segurança**. O código cliente de um
mod já tem acesso ao navegador. Para texto recebido de jogadores use `textContent`;
não interpole esses dados em HTML.

```js
const barra = ctx.ui.canvas({
  id: 'vida_flutuante', mode: 'world', width: 140, height: 24,
  anchor: { mob: 123, offset: { x: 0, y: 2.3, z: 0 }, maxDistance: 24 },
  data: { hp: 10, maxHp: 20 },
  draw(c, frame) {
    const { width, height, data } = frame;
    c.clearRect(0, 0, width, height);
    c.fillStyle = '#223344'; c.fillRect(0, 0, width, height);
    c.fillStyle = '#80dfbd'; c.fillRect(0, 0, width * data.hp / data.maxHp, height);
  },
});
barra.update({ hp: 7, maxHp: 20 });
```

Âncoras escolhem exatamente um alvo: `position: {x,y,z}`, `player: 'self'` ou id
de jogador, ou `mob: id`. Coordenadas são do mundo; o offset padrão é zero,
`maxDistance` padrão 32 (até 128), `occlude` padrão true. Alvos removidos ou não
carregados ficam ocultos. Atualize o alvo por `setAnchor`. Não é preciso importar
Three.js nem acessar os objetos internos de câmera para usar âncoras.

No Canvas, `frame` contém `width`, `height` em pixels CSS, `dpr` (até 2), `time`
em segundos, `delta` (até 0,1 s) e `data`. O SDK configura a transformação para
pixels CSS, ajusta resolução, pausa animação fora do jogo/morto e cancela RAF
ao fechar/remover/desconectar. Erro no desenho pausa essa superfície até `update`.
Em `mode: 'panel'`, `onPointer({type,x,y,buttons,pointerId,data})` recebe down/move/up/cancel
em coordenadas CSS; pode ser usado para botões e gráficos interativos.

Para Canvas estático (por exemplo, vida de mob), use `animate: false`: o desenho
só roda ao montar ou receber `update(data)`; a âncora continua acompanhando o alvo.
As superfícies compartilham um RAF, e a checagem de oclusão pode usar cache de
150 ms, invalidado por deslocamento significativo da câmera ou do alvo.

No servidor as duas APIs lançam erro, como `panel`/`hud`. O `modkit check` valida
os descritores sem chamar `mount`, `draw` ou ponteiros. Os componentes declarativos
anteriores continuam disponíveis e continuam tratando texto como texto puro.

O jogo base usa Canvas/world para barras de vida dos até 24 mobs mais próximos
num raio de 24 blocos. O snapshot `mobs` inclui os campos opcionais
`entrada[10] = hp`, `entrada[11] = maxHp`, preservando os dez campos anteriores;
clientes antigos ignoram a extensão. Sem esses campos, o cliente não inventa vida.

### 16.4 Ver o jogo no cliente: `ctx.client` (só no navegador)

Equivale ao `MinecraftClient` do Fabric (`client.player`, `client.world`) e ao `KeyBindingHelper`. Só leitura; no
servidor lança. Antes de o jogo rodar (tela de entrada) tudo devolve `null`/`[]`, sem erro.

| chamada | devolve |
|---|---|
| `player()` | `{ name, x, y, z, yaw, pitch, dimension }` do jogador local |
| `getBlock({x,y,z})` | nome completo do bloco, ou `null` (chunk não carregado) |
| `topBlock(x, z, from?)` | `{ y, block }` do bloco mais alto da coluna a partir de `from` (pula ar, plantas, tochas; água conta) |
| `blockColor(nome)` | cor média do topo da textura, `'#rrggbb'` (vale para blocos de mods) |
| `mobs()` / `players()` | mobs `{ id, type, x, y, z }` e outros jogadores `{ name, color, x, y, z }` carregados |
| `daylight()` | 0 (noite) a 1 (dia) |
| `keys.register({ id, name, key })` | açúcar compatível: tecla do mod com `onPress(fn)` e `wasPressed()`; `key` é um `KeyboardEvent.code`. Até 8 por mod. Vira uma ação "Mods" nas Opções e cede a tecla a qualquer ação do jogo (WASD, E, T, M…). Para o resto, use `input.action` |
| `input` | ações de entrada (16.4.1) |
| `debug` | as linhas da caixa do F3: `line(id, (info) => texto, { order })`, `remove(id)`, `list()`; o jogo registra as dele |
| `media` | captura de aparelho: microfone (ou um tom sintético) em quadros Opus/PCM, com a permissão do jogador e **fechada** até `start()` |
| `camera` | modos e modificadores de câmera (16.4.2) |

Exemplo completo: o mod `minimapa` (minimapa redondo com relevo, água, mobs, jogadores, bússola; N muda o zoom, J esconde).

#### 16.4.1 Entrada: `ctx.client.input` / `InputAction`

Entrada é um **registro de ações** (o `KeyBinding` do Fabric, com categorias). O motor só tem o mecanismo: dispositivos
(teclado, mouse, toque, controle e os que um mod criar) ligam e desligam ações, e o jogo lê ações, nunca teclas fixas. As ações
do jogo (andar, pular, correr, quebrar, usar, inventário, chat, largar, barra de itens, voar, esquiva, perspectiva...) são
registradas pelo mod base com as mesmas teclas de sempre; as suas aparecem junto, por categoria, em
Esc ▸ Atalhos, onde o jogador remapeia (o salvo é o `mc-keys` de sempre; ação de mod vale com o id `mod:acao`). Tecla repetida
em duas ações de mod (ou de mod com o jogo) é permitida, e a tela avisa o conflito.

```js
import { InputAction } from './mineclaude-sdk.js';
class Dash extends InputAction {
  id = 'dash'; name = 'Investida'; category = 'Meu mod'; defaultKeys = ['KeyV'];
  mouse = 1; gamepad = 'button:2'; touch = { label: '»' };   // opcionais: botão do mouse, do controle, do toque
  onPress(e) { /* e.repeat, e.source ('key:KeyV', 'mouse:1', 'touch', 'pad', 'mod') */ }
}
const dash = ctx.client.input.action(new Dash());   // ou um objeto simples { id, name, category, defaultKeys }
```

| chamada | o que faz |
|---|---|
| `action(desc)` | registra (até 256 por mod; `id` `[a-z0-9_]{1,32}`; até 4 `defaultKeys`; `mouse`: 0, 1, 2, `'wheel_up'`, `'wheel_down'`; `gamepad`: `'button:N'` ou `'axis:N:-1'`/`'axis:N:1'` (mapa padrão); `touch: { label, size?, hidden?, hold? }` cria um botão na tela de toque; `look: 'left'`, `'right'`, `'up'` ou `'down'` faz o analógico girar o olhar). Devolve `{ isDown(), value(), wasPressed(), keys(), onPress(fn), onRelease(fn), press(), release(), tap() }` |
| `on(id, fn)` | escuta qualquer ação, inclusive as do jogo: `fn({ action, phase: 'down' ou 'up', source, repeat, cancel() })`. **`e.cancel()` num `'down'` consome o aperto**: o jogo não faz o que faria (abrir o inventário, pular...) e a ação não fica segurada. Devolve quem desfaz. Id sem `:` = o do próprio mod, ou do jogo (`'jump'`, `'attack'`, `'inventory'`...) |
| `isDown(id)` / `wasPressed(id)` / `value(id)` / `axis(neg, pos)` | estado: `value` vai de 0 a 1 (analógico do controle ou do joystick), `axis('left','right')` dá -1..1 |
| `press(id)` / `release(id)` / `tap(id)` | injeta a ação como se um dispositivo a fizesse; o jogo age normalmente (`press('attack')` quebra o bloco mirado) a menos que outro mod cancele (devolve `false`) |
| `rebind(id, code)` | troca a tecla só nesta sessão (`null` = sem tecla); a escolha do jogador nas Opções vale mais |
| `device({ id, update(dt, api) })` | dispositivo próprio, chamado a cada quadro: `api.set(id, 0..1)`, `api.press(id)`, `api.release(id)`, `api.look(dx, dy)`. O teclado, o mouse, o toque e o controle (Gamepad API: analógico esq. anda, dir. olha, botões do mapa padrão) são dispositivos do mesmo mecanismo |
| `get(id)` / `list()` | uma ação / todas (`{ id, name, category, defaultKeys, keys }`) |

Um ouvinte que lança é registrado no console e não derruba o jogo; um dispositivo que lança 3 vezes é parado.
O movimento do personagem (física, previsão, o que vai ao servidor) não muda: só a origem das intenções.
O que cada ação do jogo faz por padrão fica no motor, ligado ao id: o mod base só as define.

#### 16.4.2 Câmera: `ctx.client.camera` / `CameraMode`

A câmera é um **registro de modos** mais **modificadores** empilháveis. O motor aplica a pose por quadro (posição, rotação,
FOV, roll), com suavização opcional e **colisão com blocos** (a câmera é puxada para perto do olho se um bloco estiver no
caminho). Os modos do jogo (primeira pessoa, terceira pessoa atrás e de frente) são classes do mod base;
**F5** (ação `perspective`, remapeável) gira entre os que têm `cyclable`. O que o jogador mira
(raycast de interação) continua saindo do olho do personagem, não da câmera.

```js
import { CameraMode } from './mineclaude-sdk.js';
class Topo extends CameraMode {
  id = 'topo'; name = 'Visão de cima'; smooth = 0.1;
  update(f) { // f: { dt, time, eye, yaw, pitch, fov, aspect, velocity, onGround, flying, riding, settings, solid(x,y,z), raycast(o, dir, max) }
    return { position: { x: f.eye.x, y: f.eye.y + 12, z: f.eye.z }, lookAt: f.eye };   // ou rotation: { yaw, pitch, roll? }; fov?; roll?
  }
}
ctx.client.camera.mode(new Topo());
```

| chamada | o que faz |
|---|---|
| `mode(desc)` | registra um modo (`id`, `name`, `update(frame)` que devolve `{ position, rotation ou lookAt, fov?, roll? }`; `cyclable` (padrão sim), `showBody` (desenha o corpo e esconde a mão), `collide` (padrão sim), `smooth` 0..5 s, `onEnter`/`onExit`) |
| `modify(fn, { order? })` | modificador empilhável: `fn(pose, frame)` edita `pose = { x, y, z, yaw, pitch, roll, fov }` no lugar (tremor, zoom, balanço ao andar, FOV por velocidade). Roda depois do modo, em `order` e depois no registro. Devolve quem desfaz |
| `modifyLook(fn)` | o giro do olhar (mouse, toque, controle) passa por `fn(look)`, `look = { dx, dy, source, sensitivity, invertY }`, editável (sensibilidade, inversão, ajuda de mira) |
| `set(id)` / `cycle()` / `current()` / `modes()` | trocar de modo (id sem `:` = o do mod ou do jogo: `'first_person'`, `'third_back'`, `'third_front'`) |

Modo ou modificador que lança, devolve NaN ou pose inválida cai na câmera do olho (e um modificador que falha 3 vezes é parado).
Exemplo completo: o mod `camera_lab` (zoom com tecla, câmera de ombro, tremor ao levar dano, atalho de categoria própria).

### 16.5 Identidade do jogador: `player.uuid`

Cada conta tem um id permanente (como o UUID do Minecraft): `e.player.uuid` não muda entre sessões (o `id` é só o da
sessão). Guarde o `uuid` para lembrar de alguém (dono, amigo, recorde) e ache-o online com `e.server.playerByUuid(uuid)`
(`null` se não estiver no jogo). Bots não têm uuid.

### 16.6 Experiência (XP)

Só os mods dão ou gastam experiência; o jogo base não dá. `e.player.addXp(n)` (n > 0 dá, n < 0 gasta, nunca abaixo de 0;
até 1.000.000) e `e.player.xp()` → `{ total, level, progress }` (0..1 até o próximo nível). Custo do nível n para n+1:
7 + 2n até 15, depois 37 + 5(n−15) até 30, depois 112 + 9(n−30). Mob de mod com `xp: 0..1000` dá isso a quem o mata
(filhote não). Salva na conta; o cliente mostra uma barra fina acima da barra de itens, com o nível, só quando há XP.

### 16.7 Poções: `ctx.potions` / `PotionType`

O `Potion` do Fabric: `class Elixir extends PotionType { name = 'Elixir'; color = '#3fd9c8'; effects = [{ effect: 'mod:efeito', seconds: 90, level: 2, chance? }]; lore?; rarity? }`
e `ctx.potions.register('elixir', new Elixir())` (até 4 efeitos). Isso cria o item `<mod>:elixir` (frasco que não empilha,
sempre bebível) com uma textura de frasco pintada na cor da poção; beber aplica os efeitos. Exemplo: o mod `cristal_lab`.

### 16.8 Fluidos: `ctx.fluids` / `FluidType`

O `Fluid` / `FlowableFluid` + `FluidBlock` + `BucketItem` do Fabric, num registro só. O motor não sabe o que é água: ele simula, desenha e move
o jogador por **qualquer** fluido registrado, e a água do jogo é um `FluidType` do mod base (com os números de sempre).
Exemplo completo: o mod `fluidos_lab` (seiva e brasa líquida).

```js
class Seiva extends FluidType {
  name = 'Seiva';
  paint = t => { /* pixel art; alfa por pixel = translucidez */ };   // ou texture = 'mod:nome' (e flowingTexture)
  tickRate = 12;        // ticks (20/s) por passo do fluxo; a água: 5
  flowDistance = 3;     // blocos que escorre para o lado a partir da fonte (1..7); a água: 7
  infinite = false;     // true: duas fontes vizinhas criam uma fonte (a água)
  viscosity = 0.8;      // 0..0.95: fração da velocidade de andar que tira (a água: 0.45); também freia o nado vertical
  swimmable = true;     // false: o jogador não nada, anda no fundo (freado)
  drowns = false;       // cabeça dentro gasta o ar
  damage = 0;           // vida por segundo a quem está dentro (jogadores e mobs)
  ignites = 0;          // segundos de fogo (1 de vida/s); um fluido sem `ignites` apaga o fogo de quem entra
  light = 4;            // luz emitida (0..14)
  fog = { color: '#c98a1a', near: 0.3, far: 6 };   // névoa com a câmera dentro; o padrão é o azul da água
  bucket = { name: 'Balde de seiva', color: '#d99a2b' };  // true: cria <path>_bucket; string: item que o mod já tem
  onEntityInside(e) { e.player.heal(1); }          // servidor, a cada 0,5 s por jogador dentro
  onTick(e) {}                                     // servidor, a cada passo do fluxo de uma célula do fluido
  onMeet(e) { /* e.other, e.pos, e.from, e.otherIsSource */ return true; }   // true = tratou o encontro
}
ctx.fluids.register('seiva', new Seiva());
```

Registrar cria o bloco da fonte `<mod>:seiva` e os blocos de corrente `<mod>:seiva_1..N` (N = `flowDistance`, escondidos da paleta; ids novos no fim,
pelo registro normal de blocos) e, com `bucket`, o item `<mod>:seiva_bucket`. A corrente não é salva no mundo (a física a refaz a partir
das fontes), como a da água. `adopt = 'caminho'` usa blocos que o mod já registrou (`caminho`, `caminho_1..N`): é como o jogo base mantém os
ids da água.

- **Balde.** O balde vazio (`mineclaude:bucket`) pega a fonte de qualquer fluido que tenha `bucket` e vira o balde cheio dele; o cheio coloca a
  fonte e volta a ser o vazio. É o servidor que decide (`place`), o cliente só prevê. Um fluido sem `bucket` não se pega.
  O motor não conhece o balde: o jogo base o declara (`ctx.fluids.emptyBucket('bucket')`, só no conteúdo do jogo) e é isso que o
  balde cheio deixa na mão. Um fluido pode deixar outro item: `bucket = { name: 'Frasco de seiva', empty: 'meu_mod:frasco' }`.
- **Recipientes** (`ctx.fluids.container({ empty, full, fluid, amount? })`): um item que recebe `amount` de um fluido e vira outro item
  (o balde é um deles). Uma garrafa de 250 da água do jogo: `ctx.fluids.container({ empty: 'garrafa', full: 'garrafa_agua',
  fluid: 'mineclaude:water', amount: ctx.transfer.BOTTLE })`; os dois itens são do mod e têm de existir quando o jogo carrega.
  Quem enche e esvazia é o storage de fluido do item, a API de transferência: `e.player.fluidStorage('held')` e `world.moveFluid`.
  Só o recipiente de **exatamente** um balde (1000) também pega e põe a fonte no mundo.
- **Atributos** (o `FluidVariantAttributes` do Fabric): `fillSound` e `emptySound` (sons registrados do mod: tocam onde o balde enche e
  onde esvazia; sem eles, silêncio, como sempre), `temperature` (kelvin; padrão 300, a lava do jogo é 1300) e `gaseous` (informação:
  o motor ainda não simula gás); a `viscosity` já existia. Outros mods leem com `ctx.fluids.attributes('mod:fluido')`
  (`{ fluid, name, fillSound, emptySound, temperature, viscosity, gaseous }`, ou `null`), de qualquer evento ou hook.
  `ctx.fluids.modify` troca os quatro.
- **Fluidos diferentes não se misturam.** Quando A ia escorrer para a célula de B, o `onMeet` de A é chamado (e, se não tratou, o de B, com os papéis
  trocados): `e.world.setBlock(e.pos, 'mineclaude:cobblestone'); return true;` é a regra "água + lava vira pedra", que no jogo é conteúdo de mod
  (a brasa do `fluidos_lab` a tem). Sem `onMeet` tratando, cada um fica no seu lugar.
- **Física do jogador** (a mesma no cliente e no servidor): `viscosity` e `swimmable` valem para o jogador dentro do fluido; o servidor cobra `damage`, `ignites`
  e o ar (`drowns`). Mobs sofrem `damage`/`ignites` (~1 de vida por segundo), mas ainda se movem pela água como antes.
- Um bloco `liquid: true` registrado à mão, sem fluido, continua valendo como antes (nada o simula; move como água).
- **A lava do jogo** também é um `FluidType` do mod base: escorre 3 blocos, devagar,
  não é infinita, machuca 4 de vida por segundo, põe 8 segundos de fogo, não afoga e ilumina. A regra água + lava =
  pedregulho é o `onMeet` dela, conteúdo do mod base e não do motor.
- **Levar fluido de um lugar para outro** (tanque num bloco, balde como storage, canos) é a API de transferência
  (`fluidStorage`, `world.moveFluid`); exemplo: o mod `tanque_lab`.
- **Como ele é DESENHADO** é o `render` (o `FluidRenderHandler` do Fabric): `tint` (cor fixa, fatores lineares,
  `'biome'` ou uma função por célula), `still` e `flowing` (o tile da superfície parada e o da corrente), `surface`
  (a altura da superfície de uma célula cheia de corrente — 0,88) e `alpha` (a opacidade — 0,72, a do material de
  água). Outro mod troca o desenho de **qualquer** fluido por `ctx.render.fluid('mineclaude:water', { ... })`, em
  cadeia e numa entrada `main`; exemplo: o mod `fluido_pintado`.

### 16.9 Encantamentos: `ctx.enchantments` / `EnchantmentType`

O `Enchantment` do Fabric. Cada encantamento também vira o componente de item `<mod>:<nome>` = `{ level }`, então a pilha o
guarda, salva e sincroniza como qualquer componente:

```js
class Ressonancia extends EnchantmentType {
  name = 'Ressonância'; maxLevel = 3;  // 1..10
  items = '#c:swords';                 // opcional: '#tag' de item ou lista de nomes; sem isso, qualquer item
  onAttack(e) { e.damage += 1.5 * e.level; } // golpe com o item: e.target { player: nome } | { mob: { id, type } }
  onHurt(e) { e.damage -= e.level; }         // peça de armadura vestida, quem a usa leva dano (antes da armadura)
}
ctx.enchantments.register('ressonancia', new Ressonancia());
e.player.enchant('held', 'mod:ressonancia', 2);  // false se não há item ou o item não aceita
e.player.enchantments('held');                    // [{ name, level }]
```

O tooltip mostra `✦ Ressonância II`. Exemplos: o mod `cristal_lab` e o comando `/encantar`.

### 16.10 Partículas: `ctx.particles` / `ParticleType` / `ParticleEmitterType`

O `ParticleType` do Fabric com a fábrica do cliente (`ParticleFactoryRegistry`) embutida nos campos, mais um
**emissor** — que o Fabric não tem — preso a um bloco ou a um mob. Registre o tipo nos **dois lados** (a mensagem
`ptc` leva o id, então a ordem tem de ser a mesma):

```js
class Faisca extends ParticleType {
  colors = ['#68fff0', '#ffffff'];       // 1..8 cores; a tinta do sprite também
  sprites = ['faisca_1', 'faisca_2'];    // 1..8 texturas do atlas: a partícula vira billboard e o quadro anda pela vida dela
  size = 0.07; life = 0.7; gravity = -0.15; speed = 2.5; spread = 0.2; rise = 0.8; shrink = true;
  drag = 0.6;                            // 0..8: quanto de velocidade ela perde por segundo
  collide = true; bounce = 0.4;          // para num bloco sólido e quica (0..1)
  blend = 'add';                         // 'normal' | 'add'
  burst = 160;                           // O TETO DELA por rajada, 1..512 (64 por padrão)
  onTick(p, e) { p.vx += Math.sin(p.age * 9) * 18 * e.dt; if (p.grounded) e.remove(); }
}
```

- `colors` 1..8 `'#rrggbb'`, `size` 0,02..0,6 bloco, `life` 0,1..5 s (cada partícula varia até +50 %), `gravity` −2..2
  (vezes 14 blocos/s², a régua de sempre; negativo sobe), `speed` 0..10, `spread` 0..3, `rise` 0..10, `drag` 0..8,
  `bounce` 0..1, `burst` 1..512.
- **`sprites`** são nomes de textura do atlas do terreno (um nome curto é do próprio mod primeiro, do jogo depois).
  Sem `sprites`, a partícula é um cubinho de cor sólida, como sempre foi.
- **`fromBlock: true`**: a rajada carrega um BLOCO e, sem `sprites`, as cores saem da textura dele — é o mecanismo da
  poeira de um bloco que quebra.
- **`onTick(p, e)`** roda depois do passo do motor: `p` é a partícula viva (`x/y/z`, `vx/vy/vz`, `age`, `life`,
  `grounded`) e `e` tem `dt`, `solidAt(x, y, z)` e `remove()`. Um `onTick` que estoura 8 vezes é desligado até a
  próxima sessão, como qualquer gancho de desenho.

**O orçamento.** Cada tipo tem o seu teto por rajada (`burst`) e a página tem um teto de partículas vivas **por mod
dentro de um teto global** (900 de 2.400): um mod que emite todo quadro nunca deixa os outros — nem o jogo — sem
desenho. O que não couber no orçamento simplesmente não nasce.

No servidor: `e.world.spawnParticles('mod:faisca', pos, { count, block })` para quem está a até 48 blocos (o `count`
é cortado no `burst` do tipo; `block` só vale num tipo `fromBlock`). No navegador: `ctx.particles.spawn('faisca',
pos, count, { block })`.

**Emissores (`ParticleEmitterType`, `ctx.particles.emitter`).** Um emissor é um REGISTRO: o motor acha as células do
bloco e os mobs à vista, mede a distância até a câmera, guarda o ritmo e gasta o orçamento; o mod só diz o que sai e
quando. Exatamente um de `block` / `mob`.

```js
class Fumaca extends ParticleEmitterType {
  particle = 'cinza';            // 'mod:path', ou um caminho do mod que ESCREVEU o emissor
  block = 'fumarola';            // toda célula desse bloco à vista emite   (ou `mob = 'mineclaude:pig'`)
  rate = 6;                      // emissões por segundo, 0,1..40
  count = 1;                     // partículas por emissão, 1..8
  radius = 32;                   // até onde da câmera ele ainda emite, 4..64
  offset = { y: 0.55 };          // do centro da célula (ou dos pés do mob), cada eixo -4..4
  when(e) { return e.properties.lit === 'true'; }  // ligado agora? (num mob: e.baby, e.flags, e.owner)
}
ctx.particles.emitter('fumaca', new Fumaca());        // vira 'meumod:fumaca'
ctx.particles.emitter('outromod:fumaca', new Minha()); // TROCA o emissor do outro mod
ctx.particles.emitter('outromod:fumaca', null);        // ou o tira do jogo
```

Até 32 emissores por mod. Como qualquer registro de desenho, um emissor é declarado dentro do `register` e congela
com a carga.

**As partículas do JOGO são conteúdo.** As duas que o motor soltava sozinho — a poeira de um bloco que quebra e os
corações do animal pronto para cruzar — são conteúdo do mod base, e o motor as pede por **papel**
(`block_dust`, `heart`): um papel tem um dono só, e num mundo sem o mod base o motor simplesmente não desenha
nenhuma. Trocar o que o jogo mostra é um `modify`:

```js
ctx.particles.modify('mineclaude:heart', { colors: ['#4aa3ff', '#bfe3ff'] });   // os corações do jogo, azuis
ctx.particles.modify('mineclaude:block_dust', { size: 0.05, life: 1.2 });       // poeira mais fina e mais demorada
```

O `modify` alcança tudo o que o dono declarou, menos a identidade, o `role` (a pergunta do motor, tomada uma vez) e o
`fromBlock` (é a FORMA da rajada, que quem chama já escreveu). Exemplos: o mod `particulas_lab` (sprite, colisão,
`onTick`, os dois emissores e o `modify` do coração) e o `cristal_lab` (o básico).

### 16.11 Projéteis: `ctx.projectiles` / `ProjectileType`

O `ProjectileEntity` do Fabric. Registre nos dois lados (a mensagem `proj` leva o id do tipo):

```js
class Estilhaco extends ProjectileType {
  name = 'Estilhaço'; gravity = 0.25; life = 3; damage = 3;  // gravidade × a da flecha (0..3), vida 0,5..30 s, dano 0..100
  size = 0.18; color = '#68fff0'; glow = true;              // o cliente desenha um cubo dessa cor/tamanho, girando
  shape = 'cube';                                            // ou 'arrow': o modelo de flecha do jogo, de ponta, com a pena em `color`
  onHitEntity(e) { /* e.target.player | e.target.mob, e.damage editável, e.cancel(), e.owner, e.projectile */ }
  onHitBlock(e) { /* e.pos, e.block */ }
}
ctx.projectiles.register('estilhaco', new Estilhaco());
// no servidor (ex.: onUse de um item): mira com e.player.eye e e.player.look (vetor unitário)
const { eye: from, look } = e.player, velocity = { x: look.x * 20, y: look.y * 20, z: look.z * 20 };
e.world.shootProjectile('mod:estilhaco', { from, velocity, owner: e.player }); // até 80 blocos/s; devolve o id ou null
```

O dono não é atingido no primeiro instante e leva o crédito da morte; PvP desligado vale como na flecha. Exemplo:
o mod `cristal_lab` (o estilhaço e o cajado de cristal).

### 16.12 Tabelas de loot: `ctx.loot` e `data/<mod>/loot_tables/`

A `LootTable` do Fabric, como dado. Uma tabela tem `pools`; cada pool é sorteado `rolls` vezes (número ou `{ min, max }`,
até 16) entre as `entries` pelo `weight` (1..1000). A entrada dá `item` com `count` (número ou `{ min, max }`, até 64) ou
é `{ empty: true, weight }` (nada). Pool e entrada aceitam `conditions`:
`{ type: 'random_chance', chance }`, `{ type: 'killed_by_player' }`, `{ type: 'match_tool', item | tag }`,
`{ type: 'time', when: 'day' | 'night' }`, `{ type: 'zone_bonus', min }` e `{ type: 'not', term }`. Limites: 8 pools,
32 entradas por pool.

**O perigo do lugar** (`zone.loot` da zona: o 0 / 1 / 2 que o motor já passa a um baú) entra de duas formas. Como
**campo da pool**, `bonus: { scale, rolls }`: `scale` multiplica as quantidades por `1 + nível × scale`
(arredondado) e `rolls` dá `nível × rolls` voltas a mais. Como **condição**, `{ type: 'zone_bonus', min }`: a pool
(ou a entrada) só existe daquele nível para cima. Sem nível nenhum — o padrão — nada muda, então uma tabela que já
existia sorteia exatamente como sempre. É o que o loot do Guardião de Pedra usa: três montes que crescem com a zona,
a peça rara que sai uma vez a mais por nível e as flechas que só existem na zona de perigo.

- Em arquivo: `data/loot_tables/<nome>.json` vira a tabela `<mod>:<nome>`. Em código: `ctx.loot.register('nome', tabela)`.
- **Mob** `loot: 'mod:nome'` no lugar de `drops` (filhote não solta nada; `onDeath` e o evento `mobDeath` ainda editam).
- **Bloco** `loot: 'mod:nome'` no lugar de `drop` (a condição `match_tool` vê a ferramenta na mão; criativo não solta).
- **`world.rollLoot('mod:nome', { tool?, killedByPlayer?, day?, bonus? })`** devolve `[{ item, n }]` sem dar nada: use em baús, prêmios...
- Um mob ou bloco com `loot` de tabela que não existe impede o servidor de subir, com o nome na mensagem.
- Exemplo: o mod `cristal_lab` traz uma tabela em `data/loot_tables/sentinela.json`.

### 16.13 (removido) Prêmios e Roleta da Vitória

Os prêmios e a Roleta da Vitória saíram do jogo: não existem `ctx.rewards`, `ctx.roulettes`, `RewardType`,
`RouletteType`, `e.player.vault`, `e.player.roulette` nem o evento `allowToken`. O número da subseção fica aqui só
para não mover os outros.

### 16.14 Capas e marcas: `ctx.cosmetics` / `CapeType` / `FeatType`

A capa é a aparência que **se ganha jogando** e nunca se compra. Dois registros, nos dois lados, em entrada `main`:

- **`ctx.cosmetics.cape(path, new MinhaCapa())`** (`CapeType`): `name`, o destrave — `wins` (vitórias em minigame)
  **ou** `feat` (o caminho curto de uma marca registrada), nunca os dois —, `pattern` (o nome do desenho),
  `colors` (a paleta) e **`paint(e)`**, que responde a cor de UM pixel (`e` = `{ x, y, width, height, colors }`).
  A capa é 8 × 12 pixels e a arte é pixel-art por código: **nada de imagem**.
- **`ctx.cosmetics.feat(path, new MinhaMarca())`** (`FeatType`): `text` (o que o /capa imprime) e `test(e)`, que lê a
  conta por `e.account.get(campo)` — **só leitura**, uma marca nunca escreve nada.

```js
import { CapeType, FeatType } from './mineclaude-sdk.js';

class Fundo extends FeatType {
  text = 'descer abaixo de y = -40';
  test(e) { const y = e.account.get('deepestY'); return Number.isFinite(y) && y <= -40; }
}
class Veio extends CapeType {
  name = 'Capa do Veio'; feat = 'fundo'; pattern = 'veio'; colors = ['#4a4a52', '#49c3b0'];
  paint({ x, y, colors }) { return Math.abs((x % 4) - 1.5) + Math.abs((y % 4) - 1.5) <= 1.5 ? colors[1] : colors[0]; }
}
ctx.cosmetics.feat('fundo', new Fundo()); // a marca primeiro: a capa a cita pelo nome curto
ctx.cosmetics.cape('veio', new Veio());
```

**A conta guarda o ÍNDICE da capa vestida**, que é a ordem de registro, então uma capa nova entra sempre no **fim** da
lista — as do jogo base vêm primeiro e não se movem. Os caminhos de capa e de marca são **únicos entre mods** (a conta
também guarda a chave de uma capa de marca já anunciada), e capa que cita marca que ninguém registrou para o boot.

### 16.15 Progressão: `ctx.progress` / `StatType` / `GoalType` / `BestiaryType` / `HighlightType`

Quatro registros, nos dois lados, em entrada `main`:

- **`ctx.progress.stat(path, new MinhaEstatistica())`** (`StatType`) = **um número de uma conta**, acumulado entre
  sessões. `scope` (`'total'`, `'day'`, `'week'`, ou uma lista) é o que faz a chave **virar sozinha**, e o fuso que diz
  quando o dia vira é parâmetro do escopo (`dayOffsetMs`, `weekStart`), não constante do motor. `kind: 'count'` soma;
  `kind: 'record'` guarda a melhor marca (`better: 'higher' | 'lower'`). O número é salvo em
  `modData.<mod>["stat.<path>"]`, e conta que nunca somou nada continua byte a byte igual.
- **`ctx.progress.goal(path, new MinhaMeta())`** (`GoalType`) = a **meta ou conquista**: a condição é "a estatística
  `stat` chegou a `n`", e ela **não guarda número próprio**. `pool` diz de qual sorteio ela sai (`'day'`, `'week'`,
  `'debut'`), `scope` qual escopo da estatística a condição lê (a meta só conta: não paga nada). Cumprir acontece
  **onde a estatística é escrita**, então ninguém é avisado duas vezes; a meta cujo período não é o do escopo (a de
  estreia, uma conquista) fica gravada em `modData.<mod>["goal.done"]`.
  Registre a estatística **antes** da meta que a lê, e meta de sorteio pede `group` na estatística.
- **`ctx.progress.bestiary(path, new MinhaPagina())`** (`BestiaryType`) = a **página de um mob** no bestiário: o
  `group` cujos `tiers` são os cortes de cada nível, a `hint` de onde procurar um nunca caçado e o `bred` (bicho de
  cria conta?). Mob **sem página não está no bestiário** — e um mod pode dar página a um mob do jogo que não tem.
- **`ctx.progress.highlight(path, new MinhaEntrada())`** (`HighlightType`) = uma entrada do rodízio do **Destaque do
  Dia**: o `mode` que vai ao topo do painel naquele dia, o `text` do cartão e, nos dias virados, o **um** número da
  tabela daquele modo que a virada troca (`field`/`from`/`to`, os três juntos). **A ordem de registro É o rodízio.**

```js
import { BestiaryType, GoalType, HighlightType, ModInitializer, StatType } from './mineclaude-sdk.js';

class Pedras extends StatType { scope = ['total', 'day', 'week']; dayOffsetMs = 0; weekStart = 0; }
class Corrida extends StatType { kind = 'record'; better = 'lower'; }
class DezPedras extends GoalType { stat = 'pedra'; n = 10; text = 'Quebre 10 pedras'; pool = 'debut'; }
class PaginaDoCachorro extends BestiaryType {
  mob = 'mineclaude:dog'; group = 'comum'; tiers = [5, 25, 100]; hint = 'anda com quem o domou';
}
class SumoLeve extends HighlightType { mode = 'sumo'; field = 'push'; from = 2; to = 3; text = 'empurrão e meio'; }

ctx.progress.stat('pedra', new Pedras());
ctx.progress.stat('corrida', new Corrida());
ctx.progress.goal('dez_pedras', new DezPedras()); // depois da estatística que ela lê
ctx.progress.bestiary('cachorro', new PaginaDoCachorro());
ctx.progress.highlight('sumo_leve', new SumoLeve());

if (ctx.isServer()) {
  const pedra = ctx.progress.of('meu_mod:pedra'); // só o do PRÓPRIO mod
  ctx.events.on('blockBreak', (e) => { if (!e.cancelled) pedra.add(e.player, 1); });
  pedra.get(e.player, 'day');  // o número do dia; 'total' e 'week' também, e por uuid de conta OFFLINE
  ctx.progress.of('meu_mod:corrida').offer(e.player, ms); // recorde: guarda a melhor marca
}
```

Onde um gancho recebe uma conta, ele recebe **`e.progress`** junto: `get('mod:stat', escopo?)` devolve o número (0 =
nada guardado) e nome que ninguém registrou é **erro**, não `undefined`. É a vista certa, e é por ela que a marca da
Capa do Percurso lê `mineclaude:parkour_best` — o `e.account.get(campo)` cru segue existindo como saída de emergência
para um número que ainda não tem registro.

Uma estatística que declara `group` (`'mundo'`, `'minigames'`) entra na tabela de eventos das Metas do Dia pelo
caminho curto, que por isso é **único entre mods**. As listas que o motor deriva desses registros (as metas, o
rodízio, as páginas e as capas) são montadas antes dos mods no servidor; por isso o motor as monta **de novo** no fim
da carga dos mods, e é o que faz a meta, a entrada de rodízio, a página e a capa de um mod mudarem o jogo no servidor
também.

A regra que não pode cair: **capa não muda nada de jogo.** O validador aceita só esses campos — um `damage`, `reach`,
`hp` ou `speed` numa capa é recusado no boot. As 6 capas e a marca do jogo são classes do mod base, uma por arquivo;
o mod de exemplo é o `capa_extra`. Capa ainda **não tem `modify`**: um mod acrescenta capa, não muda a de outro.

### 16.16 Efeitos de status: `ctx.effects` / `EffectType`

O `StatusEffect` do Fabric. Registre nos dois lados, na mesma ordem (a rede manda o id):

```js
import { EffectType } from './mineclaude-sdk.js';
export default class Energizado extends EffectType {
  name = 'Energizado';
  color = '#68fff0';          // cor do ícone no HUD
  beneficial = true;          // borda verde (false: vermelha)
  every = 1;                  // intervalo do onTick em segundos (0,25..60)
  attributes = [{ attribute: 'mineclaude:movement_speed', amount: 0.25, operation: 'add_multiplied_total' }]; // por nível; ver 16.17
                              // (o jeito antigo { speed: 1.25, attack, defense } continua valendo: é açúcar para esses atributos)
  onApply(e) {}               // e: { player, effect, level, seconds, world, server } — só no servidor
  onTick(e) {}
  onRemove(e) {}
}
ctx.effects.register('energizado', new Energizado());
```

No jogador: `e.player.addEffect('mod:efeito', segundos, nível?)` (até 3600 s, nível 1..10, no máximo 16 ativos; nível maior
substitui, no mesmo nível vale o tempo maior, menor é ignorado), `removeEffect`, `hasEffect`, `effects()` e `heal(n)`.
A morte limpa tudo (com `onRemove`). O cliente mostra os efeitos no canto com o tempo restante. Admin:
`/efeito <efeito> [segundos] [nível] [jogador]` e `/efeito limpar [jogador]`. Exemplo: o mod `cristal_lab`
(a bateria dá Energizado). Ao sair, os efeitos ficam salvos na conta pelo nome, com o tempo que faltava, e voltam na
entrada sem rodar `onApply` de novo; efeito de mod removido é descartado.

### 16.17 Atributos de entidade: `ctx.attributes` / `AttributeType`

O `EntityAttribute` / `AttributeInstance` / `AttributeModifier` do Fabric. O motor só tem o mecanismo; **quem define os
atributos do jogo é o mod base** (uma classe por arquivo) e o seu mod pode registrar outros
(nos dois lados, na mesma ordem):

```js
import { AttributeType } from './mineclaude-sdk.js';
export default class Sorte extends AttributeType {
  name = 'Sorte';
  default = 0; min = -10; max = 10;   // o valor final é sempre limitado a min..max
  sync = true;                        // manda o valor ao navegador do jogador (precisa quando o cliente prevê algo com ele)
}
ctx.attributes.register('sorte', new Sorte());   // 'meumod:sorte'
```

Um atributo pode declarar o **papel** que ocupa (`role`): é por papel que o motor pergunta pelos atributos que ele
mesmo lê — `attributeOfRole('max_health')` em vez do nome `mineclaude:max_health` —, **no servidor e no navegador**
(a tabela de papéis é uma só, igual nos dois lados), do mesmo jeito que pergunta em que
grupo nasce um mob `hostile` e onde fica a área `lobby`. São catorze papéis, todos do mod base, um por papel no jogo
inteiro; um atributo seu normalmente **não** declara nenhum (ele vale em efeito, item e `player.attributes` sem que o
motor precise conhecê-lo).

**Conta:** valor = `limita(min, max, (base + soma(add_value)) × (1 + soma(add_multiplied_base)) × produto(1 + add_multiplied_total))`,
a ordem do Minecraft, não importa a ordem em que os modificadores foram postos. O valor é calculado na hora de usar (nada fica
em cache): o efeito acabar ou trocar de item vale na hora.

**Atributos do mod base** (os valores padrão são os de sempre: sem mods o jogo se comporta igual):

| Atributo | Padrão (min..max) | O que muda de verdade |
|---|---|---|
| `mineclaude:max_health` | 20 (1..1024), `sync` | teto da vida, cura, regeneração, comer, renascer, lobby, estadia, partidas e a barra de corações (corações extras empilham); baixar o máximo corta a vida na hora. Todos os lugares que "enchem a vida" leem este atributo |
| `mineclaude:max_hunger` | 20 (1..1024), `sync` | teto da fome (papel `max_hunger`): comer, renascer, lobby, estadia, partidas, bots, a conta salva e a barra de comida (um ícone por 2 pontos, como os corações); baixar o máximo corta a fome na hora. `e.player.maxHunger` devolve este valor |
| `mineclaude:movement_speed` | 1 (0,2..3), `sync` | multiplicador do andar/correr: o cliente anda com ele e o servidor alarga o limite de velocidade junto |
| `mineclaude:jump_strength` | 1 (0..2), `sync` | multiplicador do impulso do pulo (soma com o `jumpFactor` do bloco; o produto vai até 2, o máximo que o anti-voo autoriza); o servidor autoriza a altura maior. Criativo e voo ignoram |
| `mineclaude:attack_damage` | 1 (0,2..3) | multiplicador do dano corpo a corpo (o `damage` do item na mão, ou 1 sem item) |
| `mineclaude:armor` | 1 (0,2..3) | multiplicador do dano recebido (a antiga `defense`: 0,5 = metade), antes dos pontos de armadura |
| `mineclaude:block_reach` | 6 (1..32), `sync` | alcance de quebrar/pôr/usar bloco: o servidor confere a edição com ele e o cliente mira com ele |
| `mineclaude:entity_reach` | 4,5 (1..16), `sync` | alcance do golpe em jogador/mob; o `weapon.reach` do item sobe ou desce na mesma medida |
| `mineclaude:knockback_resistance` | 0 (0..1) | fração do empurrão que o jogador ignora (1 = não sai do lugar) |

**Atributos de corpo e movimento** do mod base, lidos pelo motor **em mob e em jogador** (os quatro de baixo):

| Atributo | Padrão (min..max) | O que muda de verdade |
|---|---|---|
| `mineclaude:mob_movement_speed` | 1 (0..32) | o passo do mob em blocos/s (o `speed` do tipo é o base) |
| `mineclaude:mob_attack_damage` | 0 (0..1000) | o dano do golpe/toque do mob (o `damage` do tipo é o base) |
| `mineclaude:gravity` | 1 (0..4), `sync` | fator na gravidade da queda (o `gravity` do tipo é o base do mob). No jogador: a gravidade com que o navegador cai e a que o anti-voo do servidor exige |
| `mineclaude:step_height` | 0,5 (0..2), `sync` | que altura o corpo sobe sem pular. No jogador: a colisão do navegador e a folga de subida que o `move` autoriza |
| `mineclaude:safe_fall_distance` | 3 (0..256), `sync` | quantos blocos o corpo cai sem se machucar (no jogador, no pouso de todo `move`) |
| `mineclaude:scale` | 1 (0,2..4), `sync` | fator no corpo: colisão, golpe e célula ocupada no servidor; no jogador também a caixa e o olho (câmera e mira) no navegador |

`max_health`, `armor` e `knockback_resistance` são os mesmos do jogador e valem nos dois. `movement_speed` e
`attack_damage` do jogador são **multiplicadores** e por isso o mob tem o par próprio acima. A tabela `attributes` do
tipo de mob, o `mob.attributes`, o efeito em mob e os seis eventos de efeito estão nos tipos
`./types/mineclaude-mod`. O lado **jogador** dos quatro atributos de movimento (como o servidor valida o envelope, o
perfil de movimento e os modos, incluindo `ctx.movement.wrap`, que embrulha o `travel` de um modo do jogo) é
`ctx.movement` — ver [ctx.md](ctx.md).

**Fontes declarativas.** Efeito e item declaram `attributes: [{ attribute, amount, operation, slot? }]` (nome completo do atributo):

```js
class Vigor extends EffectType { name = 'Vigor';
  attributes = [{ attribute: 'mineclaude:max_health', amount: 10, operation: 'add_value' }]; } // +10 por nível, enquanto dura
class Amuleto extends ItemType { name = 'Amuleto'; icon = 'gem'; stack = 1;
  attributes = [{ attribute: 'mineclaude:movement_speed', amount: 0.1, operation: 'add_multiplied_total', slot: 'mainhand' }]; }
```

`slot` (só em item): `mainhand` (na mão), `offhand` (mão esquerda), `armor` (qualquer peça vestida), `head` / `chest` / `legs` / `feet`.
Sem `slot`: um item comum vale na mão e uma armadura vale vestida (o comportamento de sempre). No efeito o `amount` vale uma vez por nível.
Os antigos `attributes = { speed, attack, defense }` (multiplicadores 0,2..3) seguem funcionando: são açúcar para
`add_multiplied_total` em `movement_speed`, `attack_damage` e `armor`.

**No jogador (servidor)** — `e.player.attributes`:

- `get(nome)`: o valor final; `base(nome)` / `setBase(nome, v)`: o valor base (salvo na conta); `names()`.
- `addModifier(nome, { id, amount, operation, persistent? })`: o mesmo `id` substitui o anterior (devolve se substituiu); até 32 por
  atributo; `persistent: true` guarda na conta (volta no próximo login junto com o valor base). `removeModifier(nome, id)`,
  `hasModifier(nome, id)`, `modifiers(nome)`.
- Atributo ou operação desconhecidos lançam erro claro. Atributo de mod removido é descartado ao carregar a conta.

Rede: os atributos `sync` chegam ao navegador na mensagem `attr` sempre que o valor muda.

### 16.18 Vitais no jogador e no mob

Em `e.player` (servidor): `health` / `maxHealth` (o atributo `max_health`) / `setHealth(n)` (0 mata pelas regras de dano),
`heal(n)`, `damage(n, fonte?)` (a fonte é um tipo de dano, ver 16.20; padrão `'mod'`), `hunger` / `maxHunger` / `setHunger(n)`,
`exhaustion` / `setExhaustion` / `addExhaustion` (o jogo não tem saciedade separada: a exaustão é o que vira fome),
`air` / `maxAir` / `setAir(n)` (fôlego em segundos), `inLiquid` e `insideSolid` (cabeça em líquido / dentro de bloco),
`velocity` (estimada pelas duas últimas posições, em blocos/s: o movimento é do navegador), `push(x, y, z)` e
`setVelocity({x,y,z})` (impulso `kb`: o navegador soma x e z e fixa y; a resistência a empurrão vale),
`gamemode` (`'survival'` | `'creative'`), `dead`, `respawn()` (traz de volta um jogador morto; `false` se vivo),
`armorPoints`, `wearArmor(n)`, `damageItem(slot = 'held', n = 1)` (gasta a durabilidade da pilha pela regra do item; `true` se quebrou) e `dropAll()` (larga inventário, armadura e mão esquerda aos pés).
Em `e.mob` / `MobInfo`: `health`, `maxHealth`, `dead`, `damage(n)` (passa pelas regras do mob: `allowDamage`, `onHit`, `onHurt`,
drops, eventos de morte; sem direção, só um pulinho), `heal(n)`, `velocity`, `setVelocity(v)`, `push(x, y, z)`.

### 16.19 Regras de jogo: `ctx.rules` / `GameRuleType`

O `GameRuleBuilder` do Fabric (`fabric-game-rule-api-v1`; o antigo `GameRuleRegistry` saiu do Fabric). O motor só guarda o
mecanismo; **as regras do jogo são do mod base** (uma classe por arquivo) e o seu mod registra as dele (nos dois lados,
na mesma ordem):

```js
import { GameRuleType } from './mineclaude-sdk.js';
class Pontos extends GameRuleType { name = 'Pontos'; type = 'integer'; default = 3; min = 0; max = 10; sync = true; }
ctx.rules.register('pontos', new Pontos());                       // ou o objeto { type, default, min?, max?, sync? }
ctx.rules.register('flag', { type: 'boolean', default: false });
ctx.rules.get('pontos');                                          // o valor de agora; 'keep_inventory' lê a do jogo
```

Tipos: `boolean`, `integer`, `number` (min/max valem para os dois últimos) e `enum` (o `GameRuleBuilder.forEnum` do Fabric):
`{ type: 'enum', choices: ['facil', 'normal', 'dificil'], default: 'normal' }`. `choices` são 1 a 32 textos `[a-z0-9_]` sem repetir, o
`default` **tem** de ser um deles, `min`/`max` não valem, e `/gamerule <regra> <valor>` (e `server.rules.set`) só aceita um dos `choices`
— ao errar, a mensagem lista os válidos. O valor é salvo no mundo, vem por `GAME_RULES` e vai aos navegadores (`sync`) como qualquer outro.
`category` (opcional, texto `[a-z0-9_]` até 32; o `GameRuleCategory` do Fabric) só rotula a regra e sai em `server.rules.describe`. Como o
valor de um `enum` é texto, `ctx.rules.get` devolve `string` nele. `server.rules.get(nome)` / `set(nome, valor)` / `names()` /
`describe(nome)`: o `set` valida, **salva no mundo** (só o que um admin mudou) e, se a regra é `sync`, manda a
mensagem `rules` aos navegadores (também ao entrar), onde `ctx.rules.get` lê o valor. Admin: `/gamerule [regra] [valor]`
(classe do mod base). Padrão por ambiente: `GAME_RULES="mineclaude:keep_inventory=true,meumod:pontos=5"` (nomes completos);
o antigo `KEEP_INVENTORY=true` vale para `mineclaude:keep_inventory`. O valor salvo no mundo vence o do ambiente.
Regras do jogo: `keep_inventory`, `fall_damage`, `fall_damage_multiplier`, `drowning_damage`, `natural_regeneration`,
`hunger_seconds`, `regeneration_seconds`, `starvation_seconds`, `cactus_damage`, `armor_reduction`, e os **custos de exaustão**
(abaixo).

**Papel (`role`) e custo de exaustão.** Uma regra `number` pode tomar um PAPEL: um significado que o motor lê sozinho, sem escrever o
nome da regra do jogo (uma regra por papel; sem regra no papel, o motor lê **0**, não inventa número). Os papéis são os custos de
exaustão, o que cada ação gasta de fome (1 de exaustão = 1 ponto de fome; no Fabric, os `EXHAUSTION_*` do `HungerManager` /
`PlayerEntity`): `exhaustion_break_block` (por bloco quebrado em sobrevivência; Fabric `EXHAUSTION_MINING`), `exhaustion_walk` (por bloco
andado; `EXHAUSTION_WALKING`; correr e pular não se distinguem: o movimento é do navegador), `exhaustion_dodge` (por esquiva) e
`exhaustion_regeneration` (por ponto de vida regenerado; `EXHAUSTION_REGEN`, lido pelo sistema de regeneração do mod base). O mod base declara
`mineclaude:exhaustion_break_block` 0.025, `exhaustion_walk` 0.003, `exhaustion_dodge` 0.3 e `exhaustion_regeneration` 0.4. Um mod muda um
custo pelo `modify` do registro (que já existe: `default`, `min`, `max`) e um admin com `/gamerule`:

```js
ctx.rules.modify('mineclaude:exhaustion_walk', { default: 0.006 });   // andar cansa o dobro
```

O papel (`role`) não se muda pelo `modify` (é a identidade da regra).

### 16.20 Tipos de dano: `ctx.damage.type` / `DamageType`

O `DamageType` do Fabric. O motor só lê as flags; **os tipos do jogo (queda, cacto, zumbi, afogamento...) e as mensagens de morte
são classes do mod base** (uma por arquivo). Registro (servidor):

```js
import { DamageType } from './mineclaude-sdk.js';
class Acido extends DamageType {
  name = 'Ácido';
  armored = true;   // a armadura reduz (e gasta)
  shield = false;   // um escudo levantado pode bloquear
  pvp = false;      // jogador contra jogador: marca combate, sem fogo amigo, vale a trégua
  deathMessage(e) { return `${e.player} derreteu`; }   // e = { player, attacker, cause, mobName } (nomes); ou deathMessage = '{player} foi vencido por {attacker}'
}
ctx.damage.type('acido', new Acido());      // ou ctx.damage.type('acido', { armored: true, deathMessage: '...' })
e.player.damage(5, 'mymod:acido');          // a fonte: nome completo, ou o curto do jogo ('fall', 'cactus', 'zombie'...)
```

`prefix` (ex.: `'mob:'`) faz o tipo valer para toda causa que comece com isso (o tipo `modmob` do jogo cobre o golpe de mob de mod).
Sem tipo (causa desconhecida do jogo) o dano é simples: nada o reduz e a morte vira "<nome> morreu".

### 16.21 Sistemas do jogador: `ctx.systems` / `PlayerSystemType`

As regras de vida do jogo não estão no motor: **fome, regeneração, inanição, afogamento, sufocamento, cacto, redução por armadura,
regras de queda e drops da morte são classes do mod base**, lendo as regras de jogo (16.19).
O motor só roda os sistemas: o laço por jogador (vivo, em survival, na sala do mundo) chama cada `tick`, o dano passa pelos
`modifyDamage`, a morte chama `onDeath` (onde caem os itens) e o renascer chama `onRespawn`.

```js
import { PlayerSystemType } from './mineclaude-sdk.js';
class Frio extends PlayerSystemType {
  order = 5;            // menor roda primeiro (padrão 0); empate: ordem de registro
  every = 20;           // a cada N ticks (padrão 1; o jogo roda a 20 Hz)
  needsAlive = false;   // true: pula quem morreu antes, neste mesmo tick
  tick(player, dt, tick, world) { if (player.pos.y > 80) player.damage(1, 'mymod:frio'); }
  modifyDamage(e) { return e.type?.armored ? Math.ceil(e.amount / 2) : undefined; }   // e = { player, amount, type, cause, attacker }; devolve o novo dano
  onDeath(e) { /* depois de anunciada a morte */ }
  onRespawn(e) {}
}
ctx.systems.register('frio', new Frio());
ctx.systems.disable('mineclaude:hunger');                  // desliga um sistema de qualquer mod, o do jogo inclusive
ctx.systems.replace('mineclaude:regeneration', new Minha()); // ocupa o lugar dele
```

**Trocar e embrulhar em cadeia** (`ctx.systems.replace` / `ctx.systems.wrap`, como `ctx.rooms.wrap`): `replace(nome, def, { priority })` aceita também uma função `(previous) => def`, em que `previous` tem os ganchos do que estava antes (o do jogo, ou o de um mod anterior) para chamar: `ctx.systems.replace('mineclaude:hunger', (previous) => ({ every: 20, tick(p, dt, t, w) { previous.tick(p, dt, t, w); /* e o meu */ } }))`. `wrap(nome, { gancho: (e, previous) => ... }, { priority })` vai em volta de um gancho e deixa o resto como estava (`previous` é sempre o ÚLTIMO argumento; `previous()` sem argumento repete os que o embrulho recebeu; não chamá-lo troca o gancho), por exemplo `tick: (player, dt, tick, world, previous) => previous()`. Ordem: `priority` crescente, depois a ordem de carga; o último aplicado fica por cima (um `replace` descarta os `wrap` aplicados antes dele). Dois mods diferentes trocando o MESMO alvo geram um AVISO no log e entram no rastro de `contentModifications.trail()`. Sem mod nenhum, o jogo é idêntico. No sandbox continua fechado (recebe função).

Os do jogo: `mineclaude:hunger`, `regeneration`, `starvation`, `drowning`, `suffocation`, `cactus`, `armor_reduction`, `fall_damage`,
`death_drops`, `respawn` e `food`.

**Renascer e comer** também são regra do jogo, em quatro ganchos a mais do mesmo `PlayerSystemType` (o motor só aplica o que
eles respondem e teleporta):

```js
class Santuario extends PlayerSystemType {
  order = -5;                                  // antes da regra do jogo (que olha a cama)
  respawnPoint(e) {                            // onde volta: { x, y, z } decide; nada deixa o que os anteriores escolheram (e.spawn)
    const s = e.player.spawnPoint;             // o ponto guardado na conta (player.setSpawnPoint)
    if (s && e.world.getBlock({ x: s.x, y: s.y - 1, z: s.z }, { load: true }) === 'meu_mod:santuario') return { x: s.x, y: s.y, z: s.z };
  }
  respawnState(e) { return { health: 10, hunger: 7 }; }   // com que vida / fome / exhaustion / air volta (campos que faltam: cheios)
  canEat(e) { return e.alwaysEdible || e.player.hunger < 20; }          // false: não come (nada é gasto)
  eat(e) { return { hunger: e.food * 2, heal: 1 }; }                    // o que a comida faz (somado, limitado pelo motor)
}
```

`respawnPoint` roda em ordem de `order`; cada sistema vê `e.spawn` (o que os anteriores decidiram, ou `null`) e `e.world`; sem
resposta de ninguém o motor usa o spawn do mundo. A regra do jogo (`mineclaude:respawn`) só olha a cama quando `e.spawn` é
`null`: esquece um ponto cuja cama sumiu (com o aviso de sempre) e nada mais. `respawnState` aplica sem mandar `stats` (o
renascer manda o seu); o motor nunca deixa voltar com 0 de vida, mesmo sem nenhum sistema. `canEat`/`eat`: no mundo a comida
enche a fome e não se come de barriga cheia; no duelo e nas partidas (sem fome) cura metade do valor. Troque com
`ctx.systems.replace('mineclaude:food', new Minha())`. O que fica no motor: a espera entre comidas, o evento `allowEat`, a
pilha, os `foodEffects` e o `onEaten`.

Estado do ponto de renascer no `PlayerApi` (uma cama, uma fogueira, um santuário): `player.spawnPoint`
(`{ x, y, z, dimension } | null`), `player.setSpawnPoint(pos, dimension?)` (guarda na conta; `false` num bot),
`player.clearSpawnPoint()`. O jogo não tem "dormir" (a noite não pula): quem quiser pula a noite com `world.setTimeOfDay`.

Para blocos de várias células e portas: `world.isSolid(pos, { load? })` (bloco sólido que colide), `world.isOccupied(pos, name?)`
(jogador ou mob dentro da célula; `name` = o bloco que iria ali), `world.getBlock(pos, { load: true })` (lê e gera o chunk que não
está na memória, como o `getBlockState` do Fabric; sem `load` devolve `null` fora da memória), `player.resyncBlock(pos)` (devolve
a ESTE jogador o bloco de verdade) e `player.canEdit(pos)` (o lobby é protegido; na partida só dentro da área). `disable` / `replace` valem mesmo se o mod que os registra carrega depois (o jogo base é carregado por último); nome que não
existe é avisado no log e ignorado. Um sistema que lança erro 3 vezes seguidas é desligado (uma linha no log). Ordem do dano no
motor: `allowDamage` (pode mudar `e.amount`), encantamentos, atributo `armor`, `modifyDamage` dos sistemas, o dano. As flags
(`armored`, `shield`, `pvp`) vêm do tipo de dano. O que continua no motor: a queda medida (com o `fallDamageMultiplier` do
bloco), o `combatlog` (anti-fuga) e as contas de morte/abates.

### 16.22 Eventos ampliados (`ctx.events.on`)

Hoje são **89 eventos de servidor e 34 de cliente**; estes, no padrão do Fabric: `allow*` cancelam (`e.cancel()`), os que mudam valor aceitam o novo valor em `e.amount` /
`e.spawn` / `e.blocks`, `after*` só observam. Prioridade como sempre (`{ priority }`, maior primeiro; quem vem depois vê `e.cancelled`).
Cada um só roda se algum mod escuta (custo zero sem ouvintes).

> A lista completa e sempre em dia está nos tipos do mod: `EventMap` e `ClientEventMap` em `./types/mineclaude-mod`.

| Evento | Campos | Quando |
|---|---|---|
| `allowDamage` | `amount` (**editável**; 0 = sem dano), `cause`, `attacker` | antes de qualquer redução (já existia: agora altera o valor) |
| `modifyDamage` | `amount` (**editável**) | o valor final, depois dos encantamentos, do atributo `armor` e dos sistemas (arredondado em pontos inteiros) |
| `playerRespawn` | `spawn` `{x,y,z}` (**editável**) | ao renascer, antes de teleportar |
| `allowItemPickup` / `itemPickup` | `item`, `n` | item no chão ao alcance (cancelar o deixa no chão) / depois de pegar |
| `allowItemDrop` / `itemDrop` | `item`, `n`, `slot` | o jogador joga itens fora |
| `allowEat` / `afterEat` | `item`, `food` | comer (cancelar não gasta o item) |
| `allowCraft` / `afterCraft` | `recipe`, `out`, `n` | fabricar (receita e grade; cancelar não gasta nada) |
| `allowHotbarChange` / `hotbarChange` | `from`, `to` | antes da troca do slot da mão (cancelar devolve o slot) / depois |
| `attackBlock` / `blockBreakCanceled` | `pos`, `block`, `item` (+ `reason`) | clique esquerdo num bloco antes de quebrar (cancelável) / uma quebra que um mod recusou |
| `attackEntity` / `useEntity` | `target` (`{ mob, player }`), `item` | golpe / clique direito em mob ou jogador, antes da ação do jogo (canceláveis) |
| `pickBlock` / `pickEntity` | `pos`, `block` / `target` | botão do meio (canceláveis; liberado no bloco, o servidor escolhe o slot) |
| `serverStarted` / `serverStopping` | | ao subir e ao desligar |
| `serverTick` / `worldTick` | `tick`, `dt` (+ `dimension`) | todo tick do jogo (20 Hz), uma vez / uma por dimensão |
| `explosionStart` | `pos`, `kind`, `source`, e editáveis `radius`, `damage`, `damageRadius`, `knockback` | antes de a explosão escolher as células (cancelável): é onde um mod troca o raio da TNT |
| `explosion` | `pos`, `power` (o raio), `kind` (`keg`/`tnt` os do jogo; o nome do bloco ou o `kind` declarado nos de mod), `source`, `blocks` (**editável: tire entradas para proteger**) | antes de abrir o buraco; cancelar impede tudo |
| `afterExplosion` | `pos`, `power`, `kind`, `source`, `blocks` (os que saíram) | depois |
| `allowMobSpawn` / `mobSpawn` | `mob`, `pos`, `reason` (`natural`, `breed`, `summon`, `structure`) | antes (cancelável) / depois de nascer |
| `allowFluidFlow` | `fluid`, `from`, `to`, `dimension`, `block` (o que há em `to`) | antes de um fluido (água, lava, de mod) cair ou escorrer para `to` (cancelável; cancelar impede só aquele passo, o resto da água segue). Só no servidor, **fechado ao sandbox** (é respondido e roda em cada passo do fluxo). Sem ouvinte não custa nada |
| `chunkLoad` | `cx`, `cz`, `dimension` | chunk pronto (gerado ou lido) |
| `blockChange` | `pos`, `from`, `to`, `dimension` | qualquer mudança de bloco, a da física incluída |
| `blockGrow` | `pos`, `from`, `to` | um bloco prestes a crescer por `world.growBlock` (o trigo do jogo, a plantação de um mod); cancelável |
| `gameRuleChanged` | `name`, `value`, `old` | um admin mudou uma regra (16.19) |

### 16.23 Eventos de cliente (`ctx.events.on` no navegador)

O mesmo `ctx.events.on`, com os eventos **da página**, no modelo dos `Client*Events` do Fabric. Registre numa entrada
`client` (ou numa `main`: cada lado ignora os eventos do outro). Mod de exemplo: `eventos_cliente`.

> A lista completa e sempre em dia está no `ClientEventMap` dos tipos do mod (`./types/mineclaude-mod`).

| Evento | Campos | Quando |
|---|---|---|
| `clientTickStart` / `clientTickEnd` | `dt`, `rawDt`, `time`, `playing` | começo e fim do quadro (o quadro é o tick do cliente), também na tela inicial |
| `clientWorldTickStart` / `clientWorldTickEnd` | + `dimension` | a parte do quadro que precisa de mundo |
| `clientChunkLoad` / `clientChunkUnload` | `cx`, `cz`, `dimension` | o chunk apareceu na tela / foi descartado |
| `clientEntityLoad` / `clientEntityUnload` | `kind` (`mob`/`player`), `id`, `type`, `name`, `x`, `y`, `z` | mob ou outro jogador entrou / saiu da vista |
| `clientBlockEntityLoad` / `clientBlockEntityUnload` | `x`, `y`, `z`, `block` | bloco com renderer de bloco-entidade conhecido / descartado |
| `clientStarted` / `clientStopping` | `time` / `reason` | primeiro quadro da página / a página está saindo |
| `clientConnectionInit` / `clientJoin` / `clientDisconnect` | `name`, `id`, `dimension` / `reason` | conectou (antes do mundo) / já está no jogo / caiu |
| `allowReceiveChat` (cancelável) / `modifyReceiveChat` (`e.text`) / `receiveChat` | `text`, `from`, `color`, `private`, `to` | linha de chat de um jogador chegou |
| `allowReceiveGameMessage` / `modifyReceiveGameMessage` / `receiveGameMessage` | `text`, `overlay` | aviso do servidor chegou |
| `allowSendChat` / `modifySendChat` / `sendChat` | `text` | o jogador enviou uma linha de chat |
| `allowSendCommand` / `modifySendCommand` / `sendCommand` | `command` (**sem** a barra) | o jogador enviou um comando |

Cancelar um `allow*` impede o `modify*` e o evento puro (a linha não aparece, ou não é enviada). Como no servidor,
`cancel()` não interrompe os outros handlers. Nos eventos de quadro, chunk, entidade e bloco-entidade há orçamento de
tempo (1 ms por mod, 2 ms no total por quadro) e o handler que falha 8 vezes é desligado até a página recarregar.

### 16.24 Ciclo de vida, mundo, entidade e mensagem (`ctx.events.on`)

A outra metade dos `Server*Events` do Fabric: o começo e o fim do servidor, o save, a dimensão, o chunk que sai da
memória, o mob que vai embora, a armadura, o bloco-entidade, o renascer e as linhas de chat que o **servidor** manda.
Mesmas regras de sempre: prioridade (`{ priority }`, maior primeiro), cancelável onde o Fabric tem ALLOW, erro isolado
por mod e custo zero sem ouvintes. Mod de exemplo: `ciclo_de_vida`.

> A lista completa e sempre em dia está no `EventMap` dos tipos do mod (`./types/mineclaude-mod`).

| Evento | Fabric | Campos | Quando |
|---|---|---|---|
| `serverStarting` | `ServerLifecycleEvents.SERVER_STARTING` | `mods` (os ids carregados) | os mods carregaram e **nenhuma dimensão existe** — é o **único** evento sem `e.world` e sem `e.server` |
| `serverStarted` / `serverStopping` | `SERVER_STARTED` / `SERVER_STOPPING` | | já existiam: o `listen()` e o começo do encerramento |
| `serverStopped` | `SERVER_STOPPED` | `reason` | a última linha do servidor, depois do save e de todo `worldUnload` |
| `beforeSave` / `afterSave` | `BEFORE_SAVE` / `AFTER_SAVE` | `reason` (`interval`/`shutdown`/`command`), `saving` (`{ world, accounts }`), `dimensions` | em volta de cada rodada de save. O campo é `saving` e não `world` porque `e.world` já é o `WorldApi`; hoje toda rodada escreve os dois, então os booleanos **informam**, não desligam nada |
| `worldLoad` / `worldUnload` | `ServerLevelEvents.LOAD` / `UNLOAD` | `dimension` | uma por dimensão, com `e.world` sendo a **dela** (não a do Overworld) |
| `chunkUnload` | `ServerChunkEvents.CHUNK_UNLOAD` | `cx`, `cz`, `dimension` | o chunk gerado saiu do cache do servidor (teto de 1.024 por dimensão); `chunkLoad` é a outra metade |
| `entityUnload` | `ServerEntityEvents.ENTITY_UNLOAD` | `mob`, `mobId`, `pos`, `reason` (`death`/`distance`/`removed`), `dimension` | o mob saiu do mundo. Quando o handler roda ele **já não está** na lista de mobs: `mob` é o nome do tipo e `pos` a última posição |
| `entityTrackStart` / `entityTrackStop` | `EntityTrackingEvents.START_TRACKING` / `STOP_TRACKING` | `player` (quem olha), `entity` (`MobInfo` ou o jogador), `kind` (`mob`/`player`); o `Stop` traz `reason` (`range`/`removed`/`dimension`/`disconnect`) | `player` passou a ver / deixou de ver `entity`, pela **mesma regra** das listas `mobs` e `state` que o navegador recebe (mesma dimensão, dentro da distância de visão em x e z; espectador de partida nunca aparece). Conferido a 10 Hz; a primeira passada depois de ligar o ouvinte manda um `Start` por entidade já à vista. Sem ouvinte não há passada nenhuma. Não vale para projétil nem item no chão, nem para observador bot |
| `equipmentChange` | `ServerEntityEvents.EQUIPMENT_CHANGE` | `slot` (`head`/`chest`/`legs`/`feet`/`mainhand`/`offhand`), `from`, `to` (`null` = vazio) | uma vez **por casa que mudou**. Levantar o escudo e carregar a bandeira não mudam casa: nada sai |
| `blockEntityLoad` / `blockEntityUnload` | `ServerBlockEntityEvents` | `pos`, `block`, `dimension` | a entrada de bloco-entidade (o que guarda `data`, o inventário e o tick) entrou na memória / saiu dela: ao colocar um bloco que declara `onEntityLoad`/`onEntityTick`/`onEntityUnload`, ao guardar o primeiro item num bloco com `inventory`, ao ler o mundo do disco, e ao trocar o bloco por outro. Regravar o dado de uma entrada que já está lá **não** é um `load` |
| `playerCopyFrom` | `ServerPlayerEvents.COPY_FROM` | `from` (`{ health, hunger, air, pos, dimension }`), `alive` | ao renascer, no fim. Aqui o jogador **não troca de instância**: `from` é a foto de antes de o motor zerar os vitais e teleportar, e `e.player` é ele já de volta. `alive` é sempre `false` (o único caminho até aqui é morrer) |
| `mobTarget` (cancelável) | o `LivingChangeTargetEvent` do **Forge** (o Fabric não tem) | `mob`, `mobId`, `target`, `previous` (ambos `{ mob, player }` ou `null`), `reason` (`hurt`/`found`/`giveup`) | o alvo **persistente** de um mob mudou: o jogador que deixou o javali ou o cachorro bravo, ou o mob que o cachorro domado morde. Cancelar deixa o mob **sem** alvo |
| `chatMessage` | `ServerMessageEvents.CHAT_MESSAGE` | `text` | a linha que o jogador digitou **saiu** (o `chat` de sempre é o `ALLOW_CHAT_MESSAGE` dela) |
| `allowGameMessage` (cancelável) / `modifyGameMessage` (`e.text`) / `gameMessage` | `ALLOW_GAME_MESSAGE` / `GAME_MESSAGE` | `text`, `title?`, `vote?` | um aviso do servidor saindo para **um** jogador |
| `allowCommandMessage` / `modifyCommandMessage` / `commandMessage` | `ALLOW_COMMAND_MESSAGE` / `COMMAND_MESSAGE` | `text`, `command`, `title?`, `vote?` | o mesmo, enquanto um **comando** roda: é a resposta dele. `command` é o nome digitado, sem a barra |

Nas linhas de mensagem o handler recebe o texto **como o jogador vai ler** (já resolvido na língua dele), e o
que ele escrever em `e.text` vale como texto puro — um mod nunca precisa saber de texto traduzível. Linha vazia depois
do `modify*` é o mesmo que cancelar. Um `systemAll` (a linha para todos) sai uma vez **por leitor**, como no Fabric, em
que cada jogador recebe o seu pacote; sem nenhum ouvinte o caminho é o de antes, um JSON só.

**Os campos estruturados da linha** (o aviso grande `title` `{ big, small }` e a barra de notas `vote`
`{ owner, secs }` | `false`) vão no evento ao lado do `text`, **editáveis como ele** (o `ALLOW_TITLE`/`MODIFY_TITLE` do
Fabric): um mod que traduz ou censura a linha traduz ou censura também o `e.title`; trocar o campo o troca, atribuir
`null` o tira, e o que sobra em `e.title`/`e.vote` é o que vai (passa pela mesma limpeza de sempre: lixo some,
`big` até 200 e `small` até 300 caracteres). Só existem quando a linha os tem. A marca de **administrador** do
`/op`/`/deop` **não é texto de chat**: viaja na mensagem própria `admin` = `{ on }`, que nenhum evento
de mensagem vê nem cancela, então um mod que cancela a linha do `/op` não impede o navegador de marcar o admin.

Não existem, porque o jogo não tem o mecanismo:

- **`blockBurn`** (queimar bloco): não há fogo neste jogo. Não existe bloco de fogo nem propriedade de inflamável,
  e o que acende (TNT, barril de pólvora, Graveto de fogo) **explode**,
  o que já tem `explosionStart` / `explosion` / `afterExplosion`. Um mod que queira fogo registra o bloco e emite o que quiser.
- **`mobConversion`** (`ServerLivingEntityEvents.MOB_CONVERSION`): nenhum mob deste jogo vira outro. O `m.type` de um
  mob **nunca** é reatribuído (não há aldeão-zumbi que cure, nem porco que vire outro bicho); o que muda de estado é o
  filhote que cresce, o animal que é domado e o montado — tudo isso **no mesmo tipo**, com os ganchos que já existem
  (`BreedGoal`, `TameGoal`, `onMount`). Inventar um evento que nunca dispara seria pior que não ter.

**Equivalências e "não se aplica" com o Fabric:**

| Fabric | Aqui |
|---|---|
| `EntitySleepEvents` (`START_SLEEPING`, `STOP_SLEEPING`, `ALLOW_SLEEPING`, `ALLOW_BED`, `ALLOW_NEARBY_MONSTERS`, `ALLOW_RESETTING_TIME`, `ALLOW_SETTING_SPAWN`, `MODIFY_SLEEPING_DIRECTION`, `SET_BED_OCCUPATION_STATE`, `ALLOW_SLEEP_TIME`...) | **Não se aplica: o motor não tem sono.** Não existe estado "dormindo", nem pular a noite, nem monstros que impedem dormir. A cama é **conteúdo** do jogo base: o `onInteract` dela só chama `e.player.setSpawnPoint` (renascimento) e responde com mensagem. O equivalente de `ALLOW_SETTING_SPAWN` / `ALLOW_BED` é `ctx.blocks.wrap('mineclaude:bed', 'onInteract', (original, e) => ...)` (recusar antes de chamar `original` não marca o renascimento); `ctx.blocks.modify` troca o bloco. Um mod que queira dormir de verdade registra o próprio bloco e o próprio estado |
| `EntityElytraEvents` (`ALLOW`, `CUSTOM`) | **Não se aplica: não há elitro nem planar.** O jogo não tem o item, o estado de voo planado nem o evento. O que existe perto disso é o **modo de movimento** registrável (`ctx.movement.mode`): um mod que queira planar registra um `MovementModeType` com o próprio `applies`/`travel` |
| `FlammableBlockRegistry` (`fabric-content-registries-v0`) | **Não se aplica**: não há fogo nem propriedade de inflamável (ver `blockBurn` acima). O que acende, explode |
| `VibrationFrequencyRegistry` / `GameEvent` de vibração | **Não se aplica**: não há sensor de vibração nem frequências. O som é `ctx.audio`, sem "evento de jogo" que o sensor ouviria |
| `LandPathTypeRegistry` (e `WaterPathTypeRegistry`) | **Não se aplica**: o tipo de caminho (perigoso, evitado, bloqueado) não existe no motor; não há tabela de custo por tipo de bloco para a navegação dos mobs |
| `OxidizableBlocksRegistry` (e o encerar/raspar) | **Sem registro próprio.** Envelhecer com o tempo é o **tique aleatório** do bloco (`randomTicks: true` + `onRandomTick(e)` trocando o bloco); raspar/encerar com uma ferramenta é `ctx.blockTransforms.add(ferramenta, { from, to })` (o `BlockTransformerEvents` do Fabric, o mesmo que a enxada usa) |
| `VillagerInteractionRegistries` (e as trocas do aldeão) | **Equivale a `ctx.trades`**: `TradeSetType` com as ofertas por zona. Não há aldeão com profissão, nível nem "interação" (coletar, dar de comer) |

Fora deste jogo-base, estes eventos são **do servidor**: não valem para um mod em *sandbox* (o grupo `events`, como
nenhum outro grupo de eventos, não está liberado lá — ver seção 29), e o navegador tem os seus em 16.23.

## 17. Exemplo: a loja

Um bloco **Loja**: clique direito abre um painel com ofertas pagas em diamante e uma linha de HUD com o saldo. O fluxo:

1. Servidor, gancho `onInteract` do bloco: `ctx.net.send(e.player, 'open', { offers, balance })` e `return true`.
2. Navegador, `ctx.net.on('open')`: monta o painel (uma linha por oferta com `{ item }`, o texto do preço e
   `{ button: 'Comprar', onClick: () => ctx.net.send('buy', { i }) }`), abre e mostra o saldo no HUD.
3. Servidor, `ctx.net.on('buy', (player, data) => ...)`: **valida** `data.i` (inteiro, dentro da lista), cobra o
   preço (`take`), entrega (`give`; se não couber, devolve os diamantes) e responde `'balance'`.
4. Navegador, `ctx.net.on('balance')`: atualiza o HUD e a mensagem do painel.

```js
// main.js
const OFFERS = [{ item: 'mineclaude:bread', n: 4, price: 1, name: 'Pão (4)' } /* ... */];
export default function register(ctx) {
  ctx.textures.paint('shop', (t) => t.fill(['#7a5230', '#6e4a2b', '#845a35']));
  ctx.blocks.register('shop', {
    name: 'Loja', solid: true, tiles: { top: 'loja:shop', side: 'loja:shop', bottom: 'loja:shop' },
    onInteract: (e) => { ctx.net.send(e.player, 'open', { offers: OFFERS }); return true; },
  });
  if (ctx.side === 'server') {
    ctx.net.on('buy', (player, data) => {
      const i = data && typeof data === 'object' ? data.i : undefined;
      const offer = Number.isInteger(i) && i >= 0 && i < OFFERS.length ? OFFERS[i] : null; // nunca confie no cliente
      let ok = false;
      if (offer && player.take('mineclaude:diamond', offer.price)) {
        ok = player.give(offer.item, offer.n);
        if (!ok) player.give('mineclaude:diamond', offer.price); // não coube: devolve
      }
      ctx.net.send(player, 'balance', { ok });
    });
    return;
  }
  let panel = null, hud = null;
  ctx.net.on('open', (d) => {
    const body = d.offers.map((o, i) => ({ row: [
      { item: o.item, n: o.n }, { text: `${o.name} — ${o.price} diamante(s)` },
      { button: 'Comprar', onClick: () => ctx.net.send('buy', { i }) },
    ] }));
    if (!panel) panel = ctx.ui.panel({ title: 'Loja', body }); else panel.update(body);
    panel.open();
  });
  ctx.net.on('balance', (d) => {
    const text = d.ok ? 'Comprado!' : 'Não deu.';
    if (hud) hud.set(text); else hud = ctx.ui.hud({ id: 'saldo', text });
  });
}
```

Vale testar o painel com uma oferta chamada `Maçã <script>alert(1)</script>`: no painel ela aparece como texto, nunca
como HTML.

## 18. A CLI do modkit

Para criar, montar, conferir e empacotar um mod sem fazer nada à mão, use a CLI do modkit. A única coisa que você
precisa instalar é o [Bun](https://bun.sh); a CLI se chama `mineclaude-modkit` e aqui aparece como `modkit`.

```sh
modkit new meu_mod --ts     # cria a pasta do mod a partir do modelo, com fontes em TypeScript
cd meu_mod
modkit build                # monta as entradas para dist/
modkit check                # confere as regras do servidor
modkit pack                 # monta e empacota em meu_mod.mcmod
```

| Comando | O que faz |
|---|---|
| `modkit new <id> [--dir <pasta>] [--ts]` | cria um mod novo a partir do modelo. `--ts`: fontes em TypeScript |
| `modkit build [pasta]` | monta as entradas declaradas em `scripts._sources` do `package.json` para `dist/` |
| `modkit pack [pasta] [--out <arquivo.mcmod>] [--no-build] [--force]` | monta e empacota em `<id>.mcmod`. É determinístico: a mesma entrada dá os mesmos bytes |
| `modkit check [pasta] [--json]` | roda as regras do servidor sem precisar do jogo: a mesma mensagem de erro que o boot daria. `--json` para usar num script |
| `modkit sdk [pasta]` | atualiza o `mineclaude-sdk.js` e o `types/mineclaude-mod.d.ts` dentro de um mod que já existe |
| `modkit help` | a lista dos comandos |

O `check` é a ferramenta que mais economiza tempo: ele recusa o que o servidor recusaria (bloco que não existe num
drop, config inválida, passo de geração não determinístico) e avisa do que é só caro (um passo de geração acima de
2 ms por chunk). Rode-o antes de cada `pack`.

**Rodar o mod de verdade.** O modkit monta e confere o pacote; ele não sobe servidor. Para ver o mod no jogo há três
caminhos:

- instalar o `.mcmod` num servidor, na pasta que a variável `MODS_DIR` aponta, e reiniciar;
- dentro do jogo, `/mod previa <link>` com o endereço do `.mcmod` (o servidor baixa e carrega para você ver);
- a tela **Mods** do jogo, que instala e liga mods pela interface.

O empacotamento em detalhe — o que entra no `.mcmod`, o que o servidor confere ao receber e como publicar uma versão
nova — está em [empacotar.md](empacotar.md).

## 19. Comandos de chat: `ctx.commands.register(name, def)`

Também como classe (`CommandType`): os campos são o `def` e o método `run(e)` é o comando. Ex.:
`class Energia extends CommandType { admin = true; help = '/energia'; run(e) { ... } }` e
`ctx.commands.register('energia', new Energia())`.

```js
ctx.commands.register('rubi', {
  help: '/rubi [nome] — dá um rubi',            // linha do /ajuda tudo (até 200 caracteres)
  admin: false,                                  // true: só administradores (padrão false)
  rooms: 'world',                                // 'all': vale também no lobby e nas partidas (padrão 'world')
  run(e) { e.reply(`Rubi para ${e.args[0] ?? e.player.name}`); },
});
```

- Só dentro de `register`, só no servidor (no navegador a definição é checada e ignorada, como `ctx.events.on`).
- `name`: `[a-z][a-z0-9_]{1,23}`, sem a barra; maiúsculas na digitação não importam (`/RUBI` funciona).
- `e = { player, args, world, server, reply }`: `player` é o jogador da API de mod (seção 10), `args` o texto depois do
  nome separado por espaços (sem itens vazios; o chat já limita o tamanho), `reply(texto)` manda uma mensagem de sistema
  só para quem digitou.
- **Nomes reservados e conflitos:** um nome igual a um comando do jogo (`/ajuda`, `/dar`, `/tp`... e também os comandos
  de teste, que só existem num servidor de teste) ou ao de outro mod **não derruba mais o boot**: funde quando os
  subcomandos não colidem e, quando colidem, o mod de fora é **recusado por nome** no log (`[mods] mod "x": command
  "/kick" refused: it collides with the engine's own "/kick": ...`); um apelido em uso é recusado do mesmo jeito.
  Todo comando também vale como `/<modid>:<nome>`, que é sempre único.
- `admin: true` (legado; por dentro é `requires: 'admin'`): quem não é administrador recebe "Comando desconhecido",
  igual aos comandos de admin do jogo. Prefira `requires` com um nó de permissão (19.1).
- **Lobby:** por padrão o comando só vale no mundo de sobrevivência ("Esse comando não vale no lobby"); com
  `rooms: 'all'` vale também no lobby e nas partidas.
- `/ajuda tudo` lista os comandos dos mods numa seção "Comandos de mods:" (os de admin só para admin). O `/ajuda` curto
  não muda.
- Erro no `run` é registrado no log com o id do mod (`command "/rubi" threw: ...`) e o jogador vê só "Esse comando deu
  erro". Os comandos dividem o limite de comandos do jogador (5/s, rajada 15; "Calma! Comandos rápidos demais.").

### 19.1 Comandos tipados (estilo Brigadier)

Sem `args`, `sub` nem `tree` o comando é o antigo: `e.args` é um `string[]`. Com qualquer um dos três, o servidor
converte e confere os argumentos **antes** de chamar `run`, e `e.args` vira um objeto `{ nome: valor }` (`e.raw` guarda as
palavras digitadas). Duas formas, a mesma árvore por baixo. `CommandType`, `literal`, `argument` e `ArgumentTypes` vêm
do SDK: `import { CommandType, literal, argument, ArgumentTypes } from './mineclaude-sdk.js'`.

```js
// declarativa (a mais natural numa classe)
class Dar extends CommandType {
  admin = true;
  help = '/dar <alvo> <item> [n] — dá itens';
  args = [{ name: 'alvo', type: 'player' }, { name: 'item', type: 'item' }, { name: 'n', type: 'integer', min: 1, max: 64, optional: true }];
  run(e) { e.args.alvo.give(e.args.item, e.args.n ?? 1); }
}
// subcomandos: o run do comando roda quando não vem subcomando; cada sub tem args / sub / run / requires
ctx.commands.register('loja', { help: '/loja abrir | preco <item> <v>', sub: {
  abrir: { run(e) { /* ... */ } },
  preco: { requires: 'admin', args: [{ name: 'item', type: 'item' }, { name: 'v', type: 'number', min: 0 }], run(e) { /* ... */ } },
} });
// construtor (Brigadier): a raiz é literal(<nome do comando>)
ctx.commands.register('dar', { help: '/dar <alvo> <item> [n]', tree: literal('dar')
  .then(argument('alvo', ArgumentTypes.player())
    .then(argument('item', ArgumentTypes.item()).executes(giveOne)
      .then(argument('n', ArgumentTypes.integer(1, 64)).executes(giveMany)))) });
```

- **Tipos:** `string` (uma palavra), `greedy` (o resto da linha), `integer` / `number` (`min`, `max`), `boolean`
  (`true`/`false`/`sim`/`nao`/`on`/`off`), `enum` (`values`), `player` (um jogador online, `PlayerApi`), `players` (lista;
  `*` = todos, ou um **seletor**), `entities` (jogadores **e** mobs, por seletor), `item` / `block` (nome completo),
  `block_state` (`escada[face=s]`), `item_stack` (`espada[meumod:brilho=3]`, com componentes), `mob` (chave),
  `pos` (três palavras → `{ x, y, z }`; `~` e `~n` são relativos a quem digitou), `time` (`40` ticks, `30s`, `5m`,
  `2h`, `1d`), `uuid`, `angle` (graus; `~` é para onde o jogador olha), `color` (16 nomes ou `#rrggbb`) e `text`
  (o resto da linha, ou um JSON que vira **texto traduzível**). No construtor: `ArgumentTypes.integer(1, 64)`,
  `.enumOf([...])`, `.entities()`, `.blockState()`, `.time(20, 1200)`, `.color()`, `.custom('modid:tipo')`...
  O contrato de cada tipo — o que o `run` recebe — está nos tipos do mod (`types/mineclaude-mod.d.ts`).
- **Opcionais:** só os últimos argumentos; ausente = a chave não existe em `e.args`.
- **Erros:** o jogador lê qual argumento falhou, o que se esperava e as formas de uso, ex.:
  `Argumento <n>: 99 é maior que o máximo (64) (esperado: um número inteiro entre 1 e 64). Uso: /dar <alvo> <item> [<n>]`.
  `error` num argumento (texto, ou função do texto digitado) troca a mensagem inteira por uma sua.
- **Permissão:** `admin: true` ou `requires: 'admin' | 0..4 | (player) => boolean` no comando; `requires` também em cada
  subcomando (recusa com "Você não tem permissão para usar ..."). No comando, quem não passa vê "Comando desconhecido".
  O **nível 0 a 4** é o `requires(hasPermission(n))` do Brigadier; quem é cada nível quem administra o servidor configura
  (`PERMISSION_LEVEL_DEFAULT`, `PERMISSION_LEVEL_ADMIN`, `PERMISSION_LEVELS="nome=3"`), e `'admin'` segue sendo o atalho.
- **Tipo do mod:** `ctx.commands.argumentType('cor', { parse(texto, { player, server }) { ...; return valor; /* ou throw new Error('motivo') */ },
  suggest(prefixo, { player, server }) { return ['rosa', 'azul']; }, words: 1, label: 'uma cor' })` (antes dos comandos que o usam); o
  tipo é `modid:cor` (dentro do mesmo mod vale só `cor`).
- **Tab no chat:** ao digitar `/...` o navegador pede sugestões (nomes de comandos, subcomandos, jogadores online, itens, blocos,
  mobs, valores de enum, o `suggest` do seu tipo) e mostra a lista acima da caixa; **Tab** completa (de novo: a próxima). No máximo
  8 pedidos por segundo por jogador (rajada 12), 20 sugestões por resposta.
- Mods em sandbox (processo separado) ainda só registram comandos antigos.

### 19.2 Seletor de entidade, comando só do cliente, `redirect`/`fork`, apelidos e níveis

```js
// seletor: @a / @p / @r / @s / @e[type=porco,distance=..20,limit=3,sort=nearest,tag=chefe,name=!alguem]
ctx.commands.register('curar', { help: '/curar <alvos>', args: [{ name: 'alvos', type: 'entities' }],
  run(e) { for (const a of e.args.alvos) a.heal?.(5); } });
// uma opção de seletor sua (Fabric: EntitySelectorOptionRegistry); vira @e[meumod_vida=5]
ctx.commands.selectorOption('vida', { parse: (t) => Number(t), test: (ent, min) => (ent.health ?? 0) >= min });
// marcas de placar, o que o tag= filtra (o /tag do Minecraft; valem nesta sessão do servidor)
e.player.addTag('chefe'); e.mob.hasTag('guarda');
// níveis de permissão 0..4 (quem administra o servidor configura quem é cada nível)
ctx.commands.register('truque', { help: '/truque', requires: 2, run(e) {} });
// apelidos: despacham e completam com Tab; o /ajuda lista o comando uma vez só
ctx.commands.register('bexec', { help: '/bexec ...', aliases: ['bex'], run(e) {} });
ctx.commands.alias('bex2', 'bexec');
// o comando de OUTRO mod (o do jogo também): acrescenta, embrulha, esconde — e dois mods com o mesmo nome fundem
// (colisão no mesmo nó: o segundo é recusado por nome, o boot segue). Evento `allowCommand`.
ctx.commands.modify('tp', (c) => { c.tree.then(literal('aqui').executes((e) => e.reply('...'))); });
ctx.commands.wrap('tempo', (e, previous) => { if (e.raw.includes('noite')) return e.reply('não aqui'); previous(); });
ctx.commands.remove('voar');
// redirect e fork na árvore (o /execute do Minecraft)
const raiz = literal('exec');
raiz.then(literal('onde').executes((e) => e.reply((e.source ?? e.player).name)));
raiz.then(literal('aqui').redirect(raiz));
raiz.then(literal('como').then(argument('alvos', ArgumentTypes.entities()).fork(raiz, (e) => e.args.alvos)));
ctx.commands.register('exec', { help: '/exec onde | aqui ... | como <alvos> ...', tree: raiz });
// comando SÓ DO CLIENTE: roda no navegador e não vai ao servidor (Fabric: ClientCommandRegistrationCallback)
if (ctx.side === 'client') ctx.client.commands.register('aqui', { help: '/aqui', run(e) { e.reply(`Oi, ${e.player.name}`); } });
```

As tabelas e os limites de cada uma dessas chamadas (opções de seletor, formas de `modify`/`wrap`, níveis) estão nos
tipos do mod, em `types/mineclaude-mod.d.ts`.

### 19.3 Os comandos do jogo base

Os comandos gerais do jogo são conteúdo do mod base: uma classe `CommandType` por comando, registrados por
`ctx.commands.register` como os de qualquer mod. Hoje: `/ajuda`, `/tempo`, `/dar`, `/tp`, `/limpar`, `/efeito`,
`/criativo`, `/voar`, `/online` e `/morrer` (o `/efeito` usa um tipo de argumento próprio, `mineclaude:efeito`). Os
demais — minigames, salas, moderação, contas, prêmios, `/spawn`, `/regras`... — ainda são código do motor.

O que o mod base precisa do servidor vem da API pública: `server.commands(player)` (a lista de todos os comandos que o
jogador pode usar, a do `/ajuda tudo`), `server.findPlayer`, `server.effects()`,
`world.timeOfDay/setTimeOfDay/dayLength`, `player.isAdmin/bot/device/combatMs/flying`,
`player.give(item, n, { partial: true })` e `player.setCreative/setFlight/clearInventory/die/clearEffects`. Todas são
abertas a **todo** mod: o `/criativo`, o `/voar`, o `/limpar` e o `/morrer` do jogo são mod, e um mod de fora pode
reescrevê-los.

O limite de `e.reply` é o mesmo para todo mod, o do jogo inclusive: 256 respostas por execução (o `/ajuda tudo` do
jogo, o maior uso, lista uma linha por comando). Um mod com o nome de um deles (`/ajuda`, `/dar`...) continua sendo
recusado no boot (`command "/ajuda" is already a game command`). A tela de pausa lista os comandos que o servidor
mandou no `welcome` (todos os registrados, os de admin marcados), não uma lista escrita à mão no cliente.

## 20. Configuração: `ctx.config` e `mod.json`

```json
{ "id": "loja", "main": "main.js", "config": { "preco_pao": 1, "loja_aberta": true, "mensagem": "Oi" } }
```

- Os padrões ficam no `mod.json`, em `config`: só número (finito), booleano e texto (até 200 caracteres); até 50
  chaves, nomes `[a-z][a-z0-9_]{0,31}`. Um bloco inválido recusa o mod no boot (e no `modkit check`).
- O dono do servidor sobrescreve num arquivo **fora da pasta do mod**: `DATA_DIR/mods-config/<modid>.json`
  (`{ "preco_pao": 2 }`), que sobrevive às atualizações do mod. Lido no boot e de novo com
  `/mod config recarregar <mod>` (admin; mesma validação, avisos vão para o admin; mods em sandbox só no boot).
  Chave desconhecida, tipo diferente do padrão (um número escrito como texto, `"5"`, conta como tipo errado), JSON
  inválido ou arquivo que não é objeto: aviso no log (`[mods] mod "x": x.json: ...`), usa o padrão e o servidor sobe
  normalmente. `__proto__` é só uma chave desconhecida.
- `ctx.config.get('preco_pao')` devolve o valor efetivo; chave não declarada no `mod.json` lança erro.
- `ctx.config.onChange((valores) => ...)` (servidor): chamada a cada recarga, com os valores novos (até 16 ouvintes; um
  que lança vai para o log e os outros rodam).
- **No navegador** `get` devolve só os padrões do `mod.json` (o servidor os entrega no manifesto dos mods, no campo
  `config` de cada mod; as sobrescritas nunca saem do servidor, para não vazar valores privados). Decida o que o
  navegador precisa saber e mande por `ctx.net` se for o caso.

## 21. Mobs: `ctx.mobs.register(path, desc)`

```js
ctx.mobs.register('slime', {
  name: 'Gosma Viva', halfW: 0.45, height: 0.9, behavior: 'hostile', hp: 12, speed: 2, damage: 2, burn: false,
  drops: [['meumod:gosma', 1, 2], ['mineclaude:coal', 0, 1, 0.5]],
  spawn: [{ when: 'night', weight: 20, group: [1, 2] }, { when: 'underground', weight: 10 }],
  model: { parts: [{ size: [0.9, 0.8, 0.9], pos: [0, 0.4, 0], color: '#5fc94a' }] },
  sound: { freq: 220, end: 120, dur: 0.2 },
});
```

O mob reaproveita a IA do jogo pelo `behavior`: `hostile` persegue jogadores (como o zumbi; queima de dia, a menos
que `burn: false`), `passive` anda à toa e foge de quem bate, `neutral` anda à toa e investe em quem bate (como o
javali, junto com os do mesmo tipo por perto). Um `neutral` **com `ai`** não tem essa investida padrão: quem decide
quando e em quem investir é o `ai` (o `onHurt` avisa de quem apanhou) — é assim que o javali do jogo é feito, com uma
classe que estende `NeutralMob`. Para a mesma investida com outros números, estenda a classe do SDK:
`class Touro extends NeutralMob { static RALLY = 4; static CHARGE = { ...NeutralMob.CHARGE, knock: 12 }; ... }`
(statics `RALLY` 8, `GIVE_UP` 24, `ANGER_MS` 20000 e `CHARGE`; a raiva fica em `e.mob.data`). O mob recebe o id depois
dos mobs do jogo, na ordem de carga (servidor e navegador conferem a lista ao entrar).

Há dois papéis a mais, que são do **motor** (o jogo base registra os dele com eles, pelo mesmo `ctx.mobs.register`):
`npc` fica parado, não apanha de nada e não conta nos tetos de nascimento — é o Mercador, e é o único papel que aceita
`speed: 0` —, e `boss` é um hostil **mais** o caminho de chefe (acorda quando alguém entra na sala de chefe de uma
masmorra, fica preso nela, não é levantado por um golpe, não pula, e a morte dele marca a sala e dá o loot raro) — é o
Guardião de Pedra. Em `npc` o `damage` é proibido, como em `passive`; em `boss` ele é obrigatório, como em `hostile`.

| Campo | Regra |
|---|---|
| `name` | texto de 1 a 40 caracteres (aparece no `/invocar`, na mensagem de morte e no bestiário) |
| `halfW`, `height` | 0,2–1,5 e 0,3–3 (blocos; caixa de colisão e mira) |
| `hp`, `speed` | 1–200 e 0,5–8 (as zonas de perigo multiplicam a vida e o dano dos hostis) |
| `damage` | 0–20; obrigatório em `hostile`/`neutral`, proibido em `passive` |
| `burn` | só `hostile`; padrão `true` |
| `drops` | até 8 `[item, min, max, chance?]`; `item` com nome completo (`mod:item`); item que não existe recusa o mod no boot |
| `spawn` | até 16 regras (ver 21.2): `{ when, zones?, biomes?, ground?, light?, test?, weight \| chance \| fallback, group?, spread?, cap?, category? }` — `when` = situação (`night`/`underground`/`dungeon` para hostil, `day` para passivo e neutro) ou condição que você registrou; `zones` do jogo ou `mod:zona`; `weight` inteiro 1–100; `group` `[min, max]` de 1 a 32 |
| `category`, `emoji` | o grupo de nascimento do mob (padrão `hostile`/`passive`) e o ícone dele na paleta do criativo (um emoji) |
| `model` | `{ parts }` com 1–32 caixas `{ size: [w,h,d] (0,01–4), pos: [x,y,z] (−4–4; y a partir dos pés), color: '#rrggbb', role?: 'leg'/'arm'/'head', pivotTop? }`; `leg`/`arm` balançam ao andar (`pivotTop`: gira pelo topo). Sem `model`: desenhado como zumbi |
| `sound` | a voz do mob: o nome de um som registrado, ou `{ freq: 20–2000, end?, dur: 0,05–1, wave?, gain?, count?, spacing?, step?, endStep?, hurt? }` (Hz e segundos; ver a seção 23). Sem `sound`, o mob tem a voz neutra do motor — não a de outro mob. `ctx.mobs.modify` troca |
| `onHit(e)` | gancho (só servidor): o mob apanhou (golpe, flecha, explosão, queda). `e.mob` `{ name, id, hp, pos }` (cópia; `hp` antes do golpe), `e.attacker` (jogador ou `null`), `e.damage` editável (0–100; valor fora disso é ignorado), `e.cancel()` anula o golpe (sem dano nem empurrão) |
| `onDeath(e)` | gancho (só servidor): o mob morreu, antes do evento `mobDeath`. `e.mob`, `e.killer` (jogador ou `null`), `e.drops` editável como no `mobDeath` |
| `breed` | `{ food: 'mod:item', growMs?, cooldownMs? }`: criação como vaca/ovelha (segue quem segura `food`, clique direito alimenta, dois prontos a até 3 blocos fazem um filhote do dono que cresce em `growMs`, 1000–3600000 ms, padrão 10 min). Mesmos tetos de rebanho. Por baixo é o `BreedGoal` do SDK com os padrões (21.1): para outra regra (tempos, distância, falas, par), use o goal na sua classe |
| `tame` | `{ item: 'mod:item', chance }` (chance em (0, 1]): doma como o cachorro (item na mão + clique direito gasta 1; domado segue o dono, volta para perto dele, morde a briga dele se tiver `damage`; o clique do dono faz esperar/seguir). Teto por bicho e por conta como o do cachorro. Por baixo é o `TameGoal` do SDK com os padrões (21.1): para outra chance, outro alcance ou outras falas, use o goal na sua classe |
| `mount` | `{ seat, speed, saddle?, free?, item? }`: montaria como o cavalo (mão vazia monta; o selvagem pinoteia e doma como o cavalo; montado anda pela rédea a `speed` blocos/s, 1–14, galope 1,5×; o cavaleiro fica `seat` blocos acima dos pés, 0,2–3). `saddle: true`: precisa de uma sela posta antes de ser cavalgada, e `item` (nome completo) diz **qual item é a sela dela** — obrigatório com `saddle`, e o motor nunca nomeia item nenhum: o navegador manda o clique quando o jogador segura esse item e o motor só o devolve quando a montaria morre. `free: true`: **veículo** — qualquer um entra na hora (sem domar, sem dono, sem sela) e, vazio, fica parado. O que a montaria FAZ (pinotes, domar, rédea, galope, pulo) são os goals de montaria do SDK com os padrões (21.1): para outros números ou outra regra, ponha `BondWithRiderGoal` / `RideGoal` / `StayPutGoal` na sua classe. **O clique que monta** e a sela são o `MountGoal` (21.1), do mesmo jeito |
| `persistent` | `true`: o mob é **salvo com o mundo** e volta quando o servidor sobe (posição, vida e os anexos dele marcados como `persistent`); sem isso um mob de mod é selvagem e some no reinício. Só para mob de mod, e **não combina** com `breed`/`tame`/`mount` (esses já são salvos no rebanho, por dono). Não some por distância. Tetos para o mod não encher o arquivo do mundo: **200 mobs salvos por mod e 16 por mod por chunk** (o que passar do teto não é salvo, avisa no log e some por distância como um selvagem). Tipo que um mod removido deixou no save, ou que deixou de ser `persistent`, é descartado no boot com uma linha no log (o servidor sobe igual). Num mundo sem mob persistente o campo `mobs` nem existe no arquivo; um mundo antigo carrega igual. Em classe (`GoalMob`): `persistent = true;` |
| `onMount(e)` | só no servidor: um jogador montou no mob. `e = { mob, player, tick, dt, random(), world, server }` |
| `control(e)` | só no servidor, a cada tick com alguém montado (exige `mount`): `e.input` `{ forward, strafe (−1..1), jump, yaw }` do piloto; mude `e.velocity` (blocos/s) e `e.yaw`. Substitui a rédea do cavalo: o mod decide aceleração, curva, voo. Equivale ao `tickControlled` do Fabric |
| `ai(e)` | gancho (só servidor, **nunca em sandbox**): IA própria. Ver abaixo |

- **Nascimento:** cada regra concorre com o jogo: com peso total W das regras que valem ali, um mob de mod sai em
  min(W, 100)/(min(W, 100)+100) dos sorteios (100 = o sorteio do jogo): somados, os mods nunca passam da metade, para
  não sufocar os mobs do jogo (o `modkit check` avisa quando um mod passa de 100 numa hora). Sem regra que valha (e sem
  mods), o jogo sorteia exatamente como antes. Mobs de mod não nascem nas masmorras.
- **`/invocar`:** aceita `mod:mob` e a chave curta (`/invocar slime`) quando só um mod tem esse nome; as chaves do
  jogo (`zombie`...) são sempre do jogo. Mobs de mod aparecem na paleta do criativo e no bestiário (contados pelo
  nome completo; a contagem fica guardada mesmo se o mod sair).
- Um bando de mob de mod não passa do teto de hostis perto do jogador (o grupo é cortado no que falta).
- **Um papel por mob:** `breed`, `tame` e `mount` não se combinam, e nenhum vale em `hostile`.
- **Salvos:** o mob de mod criado/domado vai para o rebanho do arquivo do mundo pelo **nome completo**
  (`["mod:mob", x, y, z, ...]`; os do jogo seguem com o id numérico). Mod removido: a entrada fica guardada como
  estava e volta quando o mod volta. Os outros mobs de mod são selvagens e somem quando o servidor reinicia.
- **`ai(e)`:** chamado no máximo a cada 4 ticks (5×/s) por mob. `e = { mob, world, server, nearbyPlayers }`
  (jogadores do Mundo a até 24 blocos). Devolve `{ moveTo?: {x,y,z}, attack?: jogador de nearbyPlayers, look?: {x,y,z} }`
  ou `null` (comportamento padrão do `behavior`/flags). `moveTo` anda até lá contornando obstáculos; `attack`
  persegue e bate como o zumbi (só com `damage` > 0; armadura e escudo valem); `look` vira para o ponto. Erro ou
  chamada acima de 20 ms: comportamento padrão por 5 s (uma linha no log); acima de 2 ms: aviso no log (no máximo
  1 a cada 10 s por mob).
  - **`aiEvery`** (1..20, precisa de `ai`): de quantos em quantos ticks o `ai` é chamado; 1 = todo tick. Padrão 4.
  - **Ataque rico:** `attack: { target, reach?, every?, knock?, speed? }` — alcance do golpe (0,5..4; padrão 1,3),
    recarga em s (0,1..10; padrão 1), empurrão (0..20; padrão 6) e o multiplicador da velocidade enquanto ataca
    (0,1..4; padrão 1) e `nav`: `'direct'` (padrão: para a 0,9 bloco e vira o rosto) ou `'steer'` (contorna todo
    tick, como o javali). Um valor fora do limite anula a resposta inteira (comportamento padrão naquele tick).
  - **Atacar um mob:** `attack: { target: { mob: id }, ... }` (o id vem de `e.nearby`/`e.mob.id`): morde como o cachorro
    — alcance até a borda do alvo (`reach` + a meia largura dele), altura até 1,6, linha de visão, dano pelo golpe do jogo
    (o alvo apanha como de qualquer golpe: empurrão, `onHit`/`onHurt` dele), recarga `every`. Alvo morto, sumido ou o
    próprio mob: sem ataque.
  - **`attack.stop`** (0,1..4; padrão 0,9): a que distância do alvo o mob para. **`moveStop`** (0,1..16; padrão 0,5) e
    **`moveSpeed`** (0,1..4; padrão 1) junto do `moveTo`: seguir alguém de longe (o cachorro para a 2,5 do dono).
  - **`{ stay: true }`**: parado neste tick, sem virar, com a recarga do ataque correndo (o cachorro sentado);
    **`{ wander: true }`**: o passeio padrão, também com a recarga correndo.
  - **`e.playerByUuid(uuid)`** e **`e.mob.ownerUuid`**: o dono pela conta (permanente); `null` em animal de mundo antigo até o dono aparecer.
  - **`e.playerByName(name)`** (no `ai` e no `offscreen`): o jogador online, não bot, com esse nome — o id muda a cada
    entrada, o nome não.
  - **`attack.style`**: `'hit'` (padrão, o golpe do zumbi) ou `'bite'` (a mordida do cachorro: alcance `<=`, altura até
    1,6, visão ao meio do alvo, sem conferir criativo; os cachorros de quem foi mordido defendem só se a mordida passou
    do escudo).
  - **`e.tick`**, **`e.solidAt(x, y, z)`** e **`e.mobById(id)`** (no `ai` e no `offscreen`); no `e.mob`: `tame`, `owner`,
    `sit`, `tameable`, a raiva do jogo `angry` (`{ player, until }`) com `calm()`, e o inimigo que o jogo guarda `foe`
    com `setFoe(id | null)`; no jogador: `respawning`.
  - **`offscreenNear: true`** (com `offscreen`): o `offscreen` roda também dentro do raio de simulação.
  - **Tetos declarados** (sem privilégio: o mod do jogo não tem limite que o seu não tenha, só declara o maior):
    **`hurtLimit`** (1..256, padrão 32) é quantos mobs o `e.nearby` do `onHurt` e o `mobsNear` da IA listam;
    **`aiBudget`** (1..1000 ms, padrão 20) é quanto a `ai` pode demorar antes de ser cortada (declarado, o aviso de
    lentidão de 2 ms deixa de valer); **`offscreenBudget`** (1..1024, padrão: todos os tipos dividem 32) são as chamadas
    de `offscreen` por tick só deste tipo. O teto é o mesmo para todo mod; o jogo base declara o máximo dos três. O que
    o jogo base ainda pode e o seu mod não: **só** colocar os blocos escondidos (o bloco desconhecido e as caixas do
    lobby); é poder sobre um bloco interno, não sobre um jogador, e fica assim de propósito.
- **`knockbackTaken`** (0..1, padrão 1): quanto do empurrão de um golpe o mob leva (0 = não sai do lugar). O guardião de pedra do jogo usa 0,15.
  - **`attack.creditTo`** (com alvo mob): o id de um jogador online que leva os drops do mob mordido (o dono do cachorro).
  - **`e.player(id).foe`:** a última briga desse jogador com um mob, `{ mob, at }` ou `null` (o mob que o machucou ou
    que ele bateu): é o que os cachorros defendem.
  - **`e.mob.teleport(x, y, z)`:** põe o mob ali na hora, parado e sem caminho, só numa célula livre sobre chão.
  - **Arremesso próprio:** `e.shoot(jogador, { projectile: 'mod:pedra', speed?, damage?, error? })` atira um projétil do mod
    (`ctx.projectiles`) com a mesma mira do esqueleto (a parábola mais baixa; erro que cresce com a distância): `speed` 4..40
    blocos/s (padrão 16), `damage` 0..20 (padrão o do projétil), `error` 0..1 (padrão 0,1). Sem o segundo argumento é a flecha.
    **`lead: { x, z }`** (a velocidade do alvo, blocos/s, cada eixo até 20; ex.: `p.velocity`): mira onde o alvo VAI estar quando o
    projétil chegar — a mira do motor já desconta a queda extra do passo de 50 ms do servidor.
  - **Pegar do chão:** `e.itemsNear(raio)` (0..16) lista os itens caídos perto (`{ id, item, count, pos }`, o mais perto
    primeiro, até 16); `e.mob.pickUp(id)` pega um a até 1,6 bloco (até 3 pilhas) e `e.mob.carried` diz o que leva. Tudo cai
    onde ele estiver quando morrer (ou sair do mundo de outro jeito que não o vazio).
  - **`e.mob.cue(nome)`** (`[a-z0-9_]`, até 24): um SINAL para o visual feito em código de quem está perto — o `cue(m, nome, kit)`
    do `ctx.render.mobModel`. A mesma mensagem de animação do `play`, sem precisar de arquivo.
  - **`e.mob.setPose(nome | null)` / `e.mob.pose`** (mob com `model` de arquivo): a POSE que fica — uma animação do
    arquivo que segue tocando (em loop, ou parada no último quadro) por baixo de qualquer `play`, canal por canal (o que a
    animação de uma vez não anima vem da pose). Diferente do `play`, é **estado**: vai em toda entrada de mob no fio,
    então quem chega perto depois também vê. `null` volta à pose de ligação; nome que o arquivo não tem lança.
    O `MobModel.animate(state)` recebe `state.pose` e `state.playing` (a de uma vez tocando agora).
    Mob **sem** arquivo de modelo (desenhado em código pelo `ctx.render.mobModel`) aceita qualquer nome `[a-z0-9_]` (até 24):
    o renderer lê `m.pose` no `animate` e decide o que o nome quer dizer (enrolado, rolando, de costas).
  - **`e.mob.setHealthBar(liga)` / `e.mob.healthBar`:** esconde (false) ou mostra (padrão) a barra de vida e o nome que
    flutuam sobre o mob — escondida, a vida nem vai no fio. É o que deixa um mob disfarçado não se entregar.
- **`feedRefusal`**: o que o jogador ouve quando o clique direito neste mob não faz nada (nem comida, nem domar, nem montar):
  1 a 200 caracteres. Os mobs do jogo dizem "Só vaca e ovelha comem trigo."; sem o campo, o jogador ouve "Nada aconteceu."
- **`onInteract(e)`** (só servidor): clique direito de um jogador no mob. `e = { mob, player, item, consume(n?), random(), world, server }`
  (`item`: o nome completo do que está na mão, ou `null`; `consume` tira `n` do que ele segura). `'success'` encerra o
  clique; `'pass'` deixa o jogo seguir (domar, montar); `{ refuse: 'motivo' }` encerra e o jogador ouve o motivo (o jogo
  espaça a mesma recusa repetida: no máximo 1 a cada 2 s por mob).
- **`offscreen(e)`** (só servidor): a cada 10 ticks para um mob fora do raio de simulação (80 blocos; ali ele não
  anda), no máximo 32 por tick. `e = { mob, now, player(id), world, server }`. Ex.: o cachorro que volta para o dono.
  - **`e.now`:** o relógio do tick em ms (o mesmo para todos os mobs no tick); no `onHurt`, a hora do golpe.
  - **`e.mob.data`** (em `ai`, `onHit`, `onHurt` e nos `nearby`): um objeto do mod guardado por mob, só no servidor, que
    some com o mob. Acima de 2048 caracteres de JSON (ou o que não vira JSON) é esvaziado, com uma linha no log.
    Guarde ids e nomes, não objetos de jogador.
  - O corte de 20 ms (comportamento padrão por 5 s) não vale para o mod do jogo base.
  - **Alvo por id:** o jogador embrulhado tem `id` (da sessão). Guarde-o (ex.: no `onHurt`, em `e.mob.data`) e ache o
    jogador com `e.player(id)` no `ai`: qualquer distância e sala, bots também, `null` se saiu. O `ai` confere o que
    quiser (`dead`, `creative`, `room`, `pos`) e pode atacá-lo mesmo fora de `nearbyPlayers`.
  - No `onHurt` do mod do jogo base, `e.nearby` não tem o limite de 32 (só o raio de 16 blocos).
- **`onHurt(e)`** (só servidor): o mob apanhou e o dano **já valeu** (depois do `onHit`; não cancela).
  `e = { mob, attacker (jogador ou null), damage, nearby, world, server }`; `nearby` são os mobs vivos a até 16 blocos
  (no máximo 32, sem o próprio), cada um `{ name, id, hp, pos }`. Serve para raiva em grupo e reações.
- Golpe de mob de mod é amortecido por armadura e escudo; a morte diz "foi pego por <nome>".
- Erro em `onHit`/`onDeath` vai para o log com o id do mod e não muda nada (o golpe vale, os drops ficam os sorteados).
  Queimar ao sol mata sem `onHit`/`onDeath` (como o `mobDeath`).

### 21.1 Goals: o comportamento do mob em peças (`GoalMob`)

Como o `GoalSelector` do Minecraft/Fabric: o mob lista **goals** com prioridade e, a cada tick, o primeiro (menor número
primeiro, empate na ordem escrita) que `canUse(e, mem)` decide o que ele faz (`tick(e, mem)` devolve a decisão do `ai`, ou
`null` para passar a vez). `GoalMob` já traz o `ai` e o `onHurt` prontos (`aiEvery = 1`); o goal é **compartilhado por todos os
mobs do tipo**, então o estado de cada mob fica em `e.mob.data`.

```js
import { GoalMob, MeleeAttackGoal, FleeGoal, WanderGoal } from './mineclaude-sdk.js';
export default class Lobo extends GoalMob {
  key = 'lobo'; name = 'Lobo'; halfW = 0.4; height = 0.9; behavior = 'neutral'; hp = 12; speed = 2.4; damage = 3;
  goals = [
    [1, new MeleeAttackGoal({ range: 12, reach: 1.5, knock: 8, nav: 'steer' })],
    [2, new WanderGoal()],
  ];
}
```

| Goal | O que faz |
|---|---|
| `WanderGoal({ keepCd })` | passeia (para, escolhe um rumo, anda) |
| `LookAtPlayerGoal({ range })` | olha para o jogador mais perto e fica parado |
| `FleeGoal()` | foge de onde levou o golpe enquanto dura o susto do jogo (4 s; só para quem não é hostil nem neutro) |
| `TemptGoal({ item, range, stop })` | segue quem está no mundo segurando o item (vaca e ovelha com trigo) |
| `MoveToGoalGoal()` | anda até o alvo fixo que o mundo deu ao mob (`e.mob.goal`, o cristal da Defesa) |
| `MeleeAttackGoal({ range, maxDy, reach, every, knock, speed, nav, climb, pack })` | persegue e bate (zumbi; `nav: 'straight', climb: true, pack: {...}` é a aranha) |
| `RangedAttackGoal({ sight, keepMin, keepMax, every, windup, range, ... })` | guarda distância e atira flechas (esqueleto) |

Para escrever o seu: `class Fugir extends Goal { canUse(e, mem) { ... } tick(e, mem) { return { walk: [1, 0] }; } }`.

O que o `ai(e)` ganhou para isso (qualquer mod usa, com ou sem `GoalMob`): `e.dt`, `e.nearestPlayer(maxDist, maxDy?, { holding? })`
(a escolha do jogo: o vivo mais perto, em qualquer sala), `e.canSee(jogador)` e `e.shoot(jogador)` (a flecha do esqueleto);
na decisão, `walk: [x, z]` (+ `speed`), `flee`, `toGoal`, `keepCd`, e no `attack`: `nav: 'straight'` (reta, sem caminho), `climb`
(sobe a parede) e `stop: 0`; em `e.mob`: `group`, `fleeing`, `goal`. O jogo vive disso: zumbi, esqueleto, aranha, porco, ovelha,
vaca e galinha são classes de goals no mod base, provadas tick a tick contra o comportamento padrão do motor.

**Criar filhote, queimar ao sol e montaria também são goals** (o `AnimalMateGoal`, o "queima de dia" e o `AbstractHorseEntity` do
Fabric). O motor guarda só o mecanismo (o estado "pronto"/"filhote", o nascimento sob os tetos de rebanho do servidor, subir e
descer da montaria, levar o cavaleiro, o rebanho salvo); a regra é do goal, e você a troca pelas opções ou estendendo a classe:

| Goal | O que faz | Opções (padrão) |
|---|---|---|
| `BreedGoal({ food, ... })` | o jogador dá `food` (clique direito) e o mob fica "pronto"; dois prontos do mesmo tipo perto fazem um filhote; os pais descansam. Não toma o tick: ponha primeiro (prioridade 0). Para seguir a comida, junte um `TemptGoal` | `loveMs` (30000), `growMs` (600000), `cooldownMs` (300000), `dist` (3), `reach` (4), `messages` (`hold`, `far`, `baby`, `ready`, `resting(min)`); `canMate(mob, other)` decide o par |
| `BurnInSunGoal({ ... })` | de dia, a cada `every` ticks, perde `damage` de vida sem golpe e morre em chamas. Ponha primeiro | `damage` (4), `every` (20), `sky`: `'surface'` (na superfície do mundo, o zumbi) ou `'open'` (nada sobre a cabeça, o esqueleto), `light` (0.45) |
| `BondWithRiderGoal({ ... })` | montaria selvagem com alguém em cima: pinoteia e então fica domada (de quem montou) ou derruba e empina | `after` (`[1500, 3000]` ms), `step` (0.25 × tentativas), `rearMs` (900), `pace` (2), `messages` (`start`, `tamed`, `thrown`) |
| `RideGoal({ ... })` | leva o cavaleiro para onde ele manda | `speed` (7 blocos/s), `gallop` (1.5), `gallopAfter` (1 s), `back` (0.35), `side` (0.5), `jump` (11.5) |
| `StayPutGoal()` | domado e sem ninguém, fica onde o dono deixou (menos fugindo: ponha o `FleeGoal` antes) | |
| `MountGoal({ ... })` | **o clique que monta**, e a sela: longe, com alguém em cima, filhote, de outro dono, sela já posta, sem sela, domar antes da sela — e, no fim, `e.mob.mountBy(jogador)`. Não toma o tick: ponha primeiro (prioridade 0) | `item` (qual item é a sela dela), `saddle` (`false`: subir em cima já basta), `free` (`true`: veículo, qualquer um entra), `reach` (4), `subject` (`'animal'`), `plural` (`'animais'`: o teto por tipo), `messages` (`far`, `riding`, `taken`, `baby`, `someone(dono, subject)`, `saddled`, `saddleOn`, `needSaddle`, `tameFirst`, e os motivos do motor `no_room` e `gone` — texto ou função) |
| `TameGoal({ item, ... })` | o jogador segura `item` e clica: o mob come 1 e fica dele com `chance`; domado, o clique do **dono** senta/levanta e os outros só ouvem de quem ele é. Não toma o tick: ponha primeiro (prioridade 0) | `chance` (1/3), `reach` (4), `subject` (`'animal'`: como as falas chamam o mob), `plural` (`'animais'`: o teto por tipo), `messages` (`far`, `hold`, `angry`, `someone(dono, subject)`, `distrust`, `tamed`, `sit`, `stand` — texto ou função), `chanceEnv` (nome de variável de ambiente que substitui a chance, só para testes) |

```js
import { GoalMob, BreedGoal, TemptGoal, FleeGoal, WanderGoal } from './mineclaude-sdk.js';
export default class Coelho extends GoalMob {
  name = 'Coelho'; halfW = 0.3; height = 0.6; behavior = 'passive'; hp = 6; speed = 1.4;
  goals = [
    [0, new BreedGoal({ food: 'meu_mod:cenoura', growMs: 2 * 60000, cooldownMs: 60000, dist: 5, messages: { hold: 'Coelho só quer cenoura.' } })],
    [1, new FleeGoal()], [2, new TemptGoal({ item: 'meu_mod:cenoura' })], [3, new WanderGoal()],
  ];
}
```

O tipo do mob ganha sozinho o dado `breed` do `BreedGoal` e o `tame` do `TameGoal` (é por eles que o navegador sabe que comida
oferecer, que o motor sabe que o mob se doma e que o rebanho salvo conhece os tempos). O monstro que queima:
`goals = [[0, new BurnInSunGoal({ damage: 1, sky: 'open' })], ...]` com `burn = false` na classe (desliga a queima do motor, que só
vale para quem declara o campo). A vaca, a ovelha, o zumbi, o esqueleto, a aranha e o cavalo do jogo usam esses goals, provados
tick a tick contra o comportamento de quando a regra era do motor.

**Os campos antigos continuam valendo.** `breed`, `burn`, `tame` e `mount` num mob registrado por objeto fazem o mesmo de antes: por
baixo o motor liga os goals acima com os padrões (o `tame`: o `TameGoal` com o nome do seu mob em todas as falas). O que muda para
quem já tem mod: (1) um mob com `breed` ou `mount` **e** `ai` próprio passa a ter o `ai` chamado todo tick (o `aiEvery` dele é
ignorado), porque a rédea e o par precisam do tick; (2) num mob com `mount` e `ai` próprio, o `ai` do mod decide primeiro e os
goals de montaria só quando ele devolve `null`, como antes; (3) o nascimento do filhote acontece na vez do pai no tick, não antes
de todos (o mesmo segundo, a mesma regra).

O que esses goals pedem ao motor, e qualquer `ai` pode usar: `e.rider` e `e.input` (`{ forward, strafe, jump, yaw }` de quem está
montado; entrada com mais de 1 s vale zero), `e.random()` (o sorteio do jogo), `e.daylight()`, `e.underSky()`, `e.surfaceY()`,
`e.mobsNear(raio)`, `e.fits(dx, dz)` (o corpo cabe deslocado? para contornar um pilar); em `e.mob`: `baby`, `inLove`, `restMs`,
`canLove(jogador)` (a recusa dos tetos do servidor, ou `null`), `love(jogador, ms)`, `breedWith(outro, { growMs, cooldownMs })`,
`sunProof`, `burn(n)`, `tameBy(jogador)` (domar, se os tetos deixam), `tameRefusal(jogador, plural)` (por que os tetos não deixam
agora, ou `null`), `ownerIs(jogador)` (é o dono? pela conta quando o mob a sabe), `setSit(liga)` (senta/levanta: solta caminho,
inimigo e raiva e para onde está), `rider` (o id de sessão de quem está em cima, ou `null`), `saddled`, `setSaddle(liga)`,
`mountBy(jogador)` (põe o jogador em cima pelo mecanismo do motor: `null` = montou, senão um MOTIVO de uma palavra,
`'no_room'` ou `'gone'`, cuja FRASE é de quem sabe o nome do bicho), `dismount()`, `rear(ms)` e `bounds` (a caixa em que o mundo
prende o mob: a sala do chefe); em `e.player`/`e.rider`: `riding` (o id do mob em que ele está montado, ou `null`); no
`onInteract`, `e.random()` (o mesmo sorteio do jogo: a chance de domar); na decisão: `pace` (blocos/s no lugar da velocidade do
mob), `yaw` e `jump` junto do `walk`, `wander` com `restless` (não para) e `speed`; no `attack`: `nav: 'none'` (o motor não
conduz: vale o `walk` da própria decisão), `maxDy` (até quanto acima/abaixo o golpe vale; padrão 1,6) e `shield: false` (golpe
que escudo não segura).

O Guardião de Pedra também é uma classe de goals (o golpe pesado, voltar ao lugar, contornar pilares), e os goals dele são
escritos só com o que está acima. **Domar com item** também é goal: o cachorro do jogo usa o `TameGoal`, provado tick a tick
contra o comportamento de quando o clique era do motor; o motor não tem mais regra de domar nem de sentar. **MONTAR também**: o
cavalo do jogo usa o `MountGoal` (prioridade 0), e o motor ficou só com **montar uma entidade** — cabe o par aqui, a queda que o
cavaleiro já tinha, o assento, levar o cavaleiro junto, o rebanho. As nove recusas e as duas falas que diziam "cavalo" são do
goal, e o item da sela também (`mount.item`): o motor não escreve nome de bicho nem de item. Um mob de mod se declara
**montável** com `mount` e troca a regra à vontade — outra sela, outro alcance, outras falas, montaria sem sela nenhuma,
veículo (`free`) em que qualquer um entra na hora.

### 21.2 Regras de nascimento abertas (`spawn`, `ctx.mobs.spawnRule`)

Onde, quando e quanto cada mob nasce é **dado** (o Fabric: `SpawnSettings`, `BiomeModifications.addSpawn/removeSpawn`, `SpawnGroup`): os
mobs do jogo declaram as suas no campo `spawn` da classe, registradas pela mesma API que a sua.

```js
spawn = [{ when: 'night', zones: ['campos', 'ermos'], weight: 30, group: [2, 3], spread: 'pack', light: { max: 0.3 }, cap: 6, category: 'meumod:matilhas',
           ground: ['mineclaude:grass'], test: (e) => e.y < 80 }]
```

- **`when`:** a situação do ponto que o jogo tenta, uma vez por segundo por jogador: `night` (céu aberto à noite ou, na Quarentena, de dia), `underground`
  (caverna sob o jogador), `day` (céu aberto de dia, no capim), `dungeon` (dentro de sala de masmorra: um mob, e o limite de 3 da sala vale). Também aceita o nome de uma
  condição (`ctx.mobs.spawnCondition('chuva', { situation: 'day', test: (e) => ... })` → `'meumod:chuva'`) ou uma lista.
- **Como entra no sorteio (escolha um):** `weight` (1..100: o sorteio dos mods; juntos levam no máximo metade das vezes), `chance` (0..1: em sequência, cada regra sorteia a sua; a primeira que acerta vale; é o jeito dos javalis, cachorros e cavalos do jogo)
  ou `fallback` + `weight` (o resto, por peso: as manadas, o zumbi 3 e o esqueleto 1). A ordem dos números sorteados faz parte do comportamento: o jogo sem mods sorteia exatamente o que sorteava.
- **Filtros** (a regra só vale onde todos passam): `zones` (do jogo ou `mod:zona`, as de `ctx.worldgen.zone`), `biomes`, `ground` (blocos de nome completo sob os pés; padrão: capim de dia, qualquer um nas outras; `null` = qualquer),
  `light: { min?, max? }` (a luz do dia, 0..1, agora), `cap` (no máximo tantos deste tipo a 48 blocos do jogador) e `test(e)` com `e = { x, y, z, zone, biome, day, daylight, ground, underground, player }`.
- **`group`/`spread`:** quantos nascem juntos; `row` (fila: as manadas), `cluster` (bolo: o padrão dos hostis) ou `pack` (bolo com o mesmo `e.mob.group`: a matilha que caça junto).
- **Categorias** (`ctx.mobs.spawnCategory('matilhas', { cap, capByZone?, attempt?, role? })`, o `SpawnGroup`): o teto de quantos dela perto de um jogador. O mob conta na dele (`category`; sem `category`, na que tem o `role` do papel dele — no jogo base, `mineclaude:passive` e `mineclaude:hostile`) e nas que as regras dele nomeiam. `role` (`'passive' | 'hostile'`) é de um grupo só no jogo inteiro: quem o declara fica sendo o padrão daquele papel.
  As do jogo: `passive` (5, tenta 35% por segundo) e `hostile` (5 × o `hostileCap` da zona).
- **Mexer nos mobs do jogo:** `ctx.mobs.spawnRule('mineclaude:cow', regra)` acrescenta (a regra pode ser uma `SpawnRuleType`: campos + `test(e)`), `ctx.mobs.removeSpawn('chicken')` tira todas
  (ou `removeSpawn(mob, { when, zones, category })` / `removeSpawn(mob, (r) => ...)`). Vale na ordem de carga, depois das regras de cada mob; mob que não existe recusa o boot.

## 22. Geração do mundo: `ctx.worldgen`

Minérios, decorações (features) e estruturas entram na geração **depois de tudo do jogo**, em ordem fixa (ordem de
carga dos mods, depois ordem de registro). O mesmo código gera o chunk no servidor e no navegador: o passo tem que ser
**determinístico** — só `api.rand`, nada de `Math.random`, `Date`, `performance.now` nem variável guardada entre
chamadas. O `modkit check` faz essas funções darem erro dentro do passo e roda cada passo duas vezes no mesmo chunk;
diferença recusa o mod. Cada passo tem o id `<mod>:<path>@<worldgenVersion>` (`worldgenVersion` do `mod.json`; sem ela,
a `version`); o servidor manda a lista ao entrar e o navegador recusa entrar se a dele for diferente.

```js
ctx.worldgen.ore('jade_ore', { block: 'meumod:jade_ore', zones: ['sombrias'], minY: 5, maxY: 40, perChunk: 6, veinSize: 4 });
ctx.worldgen.feature('cogumelos', { zones: ['sombrias'], run(api) {
  const lx = Math.floor(api.rand(1) * 16), lz = Math.floor(api.rand(2) * 16);
  const y = api.heightAt(api.x0 + lx, api.z0 + lz);
  if (api.get(lx, y, lz) === 'mineclaude:grass') api.set(lx, y + 1, lz, 'mineclaude:embercap', true);
} });
ctx.worldgen.structure('totem', { region: 6, chance: 0.5, size: 3, build(api) {
  const { lx, y, lz } = api.origin;
  for (let k = 0; k < 3; k++) api.set(lx + 1, y + k, lz + 1, 'meumod:jade_ore');
} });
```

| Passo | Regra |
|---|---|
| `ore` | `block` com nome completo (bloco que não existe recusa o mod no boot); troca **só** `mineclaude:stone` (nunca caverna nem minério do jogo); `minY`–`maxY` 1–95; `perChunk` 1–20 veios; `veinSize` 1–12 blocos; veio cortado no chunk |
| `feature` | `run(api)` uma vez por chunk cujo centro está numa das `zones` (sem `zones`: todos) |
| `structure` | `region` 4–16 chunks, `chance` 0–1, `size` 1–48 blocos: no máximo uma por região. Até 14: num chunk sorteado, inteira dentro dele. **15–48:** a origem é sorteada em qualquer ponto da região e **cada chunk sob a área** chama `build` com a mesma origem e um `api` cortado nele (`set`/`get` fora do chunk são ignorados) — escreva a estrutura inteira sem olhar o chunk; o resultado é o mesmo em qualquer ordem de geração, e `build` não pode depender de `get` de outro chunk. Nunca em chunk (em nenhum chunk da área) de masmorra, ruína, acampamento, lago, poço ou rio do jogo. `api.origin` = `{ x, y, z, lx, lz }` (canto noroeste; `lx`/`lz` locais podem sair de 0–15; `y` = primeiro ar acima do chão no meio) |

- `api`: `cx, cz, x0, z0`, `rand(salt, x?, y?, z?)` (hash em [0, 1)), `get(lx, y, lz)` (nome do bloco ou `null`),
  `set(lx, y, lz, bloco, soNoAr?)`, `heightAt(wx, wz)`, `zoneAt(wx, wz)` (`lobby`/`campos`/`ermos`/`sombrias`),
  `columnAt(wx, wz)` (`{ h, desert, mountain }`). `get`/`set` usam coordenadas locais 0–15 e **ignoram** o que cair
  fora do chunk (`set` devolve `false`).
- **Altura:** o mundo **não tem teto fixo**. A geração escreve na faixa gerada e, acima dela, o mundo cresce em seções
  verticais de 16 × 16 × 16 conforme alguém constrói. Por isso evite y absolutos onde der: prefira `heightAt` e, no
  subsolo, a profundidade como fração do nível do mar (22.7).
- `set` também põe um **estado** de um bloco com `states`: `api.set(lx, y, lz, { block: 'mod:bloco', properties: { part:
  'rib', facing: 'e' } }, true)` (resolvido uma vez por gerador; combinação proibida lança). `api.terrain` diz a versão do
  terreno do gerador (`1` nos mundos de antes, `2` no novo): um passo que muda o que põe **só** quando `api.terrain === 2`
  deixa os mundos de terreno 1 byte a byte iguais. É assim que o esqueleto fóssil das Dunas Vermelhas é feito — no
  terreno 2, vértebras, costelas, crânio e ossos longos, cada peça um estado `part` × `facing` com a própria `geometry`;
  no terreno 1, os cubos de osso fóssil de sempre.
- **Mundo que já existe:** o servidor guarda no arquivo do mundo (`modWorldgen`) os ids já aplicados. Passo **novo**:
  chunks sem edição ganham a novidade; nos chunks com obra, o terreno de antes fica guardado onde o jogador não mexeu —
  a obra fica intacta. A migração visita todos os chunks com edição (um minério vale em todos eles; o log diz quantos).
  (Região já gerada antes da mudança não muda nada: ver 22.3, eras de geração.)
- **Passo que sumiu ou mudou de versão:** o servidor **não sobe** e diz quais (mod removido, ou `worldgenVersion` nova:
  o que a versão antiga gerou não pode ser refeito, o código dela não está carregado). Com
  `MODLOADER_ALLOW_WORLDGEN_REMOVAL=1` ele sobe: chunks explorados sem edição passam a mostrar a versão nova (ou nada) e
  os com obra guardam só o que foi editado — podem ficar sobras ou buracos; **nada garante a obra intacta** numa troca
  de versão. Por isso: mantenha o comportamento dos passos estável dentro de uma `worldgenVersion` e, para soltar uma
  versão do mod que não mexe na geração, suba só a `version` (deixe a `worldgenVersion` como estava).
- **Custo:** o boot mede cada passo num chunk de amostra; acima de 2 ms por chunk vai um aviso no log (o `modkit check`
  avisa também). O custo é pago em cada chunk gerado também no navegador, na thread principal do jogo.
- **Biomas:** ver a seção abaixo — **opt-in por mundo**; sem ele as zonas são anéis por distância e deserto/montanha
  vêm do clima, e mods dão cara de bioma com `zones` e `columnAt`.

### 22.1 Biomas: `ctx.worldgen.biome` (decididos quando o mundo nasce)

**Nunca mudam um mundo que já existe.** **Todo mundo NOVO nasce com biomas** — os dos mods de bioma carregados naquele
momento. Na criação o arquivo do mundo ganha `biomes: { enabled: true, ids: [...] }` e o mundo fica assim para sempre (a
variável só é lida quando o mundo nasce). `MODLOADER_BIOMES=0` cria o mundo **sem** biomas. Sem nenhum bioma registrado
o mundo nasce sem biomas, e instalar um mod de bioma depois não liga nada. Mundo antigo (sem o campo) ou criado sem
biomas gera **byte a byte igual** a antes, com ou sem mods de bioma carregados.

```js
ctx.worldgen.biome('mangue', {
  name: 'Mangue', climate: { temp: [-0.05, 1], humidity: [0, 1] }, weight: 50, zones: ['campos'],
  surface: 'meumod:lama', filler: 'meumod:lama', treeDensity: 2, grassDensity: 0, color: '#5a6b3a',
});
ctx.worldgen.feature('juncos', { biomes: ['meumod:mangue'], run(api) { /* ... */ } });
```

| Campo | Regra |
|---|---|
| `name` | nome na tela, 1–32 caracteres |
| `climate` | `temp` e `humidity`: `[min, max]` em −1..1. `temp` é o clima do jogo (o deserto aparece acima de ~0,18); `humidity` é um ruído próprio (seed + 6) |
| `weight` | 1–100: entre os biomas cujas faixas (e `zones`) cabem no ponto, um ruído lento sorteia por peso |
| `zones` | opcional, como nos passos |
| `surface` / `filler` | blocos com nome completo: o chão e os **3** blocos logo abaixo |
| `treeDensity` / `grassDensity` | 0–2 (padrão 1): multiplicam árvores e grama alta da coluna (flores só em chão de grama) |
| `color` | opcional `#rrggbb`: tinge o **topo da grama** (`mineclaude:grass`) nas colunas do bioma, pela cor de vértice do montador de malhas (só o tom: a cor é normalizada pelo canal mais claro e misturada 60/40 com branco). Só em mundo com biomas; o navegador calcula o bioma de cada coluna com o mesmo gerador do servidor. Bioma com `surface` que não é grama não muda de cor; folhas e céu não são tingidos |

- **O que muda:** só o chão de colunas que seriam **grama** (praia, deserto, neve do pico, rocha de montanha e fundo
  d'água ficam como são) e a densidade de árvores/grama. Altura do terreno (salvo passos `terrain`, abaixo), cavernas, minérios, rios, lagos e
  estruturas: iguais. As bordas vêm do ruído (contínuas, com um pouco de serrilhado).
- **Filtro `biomes`:** `ore`, `feature`, `structure` e as regras `spawn` de mob aceitam `biomes: ['mod:bioma']`
  (veio: no ponto do veio; feature: no centro do chunk; estrutura: no centro dela; nascimento: na coluna). Num mundo
  sem biomas o filtro nunca casa (o passo/regra não roda). `api.biomeAt(wx, wz)` nos passos e `e.world.biomeAt(pos)`
  na API de mods devolvem `'mod:bioma'` ou `null` — o bioma do **clima** da coluna, mesmo onde o chão não foi trocado.
- **Ids:** `<mod>:<path>@<worldgenVersion>`. O servidor manda a lista de biomas do mundo (ou `null`) ao entrar e o
  navegador recusa entrar se a dele for diferente. Bioma gravado que sumiu (mod removido ou `worldgenVersion` nova):
  o servidor **não sobe**, a mesma regra e a mesma `MODLOADER_ALLOW_WORLDGEN_REMOVAL=1` dos passos. Bioma **novo** num
  mundo com biomas: entra como um passo novo — chunks sem edição mostram o chão novo; nos com obra, o chão de antes fica
  guardado onde o jogador não mexeu (a escolha por peso muda em qualquer lugar onde o bioma novo cabe, então a migração
  visita todos os chunks com edição).
- **Terreno (`ctx.worldgen.terrain`, só mundo com biomas):** `terrain(path, { biomes?, run(api) })` roda uma vez por
  chunk **logo depois das colunas do jogo** (antes de árvores, rios, estruturas e dos outros passos) e move o chão:
  `api.setHeight(lx, lz, h)` (preso entre 4 e o topo da faixa gerada menos 14; chão/recheio refeitos pela regra do jogo
  e do bioma), `api.height(lx, lz)` (atual), `api.baseHeight(lx, lz)` (do jogo), `api.noise2(salt, x, z)` (ruído puro de
  coordenadas de mundo, cerca de −1..1), `rand`, `zoneAt`, `biomeAt`. Com `biomes`, `setHeight` só vale nas colunas
  desses biomas. Tem que ser **função pura das coordenadas de mundo** (use `noise2`): árvores e rios do chunk vizinho
  leem estas alturas, e o resultado não depende da ordem em que os chunks nascem. Mundo **sem** biomas com um passo de
  terreno carregado: o servidor **não sobe** (diz qual passo); sem o passo, nada muda.
- **`modkit check`:** gera chunks de amostra duas vezes com os biomas, conta em quantas de 4096 colunas cada bioma
  aparece (0 = aviso) e confere os passos com `biomes` num mundo com biomas.

### 22.2 O Overworld é um pipeline de estágios (o mod base é só mais um mod)

O motor **só roda o pipeline**: não conhece bloco, zona nem estrutura do jogo. O Overworld é conteúdo do mod base,
uma classe por estágio, registrada pelas mesmas chamadas `ctx.worldgen.*` que um mod usa (o jogo as faz ao carregar o
motor, porque o servidor, o navegador e os testes geram mundo antes de qualquer entrypoint rodar). Os estágios, em ordem:

| id | classe base | o que faz |
|---|---|---|
| `mineclaude:terrain` | `TerrainShaper` | altura de cada coluna (`column(wx, wz)` -> `{ h, desert, mountain }`) |
| `mineclaude:biomes` | `BiomeSource` | onde cresce cada bioma de mod (só em mundo com biomas) |
| `mineclaude:surface` | `SurfaceRule` | bedrock, pedra, terra, cobertura (`surfaceAt(info, wx, wz)` para os outros) |
| `mineclaude:fluids` | `Feature` | o mar |
| `mineclaude:caves` | `Carver` | cavernas |
| `mineclaude:ores` | `OreFeature` | minérios por zona |
| `mineclaude:trees`, `:vegetation` | `Feature` | árvores/cactos; grama alta e flores |
| `mineclaude:dungeons`, `:ruins`, `:lakes`, `:dry_beds`, `:rivers`, `:camps`, `:wells` | `StructureFeature` | estruturas; cada uma `provides()` suas consultas (`ruinAt`, `campAt`...), que o mod declara ao motor como tipos de estrutura com papel (22.5) |

Um estágio é uma classe: `constructor(ctx)` (ruídos, ids de bloco), `generate(chunk)` (escreve em `chunk.data`/`chunk.set`; `chunk.info(lx, lz)`
dá a coluna) e, se quiser, `provides()`. O `ctx` traz `seed`, `noise(offset)` (`createNoise(seed + offset)`), `hash3`, `block('mod:bloco')`,
`zoneAt`, `columnInfo`, `stage(id)`, `locate`. Nada de `Math.random`/`Date`: o servidor e cada navegador geram o mesmo chunk. Tipos:
`GenerationContext`, `GenerationChunk` e as classes de estágio em `types/mineclaude-mod.d.ts`.

```js
import { ModInitializer, TerrainShaper, Carver, ZoneType } from './mineclaude-sdk.js';
class Plains extends TerrainShaper {
  column(wx, wz) { return { h: this.ctx.seaLevel + 4 + Math.round(this.ctx.noise(20).noise2(wx / 48, wz / 48) * 2), desert: false, mountain: false }; }
}
class Polo extends ZoneType { name = 'Polo'; contains(x, z) { return Math.hypot(x - 200, z - 200) < 60; } }
export default class M extends ModInitializer {
  onInitialize(ctx) {
    ctx.worldgen.replace('mineclaude:terrain', Plains);                    // troca um estágio por outro do MESMO tipo
    ctx.worldgen.modify('mineclaude:ores', (inner, gen) => ({ generate(chunk) { inner.generate(chunk); /* ...mais */ } })); // embrulha
    ctx.worldgen.carver('ravina', Ravine);                                 // acrescenta (roda depois das cavernas do jogo)
    ctx.worldgen.ore('jade', JadeVeins);                                   // OreFeature (a forma { block, zones, ... } continua)
    ctx.worldgen.surface('neve', Snow);                                    // SurfaceRule depois da do jogo
    ctx.worldgen.stage('ilhas', Islands, { after: 'mineclaude:trees' });   // estágio novo em qualquer ponto
    ctx.worldgen.zone('polo', Polo);                                       // zona de mod: key 'meumod:polo' (anel `from` ou área `contains`)
    ctx.worldgen.area('refugio', { role: 'lobby', zone: 'meumod:polo', x: 200, z: 200, r: 30 }); // lugar por PAPEL
  }
}
```

- **`replace(alvo, Classe)`:** a classe tem que ser do mesmo tipo do alvo (`TerrainShaper` por `terrain`...); alvo desconhecido ou tipo errado
  recusa o mod no boot. **`modify(alvo, (inner, ctx) => estágio)`:** `inner` é o que rodaria; devolva um objeto (que herda de `inner`: o que faltar
  nele vem do `inner`) ou uma instância; sem retorno, vale o `inner` que você mexeu. Vários `replace`/`modify` no mesmo alvo valem na ordem de registro.
  Evite campos `#privados` nos estágios (o objeto que embrulha herda do estágio).
- **`generator(path, Tipo)`:** um `ChunkGenerator` inteiro (`stages` = ids na ordem, `locators` = respostas padrão das consultas, `oreHost` = bloco que
  os minérios de mod trocam) no lugar do do jogo. Só um mod por servidor.
- **Mundo salvo:** `stage`, `carver`, `surface` e `ore` (classe) entram na lista de ids como qualquer passo (`<mod>:<path>@<worldgenVersion>`, o cliente
  confere) e migram como `feature`. `replace`, `modify`, `generator` e o passo de `terrain` mudam o **chão** do que já existe e por isso valem em
  **qualquer** mundo, protegidos pela **era do gerador** (22.3): região já gerada fica na era dela e sai igual byte a byte; região nova sai com a mudança.
  Nada derruba o boot. `disabled` deixa o estágio de fora e volta o mundo do jogo, bloco a bloco.
- **Zonas abertas:** o filtro `zones` de `ore/feature/structure/biome` aceita as do jogo (`lobby`, `quarentena`, `campos`, `ermos`, `sombrias`) **e** as
  de mods (`mod:caminho`; zona que ninguém registrou recusa o boot). As zonas do jogo e as de mod estão no **mesmo registro**, e uma zona é uma de duas
  formas: **anel** (`from`: a distância da origem em que começa) ou **área** (`contains(x, z)`: um lugar, a qualquer distância; `from = -1` diz que
  distância nenhuma a alcança). `ctx.worldgen.zone(path, Classe)` registra uma `ZoneType` com `name` e uma das duas formas (+ `hp`, `damage`,
  `hostileCap`, `loot`, `stars`, `color`, `hostileDay`; o que faltar vira neutro). Mais dois campos valem a pena:
  - **`scaleMob(e)`** com `e = { hp, damage, hostile }` é a REGRA da zona para o mob que nasce nela ("hostil escala, passivo não" é do jogo base,
    não do motor). Sem ela, nada escala.
  - **`sky = { tint: [r, g, b], mix, fogMul, sharp? }`** é o céu por cima. Entre anéis o motor faz a passagem suave de 64 blocos de cada lado da
    fronteira; `sharp` faz dela um degrau, e numa zona de **área** ele é obrigatório (não há distância para interpolar).

  `zoneAt` pergunta aos **lugares** (as áreas e as zonas com `contains`) na ordem de registro e depois ao maior anel que couber — então uma zona de mod
  nunca vem antes do lobby e da quarentena do jogo, que se registram no bootstrap. O spawn de mobs (`zones` das regras, 21.2) e o loot dos baús
  (`loot` da zona) também olham as zonas de mods; só as trocas do mercador seguem por zona do jogo (numa zona de mod ele não oferece nada).
- **`area(path, desc)`: um lugar por PAPEL.** `ctx.worldgen.area('refugio', { role: 'lobby', zone: 'meumod:refugio', x, z, r, y?, box? })`. O motor
  pergunta a uma área pelo **papel** dela, nunca pelo nome: `lobby` (aqui não se edita, não explode e não nasce hostil, e a paleta do criativo
  desliga), `quarantine` (região com regras de vida próprias) e `match` (um dos lugares em que uma partida acontece). É um quadrado de meia largura
  `r` em volta de `(x, z)`, com `y` de piso quando tem; `zone` (a chave de uma zona registrada) faz a zona de quem está dentro ser aquela — é assim
  que o lobby e a Quarentena do jogo são zonas sem serem anéis.
- **Papéis de área abertos: `areaRole(path, { required?, description? })`.** Devolve `"<mod>:<path>"`, que a `area` aceita em `role` (declare o papel
  ANTES da área). Os três do motor (`lobby`, `quarantine`, `match`) continuam como eram; um papel seu não muda nada no motor, quem pergunta por ele
  é o seu código (as consultas de área do registro de zonas: `inArea`, `areasOf`, `areaAt`). `required: true` faz o **boot** recusar um jogo que não
  declarou nenhuma área do papel, com uma mensagem que nomeia o papel e diz como declarar — é o que o lobby e a quarentena do motor são. Um jogo sem
  lobby ou sem quarentena já **não quebra** ao carregar (as constantes caem num ponto de raio 0, e as perguntas "está no lobby?"/"está na quarentena?"
  respondem `false`); quem recusa é o boot, depois de todos os mods e das modificações.
- **Modificar e desligar zonas e áreas: `zones.modify/disable` e `areas.modify/disable`.** Pela mesma fila das outras modificações: aplicam depois
  que todos os mods registraram, por `priority` e ordem de carga, o jogo base por último; o alvo é o nome completo (`mineclaude:ermos`).
  `zones.modify('mineclaude:ermos', { name, hostileCap, loot, color, sky... })` (ou `(zona) => zona`) muda `name`, `from` (só de anel), `hp`,
  `damage`, `hostileCap`, `loot`, `stars`, `color`, `hostileDay` e `sky`, com o MESMO validador do registro; o formato (`contains`) e a regra do mob
  (`scaleMob`) são funções do motor e ficam de fora com o motivo. A zona é alterada **no lugar** (o motor segura o objeto) e o registro sela no fim do
  boot. `zones.disable(alvo)` faz o motor parar de perguntar por ela (`zoneAt` não a devolve); o índice no registro de zonas e a chave seguem valendo
  em regras de nascimento e filtros. Não saem a última zona por distância nem a zona de uma área `lobby`/`quarantine`.
  `areas.modify(alvo, { x, z, r, y, box, zone })` e `areas.disable(alvo)` fazem o mesmo com as áreas; o lobby e a quarentena do jogo não mudam de
  lugar nem saem (o motor lê o centro e o raio uma vez ao subir), nem as áreas de partida saem (o índice vai para o log), mas uma área de partida muda
  de lugar. Entram nos ids de geração do mundo (o navegador confere). Só contam como passo de **terreno** (e portanto era nova para o mundo salvo) as
  que mexem no que o gerador lê: `from` de anel, `disabled`, e `x`/`z`/`r`/`zone` de área; nome, vida, dano, cor, loot, céu, `y` e `box` não, e a forma
  de função conta como terreno (não dá para saber antes). Atenção: o gerador de uma era antiga lê as zonas já modificadas (o registro é um só), então o
  que protege a região explorada é só não mexer nesses campos depois que o mundo existe. **Sandbox:** o patch (JSON) passa; a forma de função é
  recusada com o motivo.

### 22.3 Eras de geração: o chunk que já existe não muda

A geração é **função pura** de (seed, cx, cz): o servidor não guarda chunk, guarda só as **edições**, e o navegador
gera o mesmo terreno. Logo, um mod que muda o chão (`replace`, `modify`, `generator`, `terrain`) mudaria também o que
alguém já viu. O que protege o mundo salvo é a **era do gerador gravada por região**:

- **Era** = a lista de ids dos passos de geração daquele momento (a mesma lista do arquivo do mundo, em `modWorldgen`,
  e da mensagem de entrada). O mundo guarda as eras que já usou, da mais velha para a de agora.
- **Região** = 16 × 16 chunks (256 × 256 blocos). A região ganha a marca da era de agora **quando um chunk dela vai
  para um jogador**, e **nunca mais muda**.
- Mudou a lista de passos (mod de geração que entrou, saiu ou subiu de `worldgenVersion`)? Nasce uma **era nova**. As
  regiões já marcadas seguem geradas com o gerador da era delas — os passos que vieram depois ficam desligados —, então
  o chunk delas sai **byte a byte** igual ao de antes. Região sem marca (nunca gerada) sai com a geração de agora.
- O navegador recebe as eras e as regiões presas ao entrar e escolhe o mesmo gerador por chunk, senão desenharia o
  terreno novo sobre o velho.
- **Mundo de uma era só** — todos, até um mod mexer na geração — não ganha campo no arquivo do mundo nem na mensagem (só
  o mapa de regiões, quando houver), e o gerador dele é exatamente o de sempre.
- O passo que **este** mundo não tem como atender sai no log como `[mods] RECUSADO: ...`, nomeando o mod e o passo, e o
  servidor **sobe** (hoje é o filtro `biomes:` num mundo sem biomas: o filtro nunca casa).
- **Limite:** a região que um mundo salvo **antes** desta versão já explorou e ninguém editou não tem marca — o mundo
  nunca soube dela —, então ela cai na era nova. A proteção vale do primeiro boot com esta versão em diante; para os
  chunks **com obra** continua valendo a migração de 22 (o terreno de antes guardado como edição).

### 22.4 Modificar um bioma que já existe: `ctx.worldgen.biomes.modify`

O `ctx.worldgen.biome` **cria** um bioma. Para mudar um que **já existe** — do jogo base ou **de outro mod** — é o
`ctx.worldgen.biomes.modify(seletor, fn, { phase })` (o `BiomeModifications` do Fabric):

```js
// por #tag de bioma, na fase das adições
ctx.worldgen.biomes.modify('#c:is_wet', (e) => {
  e.generation.addFeature('meumod:pedras');       // o passo passa a rodar neste bioma
  e.effects.setGrassColor('#3f7a2e');             // visual: vale na hora, em toda região
  e.spawns.add('mineclaude:pig', { when: 'day', weight: 40, group: [1, 3] });
}, { phase: 'additions' });

// por função, na fase das remoções
ctx.worldgen.biomes.modify((e) => e.temp[1] < 0, (e) => {
  e.generation.removeFeature('meumod:tufos');     // tira o passo deste bioma (mesmo sem filtro nenhum)
  e.generation.setTreeDensity(0);
  e.spawns.remove('mineclaude:zombie');
}, { phase: 'removals' });

// por nome, com a última palavra
ctx.worldgen.biomes.modify('outromod:mangue', (e) => { e.climate.setHumidity([0.2, 1]); }, { phase: 'post_processing' });
```

**O seletor** tem três formas: um nome completo (`'mod:bioma'`), uma **`#tag` de bioma** (`'#c:is_wet'`) ou uma
**função** que recebe o bioma e devolve booleano (o `BiomeSelectors` do Fabric escrito como três formas). Seletor que
não pega nada é legítimo: o modificador simplesmente não roda.

**A fase** (`ModificationPhase`) é o contrato de ordem, e é por isso que ela existe: os modificadores rodam
`additions` → `removals` → `replacements` → `post_processing` e, **dentro da fase**, na ordem de registro (ordem de
carga dos mods, depois a ordem em que o mod registrou). Assim "um mod acrescenta, o outro tira" tem resposta definida
sem depender de qual mod carregou primeiro. Sem `phase`, vale `additions`. O `e.biome` que o seletor e o modificador
recebem é o bioma **como as fases anteriores o deixaram**.

| O que o contexto muda | Vale quando |
|---|---|
| `e.climate.setTemperature([min, max])`, `setHumidity([min, max])` — a faixa onde o bioma cresce | **terreno** |
| `e.generation.addFeature(passo)` / `removeFeature(passo)` / `addOre` / `removeOre` — que passo roda no bioma | **terreno** |
| `e.generation.setWeight`, `setTreeDensity`, `setGrassDensity`, `setSurface`, `setFiller`, `setZones` | **terreno** |
| `e.effects.setGrassColor('#rrggbb')` / `clearGrassColor()` — o `color` do bioma | **na hora** |
| `e.spawns.add(mob, regra)` / `remove(mob)` / `clear()` / `setWeight(mob, w)` / `setCap(mob, n)` | **na hora** |

- **"terreno" = era de geração (22.3).** Todo `biomes.modify` é um passo de geração, então entrar com um mod de
  modificação de bioma **abre uma era nova**: região já gerada fica presa na era dela, com os modificadores
  desligados, e o chunk dela sai **byte a byte** igual ao de antes; região nova sai com a mudança.
- **"na hora" = em toda região, inclusive na já gerada.** A cor e o nascimento são lidos fora do gerador: tinta não é
  bloco e mob não é chunk, então nada do que já existe é desfeito por eles.
- **`addFeature` / `removeFeature` são mais fortes que o filtro do passo.** `addFeature` põe o passo no bioma mesmo
  que o `biomes:` dele não o cite (ou cite uma tag vazia); `removeFeature` tira o passo do bioma mesmo que ele **não
  tenha filtro nenhum** (passo sem filtro roda em todo lugar). Valem para feature, minério e estrutura — aqui os três
  são passos com filtro de bioma.
- **O filtro `biomes:` de um passo aceita `#tag` de bioma**, não só o nome cheio: `ctx.worldgen.ore('jaspe', { biomes:
  ['#c:is_wet'], ... })`. A tag é resolvida **quando o ponto é tentado**, então uma tag que um mod ou um pacote de
  dados encheu depois passa a casar sozinha; tag vazia não casa com nada. É a mesma entrada que as regras `spawn` de
  mob já aceitavam (21.2).
- **Recusas:** `addFeature`/`removeFeature` com um passo que ninguém registrou, ou `setSurface`/`setFiller` com um
  bloco que não existe, **recusam o mod no boot**, com o nome na mensagem. Num mundo **sem biomas** sai uma linha
  `[mods] RECUSADO: biomes.modify ...` e o servidor **sobe** (não há bioma ali para mudar).
- O modificador tem de ser **função pura do contexto** (ele roda nas duas passagens; nada de `Math.random`, `Date`
  nem variável guardada entre chamadas).

### 22.5 Estruturas por tipo e papel, e migrações de save declaradas

O motor **não conhece nenhuma estrutura pelo nome**: quem diz o que é uma estrutura é o mod (o do jogo inclusive), e o motor pergunta por
**papel**. São duas declarações em `ctx.worldgen`.

**`structureKind(path, { locator, near?, role?, protects?, loot? })`.** `locator` é o nome da consulta que um estágio seu `provides()`
(`(cx, cz) => valor | null`, igual ao `ruinAt` do jogo). O tipo diz ao motor:

- **`role`**: o que ela é. O motor usa `dungeon` (o valor tem `chest: { x, y, z }`; com `boss`, é sala de chefe), `ruin` (valor com `chest`) e
  `camp` (onde mora o mercador; `near` é a consulta `(x, z, max) => [{ c, d }]` que o `/rumo` usa). Qualquer outro nome serve para os seus
  sistemas: `gen.structureAt('torre', cx, cz)` devolve o valor da consulta do primeiro tipo com esse papel, e `gen.structuresNear(papel, x, z, max)`
  a lista dos mais próximos. Quem consulta (loot, guardião, mercador, `/rumo`) não escreve o nome da consulta nem o do jogo.
- **`protects`** (padrão `true`): as estruturas declarativas de mods (`ctx.worldgen.structure`, pequenas e grandes) **nunca dividem chunk** com
  ela. É assim que a torre do seu mod entra na mesma regra de "não dividir chunk" que a masmorra, a ruína, o acampamento, o lago, o poço e o rio do jogo.
- **`loot`**: `{ chest, boss }` com nomes completos de tabelas de loot: o baú do valor (`value.chest`) abre com `chest` na primeira vez, e o chefe da
  masmorra deixa `boss`.

Num mod, o tipo é **um passo de geração** (muda onde as estruturas de mod podem ir): entra na lista de ids do mundo, e o chunk já gerado fica na era
dele (22.3). No jogo é só registro. Um jogo sem nenhuma estrutura não declara tipo e nada quebra.

**`migration(id, desc)`**, o `DataFixer` do save. O `id` é estável (`meumod:nome`; os do jogo guardam o nome simples que os mundos já têm). O motor roda,
**uma vez por mundo**, as que o arquivo do mundo ainda não lista em `migrations`, na ordem de registro (o jogo primeiro), e as grava lá. Mundo novo já
nasce com todas marcadas; mod que chega depois traz as dele e elas rodam no primeiro boot. `desc` é um de três:

```js
// 1) novidade de geração que aparece também em chunk já explorado: onde o jogador editou, o terreno de antes vira edição
ctx.worldgen.migration('meumod:torres', { locator: 'torreAt', without: { torres: false }, label: 'torres' });
// 2) a planta rasteira ('ground_cover') ou a flor que o gerador pôs onde o jogador cavou ou construiu some
ctx.worldgen.migration('meumod:grama2', { plants: 'ground_cover', label: 'gramas altas' });
// 3) a sua: e = { id, seed, dimension, log(texto), regenerate(consulta | (cx, cz) => bool, without, label) }
ctx.worldgen.migration('meumod:v2', { run(e) { e.log('ajustei o que era da v1'); } });
```

`without` são as opções do gerador que desligam a novidade (o estágio as lê nas `opts` que ele recebe — o contexto do estágio de geração, não o `ctx`
do mod). As do tipo 1 com `joint` (padrão `true`) rodam **juntas** e todas comparam com o gerador com **todas** as pendentes desligadas, para um bloco
mexido por duas novidades voltar ao que era; `joint: false` compara só com a própria. Se `run` lançar, o erro vai ao log e a marca **não** é gravada
(tenta de novo no boot seguinte). As 13 do jogo base guardam os mesmos ids de sempre.

### 22.6 Densidade, splines, clima e posicionamento: `ctx.worldgen.density`

O **terreno 2** (o dos mundos novos) é um grafo de **funções de densidade com nome**, registradas pelo mod base pela mesma API pública que está aqui.
Uma função de densidade dá um número para cada ponto (x, y, z): **> 0 é sólido**. Uma que não lê y é um **campo 2D** (um valor por coluna). Os nós são
**dado puro** (`{ type, ... }`): dá para imprimir, comparar e embrulhar, e o grafo é determinístico por construção (não roda código seu ao amostrar).

```js
const D = ctx.worldgen.density, P = ctx.worldgen.placement;
// um campo de clima seu (2D): o mapa desenha, o placement de bioma lê
ctx.worldgen.climate('pedregosidade', D.clamp(D.add(0.5, D.noise2('meumod:pedras', { scale: 1 / 300, octaves: 2 })), 0, 1));
// uma função qualquer (pode ter pastas no caminho)
ctx.worldgen.densityFn('relevo/morros', D.spline(D.ref('mineclaude:overworld/erosion'), [
  { at: -0.3, value: 20 }, { at: 0, value: D.mul(8, D.ref('meumod:pedregosidade')) }, { at: 0.3, value: 0 },
]));
// embrulhar a do jogo: rios 40% mais largos (o campo de rios é "blocos até o centro do rio")
ctx.worldgen.densityFns.modify('mineclaude:overworld/rivers', (inner) => D.mul(1 / 1.4, inner));
// feature com posicionamento declarativo: run(api, pos) uma vez por posição que sobrar
ctx.worldgen.feature('pedregulhos', { placement: [P.count(2), P.inSquare(), P.heightmap(), P.scan({ down: 1, match: ['mineclaude:grass'] })],
  run(api, pos) { api.set(pos.lx, pos.y, pos.lz, 'mineclaude:stone', true); } });
```

| Construtor (`D.`) | O que é |
|---|---|
| `constant(v)`, `coord('x'\|'y'\|'z')` | número fixo; a coordenada do mundo |
| `noise2(nome, { scale, octaves?, fractal?: 'fbm'\|'ridged', warp? })` | ruído 2D pelo **nome** (`mod:nome`: semente própria, nunca colide com o de outro mod). `scale` = 1/blocos. `warp: { noise, scale, strength }` dobra o campo (costas naturais) |
| `noise3(nome, { scale, yScale?, octaves? })` | ruído 3D (~-1..1) |
| `add`, `mul`, `min`, `max` (2+ args), `abs`, `neg`, `square`, `sqrt`, `clamp(a, min, max)` | aritmética |
| `smoothstep(a, de, até)`, `lerp(t, a, b)` | transições suaves |
| `spline(entrada, [{ at, value, slope? }])` | curva que passa por todos os nós; `value` pode ser outra spline (aninhada). Sem `slope`, a curva é **monótona** onde os nós são (sem passar do ponto) |
| `yGradient(y0, y1, v0, v1)`, `radial({ x, z, radius })` | rampa em y; 1 no centro caindo a 0 no raio |
| `ref('mod:nome')` | outra função com nome (resolvida quando o gerador nasce: vale o `modify` de outros mods) |
| `cache2d(a)` | avalia uma vez por coluna (só 2D) |
| `zeroDistance(a)` | blocos até a linha onde um campo 2D cruza zero: faixas de largura constante (rios) |
| `tube(a, b, raio)`, `chambers(campo, limiar)` | túneis longos onde dois campos 3D cruzam zero; bolhas onde um campo passa do limiar |

- **Registro:** `densityFn(path, nó, { description? })` e `climate(path, nó)` devolvem o id do passo; `densityFns.modify(alvo, (inner) => nó)`
  e `densityFns.replace(alvo, nó)` editam a de qualquer um (a do jogo inclusive), na ordem de registro. Alvo desconhecido recusa o mod no boot.
- **Eras:** cada um desses é **passo de geração de terreno**: região já gerada fica na era dela (22.3) e a borda com a era nova é
  **misturada** (rampa de 32 blocos, não paredão).
- **Nos estágios** (`this.ctx` de um `TerrainShaper`/`Carver`...): `ctx.density(nome)` dá `{ sample(x, y, z), is2D }` compilado para a
  semente; `ctx.sampleVolume(sample, { x0, z0, yMin, yMax, cellXZ?, cellY? }, out?, termoPorColuna?)` amostra um chunk nos cantos das
  células (4×4×4) e interpola o resto (~40× mais barato que bloco a bloco); `ctx.topSolid(...)`, `ctx.climateAt(x, z)`,
  `ctx.namedNoise(nome)`, `ctx.fluidLevels({ layers, aquifer })`, `ctx.blendAt(x, z)`.
- **Bioma no terreno (o NICHO):** `ctx.worldgen.biome(..., { placement: { 'mineclaude:overworld/continents': [-0.2, -0.04], altitude: [-40, 4] } })`
  — qualquer função 2D com nome (`temperature`, `humidity`, `weirdness`, `continents`, `erosion`, `ridges`, `rivers`...) e `altitude`
  (blocos acima do mar, do chão liso). O nicho é `climate` (temperatura e umidade) + `placement` (que acrescenta eixos ou troca a faixa
  de temperatura/umidade). Só o terreno 2 lê; o terreno 1 escolhe só por `climate` (mundo antigo não muda). **Como o terreno 2 escolhe:**
  os nichos que contêm a coluna disputam; ganha o que lista **mais eixos** (o bioma de costa ganha da floresta na costa); empate divide
  por `weight`, um sorteio por **célula de Voronoi** (~200 blocos: a área inteira é um bioma só); nenhum contém: o mais perto (cada
  eixo na sua unidade), até um alcance; além dele, o chão do jogo. A **temperatura é a do ar**: esfria com a altitude (bioma frio sobe a
  montanha). Umidade e `weirdness` são lidas uma vez por célula; o resto, por coluna. O mapa de clima dos biomas oficiais está numa
  tabela só, dentro do mod de biomas. Eixo que não existe ou que é 3D: o gerador recusa ao nascer, com o nome.
- **Borda misturada (terreno 2):** perto da borda o bioma tem um **peso** 0..1 (a fração dele num raio de ~20 blocos, suave de coluna
  em coluna). O motor usa para intercalar o chão dos dois biomas e misturar a tinta da grama; um passo `terrain` lê com
  `api.biomeWeight(wx, wz, 'mod:bioma')` e faz a forma do bioma (dunas, planalto, brejo) **entrar em rampa** em vez de parede. Ausente
  no terreno 1 (borda dura, como sempre): `if (api.biomeWeight) { ...rampa... } else { ...como antes... }`. Nos estágios:
  `ctx.biomeWeights` (`weightOf`, `weights`, `pick`), e as primitivas `ctx.voronoi`, `ctx.climateLattice`, `ctx.nicheSelector`.
- **Campos do jogo** (terreno 2): `mineclaude:overworld/continents` (< -0,125 mar), `erosion` (baixo = montanha), `ridges`,
  `temperature`, `humidity`, `weirdness` (clima; `weirdness` ~-0,5..0,5: os biomas raros pedem um extremo); `land_height`, `rivers`,
  `surface`, `relief`, `cliff_height`, `cliff_steps` (2D); `terrain`, `caves` (3D).
- **Determinismo:** só `+ - * /`, `floor`, `abs`, `sqrt` dentro do motor (iguais em todo navegador); o `modkit check` compila cada função
  sua, compara duas amostragens em ordens opostas bit a bit, recusa NaN e mede o custo por chunk (aviso acima de 2 ms).

### 22.7 O subsolo: salas de caverna, depósitos de minério e aquíferos

O subsolo do terreno 2 é **conteúdo** que o mod base registra por estas mesmas chamadas; um mod acrescenta o seu. Tudo é **dado**
(conferido na hora do registro, com o nome do mod no erro), e cada entrada de um mod é **passo de geração de terreno** (22.3: região já
gerada fica na era dela). Só o terreno 2 lê (o terreno 1 não tem subsolo novo; mundo antigo não muda).

**Profundidade** é sempre uma **fração do nível do mar**, nunca um y fixo: `0` = nível do mar, `1` = o fundo do mundo (y 0), negativo =
acima do mar (y = mar × (1 − d)). Se a faixa de altura do mundo mudar, os números continuam valendo.

```js
// uma SALA: o terreno 2 põe uma por nó do grafo de cavernas (~60% dos nós), escolhida por peso entre as que cabem ali
ctx.worldgen.caveRoom('salao_fossil', {
  weight: 2, depth: [0.3, 0.9], shape: 'hall', radius: [5, 8], height: [5, 7], wobble: 0.1,   // biomes: ['meumod:pantano'] opcional
  decor: [{ block: 'mineclaude:ancient_stone', on: 'wall', chance: 0.3, replace: true }, { block: 'mineclaude:clay', on: 'floor', chance: 0.6, replace: true }],
});
// DECORAÇÃO nas salas de qualquer um (rooms: nomes completos; sem rooms = todas)
ctx.worldgen.caveDecor('tochas', { rooms: ['mineclaude:grand_cavern'], block: 'mineclaude:torch', on: 'floor', chance: 0.01 });
// um DEPÓSITO: veio (vein), bolsão (blob) ou camada de rocha (layer)
ctx.worldgen.oreDeposit('argila', { kind: 'blob', block: 'mineclaude:clay', depth: [0, 0.5], size: 9, frequency: 0.3, density: 0.9 });
// uma regra de AQUÍFERO: numa faixa de profundidade, uma parte das células guarda água (ou lava) até um nível próprio
ctx.worldgen.aquiferRule('agua_funda', { fluid: 'mineclaude:water', depth: [0.4, 0.9], chance: 0.1, level: [-2, 4] });
```

| Chamada | Campos |
|---|---|
| `caveRoom(path, spec)` | `weight` (0..100], `depth` [de, até], `biomes?` (filtro da coluna acima), `shape`: `dome` (chão plano, abóbada), `ellipsoid`, `hall` (comprido), `shaft` (poço até o céu, sobre entulho); `radius` [min, max] (2..16), `height` [min, max] (3..24), `wobble?` 0..0,4; `pool?` `{ fluid, depth }` (lago selado por um anel de rocha: nunca vaza), `pillars?` `{ count, radius, block? }`, `mound?` `{ block, height, radius }`, `decor?` |
| decoração (`decor`, `caveDecor`) | `{ block, on: 'floor' \| 'ceiling' \| 'wall', chance, replace? }`: no chão (em cima da rocha), pendurado no teto, na parede; `replace: true` troca a própria rocha da superfície (chão de cascalho, parede de ametista). Um enfeite por célula: vale o primeiro cuja sorte passa (os do modelo antes dos de `caveDecor`) |
| `oreDeposit(path, spec)` | `kind`: `vein` (veio sinuoso de centenas de blocos numa profundidade), `blob` (bolsões), `layer` (camada de rocha que ondula: estratos); `block`, `depth`, `size` (blocos), `thickness` (raio do veio / espessura da camada), `frequency` 0..1, `density?` (parte que vira minério), `host?` (o que ele troca; padrão: a pedra e as rochas das camadas), `filler?`/`fillerShare?`, `undulation?`. O campo vira a função de densidade `<mod>:deposit/<path>` |
| `aquiferRule(path, spec)` | `fluid` (ou `null`: célula seca de propósito), `depth`, `chance` (parte das células da faixa), `level` [lo, hi] em volta do centro da célula, `belowSea?` (padrão: verdadeiro para água). A regra de um mod pega a sua parte da faixa **antes** da do jogo |

- **Como o motor usa** (terreno 2): o mundo é cortado num **grafo de cavernas** (nós a cada ~72 blocos, ligados aos vizinhos
  naturais: conectado de propósito), com túneis entre os nós e entradas para a superfície; ~60% dos nós têm uma sala. A água e a lava
  do subsolo vêm de **aquíferos**: cada célula 3D tem o seu nível (ou nenhum), e onde dois níveis se encontram fica uma **barreira de
  rocha**; nada de fluido ao lado ou em cima de ar (nem de outro fluido), em qualquer ordem de chunk. Os depósitos rodam no estágio
  `mineclaude:deposits` (depois dos minérios espalhados, antes das cavernas: a parede da caverna corta o veio e mostra).
- **Consultas sem gerar** (gerador e `api.undergroundAt` das estruturas/features): `undergroundAt(x, y, z)` → `{ depth, belowGround,
  aquifer, room }`, `caveRoomsNear(x0, z0, x1, z1)` (salas com centro, tamanho, lago e `enclosed`), `caveTunnelsNear`, `caveNodesNear`,
  `aquiferAt(x, y, z)`. Em terreno 1, `null`/listas vazias.
- **Nos estágios:** `ctx.aquifer(opts)`, `ctx.caveGraph(opts)`, `ctx.underground` (o conteúdo deste gerador, sem os passos
  desligados), `ctx.carvers` (`tunnelPath`, `rasterTunnel`, `placeRoom`, `roomCell`, `poolCell`, `pickRoom`...), `ctx.oreDeposits()`,
  `ctx.applyDeposit(...)`.
- **`modkit check`** relata cada entrada e prova que ela faz algo: a sala aparece em nós do grafo (0 = AVISO: faixa ou biomas estreitos
  demais), o depósito põe blocos, a regra de aquífero pega células; e gera chunks de teste em duas ordens comparando byte a byte.
  Decoração de uma sala que ninguém registrou, ou bloco desconhecido: o mod é recusado no boot, com o nome.

### 22.8 Estruturas: conjuntos, peças e chão adaptado

Uma estrutura grande (vila, castelo, posto) é um **estágio** do gerador (`StructureFeature`, 22.2) que usa quatro ferramentas
do motor, por `ctx.structures` (no contexto de geração). Os dados — onde podem ficar e de que peças são feitas — são
registrados antes, conferidos na hora (erro com o nome do mod):

```js
// ONDE: um CONJUNTO de estruturas — uma por região de 20 x 20 chunks, terrenos de 3 x 3 chunks a 4 chunks uns dos outros,
// até 6 lugares tentados por região, 60% das regiões; `exclusion` mantém distância de outro conjunto
ctx.worldgen.structureSet('povoados', { spacing: 20, separation: 4, footprint: 3, salt: 0x4a71, attempts: 6, frequency: 0.6,
  /* spread: 'triangular', exclusion: [{ set: 'creatures:villages', chunks: 12 }] */ });
// O QUÊ: um conjunto de PEÇAS — cada peça é um retângulo com conectores nas bordas; um conector com `pool` puxa uma peça do
// pool (por peso) e a encaixa, virada, com um conector de nome `target` dela encostado e de frente para ele
ctx.worldgen.structurePieces('povoado', {
  start: 'centro', maxDepth: 3, maxRadius: 20, gap: 1,
  pieces: [
    { id: 'praca', size: [5, 5], connectors: [{ at: [2, 0], side: 'n', name: 'borda', pool: 'ruas', target: 'ponta' } /* , ... */] },
    { id: 'rua', size: [3, 14], connectors: [{ at: [1, 0], side: 'n', name: 'ponta' }, { at: [2, 6], side: 'e', pool: 'casas', target: 'porta' }] },
    { id: 'cabana', size: [7, 7], maxCount: 5, connectors: [{ at: [3, 0], side: 'n', name: 'porta' }] },
  ],
  pools: { centro: [{ piece: 'praca', weight: 1 }], ruas: [{ piece: 'rua', weight: 1 }], casas: [{ piece: 'cabana', weight: 1 }] },
});
ctx.worldgen.stage('povoado', PovoadoStage); // COMO: o estágio planeja, monta, nivela e constrói
```

```js
class PovoadoStage extends StructureFeature {
  constructor(ctx) {
    super(ctx);
    // um INÍCIO por região: o primeiro candidato que o plano aceita (função pura da seed e das colunas), guardado em cache
    this.starts = ctx.structures.starts('meumod:povoados', (c) => this.plan(c));
    // as features que rodam depois dos estágios (decoração de bioma) pisam no chão nivelado, não no de antes
    ctx.structures.ground((x, z, h) => { const s = this.starts.at(x >> 4, z >> 4)?.data; return s ? ctx.structures.adapt.height(s.sites, x, z, h) : null; });
  }
  plan(c) { // c = { rx, rz, k, cx, cz, n (terreno em chunks), x, z (centro) }
    const h = (x, z) => this.ctx.columnInfo(x, z).h;
    const fits = (p) => { const s = this.ctx.structures.adapt.survey(p.x0, p.z0, p.x1, p.z1, h); return s.min <= this.ctx.seaLevel + 1 || s.max - s.min > 5 ? null : s.median; };
    const layout = this.ctx.structures.assemble('meumod:povoado', this.ctx.seed ^ c.rx ^ (c.rz << 8), { x: c.x, z: c.z }, fits);
    if (!layout) return null;
    return { layout, sites: layout.pieces.map((p) => ({ x0: p.x0, z0: p.z0, x1: p.x1, z1: p.z1, floor: p.y, mode: 'pad', skirt: 3 })) };
  }
  generate(chunk) {
    const s = this.starts.at(chunk.cx, chunk.cz)?.data;
    if (!s) return;
    this.ctx.structures.adapt.chunk(chunk, 16, this.ctx.height, s.sites, (x, z) => this.ctx.columnInfo(x, z).h); // o chão
    for (const p of s.layout.pieces) { /* p.toWorld(u, v) = o bloco do mundo de um ponto local da peça; p.y = o piso */ }
  }
}
```

| Peça | Campos |
|---|---|
| conjunto (`structureSet`) | `spacing` 2..128 (lado da região, chunks), `separation?` (chunks entre os terrenos de regiões vizinhas), `footprint?` (lado do terreno, chunks), `salt`, `spread?` `'linear'` \| `'triangular'` (mais perto do meio), `frequency?` 0..1, `attempts?` 1..64 (lugares tentados em ordem), `exclusion?` `[{ set, chunks }]` (sem ciclos: recusado no registro) |
| peça (`pieces[]`) | `id`, `size` [w, d] (u para leste, v para sul, a peça sem virar), `height?`, `connectors`, `maxCount?` |
| conector | `at` [u, v] **na borda** do lado `side` (`n`, `e`, `s`, `w`: para fora), `name?` (padrão `joint`), `pool?` (ele cresce a estrutura), `target?` (o nome do conector da peça puxada; padrão = o próprio nome) |
| conjunto de peças | `pools` { nome: [{ piece, weight }] }, `start` (o pool da peça inicial), `maxDepth` 1..16, `maxRadius` 8..256 (blocos da origem), `gap?` 0..8 (blocos entre peças que não se encaixam) |
| `ctx.structures` | `set(nome)`, `starts(nome, plano, { spec?, rolls?, box? })` → `{ at, inRegion, touching, near }`, `startsOf(nome)`, `pieces(nome)`, `assemble(peças, seed, origem, fits, rot?)` → `{ pieces, joins, open }`, `validate(peças, layout)`, `adapt.{ chunk, target, survey, height }`, `ground(fn)` |
| sítio (`adapt`) | `{ x0, z0, x1, z1, floor, mode, skirt?, every? }`. `mode`: `pad` (corta e aterra no piso, com uma saia em rampa até o chão), `beard` (só aterra: embaixo até o piso e uma rampa de terra em volta; nunca corta fora), `fill` (pedestal de pedra até o piso), `pillars` (estacas nos cantos e a cada `every` blocos), `none`. Acima do piso a pegada é cortada (nada enterrado); um vão embaixo (boca de caverna) é aterrado; coluna de saia com água em cima não é tocada |

- **Determinístico e local ao chunk**: o plano é função pura da seed e das colunas (`ctx.columnInfo`), nunca de blocos gerados;
  cada chunk escreve só a parte dele; a rampa de um sítio é função do sítio e da altura natural, então os chunks vizinhos
  concordam. A mesma montagem em qualquer ordem, no servidor, na página e nos workers.
- **Mundo antigo**: uma estrutura que existia antes dos conjuntos passa `rolls` (o seu próprio fluxo da seed) e os números antigos
  no terreno 1, e fica onde sempre esteve.
- **`modkit check`** relata cada conjunto (candidatos em 4 km, quantas estruturas um estágio pôs de verdade num mundo de terreno 2, a
  menor distância entre duas) e cada conjunto de peças (200 montagens VALIDADAS — sem sobreposição, folga respeitada, encaixes de
  frente —, peças por montagem, conectores que ficaram fechados, alcance); uma montagem inválida ou não determinística recusa o mod.

### 22.9 Paisagem: zonas, marcos e a rede de rios

O terreno 2 tem uma camada de **identidade**: regiões grandes com nome (as **zonas de paisagem**), **marcos** raros que se veem de
longe e uma **rede de rios** que nasce nas serras, junta afluentes e chega ao mar. Tudo pela mesma API que o jogo usa. As zonas de
paisagem **não** são as zonas de perigo de `ctx.worldgen.zone` (lobby, campos, ermos, sombrias: anéis que decidem mob e loot) —
estas continuam iguais.

```js
const D = ctx.worldgen.density;
// uma ZONA: escolhida pelo clima de ANTES das zonas (os campos *_base do jogo), no ponto de cada célula (~1,4 km)
ctx.worldgen.landZone('salinas', {
  name: 'Salinas Brancas', color: '#f0ece0', weight: 50,
  niche: { 'mineclaude:overworld/humidity_base': [-1, -0.02], 'mineclaude:overworld/erosion_base': [-0.05, 1] },
  params: { erosion: 0.12, humidity: -0.12, rain: 0.3 },           // o que ela muda (misturado ~220 blocos na borda)
  biomes: { 'biomes:golden_savanna': 2 }, structures: { 'creatures:villages': 0.5 },
});
// um MARCO: um por região do conjunto de marcos do jogo (~600 blocos), sorteado pelas zonas, onde o chão serve
ctx.worldgen.landmark('obelisco', {
  name: 'Obelisco de Sal', zones: { 'meumod:salinas': 60, 'mineclaude:red_wastes': 10 }, radius: 6,
  needs: { ground: 'land', altitude: [1, 30], relief: [0, 5], river: 'avoid' },
  build(api, site) { /* coordenadas do MUNDO; api.set/get/ground/rand/has, cortada no chunk */ },
});
// um GANCHO nos rios: a chuva que cada nó recolhe é um campo com nome (mais chuva = mais nascentes, rios maiores)
ctx.worldgen.densityFns.modify('mineclaude:overworld/rainfall', (inner) => D.mul(inner, 1.2));
```

| Peça | Campos |
|---|---|
| zona (`landZone`) | `name` (o que o jogador vê), `niche` { campo: [min, max] } sobre os campos `select` do desenho (os do jogo: `temperature_base`, `humidity_base`, `continents_base`, `erosion_base`), `weight` 1..100, `params` (os do jogo: `temperature`, `humidity`, `continents`, `islands`, `erosion`, `ridges`, `lift` em blocos, `roughness` em blocos, `rain` multiplicador), `color`, `biomes` { bioma: 0..10 }, `structures` { conjunto: 0..1 } |
| marco (`landmark`) | `name`, `zones` { zona: peso }, `radius` 4..30 (o build não passa disso), `needs` { `ground`: `land`/`coast`/`sea`, `altitude`, `relief` (máx − mín do chão suave), `seaDepth`, `water` (fração sob o mar), `river`: `avoid`/`near`/`any` }, `fits?(survey)`, `plan?(survey, roll)` (os números do lugar, vão em `site.data`), `build(api, site)` |
| rede de rios (`drainage`) | `potential`, `ground`, `rain` (campos 2D com nome), `outlet` (y do mar), `cell`, `jitter`, `minFlow`, `width`/`depth`/`incision` [min, por, máx], `fill`, `meander`, `lake`, `estuary`, `delta`, `falls`, `reach` (o jogo registra uma: `mineclaude:overworld/river_network`) |
| nós de densidade | `D.zoneParam('lift')` (o parâmetro misturado da zona; 0 sem zonas), `D.drainage(rede, 'distance' \| 'level' \| 'depth' \| 'width' \| 'fall' \| 'kind' \| 'flow')` |
| contexto de geração | `ctx.landZones` (`at`, `param`, `entry`; `null` no terreno 1), `ctx.drainage(nome).at(x, z)`, `ctx.landmarks.starts(conjunto, { ground, drainage?, keepOut? })`, `ctx.landmarks.build(chunk, start)` |
| servidor (`e.world`) | `landZoneAt(pos)` → `{ key, name }` ou `null`, `landmarksNear(pos, raio)` → `[{ type, name, x, z, zone, d }]` |

- **Determinístico e local ao chunk.** Zona: função pura da seed (células, sorteio por célula). Rede de rios: cada nó olha só os
  vizinhos; a vazão e o nível vêm de caminhadas memorizadas pela bacia acima (sem simulação global); todo caminho termina no mar
  ou num lago, o nível nunca sobe rio abaixo e a largura nunca diminui. Marco: o plano lê só campos 2D; o `build` roda em cada
  chunk sob o marco com a api cortada nele — o mesmo marco em qualquer ordem.
- **Eras.** `landZone`, `landmark` e `drainage` de um mod são passos de terreno: região já gerada fica como era.
- **Precedência.** Um marco fica fora dos chunks de acampamento, ruína, lago, poço e leito seco do jogo; as estruturas de mod
  (`structure`) ficam fora dos marcos (tipo de estrutura `landmark`, que protege) e dos rios (`river`).
- **`modkit check`** relata cada zona (quanto do mapa ela ganha), cada marco (quantos em 6 km, a distância dos dois mais perto) e o
  **constrói duas vezes** no primeiro lugar comparando byte a byte (um `build` que quebra ou muda recusa o mod), e cada rede de
  rios (nós, lagos, todo caminho seguido até o fim: água que sobe recusa o mod).

## 23. Sons: `ctx.sounds`

Dois jeitos de criar um som; os dois rodam nos dois lados (o servidor só guarda o nome) e devolvem o nome completo:

```js
// sintetizado: camadas de tom (oscilador) e de ruído filtrado, o mesmo motor dos sons do jogo
ctx.sounds.synth('ping', { layers: [
  { kind: 'tone', freq: 880, end: 1320, dur: 0.12, type: 'triangle', gain: 0.12 },
  { kind: 'noise', freq: 3000, q: 4, dur: 0.05, gain: 0.08, delay: 0.02 },
] });
// de arquivo, na pasta do mod
ctx.sounds.file('clank', 'sounds/clank.wav');

ctx.blocks.register('sino', { name: 'Sino', tiles: { top: 'stone', side: 'stone', bottom: 'stone' },
  sounds: { break: 'ping', place: 'meumod:clank' } }); // dig / step que faltam: o do grupo de som do bloco
// o GRUPO de som do bloco (cavar, quebrar, colocar, pisar), no lugar de o motor adivinhar pelo nome: `soundGroup`
ctx.sounds.group('metal', { freq: 2000, q: 8, type: 'bandpass' });   // o filtro do estouro de ruído de cada evento
ctx.blocks.register('chapa', { name: 'Chapa', tiles: { all: 'stone' }, soundGroup: 'metal' }); // ou 'mineclaude:stone', de outro mod
// sem `soundGroup` o bloco soa como o grupo padrão do jogo (o da terra); `ctx.blocks.modify('mod:bloco', { soundGroup })` troca
ctx.mobs.register('bip', { /* ... */ sound: 'meumod:ping' }); // mob: o grito simples { freq, dur } ou um som registrado

ctx.commands.register('ping', { run(e) {
  e.player.playSound('meumod:ping', { volume: 0.8 });                     // só para ele
  e.server.playSound('meumod:clank', e.player.pos, { radius: 8 });        // todos no mundo até 8 blocos
} });
if (ctx.side === 'client') ctx.sounds.play('ping');                       // só no navegador (interface)
```

- **Camadas (`synth`)**: `kind` `tone` ou `noise`; `freq` 40–4000 Hz; `dur` 0.01–2 s; `gain` 0–0.5; `delay` 0–1 s.
  Só tom: `end` (frequência final, padrão = `freq`) e `type` (`sine` padrão, `square`, `sawtooth`, `triangle`). Só
  ruído: `q` 0.1–20 (padrão 1). Até 8 camadas; campo desconhecido ou valor fora do limite recusa o mod no boot.
- **Arquivo (`file`)**: `[a-z0-9_/]+.ogg|.mp3|.wav` dentro da pasta do mod (nada de `..` nem `/` no começo), até
  256 KB. O servidor confere no boot que existe, o tamanho e a assinatura do formato (um PNG renomeado para `.ogg` é
  recusado). O navegador baixa e decodifica ao abrir o jogo (10 s de prazo) os **efeitos** (`sfx`); as faixas de `music`
  e `ambient` são **preguiçosas**: o boot não as espera, e cada uma é baixada e decodificada na primeira vez que vai
  tocar (60 s de prazo; a música começa assim que carrega, a menos que outra coisa tenha sido pedida nesse meio tempo).
  Se falhar, o som fica mudo, sai um aviso no console e o jogo segue. Toca a no máximo metade do volume geral e por no
  máximo 4 s.
- **Nomes**: em `sounds` de bloco e `sound` de mob vale o nome curto de um som deste mod ou o completo; o som tem que
  ser registrado **antes** do bloco/mob. Na API do servidor (`playSound`) use sempre o nome completo.
- **Pelo servidor**: `e.player.playSound(nome, { volume? 0–1 })` devolve `false` quando o jogador já recebeu 20 sons no
  último segundo (descartado); `e.server.playSound(nome, pos, { radius? até 32, padrão 16, volume? })` manda para quem
  está no mundo dentro do raio (o lobby não ouve) e devolve quantos receberam; no navegador o volume cai em linha reta
  até zero no raio. Nome inexistente lança erro (contido como qualquer erro de handler, com o id do mod no log).
- **Volume e mudo**: os sons de mod passam pelo volume geral do jogo; o botão de mudo vale para eles.
- O servidor manda a lista de sons ao entrar (os nomes, na ordem dos ids) e o navegador recusa entrar se a dele for
  diferente.
- O `modkit check` lista os sons (`sons (n)`) e confere os arquivos com as mesmas regras do servidor.

### 23.1 Música, ambiente e som que segue um mob

```js
ctx.sounds.file('tema', 'sounds/tema.ogg', { category: 'music', loop: true });
ctx.sounds.file('vento', 'sounds/vento.ogg', { category: 'ambient' });       // ambiente: loop por padrão

e.player.playMusic('meumod:tema', { fade: 2 });   // troca a faixa de mod dele; pausa a música do jogo
e.player.stopMusic({ fade: 1 });                  // a música do jogo volta
const amb = e.server.playAmbient('meumod:vento', { x: 10, y: 70, z: 10 }, 24); // id
e.server.stopAmbient(amb);
e.server.playSound('meumod:ping', { mob: e.mob.id, radius: 12 });  // a fonte anda com o mob
```

- **`category`**: `sfx` (padrão: até 256 KB e 4 s, como acima), `music` ou `ambient` (até **4 MB** e **10 min**; não
  tocam por `playSound`). `loop` só vale com `music`/`ambient` (padrão: ambient sim, music não); opção desconhecida
  recusa o mod.
- **Música** (`player.playMusic(nome, { fade? 0–10 s, padrão 1 })` / `stopMusic`): uma faixa de mod por jogador; a
  nova para a anterior. Passa pelo canal de música do jogo (o volume "Música" das opções vale para ela) e a música
  procedural fica pausada enquanto a de mod toca; volta quando ela para ou acaba (sem loop). Som de outra categoria
  lança erro.
- **Ambiente** (`server.playAmbient(nome, pos, radius? até 64, padrão 16)` → id; `stopAmbient(id)` → `false` se o id
  não existe): vai para todos no mundo **naquele momento** e é guardado: quem entra depois (ou volta do lobby
  para o mundo) recebe os loops vivos, até o `stopAmbient`. O navegador baixa o volume em linha reta até zero no raio e
  toca no máximo **4** ao mesmo tempo (os mais perto); até 64 ambientes vivos por servidor.
- **Seguir um mob** (`server.playSound(nome, { mob, radius?, volume? })`): quem está no raio do mob recebe; o
  navegador move a fonte com o mob a cada quadro até o som acabar ou o mob sumir. Mob inexistente devolve 0.
- Tudo conta no limite de 20 mensagens de som por segundo por jogador e passa pelo volume geral e pelo mudo.
- Mensagens: `music` = `{ s, f }` e `amb` = `{ id, s, x, y, z, r }` (`s = -1` para), `snd.m` = id do mob.

### 23.2 Paisagem sonora (`ctx.sounds.ambience`) e passos

O som do mundo em volta do jogador — chuva, vento, pássaros, grilos, sapos, mar, caverna — é conteúdo. Uma
**paisagem sonora** diz QUAIS vozes tocam e QUANDO; o motor do navegador sonda o mundo 4 vezes por segundo
(céu aberto ou coberto, folhas, água, neve, pedra e vidro por perto, profundidade, altitude; os biomas em volta uma vez
por segundo), transforma as condições num nível 0..1, faz a transição gradual entre biomas e entre paisagens e
**sintetiza tudo na hora** (nada é baixado: os sons são originais por construção, renderizados num Worker).

```js
// entrada main (os dois lados registram; só o navegador toca)
ctx.sounds.ambience('brejo_noite', {
  when: { biome: 'meumod:brejo', time: 'night' },          // cada condição vira 0..1; elas se multiplicam
  beds: [{ voice: 'frogs', gain: 0.8 }, { voice: 'crickets', gain: 0.4 }],
  events: [{ voice: 'frog_croak', every: [3, 9], gain: [0.3, 0.7], pan: 0.9 }],
  fade: 4,
});
ctx.sounds.ambience('trovao', { when: { weather: 'storm' }, events: [
  { voice: 'thunder_far', every: [14, 45] },               // ao acaso
  { voice: 'thunder_near', cue: 'lightning_near' },         // quando alguém chamar ctx.sounds.cue('lightning_near')
] });
if (ctx.side === 'client') ctx.sounds.cue('lightning_near', { delay: 0.3, strength: 1 });
```

- **`when`**: `biome`/`notBiome` (fração dos biomas em volta; sem mod de biomas o jogo base dá `mineclaude:plains`,
  `ocean`, `desert` e `mountain`), `time` (`day`/`night`, graduais), `weather` (`clear`, `rain`, `snow`, `storm` ou o
  tipo que um clima de mod disser; vale a intensidade), `cover` (`open`/`covered`), `near` (`water`, `leaves`, `snow`,
  `sand`, `stone`, `glass`), `altitude` e `depth` (rampas `[de, até]` em blocos), `dimension`, `underwater`. Paisagem
  sem `depth` some debaixo da terra; sem `underwater`, fica quase muda com a cabeça na água.
- **`bed` / `beds`** (até 4, em loop): `rain`, `rain_roof`, `rain_leaves`, `rain_water`, `wind`, `wind_whistle`,
  `wind_soft`, `wind_dry`, `leaves`, `cave`, `crickets`, `frogs`, `waves`, `cicadas`, `hum`, `meadow`. `muffle: true`
  abafa a camada quando o céu fecha. O vento e o farfalhar das folhas têm as mesmas rajadas (tocam em fase).
- **`events`** (até 12): `voice` procedural (`bird_chirp`, `bird_warble`, `bird_whistle`, `bird_song`, `owl`,
  `woodpecker`, `creak`, `drip`, `thunder_far`, `thunder_near`, `chime`, `puff`, `echo_call`, `frog_croak`,
  `wave_crash`, `rustle`) ou `sound` (um som registrado), com `every: [min, max]` segundos ou `cue`; `gain`,
  `pan` (0..1) e um `when` só dele. Cada toque varia um pouco a altura e o volume.
- `gain` (0..1), `fade` (s) e `level(env)` (um fator seu, calculado do ambiente sondado).
- **Clima**: um `WeatherType` diz o que se ouve com `audible()` → `{ kind, amount }` (ou uma lista). A chuva do jogo
  devolve `rain` ou `snow` com a quantidade que cai ali; a tempestade soma `storm`. O céu do jogo chama a deixa
  `lightning` / `lightning_near` em cada relâmpago (o trovão do jogo é uma paisagem do mod base).
- **Limites e mixagem**: no máximo 8 camadas contínuas (as mais baixas saem), 6 sons avulsos e 6 passos ao mesmo tempo;
  o canal de ambiente tem volume próprio em Opções → **Ambiente**, fica sob o volume geral e o mudo, e silencia com a aba
  escondida. As paisagens do jogo base e as dos biomas são conteúdo de mod, escritas com esta mesma API.
- **Não vai pela rede** (cada navegador ouve o próprio mundo): nada muda no protocolo.

**Passos.** Um passo por passada no chão (a passada cresce com a velocidade: ~1/s agachado, ~2,6/s andando, ~3,3/s
correndo), com o som do bloco sob os pés: o `footstep` do bloco (`grass`, `dirt`, `stone`, `wood`, `sand`, `gravel`,
`snow`, `leaves`, `glass`, `wool`, `metal`, `water`), senão o `step` do grupo de som (`ctx.sounds.group('metal', { ...,
step: 'metal' })`), senão terra; pés na água chapinham, atravessar capim ou arbusto farfalha. Os passos dos outros
jogadores vêm da animação deles (cada pé que pousa), posicionais e mais baixos. O mesmo material escolhe o som de
cavar, quebrar e colocar quando o bloco não tem `sounds` próprio. `sounds.step` do bloco continua vencendo.

## 24. Recursos remotos (texturas, sons e código)

- `ctx.textures.png(path, arquivo, { size, sha256? })` e `ctx.sounds.file(path, arquivo, { sha256? })` aceitam:
  um caminho dentro do mod (como sempre); uma URL absoluta `https://…` (terminando em `.png` / `.ogg|.mp3|.wav`);
  ou um caminho relativo que **não existe na pasta** quando o `mod.json` tem `"remote_base": "https://…/"` (com `/` no fim).
- Quem baixa é o **servidor**, no boot: só `https`, até 5 redirecionamentos (todos `https`), os mesmos limites dos
  arquivos locais (PNG ≤ 1 MB, quadrado 16..256 e do `size` declarado; áudio ≤ 256 KB com a assinatura certa) e um
  prazo global de 60 s. Com `sha256` o conteúdo tem que bater. A cópia boa vai para `DATA_DIR/mods-cache/<sha256><ext>`
  (com `index.json`). Com `sha256` e cache, nem toca na rede. Rede fora: usa a última cópia boa (aviso no log); sem
  cópia, o boot recusa. O navegador **nunca** fala com terceiros: pede o mesmo `/mods/<id>/<caminho lógico>`
  (URL absoluta vira `_remote/textures/<path>.png` / `_remote/sounds/<path>.<ext>`).
- **Código remoto**: as listas de `entrypoints` (e `main`) aceitam URL `https://…js`, `{ "url": "…", "sha256": "…" }`
  ou caminho relativo ao `remote_base` que não existe localmente. Cada entrada remota é **um arquivo só, já empacotado**
  (bundle): imports relativos dentro dele não são baixados (a opção mais simples e segura). Máx. 512 KB por arquivo,
  UTF-8. Com `sha256`: baixado uma vez, guardado pelo hash, nunca mais baixado. Sem `sha256`: baixado **a cada boot**
  (última cópia boa se a rede falhar) e o log diz em voz alta `ATENÇÃO: mod "x" EXECUTA código remoto SEM sha256 … <url>`.
  O servidor importa do cache; `main`/`client` remotos são servidos ao navegador por `/mods/<id>/_remote/<tipo>/<n>.js`
  (ou pelo caminho relativo); entradas `server` ficam privadas (caminho lógico `server/_remote/…`, nunca servido).
- **Código remoto roda com todos os privilégios do servidor.** Fixe com `sha256` e só use publicadores de confiança.
- Recurso e código remotos ficam **desligados por padrão**: o dono do servidor tem de ligar cada um (seção 28).
- O `modkit check` **não baixa nada** e não executa entrada remota nenhuma: ele confere a forma das declarações e
  avisa que um `remote_base` não é conferido no kit — quem valida o conteúdo remoto é o servidor, no boot.
- **Rede interna bloqueada (SSRF):** antes de cada pedido (e de cada redirecionamento) o servidor resolve o nome e
  recusa se **qualquer** endereço for loopback, link-local (169.254/16, fe80::/10), privado (10/8, 172.16/12,
  192.168/16, fc00::/7), CGNAT, não especificado, multicast ou reservado; conecta no endereço que conferiu (sem nova
  consulta de DNS). Quem publica mods na rede local pede ao dono do servidor a chave que libera isso (seção 28).
  Cada conexão parada por 20 s cai; `/mod previa` e a prévia de um modpack têm 60 s no total; o boot, 60 s para
  todos os downloads.
- O cache é conferido de novo pelo `sha256` a cada leitura: arquivo adulterado conta como ausente.

## 25. Instalação por link: `/mod previa` e `/mod confirmar`

- `/mod previa https://…/mod.json` (admin): baixa o `mod.json` (≤ 256 KB), as entradas locais e o que ele listar em
  `"files": [...]` (relativo à URL do manifesto; ≤ 64 arquivos, ≤ 4 MB no total), valida tudo com o mesmo validador do
  `modkit check` numa pasta temporária (partes remotas só pela declaração) e mostra id, versão, autores, descrição,
  entradas (avisa se tem código de servidor), contagens de blocos/itens/mobs/…, recursos e código remotos,
  dependências e se substitui um mod instalado. Dá um id de prévia (vale 10 min).
- `/mod confirmar <id> [substituir]`: grava **exatamente os bytes da prévia** em `MODS_DIR/<modid>/` (nunca baixa de
  novo). Pasta existente só com `substituir`. A troca é atômica: os arquivos vão para `MODS_DIR/.staging-<x>` e entram
  por `rename` (a pasta antiga vira `.old-<x>` e é apagada; pastas com `.` no início nunca são carregadas). Precisa
  reiniciar o servidor. A origem fica em `DATA_DIR/mods-sources.json` (gravado atômico). O id `mineclaude` é reservado.
- `/mod lista`: mods instalados, versões e origem (link ou `local`).
- Instalar fixa o que foi aprovado; o modo "remoto no boot" (seção 24) é a alternativa para quem quer seguir o publicador.
- **Pacote `.mcmod` com conteúdo:** o `package.json` aceita, além de `scripts.server` e `scripts.client`, o
  **`scripts.main`** — a entrada de CONTEÚDO, que roda nos dois lados como o `entrypoints.main` de um mod em pasta
  (blocos, itens, mobs, sons e texturas só podem ser registrados de uma entrada `main`, para os ids baterem). É pública,
  então não pode ficar na pasta privada do servidor. Monte e empacote com `modkit pack` (veja
  [empacotar.md](empacotar.md)).

### 25.1 Modificar o conteúdo de outro mod (`modify`, `wrap`, `recipes.remove`)

Um mod muda um bloco, item, mob, receita, tabela de loot ou troca do mercador que **outro mod ou o jogo base**
registrou, sem fork: `ctx.blocks.modify(alvo, patch | fn)`, `ctx.items.modify`, `ctx.mobs.modify`,
`ctx.recipes.modify` / `remove`, `ctx.loot.modify(tabela, fn)`, `ctx.trades.modify`;
`ctx.blocks/items/mobs.wrap(alvo, gancho, (original, e) => ...)` envolve um gancho, como um mixin faria. As chamadas
só enfileiram (em entrada `main`); o loader aplica tudo depois do último `register` e antes de os registros
congelarem, por `priority` crescente e depois pela ordem de carga (o último vence, com aviso no log), e o resultado
passa pela validação do registro. Identidade, estados, dados salvos e forma não são modificáveis.

```js
ctx.blocks.modify('mineclaude:stone', { hardness: 3 });
ctx.items.modify('mineclaude:apple', apple => ({ ...apple, stack: 16, food: apple.food + 2 }));
ctx.recipes.modify('mineclaude:bread', { pattern: ['WW'], legend: { W: 'mineclaude:wheat' } });
ctx.loot.modify('mineclaude:dungeon_chest', table => { table.pools[0].entries.push({ item: 'mineclaude:bread', weight: 6 }); });
```

Quem mudou o quê fica registrado: `ctx.mods.modifications()` devolve o rastro na ordem aplicada, o boot escreve o
mesmo no log e o `modkit check` acusa patch com campo proibido. Os campos modificáveis e os proibidos de cada
registro estão em [ctx.md](ctx.md), grupo por grupo.

### 25.2 Tags e dados declarativos

Os descritores de bloco e de item são **imutáveis**: `tiles.all` é normalizado, campo desconhecido é recusado e
definição de item durável exige `stack: 1` explícito. As propriedades, os valores padrão e o que cada registro
valida estão em [ctx.md](ctx.md).

Tags aceitam contribuição de vários mods, referência entre tags, JSON em `data/` da pasta do mod, ingrediente
`#tag` numa receita e eficácia de ferramenta, e recarregam de forma atômica com `/mod dados recarregar` (admin).
Receitas, loot e geração de mundo em geral ainda não têm esse mesmo pipeline de recarga.

## 26. Dependências

- `mod.json`: `"dependencies": { "outro_mod": "^1.2.0" }` (`*`, `1.2.0` exata, `>=1.2.0`, `^1.2.0` = mesmo major e ≥)
  e `"dependency_sources": { "outro_mod": "https://…/mod.json" }`.
- `depends` é apelido de `dependencies`. Também existem `optional_dependencies`, `recommends`, `suggests`,
  `conflicts` e `breaks`, cada um com validação e mensagem própria. Os predicados aceitam intervalos em AND,
  alternativas em OR, pré-versões e curingas — as regras de versão estão em [versoes.md](versoes.md).
- Boot: dependência faltando ou com versão errada recusa o mod com mensagem; ciclo recusa.
- Ordem de carga: dependências antes; entre os prontos, alfabética. **Sem dependências a ordem é a alfabética de
  sempre e nenhum id muda**; com dependências um mod pode carregar antes de outro de nome menor e os ids numéricos
  dos blocos/itens mudam (o mundo é protegido disso porque o save guarda os nomes, não os números).
- Se o dono do servidor ligar a busca automática (seção 28), `/mod previa` procura as dependências que faltam pelo
  `dependency_sources` (até 4 rodadas, ciclos detectados), lista na prévia e `/mod confirmar` instala todas. Sem
  isso, a prévia mostra o que falta e não confirma.
- O `modkit check` valida os predicados de versão e as URLs de `dependency_sources` do seu `mod.json`; quem confere
  se a dependência está realmente instalada é o servidor, no boot.

## 27. Modpacks

- `modpack.json`: `{ id, name, version, description?, mods: [{ id, version, source, sha256?, files? }], config?, worldgen? }`.
  `source` é `https://…/mod.json` ou `local:<pasta>` (relativa ao `modpack.json`); `sha256` fixa os bytes do `mod.json`;
  `files: { "<caminho>": "<sha256>" }` fixa os outros arquivos. `config: { <modid>: { chave: valor } }` vale como ajuste
  do dono, com prioridade **menor** que `DATA_DIR/mods-config/<modid>.json`.
- O dono aponta o pacote deste servidor numa variável de ambiente (seção 28): um caminho do `modpack.json`, uma pasta,
  uma URL `https` ou o id de um pacote já instalado. No boot o servidor resolve o pacote (URL e mods `https` precisam
  das chaves de recurso e de código remotos), materializa cada mod em `DATA_DIR/modpack/<packid>/<modid>/` (do cache
  `DATA_DIR/mods-cache`), confere ids, versões e hashes e carrega junto com os de `MODS_DIR` (que são extras; o mesmo
  id nos dois é recusado). Cada arquivo de **código** (entradas) de um mod `https` que não está fixado em `files` gera
  no log `ATENÇÃO: … EXECUTA código remoto SEM sha256 … <url>`. Os mods do pacote são servidos ao navegador pelo mesmo
  `/mods/<id>/` (da pasta materializada), com as mesmas regras de privacidade (`server/` e entradas `server` nunca saem).
- **O modpack fica preso ao mundo:** o `world.json` guarda `modpack: { id, version }`. Outro id no mesmo mundo é
  recusado (a não ser que o dono ligue a troca de pacote, seção 28); mesmo id com outra versão passa (a regra de versão
  dos passos de geração continua valendo). Sem pacote apontado, se o mundo gravou um pacote instalado em
  `DATA_DIR/modpack/<id>`, ele carrega sozinho; se não está instalado, o boot recusa dizendo isso. O vínculo é gravado
  no `world.json` logo no boot (não espera o salvamento periódico).
- **Um modpack por processo** (os ids são do mundo inteiro). Vários pacotes = um servidor por pacote, ou um
  `DATA_DIR` por mundo.
- `/mod pack previa <https://…/modpack.json>`, `/mod pack confirmar [substituir]`, `/mod pack info` (admin; previa e
  confirmar pedem a chave de instalação por link): a prévia baixa e valida todos os mods juntos; confirmar grava
  `DATA_DIR/modpack/<id>/` com as fontes trocadas por `local:<modid>` (a original fica em `origin`). Depois é só
  apontar o id na variável do modpack e reiniciar.
- O navegador recebe `modpack` na mensagem de boas-vindas e a tela inicial mostra "Modpack: Nome 1.2.0"
  (`/mods/modpack.json`).
- O modkit não tem comando de modpack: ele monta e empacota **um** mod (`modkit pack`). O `modpack.json` é um arquivo
  que o dono do servidor escreve à mão, apontando cada mod.

## 28. Chaves de ambiente e segurança

Nada que saia da pasta do mod vem ligado de fábrica. Um mod **declara** no `mod.json` o que precisa — recurso remoto,
código remoto, sandbox — e o **dono do servidor** liga a chave de ambiente correspondente antes de o mod funcionar.
Quando a chave falta, o boot (ou a prévia) recusa com uma mensagem que nomeia exatamente a chave que o dono tem de
ligar, então nem você nem ele precisam decorar a lista:

| O que o mod quer | Quem decide |
|---|---|
| texturas, sons e modpacks por `https` | desligado; o dono liga a chave de recurso remoto |
| código remoto (entrada por URL, mod `https` num modpack) | desligado; o dono liga a chave de código remoto |
| `/mod previa`, `/mod confirmar` e as prévias de modpack | desligado; o dono liga a chave de instalação por link |
| a prévia buscar as dependências que faltam pelo `dependency_sources` | desligado; o dono liga a busca automática |
| trocar o modpack de um mundo que já tem outro | desligado; o dono libera a troca |
| baixar de endereços da rede local (LAN) | desligado; o dono libera a rede privada |
| qual modpack este servidor roda | o dono aponta o pacote (seção 27) |
| pôr todo mod de terceiros em sandbox | o dono liga; cada mod pode pedir sandbox por conta própria (seção 29) |

Onde ficam os mods (`MODS_DIR`) e onde ficam os dados do mundo (`DATA_DIR`) também são configuração do dono. Seu mod
nunca lê chave de ambiente para se configurar: o que é ajustável pelo dono vai no bloco `config` do `mod.json` e você
o lê com `ctx.config.get` (veja [ctx.md](ctx.md)).

Mods sem sandbox rodam com **todos os privilégios do servidor**: as `permissions` do `mod.json` são só informativas.
Instale apenas mods de quem você confia, fixe código remoto com `sha256` e prefira instalar (fixa os bytes aprovados)
a seguir o publicador a cada boot.

## 29. Mods em sandbox (`"sandbox": true`)

Opt-in para mods em que você não confia por inteiro. No `mod.json`: `"sandbox": true` (ou o dono do servidor põe
todos os mods de terceiros em sandbox de uma vez, seção 28). Mods sem a chave continuam exatamente como antes.

**Como funciona.** As entradas `main` e `server` do mod rodam num **processo separado** com o modelo de permissões do
Node (`--permission` no Node 22+, `--experimental-permission` no 20/21, detectado na hora) e
`--max-old-space-size=128`. Sem modelo de permissões nesse Node, o servidor **recusa** o boot com uma mensagem clara;
nunca roda o mod sem sandbox.

**Garantido pelo Node (modelo de permissões):**
- leitura de arquivo só na pasta do mod e na pasta do executor do sandbox (`--allow-fs-read`); nada de `world.json`,
  dos arquivos de conta, da configuração do servidor nem do código do jogo;
- nenhuma escrita de arquivo; nada de `child_process`, `worker_threads`, addons nativos (`process.dlopen`), WASI,
  inspector; `process.binding` negado;
- memória: heap de 128 MB (passou disso, o processo morre e é reiniciado);
- variáveis de ambiente: o processo recebe um ambiente mínimo (sem as variáveis do servidor, senhas ou chaves).

**NÃO garantido (limitações honestas):**
- **Rede:** o modelo de permissões do Node (até a 23/24) **não bloqueia sockets**. O executor tira `fetch`,
  `WebSocket`, `EventSource`, `process.getBuiltinModule` e recusa `node:net`, `http(s)`, `http2`, `tls`, `dgram`,
  `dns`, `child_process`, `worker_threads`, `cluster`, `inspector` por gancho de resolução (`module.registerHooks`,
  Node 22.15+; cobre `import` e `require`) e por `Module._load` (só `require`, Node mais antigo). É **melhor
  esforço**, não fronteira; para rede bloqueada de verdade, use firewall/namespace do sistema. **Node sem
  `module.registerHooks` (antes do 22.15):** o boot **recusa** mods em sandbox, porque lá um `import('node:net')` não
  seria barrado; o dono pode ligar a chave que aceita assim mesmo (seção 28), concordando que mods em sandbox possam
  abrir conexões.
- **Sinais e CPU:** o processo roda com o mesmo usuário do servidor (pode mandar sinais a processos desse usuário);
  CPU não tem cota, só o watchdog (abaixo).
- O sandbox protege o servidor. O `main`/`client` de qualquer mod continua sendo servido e rodando no navegador.

**Conteúdo (entrada `main`) só declarativo.** No sandbox o `main` roda com um `ctx` que grava as chamadas de
conteúdo como JSON; o servidor as repete no carregador real (mesmas validações e mensagens). **Função em qualquer
lugar é recusada no boot:** ganchos (`onInteract`, `onBreak`, `onPlace`, `onUse`, `onHit`, `onDeath`, o `ai` de mob),
passos de geração com função, `textures.paint` e o `deathMessage` de tipo de dano escrito como função (como texto
funciona). Os registradores devolvem o mesmo que o `ctx` de um mod normal: o nome completo (`"mod:path"`), o id do
objeto em `items.group` e `recipes.category`, o id do passo de geração (`"mod:path@versão"`) em
`worldgen.ore`/`biome`/`area`/`structureKind`; o que não devolve nada lá (`modify`, `remove`, `alias`, `disable`,
`items.register`, `recipes.add`...) não devolve aqui. A exceção é `blocks.register` e `textures.png`/`paint`, que
devolvem um objeto no `ctx` normal (o bloco, a entrada do registro): como nenhum JSON carrega isso, devolvem o nome.

**Quais grupos o sandbox alcança.** Uma regra só decide a tabela: **registro declarativo (JSON) passa**; o que
recebe uma **função** que o servidor teria de rodar no processo dele fica fechado, menos onde a ponte do sandbox já
sabe chamar gancho remoto com prazo (só `ctx.events`, `ctx.commands` e `ctx.net`); **leitura síncrona** de um
registro que vive no processo do servidor fica fechada também (o filho não tem a tabela de blocos nem as regras do
jogo). Membro fechado responde com o motivo, não com "is not a function". Quando o fechado é um **campo** de uma
chamada liberada (o `goals` e os campos do jogo em `ctx.mobs`), o motivo vale nos dois lados: o filho recusa enquanto
o mod registra, e o servidor recusa outra vez antes de repetir a chamada.

| grupo | aberto no sandbox | fechado (com motivo) e por quê |
| --- | --- | --- |
| `components` | `register`, `attachItem` | — (o esquema do componente é JSON) |
| `tags` | `add` | `has`, `values`, `revision` leem o registro de tags, que só existe no processo do servidor |
| `worldgen` | `area`, `biome`, `ore` (a veia comum), `structureKind`, `migration` (`{ locator }` ou `{ plants }`) | `zone`, `stage`, `carver`, `surface`, `replace`, `modify`, `generator`, `feature`, `structure`, `terrain`, `biomes.modify`: cada um recebe uma classe (`ZoneType`, `Carver`, `SurfaceRule`, `ChunkGenerator`...) ou uma função (`run`, `build`, `fn(e)`) que a geração roda a cada chunk, no servidor e no navegador, e cada um tem o motivo próprio; a forma de classe do `ore` e o `run` da `migration` são recusados como função |
| `blocks` | `register`, `modify` | `wrap` (gancho embrulhado), `dataAt`/`stateAt`/`stateId`/`list`/`find` (leem o mundo e o registro na hora) |
| `textures` | `png`, `paint` (recusa: é função, use `png`) | `redraw` é do navegador |
| `items` | `register`, `modify`, `icon`, `group`, `groups.modify` | `wrap`, `iconPalette` (a paleta é função), `list`, `find` |
| `mobs` | `register`, `modify` (sem `goals` nem os campos do jogo), `spawnRule`, `removeSpawn`, `spawnCategory` | `wrap`, `spawnCondition` (o `test(e)` roda ao sortear o nascimento), `list`, `find`; o `ai` do mob é função, então mob de sandbox é só número e aparência; `goals` carrega instâncias de `Goal` e os campos `cause`, `tameHp`, `tameDamage`, `coats`, `herd` são mecanismos que o motor roda só para os mobs do jogo base (recusados nos dois lados da ponte) |
| `sounds` | `synth`, `file`, `group`, `modifyGroup`, `modify` | `play` é do navegador (no servidor use `e.player.playSound`) |
| `recipes` | `add`, `modify`, `remove`, `addTo`, `category` | `registerType` (o parse do tipo é função), `find`, `match`, `list` (leituras síncronas) |
| `movement` | `profile`, `modify` (números) | `mode`, `wrap` (funções), `list`, `modes`, `active` (leituras síncronas) |
| `commands` | `register` (pela ponte), `alias`, `remove` | `argumentType`, `selectorOption`, `modify`, `wrap` (funções) |
| `effects`, `enchantments`, `fluids` | `register`, `modify` (e `fluids.container`, que é JSON) | `wrap` (função); `fluids.attributes` é leitura síncrona; o `paint` do fluido é função, então ele usa `texture` |
| `attributes`, `damage` (`type`), `rules`, `trades`, `loot`, `potions`, `serverRules` | `register`/`type`, `modify` | `rules.get` é leitura síncrona; o `deathMessage` de tipo de dano só como texto |
| `particles` | `register`, `modify`, `emitter` | `spawn` é do navegador (no servidor use `e.world.spawnParticles`) |
| `cosmetics` | `cape`, `capes.modify`, `feats.modify` | `feat` (toda marca precisa do `test(e)` que o servidor roda na conta) |
| `progress` | `stat`, `highlight`, `goal`, `bestiary`, `firstSessions.disable` | `of` (síncrono), `firstSession`, `firstSessions.replace` (instância com ganchos) |
| `permissions` | `node` | `check`, `has`, `nodes` (leem o registro e a resposta do `permissionRequest`) |
| `lang` | `add` | `text`, `get`, `has`, `codes`, `current`, `autoKey` (leem o registro de idiomas) |
| `help` | `register` | — |
| `dimensions` | `modify` | `register`, `teleport`, `world`, `list` |
| `rooms` | `modify`, `disable` | `register`, `wrap` (funções), `of` (síncrono) |
| `screens` | `modify` (patch JSON, `extraSlots` incluso) | `register`, `wrap`, `client`, `station` (a tela é uma classe com `canInsert`/`canTake`/`onButton`) |
| `projectiles` | `register` (só dados: `name`, `gravity`, `life`, `damage`, `color`, `size`, `glow`; `onHitEntity`/`onHitBlock` são opcionais e, se vierem, recusados como função) | — |
| `weather` | `register` (números e textos; `canStart`, `duration` e os ganchos de tique são opcionais e, se vierem, recusados como função), `modify` (patch JSON) | `list` (leitura síncrona) |
| `systems`, `stays`, `parties`, `showcase` | `disable(nome)` | `register`, `replace`, `wrap` (um `PlayerSystemType`, `StayType`, `PartyType` ou `ShowcaseSceneType` é instância de classe com ganchos que o servidor chama no tique dele); `showcase.names` é síncrono |
| `interactions` | — | `onUseBlock`, `onUseItem` (têm de responder `"success"`/`"fail"`/`"pass"` na hora do clique, e a ponte só manda evento sem resposta; observe por `ctx.events.on`) |
| `events` | `on`, pela ponte (cópia JSON, só para observar; **200 ganchos** por mod) | `permissionRequest` (é respondido) |
| `net` | `on`, `send`, `broadcast`, pela ponte (**50 canais**) | `channel`, `canSend`, `channelsOf` |
| `storage` | `world` e `player` (`get`/`set`/`delete`/`keys`), assíncronos | `accountsWith`, `accountByName`, `account`, `world.field`, `world.adopt` |
| `config` | `get` | `onChange` (a config é lida uma vez, no registro) |
| `mods` | o catálogo (`list`, `get`...) | `modifications` |
| `ui`, `render`, `audio` | — | do navegador: `ui.dom`/`canvas`/`gui`, todo o `render` de desenho e `audio.stream` |
| `services`, `runtime`, `attachments` | — | cada um precisa rodar código do mod dentro do processo do servidor |
| `blockTransforms` | `add`, `modify` (patch JSON), `remove` | a forma de função do `modify` (uma entrada é `{ from, to, airAbove? }`, só nomes e um booleano) |
| `capabilities`, `client`, `resources`, `transfer` | **grupo inteiro fechado** | `capabilities` recebe função (o provedor); `client` é do navegador; `resources` tem ouvinte de recarga e condição de recurso (funções); `transfer` é a API de transação, que roda dentro do servidor |

**Grupo fechado responde com o nome e o motivo.** Todo grupo do `ctx` de um mod normal existe no `ctx` do sandbox: o
que o sandbox não abre é um objeto sem chaves que recusa qualquer leitura ou escrita de propriedade com
`ctx.<grupo> não existe no sandbox: <motivo>`, em vez de "Cannot read properties of undefined". `typeof ctx.stays` é
`"object"` e `"stays" in ctx` é `true` (o grupo existe, só recusa); como não tem chaves, `{ ...ctx }`, `Object.keys`,
`JSON.stringify` e `await ctx.stays` não quebram o boot de um mod que não usa o grupo. Chamar o grupo como função
(`ctx.stays()`) dá o "is not a function" do motor, que já nomeia o grupo.

**Orçamento de registro.** Um mod em sandbox registra no máximo **2.000 chamadas de conteúdo**, **200 ganchos de
evento**, **50 comandos** e **50 canais de rede**; passando disso o boot recusa com o número. O registro é um JSON que
o servidor guarda, e cada gancho de evento é uma mensagem por evento pelo resto da vida do servidor.

**Lógica de servidor: tudo assíncrono.**
- `ctx.events.on`: os eventos chegam como **cópia JSON, só para observar**: sem `e.cancel()`, campos editáveis
  (`e.drops`, `e.text`...) não voltam para o jogo. Jogadores viram objetos com `name`, `pos`, `room` e métodos.
- `ctx.commands.register`: funciona; `e.reply(texto)` e as outras chamadas devolvem `Promise`. Máximo de 256
  respostas por execução, como os outros mods.
- `ctx.net.on/send/broadcast`: funcionam (mensagens repassadas pelo servidor, mesmos limites de 4 KB e 32 KB/s).
- API (`e.world.setBlock/getBlock/explode/dropItem/biomeAt`, `e.player.message/give/take/has/count/heldItem/
  teleport/damage/playSound`, `e.server.broadcast/players/playSound`): cada chamada é um pedido ao servidor,
  executado com as mesmas validações e limites da API normal, e devolve `Promise` (com o valor ou o erro).
  Limite: **200 pedidos/s por mod** (o excesso é recusado) e **16 KB por pedido**; mensagem acima de 256 KB mata o
  processo.
- `ctx.storage` (seção 30) e `e.world.getBlockData/setBlockData` (seção 31): pedidos assíncronos, como a API.
- `ctx.config.get` funciona. `ctx.ui` e `ctx.sounds.play` são do navegador (erro no servidor, como sempre).
- Jogadores comparados com `===` entre eventos diferentes não são o mesmo objeto (são cópias).

**Watchdog.** O processo manda sinal de vida a cada 1 s. Sem sinal por 10 s (laço infinito), queda ou estouro de
memória: o processo é encerrado e reiniciado com espera crescente (0,5 s, 1 s, 2 s); mais de **3 reinícios em
10 minutos** desativa o mod até o próximo boot (linha no log). O jogo nunca espera o sandbox: evento é enviado e
esquecido; comando com o sandbox fora do ar responde "Esse mod está reiniciando".

**No modkit.** O `modkit check` acusa como erro gancho ou função no conteúdo de um mod com `"sandbox": true`, e
`.cancel(` no código do mod. Para ver o sandbox de verdade em pé, instale o `.mcmod` num servidor (pasta `MODS_DIR`)
ou use `/mod previa <link>` no jogo.

### 29.1 Idioma: `ctx.lang` e o texto traduzível

Os arquivos `lang/pt_br.json`, `lang/en_us.json`... da pasta do mod são lidos no boot e servidos ao navegador em
`/mods/lang.json`. Um objeto plano, e toda chave começa com o id do mod:

```json
{ "meumod:item.bilhete": "Bilhete", "meumod:msg.oi": "Oi, {nome}!" }
```

Onde ia uma string de tela (nome de bloco, item, mob, efeito e regra, `lore`, `help` de comando, `player.message` /
`e.reply` / `systemMsg`, HUD e telas) agora também vai um **texto traduzível**:

```js
ctx.lang.add('es_es', { 'msg.oi': '¡Hola, {nome}!' });                     // o mesmo que um arquivo, em código
ctx.items.register('bilhete', { name: 'Bilhete', icon: 'meumod:papel' }); // pt literal: a CHAVE AUTOMÁTICA
                                                                          // `meumod:item.bilhete` traduz sozinha
ctx.commands.register('oi', {
  help: ctx.lang.text('command.oi.help', undefined, '/oi — cumprimenta'),
  run: (e) => e.reply(ctx.lang.text('msg.oi', { nome: e.player.name }, 'Oi, {nome}!')),
});
```

- A **cadeia** é sempre: a língua do leitor → `pt_br` → o `fallback` → a própria chave. Nunca linha vazia.
- **Chave automática**: conteúdo com `name` em string é procurado por `meumod:item.<caminho>` (`block.`, `item.`,
  `entity.`), e o literal é o `fallback` — é por isso que o jogo base ficou em inglês sem mudar uma linha do conteúdo.
- Quem resolve: o **navegador** no idioma da página (`itemName`, `blockDisplayName`, `mobDisplayName`), e o
  **servidor** na língua de cada jogador (o `hello` do navegador traz o `lang`; a mensagem `chat` não mudou de forma).
- `{args}` são substituição crua, e um arg pode ser outro texto traduzível.
- O idioma **troca no meio da sessão**: a página manda `{ t: 'lang', lang }` e a linha seguinte do servidor já sai na
  língua nova, sem reconectar. O eco devolve a ajuda de todo comando traduzida de novo.
- O exemplo `bazar_falante` traz dois arquivos de idioma mais um terceiro escrito em código.

#### 29.1.1 O texto da TELA e o seletor de idioma

O texto das telas do jogo (home, pausa, opções, inventário, crafting, criativo...) **não está num dicionário do
motor**: são as chaves `mineclaude:ui.<chave>` dos arquivos de idioma do jogo base, resolvidas pelo mesmo registro de
todo mod. A chave que o código da página usa (`home.noWebgl`) vira a do arquivo trocando cada maiúscula por
`_minúscula` (`mineclaude:ui.home.no_webgl`), porque chave de idioma é minúscula. Consequências:

- **Sobrescrever um texto de tela do jogo**: `ctx.resources.overlay.lang('pt_br', { 'mineclaude:ui.home.tagline': '...' })`
  (o pacote de recursos, seção 29.2) — o texto do mod vence o do jogo, só naquele idioma. `ctx.lang.add` só aceita as
  chaves do próprio mod; para as do jogo é a sobreposição.
- **Adicionar um idioma**: um `lang/es_es.json` no mod, com a chave `<mod>:language.name` com o nome do idioma escrito
  nele mesmo (`"tienda:language.name": "Español"`). O idioma passa a aparecer em Esc → Opções → Idioma (e no seletor da
  pausa), na ordem pt, en e depois os de mod; sem `language.name` aparece o código. O navegador em `es-ES`/`es-MX` já
  abre nele. Uma chave de tela que o seu arquivo não traduz cai no português.
- O servidor continua só com `pt` e `en` para o `/ajuda` (um idioma de mod lê o `/ajuda` em português); o texto de
  chat que um mod escreve com `ctx.lang.text` sai no idioma que o jogador escolheu, de qualquer um.

### 29.2 Recursos: `ctx.resources` (recarga, condição e pacote)

É o lado de **leitura** dos recursos de um mod: um ouvinte de recarga, condições que um JSON pode citar e um pacote
que entra em cima do de outro mod. Geração de dados (data generation) não existe. A assinatura de cada chamada está
em [ctx.md](ctx.md).

```js
// 1. roda a cada recarga de dados (o /recarregar); `after` manda na ordem, não a ordem de carga dos mods
ctx.resources.onReload((e) => releiaSeuCache(e.reason), { id: 'tabela', after: 'outromod:indice' });

// 2. uma condição que o `load_conditions` de um JSON de receita ou de loot pode citar
ctx.resources.condition('tem_festa', (e) => e.mods.includes('festa'));
ctx.resources.flag('festa');                      // a condição embutida `engine:flag` lê esta marca

// 3. pacote de recursos: trocar o idioma e a textura de OUTRO mod, com prioridade
ctx.resources.overlay.lang('pt_br', { 'outromod:item.bilhete': 'Bilhete de festa' });
ctx.resources.overlay.texture('outromod:balcao', (t) => { /* pinta */ });
```

```json
{ "type": "meumod:forno", "load_conditions": [{ "condition": "engine:all_mods_loaded", "values": ["outromod"] }] }
```

- Embutidas (namespace `engine:`, nome curto também vale): `all_mods_loaded`, `any_mod_loaded`, `items_exist`,
  `flag`, `not`, `and`, `or`. Os campos `mods:` / `items:` dos JSON de hoje continuam valendo.
- A condição é lida **antes** de a entrada ser validada: o que não vai entrar pode citar o que não existe.
- Condição que ninguém registrou é **erro**, nunca um `false` calado.
- Erro num listener de recarga não derruba os outros nem o `/recarregar`: ele é nomeado no chat.
- A sobreposição de textura mantém a **fatia do atlas** (o id); a de idioma é a única porta além da regra "um mod só
  nomeia as chaves dele". As duas são aplicadas no fim da carga dos mods, em ordem de `priority`.

### 29.3 Sorteio com semente: `seededRandom`

```js
import { seededRandom } from './mineclaude-sdk.js';
const rand = seededRandom(`meumod:${e.world.seed}:${e.server.day}`); // o Random.create(seed) do Fabric
const ang = rand() * 2 * Math.PI;                                    // a mesma semente, sempre a mesma sequência
```

- Use-o **em vez de `Math.random`** sempre que o sorteio tiver de sair igual duas vezes: nos dois lados do jogo
  (servidor e navegador), no boot seguinte sem ter guardado nada, ou no teste. A semente é um **texto**, e misturar
  nela o que identifica o sorteio (o seu mod, a semente do mundo, o dia) é o que faz dois mods não caírem na mesma
  sequência.
- É o mesmo sorteador com semente que as metas e o Marco do Dia do jogo base usam. Para a geração do mundo, o `rng`
  que o estágio recebe já vem semeado pelo mundo.

## 30. Dados persistentes: `ctx.storage` (só servidor)

```js
const visitas = ctx.storage.world.get('visitas') ?? 0;
ctx.storage.world.set('visitas', visitas + 1);          // world.json, modData[modid]
ctx.storage.player.set(e.player, 'nivel', 3);          // na conta do jogador, modData[modid]
```

- `world.get/set/delete/keys`: por mundo, até 64 KB de JSON por mod (é o `PersistentState` do Fabric: o estado
  pequeno que é do **mundo** e não de uma conta). `player.get/set/delete(player, chave)`: por conta, até 8 KB por mod,
  só para jogador online (contas offline ficam intactas no disco).
- **Migração do que o motor guardava:** `world.field(nome)` lê um campo de nível de cima do `world.json` que o motor
  não escreve (de uma versão em que o dado ainda era dele), e `world.adopt(campo, chave)` o move para a caixa do mod
  **uma vez e sem perder nada** — grava e só então apaga o campo, as duas coisas no mesmo salvamento; adotar de novo
  devolve o que já está guardado e não mexe em nada. Campo que este motor não conhece volta ao arquivo como veio
  enquanto ninguém o adota, então um boot+save nunca perde dado de uma versão anterior. É o mesmo par do
  `storage.account(uuid).field/adopt` (o lado conta).
- Chaves `[A-Za-z0-9_.:-]{1,64}`; valores JSON copiados (mexer no objeto devolvido não grava nada); `__proto__` e
  valor que não é JSON lançam; passar do limite lança e não grava.
- Grava junto com o save normal do mundo/das contas (mesma escrita atômica). Sem dados, o campo `modData` não
  aparece no arquivo (mundo sem mod que usa isso fica byte a byte igual).
- No navegador toda chamada lança. Em sandbox, cada chamada é um pedido ao servidor e devolve `Promise` (mesmos
  limites; o pedido inteiro até 16 KB; `storage.player` só com jogador de evento, comando ou rede).

## 31. Dados por bloco: `data` no bloco (só servidor)

```js
ctx.blocks.register('cofre', { name: 'Cofre', tiles: { all: 'stone' }, solid: true,
  data: { schema: { cliques: 'number', dono: 'string' }, default: { cliques: 0 } },
  onInteract(e) { e.world.setBlockData(e.pos, { cliques: e.data.cliques + 1 }); return true; } });
```

- `world.getBlockData(pos)` devolve o padrão + o que foi gravado (cópia), ou `null` se o bloco ali não declara `data`.
  `world.setBlockData(pos, parcial)` confere tipos e chaves pelo `schema`; até 2 KB de JSON por bloco e 50 mil blocos
  com dados por mundo (passou, lança).
- Ganchos (`onInteract`, `onBreak`, `onPlace`) do bloco recebem `e.data`.
- Gravado em `world.json` `blockData: [[x, y, z, "mod:bloco", {...}]]`, por nome; sem dados, o campo não existe.
- Trocou o bloco (quebrou, outro bloco por cima): os dados somem. Mod removido: os dados ficam inertes e são
  regravados como estavam (voltam quando o mod volta, se o bloco ainda estiver lá).
- **`data.client: ['chave', ...]`**: chaves do `schema` que o navegador recebe (as outras ficam só no servidor).
  O servidor manda, junto com o chunk, só o que foi gravado nesses blocos e empurra a mensagem `bdata`
  `{ x, y, z, d }` a quem está perto quando `setBlockData` muda uma chave do cliente. No navegador,
  `ctx.blocks.dataAt(x, y, z)` devolve (cópia) o padrão + o que chegou, ou `null` se o bloco não declara `client` ou o
  chunk não está carregado; no servidor lança (use `world.getBlockData`). Até **256 bytes** de JSON das chaves do
  cliente por bloco (passou, `setBlockData` lança; o padrão também é conferido ao declarar). Trocar o bloco apaga os
  dados no navegador junto. Mundo sem `client` em nenhum bloco: o chunk sai igual a antes. O que não está em `client`
  nunca sai do servidor. Em sandbox o `dataAt` do navegador não é oferecido.
- Em sandbox: o `data` do bloco é declarado no `main` como sempre; `e.world.getBlockData/setBlockData` devolvem
  `Promise` (pedido ao servidor, mesmas regras).

## 32. Renderização 3D extensível (`ctx.render`, API 1)

### 32.1 O visual do jogador: `ctx.render.playerModel` / `accessory` / `armorModel`

O jogador é conteúdo registrado: o explorador e as 4 armaduras do jogo base entram pelas mesmas chamadas abaixo, de
uma entrada `main`. A geometria é um objeto Bedrock (box UV, pixels) que o mod importa de um arquivo JS seu; a textura
é um PNG do mod (`'textures/x.png'`, servido em `/mods/<mod>/...`) ou `color: '#rrggbb'`.

- `playerModel({ geometry, texture, tint?, skinBlend? })`: troca o modelo do jogador (um mod só). Ossos exigidos:
  `head`, `body`, `arm_left`, `arm_right`, `leg_left`, `leg_right` (o jogo os move: olhar, andar, montar, item na mão).
  O `material` de cada osso escolhe o canal de tinta da aparência (`skin`, `shirt`, `pants`; outro = sem tinta).
  **Localizadores** (opcionais): ossos **sem caixas** que dizem onde o jogo prende o que não é corpo — `hand_right`
  e `hand_left` (filhos dos braços: o item na mão), `shield_right` e `shield_left` (o escudo abaixado), `cape`, `flag`
  (as costas) e `name` (a etiqueta de nome). Sem um deles, o jogo usa o lugar padrão.
- `accessory(nome, { geometry, texture | color })`: cosmético em todo jogador; cada osso diz `attach` (um osso do
  jogador). `hidesUnder: 'helmet' | 'chestplate' | 'leggings' | 'boots'`: some enquanto essa peça de armadura estiver
  vestida (o chapéu sob o capacete). O exemplo `chapeu` é um chapéu de palha assim.
- `armorModel('mod:item' | { tier }, { geometry, texture | color })`: a forma da armadura de um item ou de um material
  inteiro; cada osso diz `attach` e `slot` (0 capacete, 1 peitoral, 2 calças, 3 botas). O do item vence o do material.

### 32.2 O que o jogador carrega: `ctx.render.playerAttachments`

`ctx.render.playerAttachments({ held, flag: { teams, build }, cape, shieldPose, nameTag })`: as formas do item na mão,
da bandeira do time nas costas (e quantos times há), da capa, das poses do escudo e da etiqueta de nome. Cada uma recebe
um kit (`THREE`, o atlas, `blockUV`, o ícone...) e devolve a malha; o jogo põe a malha no localizador do modelo. As do
jogo base são conteúdo como as suas; um mod pode trocar cada uma (um mod por chave).

### 32.3 A forma viva de um bloco: `ctx.render.blockQuads` / `emitBlockQuads`

O `emitBlockQuads` do `FabricBakedModel`. Um `model` declarado é a mesma forma em toda célula; um emissor de quads
roda **dentro do montador de malhas**, uma vez por célula, e vê o `data` do bloco, o estado, o vizinho e a posição no
mundo:

```js
// numa entrada main (o montador de malhas roda num Web Worker, que só carrega essas)
ctx.render.blockQuads('cisterna', (e) => {
  e.box({ from: [0, 0, 0], to: [16, 2, 16], tile: 'meumod:pedra' });    // pixels da célula, como num `model`
  const nivel = Number(e.data?.nivel ?? 0) / 1000;                       // o `data` da CÉLULA
  if (nivel > 0) e.box({ from: [2, 2, 2], to: [14, 2 + 13 * nivel, 14], tile: 'meumod:agua', blend: 'translucent' });
});
ctx.render.blockQuads('cano', (e) => {                                   // a forma depende de quem está do lado
  e.box({ from: [6, 6, 6], to: [10, 10, 10], tile: 'meumod:latao' });
  if (e.neighbor(1, 0, 0) === 'meumod:cano') e.box({ from: [10, 6, 6], to: [16, 10, 10], tile: 'meumod:latao' });
});
```

Diferente do `ctx.render.blockEntity` (abaixo), que desenha um objeto Three **por cima** do terreno: o emissor entra
**na malha do terreno**, com a luz, a oclusão ambiente, os passes e o culling de seção do montador de malhas. Teto de
64 quads por célula (até 256 com `maxQuads`), 32 blocos por mod, cadeia com `e.previous()`, erro isolado e desligado
depois de 8 falhas; mudar o `data` refaz a malha da seção. Os tipos de `e.box`, `e.quad` e companhia estão em
[ctx.md](ctx.md).

### 32.4 O visual vivo de um bloco: `ctx.render.blockEntity` / `BlockEntityRenderer`

`ctx.render.blockEntity('caminho', new MeuRenderer())` (classe `BlockEntityRenderer`, o equivalente do Fabric) dá a um
bloco do mod objetos Three ancorados na célula: `create(e)`, `update(e)` quando os campos de `data.client` ou o estado
mudam, `render(e, frame)` por quadro e `dispose(e)`. O motor cria e destrói as instâncias pela distância e pelo chunk,
com orçamento por quadro e erro isolado. `e.display.item(nome, { position, scale, rotation })` mostra um item ou bloco
registrado e `e.display.travel` o move entre dois pontos pelo tempo desde o último `setBlockData`. Até 32 renderers
por mod e 8 por bloco; vários no mesmo bloco: o de maior `priority` é o que o motor chama e alcança os outros por
`e.previous`. Assinaturas e limites em [ctx.md](ctx.md).

### 32.5 O visual de um mob: `ctx.render.mobModel` / `mobRenderer` e as CAMADAS `ctx.render.mobFeature`

O `EntityRendererRegistry` e o `LivingEntityFeatureRendererRegistrationCallback` do Fabric. São duas coisas:

**O RENDERER — o corpo.** `ctx.render.mobModel('mod:mob' | 'caminho', { build(kit), flags?, animate? })`
(`ctx.render.mobRenderer` é o mesmo registro com o nome do Fabric). Os 12 mobs do jogo base são assim, um modelo por
mob. `build({ THREE, part, nameTag, tr, previous })` devolve `{ group, legs, arms, ... }` (o motor balança
`legs`/`arms` ao andar e pisca no dano). `kit.blockTexture('mod:bloco')` dá o visual de um bloco para um modelo feito
em código: `{ texture, top, side, bottom, front }` (o atlas do terreno — compartilhado, o motor não o descarta quando
o mob some — e a célula de cada face como `[u0, v0, u1, v1]`), ou `null` (nome que nenhum mod registrou). É assim que
a concha do Ermitão das Marés é um bloco do mundo. `flags(m, { flags, owner, coat })` roda quando os campos 8–10 do
mob mudam (domado, sentado, selado, empinando; dono; pelagem); `animate(m, { dt, now, swing, speed })` roda a cada
quadro, depois do balanço.

É uma **CADEIA**, como o `ctx.render.blockEntity`: o último a registrar vence e alcança o anterior por `kit.previous`
(`build()`, `flags(m, state)`, `animate(m, frame)`), até 8 na cadeia. O **jogo base carrega por último**, então o
renderer dele entra por **baixo** — um mod que troca o visual de um mob do jogo continua ganhando e ainda alcança o do
jogo:

```js
class GalinhaDourada extends MobRenderer {
  build(kit) {
    const model = kit.previous.build();                     // a galinha do JOGO, sem copiar uma linha dela
    model.group.traverse((o) => o.material?.color?.setHex?.(0xffd75e));
    model.crest = kit.part(0.08, 0.12, 0.2, 0xff5a3c, 0, 0.78, -0.08, true);
    model.group.add(model.crest);
    return model;
  }
  animate(m, frame, kit) { kit.previous?.animate(m, frame); /* e o seu por cima */ }
}
ctx.render.mobRenderer('mineclaude:chicken', new GalinhaDourada());
```

**As CAMADAS — o que vai por cima.** `ctx.render.mobFeature(mob | '*', nome, camada | null)`: uma camada desenha sobre
**quem quer que** desenhe aquele mob — a do jogo, a de um mod, ou a de um mod que embrulhou os dois. Várias por mob, de
vários mods, na ordem de `priority` (maior primeiro; empate: ordem de registro). Até 16 por mod.

```js
class Chapeu extends MobFeatureRenderer {
  priority = 10;
  build(e, { THREE, part }) { const g = new THREE.Group(); g.add(part(0.56, 0.03, 0.56, 0xd9c27a, 0, 0.84, -0.24)); return g; }
  update(e, { flags, owner, coat }) { if (e.object) e.object.visible = !(flags & 2); }  // os mesmos campos 8–10
  render(e, frame) { e.object.rotation.y += frame.dt; }                                  // todo quadro, depois do animate
  dispose(e) { /* o motor já tira do grupo e descarta geometria/material */ }
}
ctx.render.mobFeature('mineclaude:pig', 'chapeu', new Chapeu());   // vira 'meumod:chapeu'
ctx.render.mobFeature('*', 'aura', new Aura());                    // em TODO mob
ctx.render.mobFeature('mineclaude:horse', 'mineclaude:saddle', null);  // TIRA a sela do jogo
```

`build(e, kit)` devolve um `Object3D` (que o motor pendura no grupo do mob), `{ object, dispose? }` ou `null` (uma
camada sem objeto continua recebendo `update`/`render`: serve para quem só quer mexer no corpo). O `e` é
`{ id, mob, type, model, group, object, store }` — o `store` é seu. Oito falhas de um gancho e a camada fica
**desligada até a próxima sessão**, sem levar o mob nem as outras camadas junto.

**A sela do cavalo é uma camada do jogo base**: estava dentro do `build` do cavalo, e para pôr uma sela própria um mod
tinha de reescrever o cavalo inteiro.

**Sinais, morte e o chão.** O renderer pode ter `cue(m, nome, kit)` (o `e.mob.cue` do servidor) e `deathMs` (0..3000): na
morte o corpo fica esse tempo na cena, fora da mira, e o `animate` recebe `frame.dying` (segundos desde a morte) — o tombo
do Goblin. Para pés que pisam no bloco de verdade, `ctx.client.groundBelow(x, y, z, depth?)` dá a altura do topo da colisão
(laje 0,5; escada pelo degrau) descendo de `y` até `depth` blocos (padrão 4), ou `null` se a coluna não carregou: números
entram, um número sai, sem objeto por chamada. A locomoção procedural do Goblin é feita assim.

**O tamanho.** O atributo `mineclaude:scale` de um mob chega ao navegador, então um mob que declara
`attributes: { 'mineclaude:scale': 1.8 }` é **desenhado** 1,8× — o servidor já media a caixa dele assim. Filhote
(`BABY_SCALE`) e `scale` se multiplicam.

**A morte de um modelo de arquivo.** Um mob desenhado por arquivo de modelo que tem a animação `death` a toca quando
morre (o `mobGone` com efeito `'die'`): o corpo sai da lista de mira e da barra de vida, fica parado no último quadro e
some quando a animação acaba. As camadas dele continuam recebendo `render` até lá (um brilho pode se apagar).

O exemplo `camadas_mob` mostra as duas pontas: um renderer que embrulha o do jogo e camadas por cima.

### 32.6 O céu: `SkyType`, `ctx.render.skyType` / `sky` / `modifySky`

O motor guarda o mecanismo do céu: o relógio do dia (vem do servidor), o estado de cada quadro, os planos dos corpos
celestes e aplicar o resultado (fundo, névoa, luz). **Como o céu é** é uma classe `SkyType` (só no navegador); os do
Overworld, do Nether e do End são conteúdo do jogo base, pelas mesmas APIs de qualquer mod.

```js
import { SkyType, ClientModInitializer } from './mineclaude-sdk.js';
class TwoMoons extends SkyType {
  bodies = [
    { id: 'sun', size: 30, color: 0xfff3b0, orbit: (s) => ({ x: Math.cos(s.t * 6.283), y: Math.sin(s.t * 6.283), z: 0 }) },
    { id: 'moon_a', size: 14, color: '#dfe6f0', orbit: (s) => ({ x: -Math.cos(s.t * 6.283), y: -Math.sin(s.t * 6.283), z: 0.3 }) },
    { id: 'moon_b', size: 9, paint: (g, px) => { g.fillStyle = '#c99'; g.fillRect(0, 0, px, px); }, orbit: (s) => ({ x: -Math.cos(s.t * 6.283 * 1.7), y: -Math.sin(s.t * 6.283 * 1.7), z: -0.3 }) },
  ];
  build({ THREE }) { this.day = new THREE.Color('#6fa8dc'); this.night = new THREE.Color('#080c22'); }
  update(s) {
    const h = Math.sin(s.t * 6.283);
    s.color.copy(this.night).lerp(this.day, Math.min(1, Math.max(0, h * 1.6 + 0.4)));
    s.daylight = Math.min(1, Math.max(0.3, h * 1.6 + 0.35));
    s.sun.x = Math.cos(s.t * 6.283); s.sun.y = h; s.sun.z = 0;
  }
  lights(s) { s.ambient = 0.2 + s.daylight * 0.55; s.sunlight = s.daylight * 0.8; }
}
export default class extends ClientModInitializer {
  onInitializeClient(ctx) {
    ctx.render.skyType('two_moons', new TwoMoons());
    ctx.render.sky('mineclaude:overworld', 'two_moons');   // troca o céu do Overworld (o último mod a amarrar vence)
    ctx.render.modifySky('*', (s) => { s.fog.mul *= 0.9; }); // ou só ajusta o de uma dimensão ('*' = todas)
  }
}
```

- `update(s)` escreve o estado base; depois rodam o **clima ativo** e as funções de `modifySky` (na ordem de carga); por fim `lights(s)`
  deriva `ambient`/`sunlight` do `daylight` final. `s`: `t` (0 = nascer do sol .. 1), `color` (céu **e** névoa), `daylight` (luz do
  terreno, da mão e da música), `ambient`/`sunlight` e suas cores, `fog { near, far, mul }` (fração da distância de visão),
  `bodyOpacity`, `sun` (vetor até o sol: é o que `ctx.client.sun()` devolve; `ctx.client.daylight()` devolve `daylight`),
  `weather` (força 0..1 de cada clima ativo) e `eye`, `dimension`, `now`.
- `bodies`: quantos quiser; cada um é um quadrado no céu com `size`, `color` ou `paint(g, px)` (desenho por código num canvas) e
  `orbit(s)`, a direção até ele (`null` esconde). `render(frame)` roda todo quadro com o céu ativo, e `build(kit)` (com `kit.scene`)
  é onde um mod cria **malhas Three próprias** (estrelas, nuvens, aurora): devolva `{ dispose() }` para limpar ao sair do céu.
- `useZones = true` deixa a zona de perigo sob o jogador tingir o céu e aproximar a névoa (o Overworld).
- Dimensão sem céu amarrado usa um `FixedSky` feito do `sky`/`light` do `dimensions.register`. `FixedSky` (`color`, `light`) é a classe
  pronta para céu liso: o Nether e o End são subclasses dela.

**Corpos do céu de outra dimensão (`ctx.render.skyBody`) e o dia do mundo (`s.day`).** `ctx.render.skyBody(dimensão | '*', id, corpo | null)` acrescenta, troca (outro corpo com o mesmo id) ou tira (`null`) um corpo celeste do céu de uma dimensão, sem esconder o objeto Three pelo nome. Os do Overworld são `'sun'` e `'moon'`: `ctx.render.skyBody('mineclaude:overworld', 'moon', null)` tira a lua. O corpo é um `SkyBody` (`size`, `color` ou `paint`, `orbit(s)`). `SkyState` (o `s` de `update`/`render`/`modifySky`, e `frame.s` de uma `SkyLayer`) traz `day`: o contador de dias da dimensão (0 no primeiro nascer do sol; sobe a cada volta do relógio; guardado no `world.json`, vale entre reinícios) — use-o para o que muda de dia para dia (a fase da lua) em vez do calendário real.

**Camadas do céu (`SkyLayer`, `SkyType.layers`, `ctx.render.skyLayer`).** Uma camada é uma parte *nomeada* do céu que desenha malhas
próprias: `id`, `build(kit)` (ao ativar o céu; pode devolver `{ dispose() }`), `render(frame)` (todo quadro; o mesmo `frame` de
`SkyType.render`, mais `frame.settings` (as opções do jogador) e `frame.seed` (semente do mundo)) e `dispose()`. As nuvens do Overworld
são a camada `clouds` do céu do jogo base: mantos planos (um por tipo de nuvem, abaixo), uma textura de ruído
fBm que emenda sem costura, gerada por código a partir da semente, e um shader pequeno que corta o ruído em manchas de borda suave, sombreia
pelo gradiente na direção do sol em três tons (pixel-art) e esmaece no horizonte para a cor da névoa. Sem raymarching, sem escrever
profundidade (por isso viram "céu", não "chão", para um pós-processo de mod). Tudo é função da semente e de `s.t`; o vento
dá voltas inteiras de textura por dia, então todos os jogadores veem as mesmas nuvens e não há salto na virada do dia. Cor: branca de
dia, laranja no nascer e no pôr do sol, azul-escura à noite; na chuva e na tempestade o céu troca de tipo (abaixo; `s.weather`).
O jogador liga/desliga em Opções (`settings.clouds`, ligada por padrão). Só o Overworld tem; as outras dimensões não.

```js
// tirar as nuvens do jogo (ou de todas as dimensões com '*'), ou trocar por outra camada de id 'clouds':
ctx.render.skyLayer('mineclaude:overworld', 'clouds', null);
ctx.render.skyLayer('mineclaude:overworld', 'clouds', new MyClouds());   // class MyClouds extends SkyLayer { id = 'clouds'; ... }
ctx.render.skyLayer('mineclaude:the_end', 'aurora', new Aurora());        // ou acrescentar uma camada nova a um céu
```

**Tipos de nuvem (`CloudType`, `ctx.render.cloudType`).** A camada `clouds` não tem desenho fixo: ela desenha cada `CloudType` registrado
(`frame.cloudTypes`, na ordem de carga). Um tipo é só **dados e três ganchos**, sem código de desenho: `form` (`'deck'` = manto plano de
ruído em `altitude`; `'towers'` = colunas com volume vertical), `altitude`, `tile`, `wind` (voltas inteiras por dia), `stretch`, `threshold`,
`softness`, `opacity`, `contrast`, `belly`, as cores (`day`, `dusk`, `night`, `dark` e as sombras) e, para torres, `count`, `width`, `rise`,
`puffs`, `fadeIn`. Os ganchos: `weight(s)` (0..1, **quando** o tipo aparece: lê `s.weather` e `s.t`), `darkness(s)` (0..1, quanto a paleta vai
para a escura) e `lightning(s)` (0..1, clarões dentro das torres). O jogo base traz seis:
**cumulus** (tempo bom: montes brancos isolados de base cinza, contraste e borda definida), **altocumulus** (manto mais alto e ralo),
**cirrus** (fios altos e finos; no tempo bom e mais grossos logo antes do tempo virar), **stratus** (manto fino cinza-claro, o primeiro da
chuva), **nimbostratus** (teto baixo, escuro e contínuo: chuva, garoa, neve e embaixo da tempestade) e **cumulonimbus** (a tempestade:
torres altas e escuras com base plana, corpo em couve-flor e topo em bigorna, com raios dentro).

*Como são feitas:* os mantos são um plano cada (o ruído fBm gerado da semente, cortado em manchas, três tons, sem profundidade); o
cirrus estica o ruído em fios (`stretch`) e o nimbostratus baixa o limiar até virar teto. As **torres** têm volume vertical barato: cada
coluna são ~84 fatias de nuvem (billboards que giram só em torno da vertical, então uma fatia larga e achatada continua achatada) numa
**única chamada de desenho instanciada**, dispostas pela forma da nuvem (base larga e baixa, tronco, corpo, bigorna achatada e larga no
topo); cada fatia é sombreada como uma bolinha (lado do sol claro, embaixo escuro, borda comida por ruído), a base é escura e tudo que se vê
de baixo escurece mais. As colunas dão a volta num toro em torno do olho (sempre há algumas à vista, e de longe parecem altas) e **crescem
a partir da base** conforme o peso sobe, uma depois da outra. O raio é função pura da semente e da hora
do dia: o mesmo clarão (pulso forte + um segundo mais fraco) na mesma coluna para todos os jogadores; acende a coluna, dá um pouco de luz ao
teto e, se a coluna está perto, aparece uma linha do chão à base da nuvem. É só imagem: nada no servidor.

*Transição:* o céu muda de tipo aos poucos, sem corte. O peso de cada tipo vem da força dos climas (`s.weather`), que já sobem e descem
sozinhos, e a camada ainda o suaviza (~5 s) antes de desenhar. A **tempestade** (`/clima tempestade`)
usa isso: sua força sobe em ~50 s e desce em ~60 s; os cumulonimbus crescem e o céu escurece primeiro, **a chuva forte só vem depois do meio
da subida** e, ao acabar, a chuva para primeiro e as nuvens ficam e vão embora depois. A tempestade natural só se forma num dia de chuva
(sorteio da janela enquanto chove); o `/clima` a inicia a qualquer hora. Para anunciar um clima "antes dele chegar" qualquer `WeatherType`
faz o mesmo: devolve de `tick(f)` uma força com rampa lenta e deixa o efeito mais forte (gotas) para o fim da rampa.

```js
// um mod acrescenta um tipo, troca um do jogo pelo nome completo ou tira um, e muda QUANDO aparecem só mudando weight(s):
class Neblina extends CloudType { name = 'Neblina'; altitude = 96; threshold = 0.2; softness = 0.5; weight(s) { return s.t > 0.9 || s.t < 0.05 ? 0.8 : 0; } }
ctx.render.cloudType('neblina', new Neblina());                 // vira "meumod:neblina"
ctx.render.cloudType('mineclaude:cumulus', new MeuCumulus());   // troca (a posição na lista é a mesma)
ctx.render.cloudType('mineclaude:cirrus', null);                // tira o cirrus do jogo
```
`ctx.render.skyLayer('mineclaude:overworld', 'clouds', null)` continua tirando tudo, e a opção "Nuvens no céu" desliga mantos, torres e raio.
Custo medido no navegador (240 quadros): tempo bom +0,2 a 0,3 ms por quadro, chuva e tempestade dentro do ruído (~0,1 ms);
+3 chamadas de desenho e ~1k triângulos na tempestade.

As edições valem na ordem de carga (a última de um id vence). *Caminho para nuvens volumétricas (ideia, não implementada):* um mod
substitui a camada `clouds` por uma `SkyLayer` que desenha as nuvens num `WebGLRenderTarget` de resolução reduzida (por exemplo 1/4 da
tela, escolhida por um nível de qualidade lido de `frame.settings` ou de uma opção própria do mod), com poucos passos de raio por pixel
dentro de uma caixa de nuvem, e compõe o resultado sobre o céu por um plano de tela cheia com `depthWrite: false`, usando `frame.s`
(`sun`, `color`, `weather`) para luz e cobertura; níveis baixos reduzem passos e resolução, e o nível "desligado" volta à camada simples.

### 32.7 O clima: `WeatherType`, `ctx.weather`, `world.weather`

O motor guarda o mecanismo do clima: **um estado por dimensão** no servidor (o que está ativo e até quando), o sorteio periódico
(uma janela a cada 5 minutos), o fim de cada clima, a mensagem `weather` (`{ w: [[id, falta ms,
duração ms], ...] }`, também nas boas-vindas e ao trocar de dimensão) e a transição no navegador. **O que cada clima é** é uma classe
`WeatherType` registrada nos dois lados (`ctx.weather.register('petals', new Petals())`; o id da rede é a ordem de registro). A chuva
e o eclipse do jogo base são classes assim, e o `/clima` é um comando sobre `world.weather`. O exemplo completo (pétalas, névoa de
esporos com efeito de status, aurora) é o mod `clima_criativo`.

- **Salvo no mundo:** o estado de cada dimensão vai no `world.json` daquela dimensão, no campo opcional `weather`
  (`{ active: { 'mod:clima': { left, total, forced? } }, next }`: o que falta em ms, a duração total, se um comando ou mod forçou, e
  quanto falta para o próximo sorteio). Uma reinicialização não apaga a chuva forçada; o campo só existe enquanto há clima ativo, e um mundo
  de antes dele começa com céu limpo como sempre. Um clima que nenhum mod registra mais é ignorado na carga (`onStart` não roda de novo).
- **`ctx.weather.modify(alvo, patch | fn)`:** muda um clima de qualquer mod pelo mesmo mecanismo de `modify` da seção 25.1 (chance,
  duração, onde ocorre, textos do comando, ganchos do servidor e do navegador). Climas têm **tags**
  (`ctx.tags.has('weather', 'c:precipitation', nome)`), assim como dimensões e zonas
  (`ctx.tags.has('dimension', 'c:is_overworld', e.dimension)`, `'zone'`).
- **Campos:** `name`, `command` (a palavra do `/clima`), `dimensions` (ids completos; padrão só o Overworld: nas outras dimensões
  nada sorteia, nada chega ao navegador), `chance` (0..1 por janela), `minMs`/`maxMs`, `cooldown` (janelas de espera depois que acaba),
  `order` (o céu aplica os efeitos em ordem crescente), `refusal`/`already` (o que o `/clima` diz quando não dá para começar / já está
  ativo; sem `already`, o `/clima` reinicia o clima ativo).
- **Servidor** (`e` = `{ dimension, now, frac, dayMs, rng, forced, name, from, until, left, world, server }`): `canStart(e)` (antes do
  sorteio), `duration(e)` (ms; 0 = não começa; padrão minMs..maxMs), `shouldEnd(e)`, `onStart(e)`, `onTick(e)` (~1 vez por segundo),
  `onEnd(e)`, `status(e)` (o texto do `/clima`). Use `e.rng()` no lugar de `Math.random`. `e.world` / `e.server` são os de sempre:
  apagar fogo, molhar, raio, `e.server.players()` (só os da dimensão) com `player.addEffect(...)`.
- **Navegador** (`f` = o quadro: `dt`, `now`, `eye`, `active`, `elapsed`, `dur`, `left`, `level(nome)`, `enabled` (a opção do jogador),
  `solidAt`, `columnAt`, `liquidHead`, `noise(nível, opts)` (um ruído filtrado contínuo, como o som da chuva), `sky.body('sun')`...):
  `build(kit)` uma vez (`kit.THREE`, `kit.scene`), `tick(f)` devolve a força 0..1 (o tipo sobe e desce sozinho),
  `render(f)` desenha o que quiser, `modifySky(s, força)` mexe no `SkyState` (cor, `daylight`, `fog.mul`, `bodyOpacity`), `reset()`
  ao trocar de dimensão.
- **`world.weather`** (servidor, a dimensão do mundo em que o mod age): `active()` (`[{ name, label, left, duration }]`), `has(nome)`,
  `types()`, `start(nome, ms?)` (false se o tipo não pode agora), `stop(nome)`, `clear()`. Nomes completos (`mod:path`) ou o caminho de
  um clima do jogo (`'rain'`).

### 32.7.1 O clima regional: eventos, ambientes, campos de superfície e células (`ctx.weather`)

Além do clima global acima, o tempo é **regional**: uma função pura de (semente, x, z, tempo) calculada só onde há
jogador, igual no servidor e no navegador — pressão, vento, temperatura, umidade e **células** de tempo que andam com o
vento (chove aqui, faz sol ali). Nada disso é estado guardado: dois lados com a mesma semente chegam ao mesmo número,
e o que é forçado (as células criadas por um mod) vai no save. Tudo é dado registrado nos DOIS lados (entrada `main`),
na mesma ordem:

```js
// um evento: onde/como é raro/tamanho/duração/o que cai/o visual/o som/o aviso; onTick (servidor) para o efeito de jogo
ctx.weather.event('cinzas', { name: 'Chuva de cinzas', command: 'cinzas', precipitation: 'none', icon: '🌋', rarity: 0.05,
  when: { temperature: [26, 80], humidity: [0, 40] }, radius: [120, 220], duration: [300, 600], fog: 0.7,
  environment: 'meumod:cinzas', warning: { text: 'Cinzas no ar: a visão vai cair.', lead: 60 },
  onTick(e) { for (const p of e.server.players()) if (e.at(p.pos) > 0.3) p.addEffect('meumod:tosse', 3); } });
// o visual inteiro, por hora (6 = nascer do sol): céu, névoa, nuvem, luz, sol, estrelas, vento da folhagem
ctx.weather.environment('cinzas', { colorMix: 0.85, fogDensity: 0.7, light: 0.6, cloudForm: 'dust', particles: 'ash',
  keyframes: { 10: { sky: '#6a5e58', fog: '#7a6c64' }, 20: { sky: '#3a2a26', fog: '#4a3430' } } });
ctx.weather.profile('meumod:pantano', { humidity: 20, temperature: 2, environment: 'meumod:pantano' }); // o clima de um bioma
ctx.weather.source('vulcao', { x: 900, z: -300, radius: 250, temperature: 15, pressure: -12 });         // um termo somado
// "como um mod cria acúmulo de água": um campo de superfície (a integral do tempo no lugar) que deixa poças
ctx.weather.surfaceField('encharcado', { cell: 8, history: 0.25, step: 30, gain: { rain: 40 }, loss: { base: 60, sun: 10 },
  effect: { place: 'mineclaude:puddle', where: 'exposed', on: ['mineclaude:grass', 'mineclaude:dirt'], above: 0.3, spread: 0.3 } });
// lendo e mandando
ctx.weather.sample(x, y, z);   // { temperature °C, pressure hPa, humidity %, wind {x,z} m/s, cloud, precipitation, kind, event... }
ctx.weather.forecast(x, z, 2); // a previsão (o mesmo modelo num t futuro)
const id = ctx.weather.cells.create({ kind: 'mineclaude:storm', x: chefe.pos.x, z: chefe.pos.z, radius: 150, seconds: 300, motion: { vx: 0, vz: 0 } });
ctx.weather.cells.steer(id, { x: chefe.pos.x, z: chefe.pos.z }); // uma tempestade que segue um chefe (servidor)
```

- **Evento** (`event`): `precipitation` (`rain`/`snow`/`hail`/`sand`/`none`/`auto` = chuva ou neve pela temperatura no
  ponto), `radius`/`duration`/`intensity` (faixas), `rarity` (0..1 por região de 512 blocos e época de 15 min quando as
  condições batem), `when` (`temperature` °C, `humidity` %, `pressure` hPa de anomalia, `wind` m/s, `biome`, `notBiome`,
  `coast`, `ocean`, `hours` 0..24, `season` −1..1), `curve` (intensidade na vida), `drift` (quanto do vento segue),
  `cloud`/`darkness`/`fog`/`gust`/`lightning`/`cold`/`humidity`, `cloudForm`, `environment`, `sound` (o `weather` do
  ambiente que toca), `icon`, `warning`, `gamerule` (precisa estar ligada para nascer sozinho), `natural`, `dimensions`.
  Ganchos do servidor: `onTick(e)` (~1 vez por segundo por célula sobre jogadores), `onStart`, `onEnd` (células
  forçadas). `e`: `cell`, `at(pos)`, `sample(pos)`, `strike(pos)` (um raio que todos veem e ouvem), `temp` (edições
  **reversíveis**: `set`, `restore`, `restoreAll`, `list`), `rule(nome)`, `rng()`, `world`, `server`.
- **Ambiente** (`environment`): cores `sky`, `horizon`, `fog`, `cloud`, `cloudShadow`, `ambient`, `sun` ('#rrggbb');
  números `fogDensity`, `light`, `ambientMix`, `cloudCoverage`, `cloudDarkness`, `sunSize`, `halo`, `stars`, `wind`,
  `colorMix`...; `keyframes` por hora; `cloudForm`, `particles`, `ambience`. O navegador mistura bioma + eventos.
- **Campo de superfície** (`surfaceField`): `gain` por hora em chuva/neve/granizo/areia, `loss` (base, calor acima de
  `above` °C, sol, vento), ou `rate(amostra, valor, info)`; `effect` põe `place` em `hollow` (depressões) ou `exposed`,
  só em chão natural, descoberto, fora de zona protegida, dentro do orçamento por minuto; ao sumir, devolve exatamente o
  que havia. O navegador também calcula os campos, para shaders de chão molhado e de neve.
- **Células** (`cells`): `list` nos dois lados; `create`/`steer`/`remove` só no servidor (64 por dimensão; vão no save).
- O exemplo `clima_regional` junta tudo: poças rápidas, chuva de cinzas, fonte de calor e uma nuvem de chuva que segue
  você. Comandos do jogo: `/clima` (o tempo aqui), `/clima previsão`, `/clima <evento> [intensidade] [minutos]`
  (admin), `/clima limpo`, `/clima global <clima>`.

**Acesso gráfico avançado.** Um mod também registra estratégias de montagem de malhas em entradas `main` (que os Web
Workers carregam) e passes de câmera/imagem em entradas `client` ou `main`: acesso direto ao Three.js, render targets,
câmera visual, materiais e etapas antes ou depois da cena, ou substituindo o desenho padrão. As assinaturas, as
prioridades, o descarte e os limites estão em [ctx.md](ctx.md). HUDs em DOM e canvas continuam em `ctx.ui`, e o estado
e a validação do jogo continuam no servidor: esse código roda confiado dentro do navegador do jogador.

### 32.8 O modelo 3D de um item: `ctx.render.itemModel`

**Sem fazer nada, todo item que não é bloco já é 3D:** o motor EXTRUDA o ícone — cada pixel opaco vira um voxel de
1/16 de espessura, frente e verso com o desenho, laterais só no contorno (mais escuras) — e usa essa peça na mão em
primeira pessoa, no item jogado no chão e no display de um bloco-entidade (`e.display.item`). A geometria é feita UMA vez
por item e compartilhada: 200 espadas no chão são 200 malhas sobre a mesma geometria e o mesmo material. Na mão, uma
ferramenta ou arma (`tool`, `weapon`, `damage`) fica na diagonal de arma (lâmina para cima e para frente, cabo na
mão), um arco (`ranged`) em pé, o resto (comida, materiais) de outro jeito.

Para um visual feito à mão, `ctx.render.itemModel('caminho' | 'mod:item', { build(kit), animate? })`:

```js
class Espada {
  build({ THREE, part, previous }) {
    const g = new THREE.Group();
    g.add(part(0.36, 0.055, 0.085, 0x7c838c, 0, -0.335, 0));   // a guarda
    // ... lâmina, cabo, pomo ao longo de +y
    g.rotation.z = -Math.PI / 4;                               // +y na diagonal do ícone (cabo embaixo à esquerda)
    const root = new THREE.Group(); root.add(g); return root;  // ou embrulhe o de baixo: previous.build()
  }
  animate(object, { dt, now, context }) { /* a cada quadro enquanto aparece */ }
}
ctx.render.itemModel('mineclaude:iron_sword', new Espada());
```

- **Convenção:** o objeto tem 1 bloco de largura, centrado, o topo do ícone em +y e a frente em +z — o motor escala e
  posiciona por lugar (`kit.context`: `'hand'`, `'drop'`, `'display'` ou `'icon'`, o ícone 3D do inventário). Na mão, uma ferramenta é segurada no ponto
  (-0,3; -0,3) do ícone (o cabo de um ícone desenhado na diagonal); qualquer outro item, pelo centro.
- **O kit:** `THREE`; `part(w, h, d, cor, x?, y?, z?)` (uma caixa SEM luz: a cena da mão não tem luzes e o motor
  escurece os materiais pela luz do mundo); `icon()` (uma malha nova do ícone extrudado — geometria e material
  compartilhados, não descarte); `blockTexture('mod:bloco')` (o mesmo do kit de mob); `context`; `item`
  (`{ id, name, tool, ranged, food }`); `previous.build()`.
- **CADEIA**, como o `mobModel`: o último a registrar vence e alcança o de baixo por `kit.previous.build()`; no fundo
  está a extrusão. O jogo base, que carrega por último, entra por BAIXO. Até 8 na cadeia e 256 por mod.
- **Erros isolados:** um `build` que lança (ou devolve algo que não é `Object3D`/`{ object }`) cai para o de baixo;
  8 falhas e o modelo fica desligado até a próxima sessão. O `dispose` de `{ object, dispose }` roda quando o objeto
  sai (mão e chão). Geometrias e materiais que o `build` criou são descartados pelo motor; texturas nunca.
- **Item de bloco:** um `itemModel` no item de um bloco (os troncos, por exemplo) vale na mão, no ícone 3D e no
  item no chão, como um item com modelo; sem ele, o bloco continua sendo o cubo.
- **Só no navegador:** o registro existe nos dois lados (uma entrada `main` não precisa testar o lado), o servidor
  ignora. Um item que declara `model` (um arquivo de modelo, com animações) continua usando o arquivo.

**O ícone também é 3D.** A barra de itens, o inventário, o baú e as outras telas, a paleta criativa, a loja, a troca e as
telas de mod (`bridge.drawIcon`) mostram o MESMO objeto da mão (o modelo da cadeia, a extrusão, o cubo do bloco, a laje,
a escada, o `model` declarado), desenhado uma vez numa imagem de 48 px, visto de três quartos com uma luz simples e fundo
transparente. O `build` roda com `kit.context === 'icon'` e o `animate` não roda (quadro
parado). Os ícones são feitos em fatias ociosas de poucos ms — até ficarem prontos aparece o ícone plano — e guardados
por item + desenho + cadeia de modelos (um `itemModel` novo gera ícone novo sozinho); textura repintada ou mod recarregado
refaz os que estão na tela. Sem WebGL, com o contexto perdido, ou se o `build` lançar no ícone, fica o ícone plano. Um item
que lê melhor plano (um mapa, uma página escrita) declara **`icon3d: false`** no registro: o ícone continua o desenho; a mão
e o chão seguem 3D.

**Modelos esculpidos e compartilhados.** Os ~85 itens do jogo base e dos mods oficiais usam um construtor pequeno,
copiado dentro de cada mod (um mod empacotado só leva a própria pasta): `box`, `frustum` (caixa afunilada: barra,
lâmina), `rod` (haste entre dois pontos, afunilável), `lathe` (facetas torneadas: gema, maçã, balde), tudo numa ÚNICA
geometria por chave com a luz **gravada na cor dos vértices** (uma luz fixa sombreia cada face pela normal; `gloss`
aproxima o brilho de metal). `sharedModel(THREE, chave, build)` monta uma vez e devolve malhas marcadas
`sharedItemMesh` sobre DOIS materiais compartilhados por mod (opaco e translúcido): 200 barras no chão são 200 malhas
sobre os mesmos buffers, um draw call cada, e o motor nunca descarta a geometria. As famílias são barras com bisel e
marca cunhada, diamante lapidado, carvão, graveto, barbante, couro, osso, trigo, sementes, frascos de corante;
picareta, machado, pá e enxada por material; arco, besta, escudo, flecha, lanças e machados de guerra; as 4 peças de
armadura de cada material; comida e utilidades. Um ajudante `sculpted(chave, build, { transform, pose })` embrulha tudo
no formato do `itemModel` (uma constante de diagonal põe a ferramenta na diagonal do ícone; um fator de escala de mão
encolhe um item volumoso).

### 32.9 Gráficos: presets, sombreamento do mundo, `sway` e `ctx.render.shadeMaterial`

O jogador escolhe a qualidade em **Opções → Gráficos** (salvo por aparelho, `mc-graphics`): **Baixo** é o visual de
sempre, pixel a pixel (materiais sem luz, luz do céu + tocha + AO do montador de malhas, névoa linear); **Médio**,
**Alto** e **Ultra** somam luz do sol/lua pela direção da face (laranja no nascer/pôr, azulada à noite), sombra do sol
em mapa de sombras estabilizado (uma cascata no Médio/Alto, três no Ultra; o Médio redesenha a cada 2 quadros), água
com ondas, fresnel do céu, cor pela profundidade e espuma na margem, folhas e grama balançando (a grama afunda no chão
depois de ~50 blocos), névoa em x/z com névoa de altura e tom do sol, a curvatura do planeta (abaixo) e, do Alto para
cima, bloom só do que brilha e curva de tom suave (raios de sol só no Ultra). Há chaves avulsas (sombras, água,
balanço, bloom, curvatura). Sem WebGL2, só o Baixo. O motor sugere o preset pela GPU e um teste de 2 s; celular começa
no Baixo (Médio em GPU forte).

**`sway` no bloco.** `sway: true` (força padrão), um número `0..1` (essa força) ou `false`/`0` (nunca). Sem declarar,
balançam as folhas (tag `c:leaves`, o bloco inteiro, de leve) e as plantas `shape: 'cross'` (presas na base). Bloco
não sólido dobra a partir da base; sólido mexe inteiro. É só visual e vale **por textura** (o shader acha o ladrilho
pela UV): dois blocos com o mesmo ladrilho balançam igual. O brilho do bloom segue `emissive` ou `light` ≥ 10.

```js
export default class Samambaia extends BlockType { key = 'samambaia'; shape = 'cross'; sway = 0.6; tiles = t('samambaia'); }
export default class Trepadeira extends BlockType { key = 'trepadeira'; solid = false; sway = true; /* ... */ }
export default class FolhaDura extends BlockType { key = 'folha_de_ferro'; tags = ['c:leaves']; sway = false; /* ... */ }
```

**`ctx.render.shadeMaterial(material, { mode })`** (entradas main/client): o material Three de um renderer de
bloco-entidade, de um modelo de mob ou de um passe recebe a MESMA luz do sol e a MESMA sombra do mundo — sem isso ele
fica chapado ao lado do terreno sombreado. Muda o material no lugar (chamar duas vezes não faz nada), devolve o mesmo
objeto e acompanha a troca de preset ao vivo; no Baixo, no servidor e sem WebGL2 não muda nada. `mode: 'lit'`
(Lambert/Phong/Standard: a sombra no termo direto — o sol da cena já ilumina e já segue o sol nos presets sombreados),
`'basic'` (MeshBasicMaterial: ambiente + sol pela face + sombra), `'auto'` (padrão) escolhe pelo tipo; ShaderMaterial
volta intacto. Um `onBeforeCompile` que o mod já tenha roda antes do nosso. Os materiais Lambert/Phong/Standard opacos
da cena (mobs, jogadores, NPCs) já recebem a sombra sozinhos e toda malha opaca fora do terreno projeta sombra
(`mesh.userData.noShadow = true` tira uma).

```js
ctx.render.blockEntity('relicario', {
  create(e) {
    const mat = ctx.render.shadeMaterial(new e.THREE.MeshLambertMaterial({ color: '#c9a227' }));
    e.group.add(new e.THREE.Mesh(new e.THREE.BoxGeometry(0.5, 0.5, 0.5), mat));
  },
});
```

**`ctx.render.graphics()` — o que está ligado agora.** Devolve um retrato **só de leitura** dos gráficos deste jogador,
para o seu mod decidir quanto desenhar sem perguntar nada ao jogador:

```js
ctx.render.graphics();
// { preset: 'alto', shading: true, shadows: true, water: true, sway: true, bloom: true, planetCurve: true }
```

- `preset`: `'baixo'`, `'medio'`, `'alto'` ou `'ultra'`.
- `shading`, `shadows`, `water`, `sway`, `bloom`: as chaves avulsas, já combinadas com o preset.
- **`planetCurve`: a curvatura do planeta** — o mundo se dobra para longe conforme a altitude, nos presets **Médio e
  acima**. Não é olho-de-peixe nem efeito de tela: a conta é feita **no vértice**, depois da projeção padrão do Three,
  então um ponto a `d` blocos da câmera (distância horizontal) é desenhado por volta de `d² / (2R)` blocos mais baixo —
  zero no pé da câmera (nada perto distorce) e crescendo com o quadrado da distância. O efeito entra aos poucos com a
  altura (nada embaixo, cheio lá no alto), e por isso o chão só vira bola quando o jogador sobe muito. Duas
  consequências para um mod: as malhas que você desenha com material do Three se curvam junto com o terreno, de graça;
  e **é só visual** — raycast, colisão, pôr e quebrar bloco e o servidor não veem curvatura nenhuma, e a sombra
  continua sendo calculada no mundo plano. O jogador liga e desliga em Opções → Gráficos ("Curvatura do planeta"); no
  Baixo o quadro é o de sempre. Leia `planetCurve` quando o seu desenho depender de onde o terreno distante **parece**
  estar.

**Luz, sombra e vento (v2).** Nos presets sombreados o sol pesa ~78% e o ambiente do céu ~22% ao meio-dia: um chão na
sombra fica em ~50% do brilho do mesmo chão ao sol. A divisão por face (topo 100, lados ~80/65, baixo 50) é a do
montador de malhas; a parede virada ao sol recebe o sol inteiro, a de costas só o ambiente; a luz do céu/AO fica um
pouco mais funda (interiores e debaixo da copa mais escuros). Pôr do sol: luz longa quente e sombra azulada; noite mais
escura com lua azul. Sombra com endurecimento de contato (nítida no pé do tronco, macia na ponta da copa); no Ultra o
terreno entra nas três cascatas. Alto/Ultra: a sombra das NUVENS passa pelo chão (a camada de céu que desenha o deck
chama `frame.cloudShadow({ texture, altitude, tile, wind, stretch, threshold, softness, opacity })` — outra camada de
nuvens faz o mesmo para ter sombra).

O **vento** é um campo de rajadas no mundo todo (a mesma função em JS e em GLSL): as rajadas andam a favor do vento,
então o campo ondula e as copas se inclinam uma depois da outra; folhas balançam inteiras (inclinação + onda + tremular
no Alto/Ultra), grama e flores dobram mais; quem anda no meio (você, outros jogadores, mobs — até 16 perto da câmera,
4 no Médio) abre o mato. Troncos não mexem. No Alto/Ultra a sombra da copa balança junto.

**Partículas do ar: `ctx.particles.ambient(path, desc)`** (entrada main). Folhas caindo das copas, poeira no sol,
vaga-lumes, esporos, neve, espuma, brasas: o mod diz QUAL partícula (uma registrada com `ctx.particles.register`), ONDE
nasce (`anchor`: `canopy` debaixo das folhas, `ground`, `air`, `water`, `blocks` + `blocks: [...]`) e QUANDO (`when`: as
mesmas condições das paisagens sonoras — bioma, hora, clima, cobertura, perto de...). O motor sonda algumas colunas por
quadro em volta da câmera, segura o teto do preset (Médio 120, Alto 360, Ultra 700; Baixo nenhuma, o quadro não muda),
move com as rajadas e desenha tudo em DOIS draw calls (as que brilham, `glow`, pegam bloom no Alto/Ultra). `rate` é a
densidade do Ultra; `gust` soma nascimentos numa rajada; `wind`, `flutter`, `blink`, `light: 'sun' | 'shade'`, `fromBlock`
(a folha cai na cor do bloco da copa). `ambient('outromod:x', null)` tira a de outro mod.

```js
ctx.particles.register('polen', { colors: ['#fff6c8'], size: 0.035, life: 5, gravity: -0.004, drag: 2, speed: 0.15 });
ctx.particles.ambient('polen_do_prado', { particle: 'polen', anchor: 'air', height: [-1, 4], light: 'sun', rate: 12, wind: 0.6,
  when: { biome: 'meumod:prado', time: 'day', weather: 'clear' } }); // a chuva desliga (weather: clear)
```
O jogo base registra `falling_leaves`, `sun_motes`, `fireflies`, `embers` e `sea_spray`; o mod de biomas, esporos no
Bosque de Cogumelos, neve na Taiga, luzes do Brejo e pétalas no Ipezal.

## 33. Runtime, escopos e tarefas (`ctx.runtime`, API 1)

Um mod registra `onStart`/`onStop`, cria escopos filhos, rastreia os recursos que criou e agenda `every`, `after` e
`onUpdate` no tique do servidor ou no quadro do navegador. Descartar um escopo cancela as tarefas dele e libera os
recursos registrados; erro e custo de cada tarefa saem identificados pelo mod. O jogo base usa esse mesmo contrato
para os indicadores de sobrevivência. Assinaturas, limites e garantias em [ctx.md](ctx.md).

## 34. Áudio extensível (`ctx.audio`, API 1)

Um mixer por mod, canais, sons 3D que seguem mobs, emissores fixos, reverberação por ambiente, oclusão, efeitos e
processamento Web Audio. As assinaturas e os limites estão em [ctx.md](ctx.md).

`bus.stream({ codec, frameMs, jitterMs, position, radius })` é o terceiro tipo de som: uma voz **ao vivo**, cujas
amostras chegam quadro a quadro por `push(bytes, { seq })` enquanto ela toca, com buffer de jitter e o mesmo áudio 3D
das outras vozes. Serve para voz de jogador, rádio e qualquer fonte que você produza em tempo real.

## 35. Salas e minigames: `ctx.rooms` (só servidor)

Um minigame é uma classe `MinigameType` registrada com `ctx.rooms.register('spleef', new Spleef())`. O `path` é a
chave da sala: vira o comando `/spleef`, o contador de vitórias e o `player.room`.

O motor de partidas cuida de fila, contagem, times, mapa reservado, inventário guardado e devolvido, espectador,
bot de treino, vitória e revanche. O mod descreve **campos** (`name`, `icon`, `min`, `max`, `teams`, `duration`,
`pvp`, `pushFactor`, `spectate`, `bots`, `area`...) e **ganchos** (`buildArena`, `spawnPoint`, `giveKit`,
`fallLevel`, `onStart`, `onTick`, `tiebreak`, `scoreboard`, `botAction`...). Todo gancho recebe `e.room`, com
`players`, `teams`, `world` (limitado à arena), `data`, `timer`, `score`, `eliminate`, `win`, `setPhase` e
companhia. A seção 37 cobre o resto dessa API, e os tipos completos estão no `types/mineclaude-mod.d.ts` que vem
na pasta do mod.

`player.setItem(slot, item, n)` põe uma pilha num slot (a armadura fica em 200..203).

```js
import { MinigameType } from './mineclaude-sdk.js';

class Spleef extends MinigameType {
  name = 'Spleef'; icon = 'shovel'; min = 2; max = 8; duration = 180; pvp = false;
  giveKit(e) { e.player.give('mineclaude:shovel', 1); }
  onStart(e) { e.room.broadcast('Cave o chão de quem está do lado.'); }
}
ctx.rooms.register('spleef', new Spleef());
```

### 35.1 Alcançar a sala de outro mod: `modify`, `wrap`, `disable`

`ctx.rooms.register` recusa o segundo registro do mesmo nome, então as salas do jogo (e as de qualquer mod)
seriam intocáveis. Os três métodos abaixo as alcançam. O alvo é o `path` da sala (`"spleef"`, ou
`"mineclaude:spleef"` com o mod).

Tudo entra numa fila durante o `register` e roda depois que **todos** os mods registraram, antes de o motor
montar as salas: a ordem é por `{ priority }` (padrão 0, menor primeiro), empate pela ordem de carga e de
chamada; o último aplicado vence, dois mods no mesmo campo deixam um aviso, e cada mudança fica no registro de
mudanças (`trail()`, com `kind: 'room'`).

```js
ctx.rooms.modify('spleef', { max: 5, countdown: 20, name: 'Spleef Plus' });          // patch
ctx.rooms.modify('spleef', (d, info) => { d.duration = d.duration * 2; });           // função: (rascunho, { name, mod, kind })
ctx.rooms.wrap('spleef', { onStart(e, previous) { e.room.broadcast('vai!'); return previous(e); } });
ctx.rooms.disable('tntrun');                                                         // some da lista, do painel e dos comandos
```

- **`modify`**: o resultado volta pelo **mesmo validador do `register`** (`min > max`, `area` sem a construção de
  área fixa... recusam com a mensagem de sempre).
  Campos livres numa sala com fila: `name`, `description`, `icon`, `article`, `min`, `max`, `teams`, `teamDefs`,
  `startTeam`, `minAfter`, `order`, `countdown`, `duration`, `pushFactor`, `respawnSeconds`, `botFillSeconds`,
  `tickMs`, `pvp`, `spectate`, `bots`, `editable`, `creative`, `protectBuilt`, `noTrainingFloor`, `coop`,
  `protectBlocks` e `area`.
  Numa sala sem fila: `name`, `description`, `icon`, `order`, `boardOrder`, `tickMs`, `challenge`,
  `panelChallenge`, `bots`, `stats`, `pvp`, `box`, `areas` e `sign`.
  **Barrados, com o motivo na mensagem:** `command`, `help` e `commands` (o comando de chat já foi registrado com
  a sala: use `ctx.commands.modify`/`wrap`), `shop` (a loja nasce com a sala), `solo` (o tipo não muda) e, numa
  sala sem fila, `records`, `boards` e `tops` (os recordes estão salvos nas contas). Um gancho não é campo (para
  isso existe `ctx.rooms.wrap`), e campo privado da classe da sala (constante, método auxiliar) não é alcançável.
- **`wrap(name, { gancho: (e, previous) => ... })`**: alcança qualquer um dos ganchos da sala — numa sala com
  fila, `buildArena`, `giveKit`, `onStart`, `onTick`, `onPlayerDeath`, `canBreak` e os outros; numa sala sem
  fila, os dela. `previous(e?)` roda o gancho de baixo (o da sala, ou o embrulho anterior; sem argumento reusa o
  `e`). **Não** chamar `previous` troca o gancho. Um gancho que a sala não tinha nasce com `previous` devolvendo
  `undefined`, e o motor passa a rodá-lo. O gancho continua a rodar com o diagnóstico do mod dono da sala.
- **`disable(name)`**: a sala sai da lista de jogos (a fila, o cartão do painel do lobby, a lista da ajuda) e o
  comando de entrada e os comandos próprios dela somem (um comando compartilhado, como o de compra, fica). O nome
  continua ocupado: nenhum mod registra outra sala com ele.
- **Sandbox:** `modify` com patch JSON e `disable` estão liberados; `wrap` (função) segue fechado, com o motivo.
  `register` e `of` continuam fechados.

## 36. Telas com slots: `ctx.screens` (`ScreenHandlerType`, `Slot`)

O modelo é o do Fabric: um `ScreenHandlerType` registrado **nos dois lados**; o **servidor** é dono dos slots, valida cada clique e
sincroniza; o **navegador** só desenha. Toda a lógica de clique (pegar, soltar, dividir, shift, 1-9, largar) é do motor e vale igual
para qualquer tela. As telas do próprio jogo (inventário, baú, bancada) são classes do mod base, escritas por estas mesmas APIs.

```js
import { ModInitializer, ScreenHandlerType, Slot } from './mineclaude-sdk.js';

class SoMadeira extends Slot { canInsert(stack) { return stack.item === 'mineclaude:planks'; } }   // regra = método, como no Fabric
class Moedor extends ScreenHandlerType {
  title = 'Moedor';
  slots = [new SoMadeira('block', 0, 44, 20), Slot.block(1, 116, 20, { outputOnly: true })];  // 'block': o inventário do bloco aberto
  properties = ['progresso', 'total'];                       // inteiros calculados no servidor (o PropertyDelegate)
  bars = [{ label: 'Moendo', value: 'progresso', max: 'total' }];
  readProperties({ world, pos }) { const d = world.getBlockData(pos); return { progresso: d.progress, total: 40 }; }
  quickMove(e) { e.insert(e.index < 0 ? [0] : 'player'); }  // shift-clique (sem o gancho o motor move entre a tela e a mochila)
  onSlotChange(e) {}  onOpen(e) {}  onClose(e) {}  onButton(e) {}  canOpen(e) { return true; }
}
export default class M extends ModInitializer {
  onInitialize(ctx) {
    ctx.screens.register('moedor', new Moedor());           // seumod:moedor, nos dois lados
    ctx.blocks.register('moedor', { name: 'Moedor', tiles: { all: 'stone' }, inventory: { slots: 2, screen: 'seumod:moedor' } });
  }
}
```

**Campos** de `ScreenHandlerType`: `title`; `slots` (lista de `Slot`, ou função `({ size, data, player }) => Slot[]`, `size` = tamanho do inventário
do bloco/item); `playerInventory` (padrão `true`: os 36 slots do jogador sob o painel); `temp` (tamanho do inventário temporário); `properties`
(até 8 nomes) com `readProperties(e)` (o servidor lê a cada tick e só reenvia o que mudou); `bars` (até 4, sobre as propriedades); `buttons`
(ids 0..n-1 que `onButton` aceita, até 16); `crafting: { size: 2|3, station?, block?, x?, y? }`; `data` (JSON até 512 bytes que a tela do navegador recebe).
**Ganchos** (servidor, síncronos): `readProperties`, `quickMove`, `canOpen` (só abre com `true`), `onOpen`, `onClose`, `onSlotChange({ index, stack })`,
`onButton({ id })`. Todo evento traz `player`, `world`, `server`, `screen`, `pos`, `item`, `slot`, `data`.

**`Slot`**: `new Slot(source, index, x, y, { maxCount, outputOnly, label })` ou `Slot.block/item/temp/player/armor/offhand(...)`. `source` diz onde a pilha mora:
`'block'` (inventário do bloco aberto: nativo ou `inventory` de mod), `'item'` (o conteúdo guardado num item), `'temp'` (inventário temporário desta abertura: **o que
sobra volta ao jogador ao fechar**, ao sair, ou antes do drop da morte; o que não couber cai aos pés), e, só para posicionar, `'player'`/`'armor'`/`'offhand'`.
`x`, `y` em pixels da GUI a partir do canto do painel. Regras: sobrescreva `canInsert(stack, player)` / `canTake(player)` numa subclasse; `maxCount` (1..64: pilha maior não
entra) e `outputOnly` (nada entra pelo clique; só o mod, por `getItemStorage`, coloca). O motor aplica as regras em troca, divisão e shift-clique, e o filtro `accepts` do bloco continua valendo.
Uma regra que lança recusa o movimento (e vai para o log), nunca derruba o servidor.

**Abrir:** `player.openScreen('seumod:moedor', { pos })` (o bloco; precisa estar ao alcance e ter inventário), `{ item: true | slot }` (o conteúdo guardado no item, o da mão por
padrão), `{ data, title }`; sem `pos` nem `item` a tela só tem `temp`/`data` (uma bancada de comando, por exemplo). Devolve `true` quando abriu; uma tela aberta é trocada;
`player.closeScreen()` fecha; `player.openScreenType` diz qual. Um bloco com `inventory.screen: 'seumod:moedor'` abre essa tela no clique direito (`true` continua sendo a tela de baú do jogo).

**Segurança.** O servidor valida tudo: id do slot (`100..199` são os 100 primeiros da tela aberta e `1100..2023` os seguintes, `screenWire(k)` / `frame.data.screenWire(k)`; `0..35` a mochila; `200..204` equipamento; uma tela tem até 1024 slots e um inventário de bloco/item/temp até 1024, e a tela padrão rola quando não cabe na janela), contagem, alcance do bloco, se a tela ainda está
aberta de fato e o id do botão. Uma tela fecha sozinha quando o bloco some ou fica longe, o jogador morre, sai, troca de dimensão/sala, ou o item sai do slot onde foi aberto.
Cada clique é uma troca entre arrays que o servidor guarda: não há pilha "no cursor" no servidor, então fechar, sair ou morrer com o mouse segurando algo não perde nem duplica nada.

**Navegador.** `ctx.screens.client('moedor', MinhaTela)` liga uma classe (ou instância) com `draw(ctx, frame)`, `onPointer(e)`, `onKey(e)` ao tipo; ela recebe os mesmos dados da tela
de inventário do jogo em `frame.data` (`stack(idx)`, `held()`, `actions.click/right/hotbar/drop/close/button`, `screenView()` com `lay`, `bars`...; `screenData()` é o `data` que o servidor passou ao abrir, `screenPos()` o bloco `{ x, y, z }` ou `null`, e `itemKey(id)` / `itemId(nome)` convertem o id numérico do desenho no nome que o servidor usa e de volta) e desenha com o skin/tema (`frame.ui`). O exemplo `logisticspipes` desenha slots fantasma e se configura por `ctx.net`.
**Sem Screen de cliente**, o motor desenha uma tela padrão: os slots onde `slots` os pôs, as barras, a grade de crafting, os botões (`data.buttons = ['Moer', ...]` dá os rótulos) e a mochila
do jogador. Um mod só de servidor, portanto, já funciona. No `?domui` (HTML) os slots da tela aparecem como uma grade de baú com as barras (sem posições nem botões). No celular isso vale só para as telas do jogo e as de mod SEM classe de cliente: uma tela com `ctx.screens.client` abre na camada de GUI também no toque, com as posições e os botões do mod e áreas de toque maiores.

**Estações de crafting são abertas.** Uma tela com `crafting: { size: 3 }` é uma estação: as receitas a citam em `station` (`'seumod:bancada'`, o padrão é o nome da tela; `crafting.station`
dá outro, do seu mod). Ela vale quando está aberta; com `crafting.block` o bloco também a oferece a até 4 blocos de distância (como a bancada do jogo faz com `'crafting_table'`).
`ctx.screens.station('seumod:forno', { block })` registra uma estação sem grade (a fornalha do jogo é uma). Receita com estação desconhecida falha no boot.

### 36.1 Mexer na tela de OUTRO mod: `ctx.screens.modify` e `ctx.screens.wrap`

`ctx.screens.register` recusa o segundo registro do mesmo nome, então a tela do baú, da mesa de criação (e a de qualquer mod) era intocável. Como nos outros registros
que aceitam `modify`, o mod declara a mudança na `main` e o loader a aplica depois que todos registraram, por `priority`, com o nome completo da tela:

```js
// um slot de acessório no baú do jogo
ctx.screens.modify('mineclaude:chest', { extraSlots: [{ x: 180, y: 14, label: 'Acessório', maxCount: 1, accepts: ['mineclaude:apple', 'mineclaude:stone'] }], data: { acessorio: 1 } });
ctx.screens.modify('mineclaude:chest', (d, info) => { d.extraSlots.push({ x: 180, y: 32 }); });     // função: recebe uma cópia
// uma regra sobre TODOS os slots da tela; `previous(e?)` roda a de baixo (sem outra, devolve true)
ctx.screens.wrap('mineclaude:chest', { canInsert(e, previous) { return e.stack.item !== 'mineclaude:dirt' && previous(e); } });
```

- **Livres (`modify`):** `title`, `playerInventory`, `temp`, `buttons` (exige um `onButton`), `data` e `extraSlots`. O resultado passa pela mesma conferência de tipo do `register`.
- **`extraSlots`** (até 16, em JSON: `{ x, y, maxCount?, outputOnly?, label?, accepts? }`): cada um é um slot do inventário **temporário** da tela, depois do `temp` dela e **no fim do layout**; então
  nenhum id `100..` dos slots da própria tela se move, e o que está num slot extra volta para o jogador ao fechar (o inventário salvo do bloco ou do item não é tocado: `source`/`index` são recusados com o motivo).
  `accepts` filtra por nome de item; regra além disso é um `wrap` de `canInsert`. O baú do jogo desenha o slot extra em `x, y` (marcado `f: 1` no layout; painel de 198 de largura, grade até x=180); no `?domui`/celular ele cai na grade.
- **Barrados, com o motivo:** `slots`, `properties`, `bars`, `crafting` (são do handler dono: regras em função, o nome que as receitas citam), `name`, `mod` e o tamanho do inventário do bloco (salvo no mundo; é do bloco).
- **`wrap`:** `canInsert(e)` e `canTake(e)` (ganchos novos da tela: a regra de todos os slots, depois da do próprio slot; `e.index` é o slot em `slots`, `e.stack` o item; só `true` deixa passar), `onOpen`, `onClose`,
  `onSlotChange`, `onButton`, `quickMove`, `canOpen`, `readProperties`. Embrulhos se encadeiam; não chamar `previous` troca o gancho.
- **Sandbox:** `modify` com JSON passa (é dado); `wrap`, `register`, `client` e `station` não (função / navegador).

**Item com inventário** (a mochila): `ctx.items.register('mochila', { name, icon, inventory: { size: 9, screen: 'seumod:mochila_tela' } })`. Clique direito abre (a menos que
você declare `onUse`). O item não empilha e cada pilha leva o conteúdo dela nos componentes (`engine:contents`, até 4 KB no total da pilha), então vai junto quando é largada, guardada,
salva e recarregada. Uma mochila não entra em si mesma nem em outra do mesmo item; dentro de outra só entra uma vazia (um nível). O exemplo `mochila` traz tudo junto: a mochila, uma
bancada própria com receita só dela e o moedor com barra de progresso.

### 36.2 Telas de controle: o painel de uma máquina (`controls`)

Uma `ScreenHandlerType` com `controls` é uma **tela de controle**: um clique direito abre o painel da máquina, com interruptores,
slots, seletores, controles deslizantes, leituras e gráficos. O motor a desenha com o kit de pixels do jogo (o tema e o skin
registrados), no computador e no celular, **sem classe de navegador**; então um mod só de servidor já tem o painel pronto.

```js
import { ScreenHandlerType, Slot } from './mineclaude-sdk.js';

class SoCarvao extends Slot { canInsert(stack) { return stack.item === 'mineclaude:coal'; } }
class PainelForno extends ScreenHandlerType {
  title = 'Forno de Mod';
  blocks = ['seumod:forno'];                                   // abre neste bloco (mesmo sem inventário) e fica aberta enquanto ele estiver lá
  controlsHint = 'Dica: agachado + clique liga e desliga sem abrir o painel.';   // aparece nas 3 primeiras aberturas
  slots = [new SoCarvao('block', 0, 0, 0)];                    // o slot real; o campo `slot` diz onde ele aparece
  controls = [
    { id: 'on', kind: 'switch', label: 'Forno', on: 'LIGADO', off: 'DESLIGADO' },
    { id: 'fuel', kind: 'slot', slot: 0, label: 'Combustível' },
    { id: 'modo', kind: 'selector', label: 'Modo', options: [{ value: 'eco', label: 'Econômico' }, { value: 'turbo', label: 'Turbo', color: '#e04040' }] },
    { id: 'alvo', kind: 'slider', label: 'Temperatura', min: 100, max: 900, step: 50, unit: '°C', presets: [200, 500, 800] },
    { id: 'temp', kind: 'readout', style: 'dial', label: 'Agora', min: 0, max: 1000, danger: 800, unit: '°C', decimals: 0 },
    { id: 'hist', kind: 'graph', label: 'Último minuto', series: [{ label: 'Temp.', color: '#e8762f', min: 0, max: 1000, unit: '°C' }] },
    { id: 'limpar', kind: 'button', label: 'Limpar cinzas' },
  ];
  readControls({ world, pos }) {                                // duas vezes por segundo enquanto está aberta
    const d = world.getBlockData(pos);
    return { on: d.on, fuel: { ratio: d.queima / 160, text: `${d.queima} s` }, modo: d.modo, alvo: d.alvo,
      temp: d.temp, hist: [d.historico] };
  }
  onControl({ world, pos, id, value }) {                        // `value` já conferido contra o campo
    if (id === 'limpar') return void world.setBlockData(pos, { cinzas: 0 });
    world.setBlockData(pos, { [id]: value });
  }
}
// ctx.screens.register('painel_forno', new PainelForno());    // nos dois lados (o navegador precisa do tipo para desenhar)
// no onInteract do bloco: if (!e.sneaking) { e.player.openScreen('seumod:painel_forno', { pos: e.pos }); return 'success'; }
```

**Os campos** (`controls`: uma lista, ou um método `controls(e)` que a devolve ao abrir; até 24; `id` único, `label`, `hint` opcional
com até 4 linhas de dica):

| `kind` | O que é | O valor em `readControls` | Muda? |
|---|---|---|---|
| `switch` | liga/desliga (`on`, `off`: os rótulos) | `true` / `false` | sim: `value` é booleano |
| `button` | uma ação ("Testar") | (nada) | sim: `value` é `true` |
| `selector` | uma das `options` `[{ value, label, color? }]` (até 48; a cor vira uma amostra) | o `value` escolhido | sim: só uma das opções |
| `slider` | um número de `min` a `max` por `step`, com `unit`, `decimals` e até 6 `presets` (botões prontos) | o número | sim: o servidor arredonda ao passo e prende na faixa |
| `slot` | um dos slots da própria tela (`slot`: o índice em `slots`), com uma barra ao lado | `{ ratio?, text? }` | não (os cliques no slot são os do motor) |
| `readout` | uma leitura; `style`: `text` (texto, número ou `{ text, color }`), `bar` (`{ ratio, text?, color? }`), `mix` (`[[nome, fração, cor], ...]`, até 8), `dial` (um número ou `{ value, text }` num mostrador de `min` a `max`, vermelho depois de `danger`) | conforme o estilo | não |
| `graph` | um histórico: `series` `[{ label, color, min, max, unit? }]` (até 3) | `number[][]`, até 180 pontos por série, o mais novo no fim | não |

Um campo que muda aceita também `{ value, disabled?, note? }`: `disabled` o deixa cinza (e o servidor recusa mudança nele) e `note`
escreve uma linha embaixo (o aviso "acima de 1,6 o vidro pode estourar").

**Os ganchos** (servidor): `readControls(e)` é **obrigatório** com `controls` (o motor lê a cada meio segundo e manda só o que mudou;
o que não cabe em 8 KB é recusado e a leitura para até reabrir) e `onControl(e)` (com `e.id` e `e.value`) é obrigatório quando há
um campo que muda. `blocks` (nomes completos) deixa a tela abrir num bloco **sem inventário** e ficar aberta enquanto o bloco ali for um
deles (a válvula que troca entre o bloco aberto e o fechado); sem `blocks`, a tela num bloco sem inventário fica aberta enquanto o
bloco for o mesmo. `controlsHint` é a dica das primeiras aberturas (o navegador conta, por tipo de tela, no `localStorage`).

**Segurança.** Toda mudança chega como a mensagem `screenControl { id, value }` e o servidor confere: a tela está aberta de fato,
o bloco está ao alcance (longe, a tela fecha), o campo existe e muda, não está `disabled`, e o valor tem a forma do campo
(número arredondado ao passo e preso à faixa, opção que existe, booleano). Só então `onControl` roda. Um jogador nunca mexe na tela de outro.

**O clique agachado.** A interação leva `sneak: true` quando o clique veio agachado (Shift no teclado, o botão de descer no toque), e os
ganchos `onInteract`/`onUse` recebem `e.sneaking`. Ele é o par natural do painel: o clique comum abre a tela, e o clique agachado guarda
a ação rápida — ligar e desligar, virar a válvula — sem abrir nada.

**No navegador.** O motor desenha a tela: os campos numa coluna, a mochila embaixo (ou ao lado, numa janela larga e baixa como um
celular deitado), e a coluna rola (roda do mouse, ou as setas no toque) quando não cabe. No celular a tela de controle abre na camada
de GUI, como a tela de um mod com classe própria. No `?domui` (HTML) só os slots aparecem.
Uma classe de navegador (`ctx.screens.client`) continua podendo desenhar tudo do seu jeito: `frame.data.controls()` devolve
`{ fields, state, hint, screen }` e `frame.data.actions.control(id, value)` manda a mudança.

As máquinas de gás do jogo base usam painéis assim (seção 46).

## 37. Mais API de sala: avisos, times, mobs, loja e dano

Continuação das salas (seção 35): o resto da API que uma partida usa, em grupos.

### 37.1 Participantes, avisos grandes, blocos protegidos e loot de baú

- **`room.participants`**: todos que largaram, na ordem da largada (o `index` do `spawnPoint`), mesmo os que já saíram. **`room.countdown`**: a contagem da fila, em segundos.
- **`room.announce(texto)`**: linha para o lobby inteiro (o "X venceu..." que todo modo diz); `room.broadcast` é só para quem está na partida.
- **Aviso grande e votação (campos estruturados do chat)**: `room.announce`, `room.broadcast`, `player.message` e o `announce` das salas solo aceitam um último parâmetro `{ title?, vote? }` (tipo `ChatExtras`). `title: { big, small? }` mostra o aviso grande no meio da tela (a contagem "3", o tema, o vencedor) e `vote: { owner, secs }` abre a barra de notas da votação da construção de `owner`. `big` e `small` são texto literal ou traduzível (`ctx.lang.text`) e chegam ao navegador **já no idioma de cada leitor**, como o próprio texto da linha (a mensagem `chat` leva os campos `title` e `vote`). `vote: false` desliga a barra (o dono da construção não vota nela). **Sem o campo não há aviso grande**: o navegador não casa frase em português, o aviso grande vem só do campo `title`; declare-o. A largada tem o seu: o `startMessage` da sala pode devolver `{ text, title: { big, small } }` (o texto do chat mais o aviso grande, ex. `big: 'SPLEEF!'`); devolvendo só texto, a largada fica só no chat, e a sala sem `startMessage` começa com o nome em maiúsculas, que vira o aviso. Ex.: `room.announce(t('msg.round', { n }), { title: { big: String(n), small: t('msg.round_small') } })`.
- **`room.lock(x, y, z)` / `room.unlock(...)`**: bloco protegido (ninguém quebra, nem numa sala `editable`), como a jaula das Ilhas do Céu até abrir. Baús montados em `buildArena` já nascem protegidos. Campo `protectBuilt = true` protege tudo o que `buildArena` monta (os lotes da Batalha de Construção).
- **Loot de baú**: `chestLoot(e)` (gancho; `e.pos`) devolve o loot de cada baú montado em `buildArena`, e `room.fillChest(pos, loot)` enche um baú depois (as Ilhas enchem os das ilhotas quando a jaula abre; quem está com ele aberto vê na hora). `loot` é o nome de uma tabela registrada (`ctx.loot`, `'mod:nome'`, espalhada em espaços livres) ou uma lista `[[item, min, max, peso], ...]` (4 a 7 pilhas em espaços sorteados: a mesma conta dos baús do jogo).
- **`creative = true`**: a sala joga em modo criativo e com voo; o motor desliga na saída. `fallLevel` pode devolver `-Infinity` (ninguém cai).
- **`article`** aceita também `'os'` e `'as'` ("fila das Ilhas do Céu"). **`botFillSeconds`**: espera sozinho na fila até o bot de treino entrar. **`respawnSeconds`** vai de 0,1 a 60.
- **`ctx.rooms.of(player)`**: a sala da partida em que o jogador está, entre os jogos do próprio mod (`null` fora de partida).
- **`commands`** (campo do jogo): `{ nota: { help, run(e) } }` com `e.player`, `e.args`, `e.reply` e `e.room` (a partida do jogador). Valem no lobby e nas partidas e o `/ajuda` os lista junto do comando de entrar (a Batalha de Construção tem o `/nota`).

### 37.2 Passo curto, bot de treino, trégua de PvP e dano próprio

- **`onFastTick(e)` + `tickMs`** (50 a 250, padrão 50): um passo mais curto que o de ~0,25 s do motor, para cada partida em andamento (o TNT Run
  marca e apaga o chão pisado nele). Erros no gancho são tratados como nos outros (log com o id do mod, desiste depois de 5 seguidos).
- **`botFoes(e)`**: com quem o bot de treino se importa neste passo. Devolva a lista de alvos (vazia: não anda até ninguém e não bate) ou nada
  (o padrão, `e.foes`). `e.setGoal({ x, z } | null)`, `e.getGoal()` e `e.atHole()` mandam o bot para um ponto (fugir de quem tem a batata,
  ficar dentro da borda).
- **`canPvp(e)`** (`e.victim`, `e.attacker`): `false` = o golpe, a flecha e a explosão não ferem a vítima agora (a trégua da Arena da Sobrevivência).
- **`protectBlocks`**: lista de nomes de bloco do que `buildArena` monta que são o esqueleto do mapa (o resto quebra, com `editable`).
- **`noTrainingFloor`**: o bot de treino eliminado sai de vez, sem a volta do piso de duração do treino.
- **`room.flash(player)`**: o piscar de golpe (sem dano) para quem está perto.
- Dano próprio da sala: registre um tipo (`ctx.damage.type('borda', { name: 'Borda' })`) e use `player.damage(1, 'meumod:borda')`.
- A ordem do jogo no painel vem só do campo `order` (menor primeiro).

### 37.3 Times com nome e cor, troca de time e espera de renascimento

- **`teamDefs`** (`[{ name, color: '#rrggbb' }, ...]`, um por time) dá nome e cor aos times do jogo no lugar dos quatro do motor; a cor é a que todo
  cliente da partida pinta no jogador. **`startTeam`** (índice): todos largam nesse time em vez de divididos; os outros começam vazios.
- **`room.setTeam(player, team)`** troca o jogador de time no meio da partida (a cor nova vai para todos); **`room.teamOf(player)`** diz o índice
  do time dele. O kit não muda sozinho: **`room.giveKit(player)`** roda de novo o `giveKit` do jogo agora (e o `giveKit` recebe `e.team`).
- **`room.waiting`**: quem espera para renascer (`canRespawn`), com `at` (quando caiu) e `until` (quando volta).
- **`holdEnd(e)`**: `true` segura o fim "sobrou um time de pé" (em A Praga, antes do sorteio, todos são um time só).
- **`botFoes`** recebe `e.reach` (o alcance do golpe do bot).
- **`commands.<nome>.admin`**: o comando de um jogo só para administradores.
- **`tiebreak` com `{ team: índice }`**: o desempate pode apontar um time, não só um jogador.

### 37.4 Mobs da partida e leitura do mundo da sala

- **`room.spawnMob(type, pos, { pen })`**: um mob da partida (`'zombie'` ou `'mod:chave'`) em `pos`, dentro da caixa da sala. `pen: true` o prende à caixa da
  sala (ele nunca some por distância nem queima de dia). O motor tira todo mob da área quando a partida acaba. Devolve o `MobInfo` (ou `null`).
- **`room.world.info(x, y, z)`**: o que o motor sabe da célula (`name`, `air`, `solid`, `liquid`, `unbreakable`, `container`, `top`, `blastResistance`), para
  planejar em volta dela (uma explosão que poupa o esqueleto e os baús, uma jaula sobre laje); `null` fora da caixa.
- **`room.isLocked(x, y, z)`**: o bloco está protegido (`lock`, `protectBlocks`/`protectBuilt`, baús montados)?
- **`onBlockBreak` devolvendo `true`** quer dizer "esta quebra é minha, já resolvi": o motor para aí — sem drop, sem levar o que estava em cima do
  bloco e sem gastar a ferramenta. É o que o Bloco da Sorte (`mineclaude:lucky_block`) faz: ele não dá nada sozinho, e quem o abre é o jogo da
  partida (Blocos da Sorte). Sem retorno, o motor segue como sempre (o gancho é só um aviso).

### 37.5 Cooperativo e a API de mob da sala

- **`coop = true`**: todos no mesmo time contra o servidor (`teams = 1`); a partida só acaba por `room.win(...)`, `room.defeat()` ou com ninguém de pé.
  **`room.defeat()`** é o fim cooperativo perdido: sem vencedor, mas conta derrota no `/stats` e no log.
- **`room.spawnMob(type, pos, opts)`** aceita `opts.goal` (`{ x, y, z, near? }`: sem jogador a até `near` blocos o mob anda até lá, como o Cristal da
  Defesa do Cristal), `speed` (fator da velocidade), `damage` (do toque), `noPath`, `noJump`, `noKnockback` e `immortal`. **`room.mobs`** lista os mobs vivos da sala (MobInfo novo a
  cada leitura, com a posição e a vida de agora). O motor tira todos os mobs da sala quando a partida acaba.
- **`onMobHit(e)`** (`e.mob`, `e.attacker`) e **`onMobDeath(e)`** (`e.mob`, `e.killer`): ganchos de sala para os mobs criados por `spawnMob`. O golpe chega ao
  `onMobHit` mesmo com `noKnockback`; `mob.remove()` não dispara `onMobDeath`.
- **`MobInfo`** (só servidor) traz o que um jogo precisa para guiar o próprio mob: `setGoal(goal | null, near?)` e `walkingToGoal`, `setSpeed(fator)`,
  `setTouchDamage(n)`, `setFlags({ noKnockback, noPath, noJump, immortal })` (`immortal`: a vida nunca acaba, o golpe é sentido), `setPosition(x, y, z)` (sem a
  conferência de chão do `teleport`), `holdAttack(segundos)`, `canSee(jogador)` e `remove('die'?)`.
- O Cristal (bloco com vida) é conteúdo do jogo `defesa` (`room.data`, `protectBlocks`, `room.world`); o vulto da Noite do Vulto (olhar, tochas, aparições) é conteúdo do jogo `vulto`.

### 37.6 Bandeira nas costas e ajudantes do bot de objetivo

- **`player.backFlag` / `player.setBackFlag(time | null)`**: o que o jogador carrega nas costas para todos verem, como o número de um time (0 a 15) ou `null`.
  O servidor só guarda o número e avisa os outros (a mesma mensagem `gear` de sempre); a forma e as cores são do mod, no cliente:
  `ctx.render.playerAttachments({ flag: { teams, build } })` (o jogo `bandeira` registra a dele no entrypoint de cliente, `entrypoints.client`).
- **`botAction`** do bot de treino tem os ajudantes dos modos com objetivo: `e.setGoal({ x, z } | null)`, `e.route(x)` (o caminho pela linha do meio da
  área até esse x), `e.bridge()` (põe uma lã do kit onde falta chão) e `e.breakNear({ x, y, z })` (quebra o bloco-alvo se estiver ao alcance, pelas mesmas regras
  do jogador: `canBreak` do jogo incluído).
- `canBreak` pode devolver `false` depois de tratar o bloco (a bandeira sai do pedestal e o bloco não vira item), e `room.win({ team })` já premia o time inteiro.
- O `giveKit` de um jogo manda **uma** mensagem `inv` no fim (os `player.setItem` dentro dele não mandam uma por espaço).

### 37.7 A loja da partida, o dano da sala e os itens no chão

- **`shop`** (campo do jogo, `RoomShopDef`): a loja da partida. O jogo só declara a tabela; o motor registra o comando, manda a tabela ao navegador
  (o botão da loja, a tecla da ação `shop` e o painel já existem no jogo base: **o mod não precisa de cliente**), cobra o preço, entrega os itens (sem o preço ou
  sem espaço nada muda) e guarda o nível das melhorias de cada time até o fim da partida.

  ```js
  shop = {
    command: 'trocar',                       // padrão: 'comprar'; jogos podem dividir o mesmo nome (o motor manda a compra ao jogo em que a pessoa está)
    title: 'Barraca da Feira', hint: 'Pague com as barras de ouro do kit.',
    offers: [{ key: 'maca', name: 'Maçã ×2', price: ['gold_ingot', 2], give: [['apple', 2]] }],
    upgrades: [{ key: 'couraca', name: 'Couraça do time', icon: 'iron_chestplate', prices: [['gold_ingot', 3]], desc: '−1 no próximo golpe', max: 'O seu time já está de couraça.' }],
  };
  ```

  `offers`: `key` (o que se digita depois do comando), `name`, `price: [item, n]`, `give: [[item, n], ...]` e `icon` opcional (padrão: o primeiro item de
  `give`). `upgrades` são níveis do **time** de quem compra (pedem `teams`): `prices[n]` é o preço do nível n+1, `desc` vai no aviso e no painel e `max` é o
  que o comando diz no último nível. Limites: 32 ofertas, 16 melhorias, 8 níveis; as chaves são únicas entre ofertas e melhorias. Os outros textos do
  comando (preço que falta, inventário cheio, "Use: /cmd <item>. Loja: ...") são do motor.
- Ganchos da loja: **`shopGive(e)`** (`e.player`, `e.team`, `e.offer`, `e.give`) devolve o que a oferta entrega a **este** jogador no lugar do `give` da tabela
  (a lã do time de quem compra); **`onShopUpgrade(e)`** (`e.team`, `e.key`, `e.level`) roda quando o time sobe de nível, já pago: é ali que a melhoria passa a valer.
- **`room.shop`** (`null` num jogo sem loja): `level(team, key)`, `levels(team)`, `setLevel(team, key, n)` (manda a loja de novo a quem do time está de pé: uma
  melhoria que se gasta volta a 0 e pode ser comprada outra vez) e `priceText(key, level?)` (o preço como a loja o diz: `2× Diamante`).
- **`modifyDamage(e)`**: o dano que um jogador da partida vai levar (`e.player`, `e.amount`, `e.cause`: `'pvp'`, `'arrow'`, `'explosion'`...; `e.attacker`;
  `e.held`: `{ item, tool }` do que o agressor tem na mão). Devolva o novo valor (nada = não muda). Roda antes da armadura e do `allowDamage` dos mods.
- **`room.dropItem(pos, item, n)`**: um item no chão da arena, parado e já pegável (um gerador, um prêmio); **`room.dropsNear(pos, raio, item?)`** conta os que
  estão em volta (o teto de um gerador). O motor tira todo item da arena quando a partida acaba.
- **`RoomTeam.members`**: todos do time, também quem já foi eliminado (`players` é só quem está de pé); `room.win(team.members)` premia o time inteiro num
  fim decidido pelo jogo. **`e.teamIndex`** no `spawnPoint`: o lugar do jogador dentro do time, que não muda quando um colega sai.
- **`player.canReach({ x, y, z })`**: o bloco está ao alcance do jogador? (a mesma conta que o servidor faz antes de aceitar a quebra).
- **`debugState(e)`**: uma linha com o estado da partida para o comando de teste do servidor.
- Exemplos: o jogo `ovo` (Guardiões do Ovo) traz a loja completa, com 7 ofertas, 4 melhorias, geradores e armadilha; o exemplo `feira` traz o mínimo, uma
  oferta e uma melhoria que se gasta.

## 38. Trocas do mercador: `ctx.trades` (`TradeSetType`)

Um **conjunto de trocas** é a lista de ofertas de UMA zona:

```js
import { TradeSetType } from './mineclaude-sdk.js';

class ErmosTrades extends TradeSetType {
  zone = 'ermos';            // a zona onde ficam os mercadores dele (a chave, ou o nome completo de uma zona de mod)
  perCamp = 4;               // quantas delas um mercador mostra (sorteadas pela casa dele)
  offers = [                 // cada oferta: o jogador dá `give` e recebe `get`
    { give: ['mineclaude:wheat', 6], get: ['mineclaude:arrow', 4] },
  ];
}
ctx.trades.register('ermos', new ErmosTrades());
```

Os itens são citados por **nome**, como numa receita, então um conjunto cabe na fase de bootstrap (é lá que o jogo
base registra os três dele). O motor fica com o mecanismo: a mensagem `trade` e o `idx` dela, o alcance até o
mercador, a troca atômica e o sorteio determinístico de quais ofertas cada acampamento mostra.

As trocas de uma zona são os conjuntos dela **concatenados na ordem de registro** — os do jogo base primeiro, então
o índice de uma troca do jogo nunca se move (é o `idx` que a mensagem leva) e o `perCamp` da zona é o do primeiro
conjunto dela. Para mexer numa troca que já existe: `ctx.trades.modify('mineclaude:ermos', patch)`, pelo mesmo
mecanismo dos outros registros — o mod declara a mudança na `main` e o loader a aplica depois que todos
registraram, por `priority`. Mod em sandbox alcança os dois.

## 39. Estadias: `ctx.stays` (`StayType`, só servidor)

Uma **estadia** é um lugar DENTRO do mundo em que o jogador entra com as coisas dele guardadas — a Quarentena do
jogo base é uma. O `player.room` continua `'mundo'` (os mobs nascem em volta dele como sempre); o que muda é que o
inventário do mundo fica parado em segurança e ele chega de mãos vazias.

```js
import { StayType } from './mineclaude-sdk.js';

class Retiro extends StayType {
  area = 'meumod:claustro';  // o nome completo da ÁREA que a contém (ctx.worldgen.area)
  every = 40;                // ticks entre as chamadas de tick(e) (padrão 20)
  leaveOutside = true;       // a varredura desfaz a estadia de quem saiu da caixa (padrão)
  holdInCombat = true;       // ... menos em combate: aí ele volta ao ponto de chegada (padrão)
  arrival = { columns: 4, step: 8, range: 40, margin: 8 }; // os números do sorteio do ponto de chegada
  onEnter(e) { e.data.dias = 0; e.player.message('Bem-vindo.'); }   // `e.data` é o objeto DELA por jogador
  onLeave(e) { /* e.reason: 'command' | 'death' | 'outside' | 'mod' */ }
  onHold(e) { }
  tick(e) { }
  refuse(e) { return e.what === 'lobby' ? 'Saia daqui primeiro.' : null; }
}
ctx.stays.register('claustro', new Retiro());
```

O motor cuida de tudo que é igual para qualquer estadia: as travas do caminho de entrada (morto, outra sala,
combate, dano recente, chão, a espera entre trocas de lugar — as mesmas do `/lobby`), guardar o inventário em
`p.worldState` (o campo que a conta salva, então sair do jogo lá dentro não perde nada), o teleporte, a varredura de
quem saiu da caixa, a morte que desfaz a estadia e o ponto de volta, e **perguntar à estadia** se um caminho dele
está recusado: `refuse(e)` com `e.what` = `'enter'` / `'leave'` / `'spawn'` / `'lobby'` (nos dois
primeiros vêm também `e.reason` e `e.seconds`). Nenhum texto é do motor: toda linha vem dos ganchos.

Sem `spawn(e)`, o ponto de chegada é o sorteio do motor pelos números de `arrival`: as `columns` colunas mais altas
de uma grade de `step` em volta da área (até `range`, nunca a menos de `margin` da borda, só onde o chão está acima
do mar por `aboveSea`), uma delas com até `scatter` blocos de desvio, conferida no mundo de agora e nunca a mesma
duas vezes em seguida — um ponto fixo seria armadilha certa num servidor anárquico.

Um jogador entra e sai pela API dele: `player.enterStay('meumod:claustro')`, `player.leaveStay()` e `player.stay`
(`{ name, data }` ou `null`). Eventos: `allowStayEnter` (cancelável), `stayEnter` e `stayLeave`. Outro mod desliga
ou troca a estadia de qualquer um, a do jogo inclusive: `ctx.stays.disable('mineclaude:quarentena')` e
`ctx.stays.replace('mineclaude:quarentena', new MinhaQuarentena())`.

**Trocar e embrulhar em cadeia** (`ctx.stays.replace` / `ctx.stays.wrap`, como `ctx.rooms.wrap`): `replace(nome, def, { priority })` aceita também uma função `(previous) => def`, em que `previous` tem os ganchos do que estava antes (o do jogo, ou o de um mod anterior) para chamar: `ctx.stays.replace('mineclaude:quarentena', (previous) => ({ area: 'mineclaude:quarentena', onEnter(e) { previous.onEnter(e); /* e o meu */ } }))`. `wrap(nome, { gancho: (e, previous) => ... }, { priority })` vai em volta de um gancho e deixa o resto como estava (`previous` é sempre o ÚLTIMO argumento; `previous()` sem argumento repete os que o embrulho recebeu; não chamá-lo troca o gancho), por exemplo `onEnter: (e, previous) => { previous(e); ... }`. Ordem: `priority` crescente, depois a ordem de carga; o último aplicado fica por cima (um `replace` descarta os `wrap` aplicados antes dele). Dois mods diferentes trocando o MESMO alvo geram um AVISO no log e entram no rastro de `contentModifications.trail()`. Sem mod nenhum, o jogo é idêntico. No sandbox continua fechado (recebe função).

## 40. Primeira sessão de uma conta: `ctx.progress.firstSession` (`FirstSessionType`, só servidor)

O servidor fala com quem **acabou de criar a conta**, sem ele pedir, e só desta vez — a saudação do jogo base é uma
destas. Quem decide que é a primeira sessão é o motor: a MARCA fica na conta, então reconectar, trocar de navegador
ou conta antiga não recebem nada.

```js
import { FirstSessionType } from './mineclaude-sdk.js';

class Recepcao extends FirstSessionType {
  greetAfter = 2000;   // ms até tentar a saudação (padrão 2000)
  idleAfter = 60000;   // ms até a segunda linha de quem não fez nada (padrão 60000)
  onStart(e) { e.data.chegou = e.room; }                       // `e.data` é o objeto DELA por jogador
  greet(e) { return e.room === 'mundo' ? 'Bem-vindo!' : null; } // a frase, ou nada
  roomWelcome(e) { return ' · Primeira vez aqui?'; }            // vai DENTRO da linha de boas-vindas de uma sala
  idle(e) { return e.moved > 2 ? null : 'Ande um pouco!'; }     // ele continua onde chegou e não fez nada
}
ctx.progress.firstSession('recepcao', new Recepcao());
```

O motor cuida do que é igual para qualquer uma: a marca da conta, os dois relógios, saber se o jogador já **fez**
alguma coisa (quebrou ou pôs bloco, entrou numa fila, andou a régua do servidor) e a garantia de que a boas-vindas
sai **uma** vez — no mundo pelo `greet`, ou dentro da linha de uma sala pelo `roomWelcome`, nunca as duas. Nenhum
texto é do motor: toda linha vem dos ganchos, e um gancho que devolve `null` não diz nada.

Em todos os ganchos: `e.player`, `e.data`, `e.world`, `e.room` (a sala de agora) e `e.moved` (blocos andados na
horizontal desde que ele chegou). Para falar de uma **meta** sem conhecer o sorteio, `e.player.goals()` devolve as
metas sorteadas para a conta agora — `{ day, week, debut }`, cada entrada com `{ name, path, text, stat, group,
pool, n, value, done }`; `debut` só vem no dia em que a conta nasceu. Outro mod desliga ou troca a de qualquer um, a
do jogo inclusive: `ctx.progress.firstSessions.disable('mineclaude:primeira')` e
`ctx.progress.firstSessions.replace('mineclaude:primeira', new MinhaRecepcao())`.

## 41. Grupos: `ctx.parties` (`PartyType`, só servidor)

Um **grupo** é um punhado de jogadores andando juntos — o Grupo do jogo base é um: até quatro amigos que entram
juntos na fila e ficam no mesmo time.

```js
import { PartyType } from './mineclaude-sdk.js';

class Esquadrao extends PartyType {
  role = 'queue';       // o sentido que o MOTOR lê neste grupo, um por jogo (hoje só 'queue'); sem papel, é só seu
  max = 6;              // quantos cabem, contando o líder (padrão 4)
  inviteMs = 15000;     // quanto tempo um convite vale (padrão 60000)
  inviteGapMs = 10000;  // um convite por alvo a cada tanto (padrão 10000)
  onInvite(e) { e.target.message(`${e.player.name} te chamou (${e.seconds} s).`); }
  onJoin(e) { for (const m of e.members) m.message(`Esquadrão: ${e.size}/${e.max}`); }
  onLeave(e) { e.player.message(e.over ? 'Acabou.' : 'Você saiu.'); } // e.reason, e.by, e.members, e.newLeader
  refuse(e) { return e.reason === 'full' ? 'Está cheio.' : null; }    // e.what: invite | accept | leave | kick
}
ctx.parties.register('esquadrao', new Esquadrao());
```

O motor cuida de tudo que é igual para qualquer grupo: quem está nele e quem lidera (com a sucessão quando o líder
sai do servidor, em silêncio, como o jogo sempre fez), os convites com prazo e o um-por-alvo-a-cada-`inviteGapMs`, o
teto de `max`, podar quem saiu, e a regra de moderação de que **quem te ignora não recebe convite nem fica sabendo**.
Nenhum texto é do motor: toda linha vem dos ganchos, e `refuse(e)` devolve a frase de cada recusa (`e.reason`:
`self`, `unreachable`, `offline`, `not_leader`, `full`, `target_in_party`, `invite_pending`, `no_invite`,
`already_in`, `inviter_not_leader`, `no_party`, `no_name`, `not_member`; `e.target` é o nome em questão).

O **papel** `queue` é o que o motor pergunta quando põe gente numa partida junto: é o grupo que entra junto na fila e
fica no mesmo time (um grupo por papel no jogo inteiro; dois com o mesmo papel derrubam o boot, dizendo qual). Um
grupo sem papel é só do mod dele, e o motor nunca pergunta por ele.

Um jogador age pela API dele, dizendo de que grupo fala (como numa estadia): `player.party('meumod:esquadrao')`
(`{ name, max, size, leader, members, isLeader }` ou `null`), `player.inviteToParty(nome, outro, 'motivo')`,
`player.acceptPartyInvite(nome)`, `player.leaveParty(nome)` e `player.kickFromParty(nome, 'Quem')`. O `'motivo'` é um
rótulo curto que volta no `onInvite` (o jogo base manda `'link'` no convite que veio de um link). Eventos:
`allowPartyInvite` e `allowPartyJoin` (canceláveis), `partyInvite`, `partyJoin` e `partyLeave`. Outro mod desliga ou
troca o grupo de qualquer um, o do jogo inclusive: `ctx.parties.disable('mineclaude:grupo')` e
`ctx.parties.replace('mineclaude:grupo', new MeuGrupo())`.

**Trocar e embrulhar em cadeia** (`ctx.parties.replace` / `ctx.parties.wrap`, como `ctx.rooms.wrap`): `replace(nome, def, { priority })` aceita também uma função `(previous) => def`, em que `previous` tem os ganchos do que estava antes (o do jogo, ou o de um mod anterior) para chamar: `ctx.parties.replace('mineclaude:grupo', (previous) => ({ role: 'queue', refuse(e) { return previous.refuse(e); } }))`. `wrap(nome, { gancho: (e, previous) => ... }, { priority })` vai em volta de um gancho e deixa o resto como estava (`previous` é sempre o ÚLTIMO argumento; `previous()` sem argumento repete os que o embrulho recebeu; não chamá-lo troca o gancho), por exemplo `refuse: (e, previous) => previous(e)`. Ordem: `priority` crescente, depois a ordem de carga; o último aplicado fica por cima (um `replace` descarta os `wrap` aplicados antes dele). Dois mods diferentes trocando o MESMO alvo geram um AVISO no log e entram no rastro de `contentModifications.trail()`. Sem mod nenhum, o jogo é idêntico. No sandbox continua fechado (recebe função).

Um grupo vive **só na memória**: ele acaba quando o servidor reinicia, e quem desconecta sai dele.

## 42. Vitrine da home: `ctx.showcase` (`ShowcaseSceneType`, os dois lados)

Antes de alguém entrar, a home abre uma conexão **anônima, só de olhar**, e o servidor passa uma **rotação de cenas**
do jogo acontecendo agora. O motor **não escolhe lugar nenhum e não voa câmera nenhuma**: as três cenas do jogo base —
o spawn do alto, o ponto onde quem chega nasce e a partida com mais gente — são conteúdo do mod base, registradas por
este canal.

O que é do MOTOR, e vale para toda cena: a conexão e a checagem de versão, o teto de olhares, escolher a cena da vez
**e a seguinte** (o navegador carrega o próximo lugar enquanto o atual passa, e a troca não tem tela preta), entregar
chunks **só em volta do ponto da cena** (e só dali: a vitrine não pode virar um jeito de varrer o mapa atrás de
bases), o estado dos jogadores e dos mobs de perto a 10 Hz, a lista de quem está ali e o relógio.

| Campo | O que é |
|---|---|
| `ms` | quanto a cena dura, em ms (padrão 20000) |
| `near` | blocos em volta do ponto cujos jogadores aparecem nela (padrão 48) |
| `point(e)` | **servidor**: onde a câmera olha, `{ x, y, z }`, ou `null` para **pular** a cena desta vez. `e` traz `spawn`, `lobby`, `players` e `busiestMatch()` — a geometria do motor para "a área de partida com mais gente agora", ou `null` sem ninguém jogando |
| `camera(e)` | **navegador**: a pose da câmera, `{ x, y, z, yaw, pitch }`. `e` traz o ponto (`x`, `y`, `z`), `t` em segundos desde o começo da cena, `light` (`true` no celular, onde a vitrine é barata) e `aim(cx, cy, cz, tx, ty, tz)`, que monta a pose de quem olha para um ponto |

```js
import { ShowcaseSceneType } from './mineclaude-sdk.js';

class MinhaCena extends ShowcaseSceneType {
  ms = 15_000;
  point(e) { return e.busiestMatch() ?? e.spawn; }   // no servidor
  camera(e) {                                        // no navegador
    const a = e.t * 0.06;
    return e.aim(e.x + Math.sin(a) * 20, e.y + 9, e.z + Math.cos(a) * 20, e.x, e.y + 1, e.z);
  }
}
ctx.showcase.register('minha', new MinhaCena()); // entra no fim da rotação
```

A cena é **o mesmo objeto nos dois lados** (registre-a fora de qualquer `if (ctx.side === …)`): o servidor chama o
`point`, o navegador chama o `camera`. `ctx.showcase.disable('mineclaude:alto')` tira uma cena e
`ctx.showcase.replace('mineclaude:arena', new MinhaCena())` troca uma, como em qualquer registro — de um mod carregado
antes do mod base também. Uma cena cujo gancho estoura **três vezes seguidas** é desligada, com uma linha no log, e a
rotação segue sem ela; sem cena nenhuma que dê ponto, o motor olha para o spawn, parado — uma tela preta seria pior.

## 43. Regras do servidor: `ctx.serverRules` (`ServerRuleType`)

A lista que o `/regras` imprime e que a aba **Regras** da tela do Esc mostra. **Não** são as regras de jogo
(`ctx.rules`, o `/gamerule`): aquelas são interruptores do mundo, estas são o código de conduta de quem roda o
servidor. As nove do jogo base são classes do mod base, registradas no bootstrap.

```js
import { ServerRuleType } from './mineclaude-sdk.js';

class SemAltar extends ServerRuleType {
  title = ctx.lang.text('rule.altar.title', {}, 'Nada de altar'); // literal ou texto traduzível
  text = ctx.lang.text('rule.altar.text', {}, 'Neste servidor não se constrói altar no lobby.');
}
ctx.serverRules.register('altar', new SemAltar());
ctx.serverRules.modify('mineclaude:respeito', { text: 'Respeito, sempre.' }); // reescreve uma de qualquer mod
```

Dois textos e nada mais (título até 48 caracteres, texto até 400), cada um literal ou traduzível — o jogo base
escreve a linha em português como **fallback** da chave de idioma dela, que é como essas nove frases deixaram de ser
texto do motor sem mudar uma vírgula do que o jogador lê. A **ordem de registro** é a ordem da lista, e o número de
cada regra é só o lugar dela nela (nada salva esse número). O motor ficou com o mecanismo: o `/regras` numera e
imprime, a aba do Esc desenha, e a lista é derivada do registro.

## 44. NPCs que vivem no mundo: `ctx.npcs`

Um NPC é alguém que **vive**: tem nome, casa, ofício, uma mochila, fome e sono, lembra de quem conhece, anda até os
lugares (abrindo e fechando portas), cava, põe blocos, ergue uma construção a partir de uma planta, usa baús, come,
dorme, conversa, foge — e continua sendo ele depois de o servidor reiniciar.

**Por que em cima do mob, e não uma entidade nova.** Um mob já é tudo o que o CORPO de um NPC precisa, e já é do servidor:
posição, física, vida, a mensagem `mobs` de 10 Hz, a cadeia de renderers, `cue` e `pose`, `persistent`. Então um tipo de
NPC **é um mob persistente cujo `ai` é o cérebro de NPC**. Nenhuma mudança de protocolo, nada novo no tick do motor. O
que é novo: o cérebro, as ações, a segurança das edições e o registro salvo. O corpo é do
mod: **qualquer forma** (um humanoide, um pássaro, uma pedra com raízes), desenhada pelo `ctx.render.mobModel` dele, que lê a
VISTA sincronizada do NPC (`ctx.npcs.view(id)`) e traduz os nomes que o cérebro manda (`cue`: `dig`, `place`, `talk`, `eat`,
`work_*`...; `pose`: `sleep`, `dig`, `cower`) em movimento procedural próprio. O cérebro nunca mexe num membro.

```js
const L = ctx.npcs.lib;
ctx.npcs.goal('dormir', {                       // um OBJETIVO: quanto importa agora e o plano que o serve
  score: (n) => (L.scheduleAt([[0.52, 0.98, 'noite']], n.host.time) ? 0.8 : 0),
  plan: (n) => [{ do: 'sleep', bed: n.state.home, onTop: false }],
});
ctx.npcs.goal('trabalhar', {
  score: () => 0.5,
  plan: (n) => [{ do: 'walk', to: n.state.work, near: 2 }, { do: 'dig', at: { x: 10, y: 60, z: 4 } }, { do: 'store', chest: n.state.places.bau }],
});
ctx.npcs.blueprint('cabana', { palette: { c: 'mineclaude:cobblestone' }, layers: [['ccc', 'c c', 'c c'], ['ccc', 'ccc', 'ccc']] });
ctx.npcs.register('morador', { name: 'Morador', height: 1.8, hp: 20, speed: 2, goals: ['dormir', 'trabalhar'] });
ctx.npcs.spawn('meumod:morador', world, pos, { name: 'Zé', role: 'miner', home: { x: 4, y: 64, z: 4 }, work: { x: 12, y: 60, z: 4 }, areas: [[0, 50, 0, 20, 70, 20]] }); // servidor
```

### 44.1 O tipo: `ctx.npcs.register(path, def)`

Registra um mob (`behavior: 'passive'`, `persistent: true`, `aiEvery` 2) com o cérebro e, uma vez por mod, três anexos:
`npc_state` (o registro, persistente), `npc_view` (a VISTA, `sync: 'tracking'`) e `npc_edit` (a marca de bloco "isto foi um
NPC que fez"). Campos: `name`, `halfW`, `height`, `hp`, `speed`, `walkSpeed`, `bodyCells` (altura em células que o caminho
pede), `reach` (alcance de trabalho, 4,2), `digSpeed` (multiplica o tempo de cavar de um jogador; 1,5), `needs` (queda por
dia), `goals` (nomes ou `[nome, objetivo]`), `think` (s entre escolhas, 0,5), e os ganchos `init(n, e)` (um NPC que nasceu
sem registro: invocado), `tick(n, e)` (todo tick, antes do cérebro), `view(state, mem)` (os campos a mais da vista),
`onInteract(e, npc)`, `onHurt(e, npc)`, `onDeath(e)`. `ctx.npcs.spawn(tipo, world, pos, registro)` (servidor) faz nascer um
com o registro já escrito; `stateOf(id)`, `activityOf(id)`, `list()` e `stats()` leem o que ele é e faz. O primeiro mod que
registra um tipo leva o comando `/npc` (abaixo).

### 44.2 O registro (`NpcState`, salvo com o mob)

`name`, `seed` (a aparência e as manias), `role`, `home`, `work`, `places` (até 16 lugares com nome), `areas` (até 4 caixas
`[x0, y0, z0, x1, y1, z1]` onde ele pode editar), `inv` (até 12 pilhas de 64), `held` (o que está na mão), `needs` (`hunger`,
`energy`, `safety`, `social`, 0..1), `rel` (quem → −1..1), `data` (o registro do mod). JSON até 7 KB (o codec corta as listas
e recusa o que passa); um registro torto que vem do disco é consertado (`normalizeState`). Salvo quando muda e a cada 15 s.

### 44.3 O cérebro: objetivos, planos, ações

A cada `think` segundos, cada objetivo dá uma NOTA (0..1, a maior vence; o objetivo em andamento ganha `stick`, 0,1, para não
ficar trocando entre dois parecidos); o vencedor faz um PLANO (`[{ do: 'ação', ...args }]`) e o executor roda os passos.
Um passo que falha devolve o motivo (`'!no_path'`, `'!need:mineclaude:cobblestone'`, `'!not_natural'`...), o gancho `failed`
do objetivo é chamado e o objetivo descansa `rest` segundos (8). As AÇÕES do motor:

| Ação | O que faz |
|---|---|
| `walk { to, near?, pace? }` | anda até lá pelo caminho (abaixo), abre as portas no caminho e fecha atrás |
| `wait { seconds, pose?, cue?, every?, look? }` | parado, mostrando algo |
| `work { at, seconds, cue, every?, pose? }` | vai até a estação e trabalha nela (um `cue` a cada `every` s) |
| `dig { at, tool? }` | cava uma célula (tempo de jogador × `digSpeed`, pela ferramenta); o drop vai para a mochila |
| `place { at, block, item? }` | põe um bloco da mochila (sai de cima da célula antes) |
| `build { blueprint, origin, turns? }` | ergue a planta célula por célula (limpa o que está no caminho); falta material: `!need:<item>` |
| `store { chest, keep? }` / `take { chest, item, n }` | guarda tudo (menos `keep`) num baú / tira de um baú (as transações do motor) |
| `drop`, `eat { item }`, `sleep { bed, onTop?, pose? }`, `talk { with, seconds }` | soltar, comer, dormir (fica até outro objetivo ganhar), conversar |
| `flee { from, to? }`, `wander { around, radius }`, `harvest { at, ripe, loot?, seed? }`, `fight { target }` | fugir, passear, colher e replantar, bater |

Um mod acrescenta as suas com `ctx.npcs.action(path, { start?, tick, stop? })` e usa as do motor por dentro
(`n.type.actions.get('dig')`). `ctx.npcs.lib` traz o que um objetivo precisa: `walkTo`, `refusal`, `scheduleAt`, `addItem`,
`takeItem`, `countOf`, `relate`, `rng`, `nextCell`, `missingMaterials`, `findPath`, `CELL`...

### 44.4 O caminho

A* próprio: 4 direções, sobe 1 (pulo), desce no máximo 2 (penhasco nunca), nunca entra
na água nem em lava/cacto, passa POR portas fechadas (o passo vem marcado; o NPC abre com `world.toggleBlock`, o mesmo
estado do clique, e fecha depois de passar). Até 1200 nós por busca, um cache de caminhos (15 s) e no máximo 3 buscas por tick
no servidor inteiro (as outras esperam um tick paradas). Escadas de mão: o corpo de mob não tem física de escalar, então a
célula `climbable` é atravessável mas não subida.

### 44.5 Plantas (`ctx.npcs.blueprint`)

Camadas de texto de baixo para cima (`.` = deixa como está, ` ` = tem de ser ar) e uma paleta de um caractere por bloco.
O motor gira (`turns`), ordena a obra (limpar primeiro, depois de baixo para cima; dentro de uma camada, o que encosta no
que já está de pé antes: nenhum bloco flutuando é posto primeiro) e conta o material (`missingMaterials`). Andaime: não há
(as plantas devem caber no alcance do chão: até ~5 de altura).

### 44.6 Segurança (servidor anárquico)

Toda edição de NPC passa por UMA regra, e a resposta é um motivo ou nada:

1. **O governador:** `/npc pausar` (para tudo) e `/npc limite N` (no máximo N edições por minuto, somando todos os NPCs do
   mundo; padrão 120). `/npc` mostra o estado e as recusas. Comando de admin, salvo no mundo.
2. **Lugares protegidos:** lobby, área de partida e quarentena (`world.editProtection`): onde um jogador não mexe, NPC também não.
3. **Área de trabalho:** só dentro das caixas `areas` do registro; sem caixa, nenhuma edição.
4. **Só natural:** uma célula que alguém mudou depois de gerada (`world.blockEdited`: jogador, outro mod, explosão) nunca é
   cavada nem preenchida — a não ser que a mudança tenha sido de um NPC (a marca `npc_edit`). Um NPC nunca tira o bloco
   que um jogador pôs nem tapa o buraco que um jogador cavou.
5. **Inquebrável:** bedrock e os blocos internos.

### 44.7 Custo

Cada NPC pensa a cada 2 ticks perto de jogadores e 4× menos sem ninguém a 32 blocos (o passo do andar continua); o orçamento do
servidor inteiro é 8 ms por tick de pensamento (passou: o resto mantém a última decisão até o próximo tick). O que o caminho
lê do mundo fica num cache de 3 s (uma edição do próprio NPC sai na hora). `ctx.npcs.stats()` mostra o custo.

### 44.8 APIs do mundo acrescentadas

`world.blockEdited(pos)`, `world.editProtection(pos)`, `world.digInfo(pos, tool)` (`{ seconds, drop }`), `world.toggleBlock(pos)`
(o `toggle.to` do bloco, como um clique: a porta, o portão) e `world.placeItem(pos, item)` (o que o `places` do item põe — a
semente — onde o `placement.on` do bloco deixa; não tira o item de ninguém).

Exemplo completo: os Musgarretes, uma vila inteira de NPCs com dia, troca e movimento de corpo próprio.

## 45. Combate corpo a corpo como dado: `ctx.combat` (movesets)

O motor tem só o MECANISMO do combate; as armas são CONTEÚDO. A espada, o machado de guerra e a lança do jogo são do
mod base, escritos com esta mesma API.

```js
ctx.combat.stamina({ max: 10, regen: 4, delayS: 0.8 });   // o fôlego de todo jogador (sem isto, custos são ignorados)
ctx.combat.moveset('martelo', {
  cadenceMs: 600,                       // o ritmo mínimo entre dois golpes que o servidor aceita
  resetS: 1,                            // uma pausa deste tamanho recomeça a cadeia
  moves: {
    golpe: { dur: 0.6, lock: 0.7, strike: [0.35, 0.6], yaw: [-1, 1], pitch: [0.6, -0.6], sectorDeg: 120,
      step: { at: 0.25, dist: 0.4 }, camera: { kick: 0.04 }, trail: true,
      fp: [[0, {}], [0.35, { px: 0.1, py: 0.2, rz: -1 }], [0.6, { px: -0.3, rz: 1.2 }], [1, {}]],
      tp: [[0, {}], [0.35, { x: 2.6, elbow: 1, twist: -0.6, crouch: 0.4 }], [0.6, { x: 1, twist: 0.5, lunge: 0.8 }], [1, {}]] },
    giro: { dur: 0.8, lock: 0.9, finisher: true, damage: 1.4, stagger: 500, strike: [0.3, 0.7], yaw: [-2.6, 2.6], pitch: [0, 0], sectorDeg: 320,
      tp: [[0, {}], [0.3, { spin: 1 }], [0.7, { spin: 5.5 }], [1, { spin: 6.283 }]] },
    esmagar: { dur: 0.8, lock: 1, damage: 1.8, guardBreak: 3000, stamina: 5, strike: [0.4, 0.6], yaw: [0, 0], pitch: [1.4, -1.1], sectorDeg: 60 },
  },
  chain: ['golpe', 'golpe', { default: 'giro', air: null }],   // passos; um passo pode ter ramos
  branches: { air: 'golpe' },                                    // ramos gerais: air, sprint, down, up
  heavy: { move: 'esmagar', minS: 0.45, fullS: 1.4, bonus: 1 },  // segurar o ataque carrega; soltar dispara
  guard: { parryMs: 200, reduce: 0.5, stamina: 2, stagger: 800 }, // o botão de usar levanta a própria arma
});
ctx.combat.bind(['meumod:martelo_de_ferro'], 'martelo');
```

**Golpe** (cada um vira o registro sincronizado `<mod>:<moveset>_<id>`; o id viaja no fio):

| Campo | Significado |
|---|---|
| `dur`, `strike` | duração (s) e a janela [início, fim] em u = 0..1 em que a lâmina vale |
| `yaw`, `pitch` | o arco da lâmina em volta do olhar durante a janela (radianos; + esquerda / + cima) — o cliente varre a lâmina quadro a quadro |
| `sectorDeg`, `reachAdd` | o setor que o SERVIDOR confere (mais 30° de folga pela rede) e o alcance a mais |
| `damage`, `knockback`, `lift`, `stagger`, `guardBreak` | multiplicador de dano e de empurrão, empurrão para cima, ms em que o alvo não ataca, ms em que uma guarda atingida cai |
| `stamina`, `lock`, `hitStop`, `finisher` | fôlego gasto; espera mínima até o próximo golpe; congelamento no contato; marca de finalizador |
| `step`, `hop` | ROOT MOTION: um passo real de até 1,2 bloco (o servidor abre essa folga no `move`); `hop` é o pulinho do corpo (cosmético) |
| `camera`, `trail`, `sound` | tranco / balanço / tremor da câmera em 1ª pessoa; rastro; até 4 sons em momentos do golpe |
| `fp`, `tp` | as trilhas de pose: 1ª pessoa (`px py pz rx ry rz`) e o CORPO INTEIRO em 3ª (`x y z elbow twist lean lunge spin hop roll crouch lx ly lz lelbow head`) |

**Cadeia e ramos.** `chain` é a lista de passos leves; cada toque toca o próximo. Um passo pode ser `{ default, air,
sprint, down, up }` e um ramo `null` desliga o ramo geral naquele passo (a ordem testada é air, sprint, down, up).
**Pesado.** Com `heavy`, um TOQUE (soltar antes de `minS`) é leve e SEGURAR carrega; soltar dispara o pesado com a carga
0..1 (`bonus` de dano a mais na carga cheia) se o fôlego pagar. **Guarda.** Com `guard`, o botão de usar levanta a arma:
nos primeiros `parryMs` ela APARA (nenhum dano; o atacante — jogador ou mob — fica `stagger` ms sem atacar), depois só
bloqueia `reduce` do dano gastando `stamina`; sem fôlego a guarda quebra. Um escudo na mão tem prioridade.

**O que o servidor confere**: o golpe é do moveset do item na mão; o tempo desde o último
golpe aceito respeita `cadenceMs`, a trava do anterior e, num pesado, a carga mínima mais a preparação; atordoado não
bate; o fôlego paga; o alvo está no setor e no alcance do golpe. O servidor **não** confere a ORDEM dos golpes, então
desenhe a cadeia de modo que um golpe leve qualquer não renda mais dano por segundo do que ela.

Mobs de mod podem ganhar o mesmo: basta `bind` no item que eles seguram. O lado do mob **atacando** com golpes de
moveset ainda não existe.

## 46. Gases, altitude e frio: `ctx.gases`

O ar do jogo é feito de **gases**. O motor guarda o mecanismo; **quais** gases existem, o que respirar faz e o que
machuca é conteúdo: o mod base registra ar, oxigênio, gás carbônico, metano, fumaça e gás vulcânico.

**O princípio**: nada é simulado no mundo inteiro. **Ao ar livre** a composição é uma função da posição
(altitude, bioma, hora) montada pelos **campos** registrados, calculada só onde alguém pergunta. **Num lugar fechado**
(uma sala, uma caverna, uma base) o ar é um grafo de **aglomerados**: cada seção de 16³ com ar fechado vira folhas, as
folhas vizinhas trocam gás pelas faces e as parecidas se juntam num nó pai (uma caverna enorme parada vira um nó só; não
há teto de células). Cada nó guarda uma coluna de **camadas** (uma por bloco de altura): o gás mais pesado que o ar desce e se junta no chão, o mais leve sobe
para o teto, e cada abertura troca com o ar de fora conforme a **altura** dela. Um buraco no teto deixa sair os leves,
uma porta no nível do chão escoa os pesados, e um poço leva o CO₂ para a caverna de baixo. O ar fechado só anda quando
alguém pergunta por ele (é preguiçoso): o que ninguém vê fica parado e, quando alguém volta, é atualizado com o mesmo
passo de 1 s. Ele também tem **pressão** (gás ideal) e **temperatura**, e os dois andam com o gás.

```js
ctx.gases.register('neon', {
  name: 'Neon', formula: 'Ne', color: '#ff5fd2',          // a cor é obrigatória: todo gás é visível
  density: 0.7,                                           // abaixo de 1 sobe, acima de 1 desce (em relação ao ar)
  diffusion: 0.4, visibility: { from: 0.01, full: 0.12, opacity: 0.4 },
});
ctx.gases.source('neon_lamp', { blocks: ['meumod:neon_lamp'], emits: { 'meumod:neon': 0.01 } }); // volumes de célula por segundo
ctx.gases.field('night_shimmer', {                         // o ar livre: calculado só onde alguém pergunta
  sample: (env) => (env.daylight < 0.3 && env.y <= env.seaLevel + 3 ? { add: { 'meumod:neon': 0.015 } } : null),
});
```

| Campo do gás | O que é |
|---|---|
| `name`, `formula` | o nome (texto ou traduzível) e a fórmula para mostrar |
| `color`, `visibility` | a cor da névoa (obrigatória) e a opacidade pela fração: some abaixo de `from` e chega a `opacity` em `full` |
| `density` | 0,05..20 em relação ao ar: acima de 1 desce, abaixo de 1 sobe |
| `diffusion`, `decay` | quanto se mistura entre camadas e quanto some sozinho, por segundo |
| `outdoor` | a fração no ar livre antes dos campos (oxigênio: 0,209) |
| `background` | o gás de fundo (o ar): não é rastreado, é o que sobra em cada camada |
| `breathable`, `asphyxiant {at, full}`, `toxic {at, full, damage}`, `flammable {lower, upper}` | são **dados**: quem aplica o efeito é o mod (o mod base lê os quatro) |
| `smell`, `sound` | o texto do cheiro (o detector mostra) e um som para quem está dentro do gás |
| `heatCapacity` | 0,1..10 em relação ao ar (padrão 1): quanto custa esquentar o gás |
| `spectrum` | 1..8 faixas de absorção `{ at, width, strength }` (0..1 do espectro do jogo). Sem ela, uma derivada da cor e do nome. Cada gás absorve a luz do seu jeito: é isso que o Espectrômetro lê e o que os Óculos de Gás veem |
| `visibility.nakedEye` | 0..1: o quanto o gás aparece A OLHO NU como névoa no mundo (0 = só os Óculos de Gás o veem; sem o campo, um valor derivado da `opacity` e da cor — até 0,4 de opacidade fica invisível) |

Uma **fonte** (`source`) declara `emits` e `consumes` por bloco. `needs: { gas, min }` a desliga quando falta o gás (a tocha
apaga sem oxigênio); `day: true` a deixa ligada só de dia (as folhas); `flame: true` acende um gás `flammable` que esteja
na faixa dele. Um bloco sólido conta quando está na parede da sala (a lava, a fornalha de um mod). Um **campo** (`field`)
devolve, para um ponto, `pressure` (multiplica), `mix` (fixa uma fração) e `add` (soma). Ele recebe
`{ x, y, z, dimension, biome, underground, daylight, height, seaLevel, time }`. Um campo também pode dar `temperature`
(°C) do ar livre (o mod base dá a do clima). Uma fonte pode ter `heat` (por segundo: 1 esquenta uma célula de ar em
1 °C; negativo esfria): a tocha, a lava, a neve.

**No servidor:**
- `ctx.gases.sample(world, pos, { exchange? })` → `{ outdoors, pressure, temperature, gases, partial, pressureRate, wind,
  room }`: o que há no ar ali. `partial` é a pressão parcial de cada gás; `pressureRate` é quanto a pressão mudou por
  segundo (negativo: descompressão); `wind` diz para onde o ar está saindo; `room.clusters` dá as folhas e os nós.
  `exchange` troca gás ali com a pressão constante; é assim que o jogador respira. `pending: true` quer dizer que o
  volume ali ainda está sendo montado (as montagens entram numa fila com orçamento por segundo): a resposta é a última
  conhecida daquela seção e `outdoors` é `false` — um lugar em espera **nunca** é dado como ar livre.
- `room(world, pos)` → a sala, com as camadas e as fontes. Se o volume dela ainda está pendente, vale a mesma regra: a
  resposta é a última conhecida, não um ar livre inventado.
- `view(world, centro, { radius, build? })` → os aglomerados em volta, só leitura (é o que os Óculos de Gás desenham).
  `outdoor(world, pos, sobTeto?)` → o ar livre ali só pelos campos, sem olhar sala nenhuma.
- `emit(world, pos, gás, n)`: uma máquina pondo gás. Devolve `false` ao ar livre e enquanto o volume está pendente
  (tente de novo no segundo seguinte).
- `invalidate(dimensão, pos, blocoNovo?)`: o mod base chama a cada bloco que muda. Com o bloco novo, as redes de
  transporte também se refazem.
- `onIgnite(fn)`: uma chama num gás inflamável; devolva `true` para o gás queimar.
- `skip(s)`: adianta o relógio (é o `/gas avancar`).
- `stats()`: salas, células, inundações e o tempo gasto.
- `save(dim)` / `load(dim, lista)`: o mod base guarda as salas com o mundo, e só quando há sala com ar diferente do de fora.
- `shape(dim)` → `{ height, seaLevel }`. Esta vale nos dois lados.

**A pressão do ar fechado** é dele: selado, ele guarda o que tem em qualquer altura, e pelas aberturas (e pelas faces
entre aglomerados) a pressão relaxa para a do vizinho ou a de fora. Esquentar sobe a pressão. `sample().pressure` e
`room().pressure` dão esse número.

**Calor nas paredes**: a propriedade de bloco `thermal: { conductivity, heatCapacity }` diz quanto calor uma parede
passa (pedra 1, vidro 1,6, madeira 0,25, lã 0,05, metal 4; sem ela, o motor escolhe pelo material).

**Estouros**: `ctx.gases.rated(caminho, { blocks, burst })` dá a um bloco a diferença de pressão que ele aguenta.
`stressed(world)` (servidor) lista os que passaram dela, e quem decide o que acontece é o mod. O jogo base quebra o bloco
com uma explosão pequena, pela regra `mineclaude:pressure_bursts` e nunca numa área protegida.

**Transporte: bombas, dutos, saídas, tanques.** Um mod faz a máquina dele registrando blocos
como **dispositivos**. Os dispositivos encostados face com face formam uma rede, e ela liga nos dutos do jogo base:

```js
ctx.gases.device('coletor', {
  blocks: ['meumod:coletor'], kind: 'pump', rate: 1,              // volumes de célula por segundo, × a pressão na entrada
  power: (e) => ((e.world.getBlockData(e.pos)?.carga ?? 0) > 0 ? 1 : 0),   // 0..1: combustível, energia (servidor)
  filter: () => ({ only: ['meumod:neon'] }),                      // ou { except: [...] }; sem filtro, a mistura inteira
});
ctx.gases.device('cano', { blocks: ['meumod:cano'], kind: 'conduit' });
ctx.gases.device('respiro', { blocks: ['meumod:respiro'], kind: 'vent', rate: 2, maxPressure: 1.1 });
ctx.gases.device('garrafa', { blocks: ['meumod:garrafa'], kind: 'store', rate: 3, capacity: 200 });
ctx.gases.device('tampa', { blocks: ['meumod:tampa'], kind: 'cap' });
```

| `kind` | O que faz |
|---|---|
| `pump` | Puxa da célula livre de cima (senão, de um lado; senão, de baixo) o que houver lá, e empurra para a rede |
| `conduit` | Leva. Ligado a no máximo um outro dispositivo, é ponta aberta e **vaza** |
| `vent` | Solta na célula livre ao lado (uma fechada primeiro) até a sala de lá chegar em `maxPressure` |
| `store` | Guarda até `capacity`, com a mistura; enche com a sobra e devolve o que falta às saídas |
| `cap` | Liga, mas não deixa passar (uma válvula fechada) |
| `sensor` | Não faz parte da rede: lê o ar da célula na frente uma vez por segundo. `trip(e, { pressure, temperature, rate, gases })` → true/false ou 0..1 é o **sinal** de saída (um alarme), e `ctx.gases.sensor(world, pos)` devolve a última leitura com o sinal |

**O painel** de um dispositivo (liga/desliga, slot de combustível, filtro, limites, leituras, gráficos) é uma tela de controle
([§36.2](#362-telas-de-controle-o-painel-de-uma-máquina-controls)) ligada ao estado público dele: é assim que as máquinas de
gás do jogo base têm os painéis delas.

O **controle** é abstrato, para uma rede de energia poder dirigir o dispositivo depois sem mudar nada nele:
`power(e)` → 0..1 (a fração da vazão neste segundo) e `signal(e)` → ligado/desligado (um conduit desligado vira tampa).
A saída de uma `vent` pode ser uma função: `maxPressure: (e) => número`.
Não há sinal grátis nem modo "sempre ligado" no jogo base: a bomba dele queima combustível.

No servidor:
- `withdraw(world, pos, volume)`, `inject(world, pos, quantidade, gases, { maxPressure })` e
  `transfer(world, de, para, volume, { filter, maxPressure })`: uma máquina sem dutos;
- `volumeAt(world, x, y, z)`: o volume naquela posição, a alça abstrata por onde os dispositivos falam com o gás (com a
  temperatura `T`; `put(quantidade, mistura, maxP, temperatura)` traz o calor junto). Com `pending` (o nome antigo é
  `refused`), o volume ainda está na fila de montagem, com prioridade de dispositivo: espere o próximo tique;
- `network(world, pos)`: as peças da rede, os vazamentos e se ela pode rodar;
- `stored` / `draw`: o que um tanque guarda, e tirar dele;
- `tickDevices(world)`: anda as redes da dimensão (o mod base chama uma vez por segundo);
- `saveDevices` / `loadDevices`: o estado, que o mod base guarda com o mundo.

O jogo base traz cinco blocos: **Bomba de Gás**, **Duto de Gás**, **Saída de Gás**, **Tanque de Gás Grande** e **Válvula
de Gás**.

**O que o mod base faz com isso:**

- **Oxigênio.** O atributo `mineclaude:oxygen` (0..100) é o medidor: o valor base fica na conta.
  - O ar respirável é o O₂ na altura da cabeça × a pressão ÷ 20,9 %, cortado pelos gases asfixiantes (o CO₂ corta de 4 %
    a 18 %).
  - A pressão cai com a altitude a partir de `seaLevel + 0,3·(height − seaLevel)` (y ≈ 50; `height` é o topo da faixa
    gerada, 96) numa **exponencial** sem piso e sem teto: 0,4 em y 96, 0,14 em 150, 0,05 em 200, quase 0 em 1000. Não há
    teto de altura no mundo: ele cresce em seções verticais de 16×16×16 acima da faixa gerada, e o limite é o ar — quem
    bombear ar para cima sobe o quanto quiser. Numa sala vale a pressão **da sala**.
  - O medidor desce devagar (1,2 por segundo; 1,6× correndo) até o nível que o ar permite e volta rápido (6 por segundo).
  - Abaixo de 75: a stamina do combate enche até 60 % mais devagar, o passo fica até 25 % mais lento e a visão escurece.
    A stamina usa o atributo `mineclaude:stamina_regen`, que o motor lê pelo papel `stamina_regen` nos dois lados.
  - Em 0: dano (`mineclaude:thin_air` ou `mineclaude:asphyxia`).
  - **Aclimatação** (`mineclaude:acclimatization`, 0..1): sobe em 10 minutos no ar rarefeito e cai em 3 minutos no ar bom.
    Completa, tira metade da falta de ar.
  - **Resistência** (`mineclaude:thin_air_resistance`): o **Tanque de Ar** (`mineclaude:air_tank`) dá 0,9 em qualquer
    mão e gasta 1 de durabilidade por segundo de uso; a **Poção do Fôlego da Montanha** (efeito
    `mineclaude:mountain_breath`) dá 0,35 por nível.
  - Os gases tóxicos (fumaça, gás vulcânico) ferem (`mineclaude:gas_poison`), e o tanque filtra na mesma medida.
  - Debaixo d'água continua valendo o **fôlego** de sempre (as bolhas, `player.air`). São perigos diferentes, cada um com
    a sua barra, e este sistema não mexe no medidor quando a cabeça está na água.
- **Frio.** O atributo `mineclaude:body_temperature` é a temperatura do corpo em °C (37 = bem).
  - A temperatura do ar vem de `ctx.weather.sample(x, y, z)` quando o sistema de clima existir (`{ temperature }`, em °C,
    ou em kelvin se for acima de 150).
  - Sem o clima, a conta é: a base do bioma; −30 °C do nível do mar até o topo (proporcional à altura da dimensão);
    −7 °C à meia-noite; −3 °C na chuva; na caverna a temperatura tende a 12 °C; molhado, −6 °C.
  - Somam-se três coisas: o calor por perto (lava, tocha, fornalha, magma); o abrigo (+3 °C sob um teto, +5 °C numa sala
    fechada); e a roupa (`mineclaude:cold_insulation`: o couro dá +2,5 °C por peça, o **Casaco de Pele**
    `mineclaude:fur_coat` dá +10 °C e a **Poção do Calor** `mineclaude:warmth` dá +8 °C por nível).
  - O corpo esfria 0,03 °C por segundo até o que o frio permite. Abaixo de 36 °C vem o efeito **Frio**
    (`mineclaude:chill`, níveis 1 a 3): o jogador fica mais lento e com mais fome.
  - Só há dano no nível 3 (abaixo de 33,5 °C, frio extremo): `mineclaude:freezing`.
  - No ar frio o hálito aparece (partícula `mineclaude:breath_fog`).
- **Explosão de metano.** Uma chama num gás `flammable` dentro da faixa explode: numa sala, ou numa tocha posta num bolsão
  ao ar livre, como o metano do Pântano Luminoso. Só explode com a regra ligada, **nunca** numa área protegida (lá o gás
  queima sem estrago), e no máximo com raio 2,5 e dano 8.
- **Regras:** `mineclaude:oxygen`, `mineclaude:cold` e `mineclaude:gas_explosions`. As três começam ligadas e mudam com
  `/gamerule`.
- **Itens e receitas:**
  - Tanque de Ar: 4 ferro + vidro + linha.
  - Casaco de Pele: 6 couro + 2 lã.
  - Detector de Gás: 2 ferro + ouro + vidro + carvão. Na mão, mostra o ar em volta.
  - Poção do Fôlego da Montanha: vidro + 4 folhas + sol-pétala.
  - Poção do Calor: vidro + 2 cogumelo-brasa + carvão.
- **Navegador:**
  - A barra de O₂ e o termômetro só aparecem quando importam.
  - Vinheta escura com a hipóxia, borda de gelo com o frio, e a cor do gás em que a cabeça está.
  - Névoa de partículas na cor de cada gás, onde ele se junta. Há um tipo de partícula por gás
    (`mineclaude:gas_<mod>_<gás>`), criado depois de todos os mods: o gás de um mod ganha a sua sem nenhum código de cliente.
  - Uma linha no F3.
  - No celular as barras da camada de GUI não aparecem (o HUD de lá é HTML).
- **Admin:** `/gas` (o ar aqui), `/gas avancar <s>`, `/gas emitir <gás> <n>` e `/gas stats`. Nó de permissão:
  `mineclaude:command.gas`, nível 2.

Exemplo completo: o mod `gas_neon`, com um dispositivo próprio, o Coletor de Neon.

## 47. Modificadores de mundo: `ctx.modifiers` (`WorldModifierType`, `ModifierPresetType`)

Um **modificador de mundo** é o interruptor com nome — ou a escolha de valor — que o jogador marca na tela **"Criar
mundo"**. Ele não é uma regra de jogo: uma regra (`ctx.rules`, o `/gamerule`) é **um número que um sistema lê**; um
modificador é **a escolha com que o mundo nasceu**, e ele embrulha sistemas inteiros mais as regras que esses sistemas
leem. "Gases e atmosfera" desligado não é "o oxigênio não machuca": é **o runtime de gases não roda** — nenhuma sala,
nenhum aglomerado, nenhum transporte, nenhum campo do ar livre, nenhum custo de CPU.

O motor guarda só o mecanismo: o registro que os dois lados preenchem na mesma ordem, os tipos, a árvore pai/filho, as
predefinições e os valores de agora. **Quais** modificadores existem é conteúdo: o jogo base registra os dele, e
qualquer mod registra os seus.

### 47.1 Registrar

```js
ctx.modifiers.register('derrubada', {
  name: 'Derrubada de árvores',                 // o que o jogador lê (aceita ctx.lang.text)
  description: 'Cortar o tronco derruba a árvore inteira, com física.',
  category: 'fisica',                           // agrupa na tela
  order: 0,                                     // onde fica dentro da categoria
  type: 'boolean',                              // o padrão; também integer | number | enum
  default: true,                                // o valor de um mundo NOVO
  legacy: false,                                // o valor de um mundo criado ANTES deste modificador
  requiresRestart: false,                       // a mudança só vale no próximo boot?
  worldgenOnly: false,                          // decidido quando o mundo nasce? (implica requiresRestart)
  conflicts: ['outromod:lenhador'],             // não pode estar ligado junto com esse
  gamerules: { false: { 'meumod:queda_de_tronco': false } }, // as regras que ele embrulha, POR VALOR
});
```

Campos:

| campo | o que é |
|---|---|
| `name`, `description` | texto de tela (1..60 e até 240; aceitam texto traduzível) |
| `category` | `atmosfera`, `clima`, `sobrevivencia`, `mundo`, `combate`, `criaturas`, `fisica`, `outros` — ou qualquer `[a-z0-9_]` seu, desenhado no fim com o próprio nome |
| `order` | menor primeiro; empate = ordem de registro |
| `type` | `boolean` (o padrão), `integer`, `number` ou `enum` |
| `default` | o valor de um mundo novo que não escolheu nada |
| `legacy` | **a migração**: o valor que um mundo criado ANTES deste modificador lê, para sempre. Ausente = o `default` |
| `choices` | só `enum`: 2..32 textos; a escolha `off` quer dizer desligado (é o que o `enabled` responde) |
| `min`, `max` | só `integer` e `number` |
| `parent` | o nome completo do modificador de cima: com ele desligado, este também para |
| `requiresRestart`, `worldgenOnly` | a mudança vale já ou só no próximo boot (o `/modificador` avisa) |
| `conflicts` | nomes completos que não podem estar ligados junto com este (basta um dos dois declarar) |
| `gamerules` | `{ '<valor>': { 'mod:regra': valor } }`: quando o valor efetivo é `<valor>`, aquelas regras são forçadas |

**O `gamerules` é por valor, e um valor sem entrada não mexe em regra nenhuma.** É assim que um interruptor força algo só
do lado desligado (`{ false: { 'mineclaude:oxygen': false } }`) e um modificador de valor só força fora do padrão
(`{ lenta: { 'mineclaude:hunger_seconds': 180 } }`, com `normal` sem entrada). Num mundo que ninguém mexeu, portanto,
nenhuma regra muda de valor por causa dos modificadores.

### 47.2 A árvore

`parent` monta uma árvore. Um filho de algo desligado **para**: `ctx.modifiers.get(filho)` devolve o valor de desligado
dele (`false`, `'off'`, ou o mínimo) e `ctx.modifiers.enabled(filho)` devolve `false`, mesmo com o valor próprio dele em
`true`. O valor próprio é guardado: ligar o pai de volta acorda o filho exatamente como ele estava. A tela desenha o
filho recuado, apagado e travado, dizendo qual é o de cima que está desligado.

### 47.3 Predefinições

```js
ctx.modifiers.preset('classico', {
  name: 'Clássico',
  description: 'O jogo como ele sempre foi.',
  order: 0,
  values: { 'mineclaude:gases': false, 'mineclaude:hunger': 'normal' },  // o que ela não nomeia fica no padrão
});
```

O jogo base registra três: **Clássico** (sem gases), **Realista** (tudo ligado) e **Tranquilo** (sem gases, sem fome, sem
dano de queda nem afogamento).

### 47.4 O conteúdo que um modificador embrulha

Nada é **jamais** tirado do registro — os ids de blocos e itens são do mundo e dos inventários salvos. O que um
modificador desligado faz é tirar o conteúdo dele **da vista**:

```js
ctx.modifiers.gate('mineclaude:gases', {
  blocks: ['mineclaude:gas_pump', ...],
  items: ['mineclaude:gas_pump', 'mineclaude:air_tank', ...],
  recipes: ['mineclaude:gas_pump', ...],   // a CHAVE da receita (nome completo, ou simples nas do bootstrap)
});
```

Enquanto o modificador está desligado, esse conteúdo sai da **paleta do criativo**, sai do **livro de receitas** e o
servidor **recusa fabricá-lo** (pelos dois caminhos: pela chave e pela grade). O bloco continua colocável e o item
continua no inventário de quem já tem — e um mundo que ligar o modificador depois encontra tudo no mesmo lugar, com os
mesmos ids.

### 47.5 Ler, dentro do jogo

```js
if (!ctx.modifiers.enabled('mineclaude:gases')) return;   // a única chamada que um sistema precisa
const fome = ctx.modifiers.get('mineclaude:hunger');       // 'normal' | 'lenta' | 'desligada'
if (ctx.modifiers.has('outromod:x')) { /* funciona sem o outro mod */ }
```

`enabled` e `get` respondem **igual nos dois lados**: o `welcome` leva o conjunto ao navegador (campo `modifiers` =
`[[nome, valor]]`), e a mensagem `modifiers` = `{ m: [[nome, valor]] }` manda o conjunto de novo quando um
administrador muda algum. Um jogo cujos mods não registraram modificador nenhum lê `true` em tudo: nada muda.

Do lado do servidor um mod também tem `e.server.modifiers`: `get`, `enabled`, `set`, `names`, `describe`, `all`,
`presets`, `preset` e `categories`. O `set` salva no mundo, aplica de novo as regras que a árvore força e avisa todos os
navegadores; ele devolve `{ value, restart, children, conflicts }`. O evento `worldModifierChanged` = `{ name, value,
old }` avisa quem escuta.

### 47.6 Onde o valor mora

1. **A tela "Criar mundo"** monta a seção **a partir do registro**: as predefinições, uma caixa de procura e um bloco por
   categoria que abre e fecha. Um mod que registra um modificador aparece lá sozinho, sem ninguém tocar na tela.
2. O **registro de mundos do navegador** guarda só o que difere do padrão, mais a predefinição escolhida, e passa isso ao
   servidor na criação.
3. O **servidor** lê essa escolha **uma vez**, quando o mundo nasce, e escreve o conjunto COMPLETO no registro do mundo
   (campo `modifiers`). Um mundo que já existe nunca relê a escolha da criação.
4. No boot, o servidor carrega o conjunto salvo e aplica as regras que ele força — **depois** das regras de jogo, de
   propósito: um modificador manda na regra que ele embrulha.
5. `/modificador lista|liga|desliga|valor|predefinicao` (nó `mineclaude:command.modificador`, nível 4) muda depois.

**A migração.** Um mundo salvo **sem** o campo `modifiers` é um mundo de antes deste sistema. Ele **não** pega os
padrões novos: cada modificador lê o `legacy` dele, que é o que aquele mundo já jogava. Nenhum mundo salvo muda de
comportamento. Só um mundo nascido com o campo segue os `default` (e aí "Gases e atmosfera" nasce desligado).

### 47.7 O que já é modificador

Ligados agora, no jogo base:

| modificador | categoria | padrão | regras que embrulha |
|---|---|---|---|
| `mineclaude:gases` (mestre) | atmosfera | **desligado** (`legacy` ligado) | — (desliga o runtime inteiro) |
| `mineclaude:breathing` | atmosfera | ligado | `mineclaude:oxygen` |
| `mineclaude:thin_air` (filha de `breathing`) | atmosfera | ligado | — (o campo `thin_air` do ar livre) |
| `mineclaude:cold_weather` | atmosfera | ligado | `mineclaude:cold` |
| `mineclaude:pressure_damage` | atmosfera | ligado | `mineclaude:pressure_damage` |
| `mineclaude:pressure_bursts` | atmosfera | ligado | `mineclaude:pressure_bursts` |
| `mineclaude:gas_explosions` | atmosfera | ligado | `mineclaude:gas_explosions` |
| `mineclaude:climate` (mestre) | clima | ligado | `regional_weather`, `climate_puddles`, `snow_accumulation`, `tsunami` |
| `mineclaude:climate_damage` | clima | ligado | `climate_damage`, `wind_push` |
| `mineclaude:hunger` (enum) | sobrevivência | `normal` | `hunger_seconds`, `starvation_seconds` |
| `mineclaude:fall_damage` (enum) | sobrevivência | `normal` | `fall_damage`, `fall_damage_multiplier` |
| `mineclaude:drowning` | sobrevivência | ligado | `drowning_damage` |
| `mineclaude:natural_regeneration` | sobrevivência | ligado | `natural_regeneration` |
| `derrubada:derrubada_arvores` (mod `derrubada`) | física | ligado | `derrubada:arvores` |
| `derrubada:derrubada_dano` (filho do de cima) | física | ligado | `derrubada:dano_arvore` |

