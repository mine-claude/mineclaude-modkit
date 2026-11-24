# `ctx`: a referência da API de mods

Esta é a referência de `ctx`, o objeto que o seu mod recebe. Ela é derivada das declarações de tipo que
acompanham o modkit (`types/mineclaude-mod.d.ts`, dentro da pasta do mod): cada assinatura abaixo é a do tipo,
não uma paráfrase. Para aprender o assunto com texto corrido e exemplos longos, leia
[guia-de-mods.md](guia-de-mods.md); use esta página para lembrar o nome e a forma de um método.

**Sumário**

- [O que é o `ctx`](#o-que-é-o-ctx)
- [`ModContext`, `ServerModContext` e `ClientModContext`](#modcontext-servermodcontext-e-clientmodcontext)
- [`ctx.runtime`](#ctxruntime)
- [`ctx.services`](#ctxservices)
- [`ctx.components`](#ctxcomponents)
- [`ctx.mods`](#ctxmods)
- [`ctx.tags`](#ctxtags)
- [`ctx.lang`](#ctxlang)
- [`ctx.resources`](#ctxresources)
- [`ctx.blocks`](#ctxblocks)
- [`ctx.items`](#ctxitems)
- [`ctx.recipes`](#ctxrecipes)
- [`ctx.screens`](#ctxscreens)
- [`ctx.capabilities`](#ctxcapabilities)
- [`ctx.interactions`](#ctxinteractions)
- [`ctx.blockTransforms`](#ctxblocktransforms)
- [`ctx.transfer`](#ctxtransfer)
- [`ctx.mobs`](#ctxmobs)
- [`ctx.effects`](#ctxeffects)
- [`ctx.gases`](#ctxgases)
- [`ctx.attributes`](#ctxattributes)
- [`ctx.movement`](#ctxmovement)
- [`ctx.modifiers`](#ctxmodifiers)
- [`ctx.rules`](#ctxrules)
- [`ctx.damage`](#ctxdamage)
- [`ctx.combat`](#ctxcombat)
- [`ctx.systems`](#ctxsystems)
- [`ctx.stays`](#ctxstays)
- [`ctx.parties`](#ctxparties)
- [`ctx.showcase`](#ctxshowcase)
- [`ctx.serverRules`](#ctxserverrules)
- [`ctx.permissions`](#ctxpermissions)
- [`ctx.help`](#ctxhelp)
- [`ctx.rooms`](#ctxrooms)
- [`ctx.loot`](#ctxloot)
- [`ctx.cosmetics`](#ctxcosmetics)
- [`ctx.trades`](#ctxtrades)
- [`ctx.npcs`](#ctxnpcs)
- [`ctx.progress`](#ctxprogress)
- [`ctx.projectiles`](#ctxprojectiles)
- [`ctx.particles`](#ctxparticles)
- [`ctx.weather`](#ctxweather)
- [`ctx.registries`](#ctxregistries)
- [`ctx.enchantments`](#ctxenchantments)
- [`ctx.potions`](#ctxpotions)
- [`ctx.fluids`](#ctxfluids)
- [`ctx.worldgen`](#ctxworldgen)
- [`ctx.dimensions`](#ctxdimensions)
- [`ctx.sounds`](#ctxsounds)
- [`ctx.textures`](#ctxtextures)
- [`ctx.events`](#ctxevents)
- [`ctx.commands`](#ctxcommands)
- [`ctx.config`](#ctxconfig)
- [`ctx.render`](#ctxrender)
- [`ctx.audio`](#ctxaudio)
- [`ctx.storage`](#ctxstorage)
- [`ctx.net`](#ctxnet)
- [`ctx.server`](#ctxserver)
- [`ctx.attachments`](#ctxattachments)
- [`ctx.ui`](#ctxui)
- [`ctx.client`](#ctxclient)
- [Duas notas finais](#duas-notas-finais)

## O que é o `ctx`

O `ctx` é a única porta do mod para o jogo. Ele chega como argumento do ponto de entrada:

```js
export default function register(ctx) {
  ctx.items.register('rubi', { name: 'Rubi', icon: 'gem' });
}
```

ou, na forma de classe:

```js
import { ModInitializer } from './mineclaude-sdk.js';

export default class Mod extends ModInitializer {
  /** @param {import('./types/mineclaude-mod').ModContext} ctx */
  onInitialize(ctx) {
    ctx.items.register('rubi', { name: 'Rubi', icon: 'gem' });
  }
}
```

Três coisas valem para ele sempre:

- **O `ctx` é congelado.** Você não acrescenta nem troca campos dele. Se tentar, a atribuição não pega (e em
  modo estrito lança). Guarde o seu próprio estado no fecho (closure) do `register`, em `ctx.storage` ou num
  registro seu.
- **O conteúdo congela depois do boot.** Os registros (`register`, `add`, `paint`...) só valem durante a carga.
  Terminada a carga de todos os mods, não se registra mais nada em jogo.
- **O mesmo código roda nos dois lados.** O mesmo mod é carregado no processo do servidor e na página do
  navegador de cada jogador. Blocos, itens, receitas, texturas, mobs e geração têm de ser registrados nos dois,
  na mesma ordem.

Três membros avulsos dizem onde você está:

```ts
readonly id: string;                                  // o id do mod ([a-z0-9_]+, igual ao nome da pasta)
readonly environment: 'server' | 'client' | 'worker';
isServer(): this is ServerModContext;
isClient(): this is ClientModContext;                 // página do navegador; false no worker de malhas
isWorker(): boolean;                                  // o worker que monta as malhas
```

`ctx.side` continua existindo por compatibilidade (`'server'` ou `'client'`; no worker ainda é `'client'`).
Para código que depende do DOM, use `isClient()`.

## `ModContext`, `ServerModContext` e `ClientModContext`

```ts
type ModContext = ServerModContext | ClientModContext;
```

Os dois lados compartilham uma base grande (`ModContextBase`) e divergem em cinco campos:

| Campo | No servidor (`ServerModContext`) | No navegador (`ClientModContext`) |
|---|---|---|
| `side` | `'server'` | `'client'` |
| `net` | `ServerNet`: manda para um jogador, para quem está perto, para todos | `ClientNet`: manda para o servidor e recebe |
| `server` | `ServerLookup`: quem está online, quem está perto, quem está vendo | toda chamada lança |
| `attachments` | leitura e escrita | só leitura: o que o `sync` do servidor mandou |
| `ui` | `ServerUi`: toda chamada lança (a interface é do navegador) | `ClientUi`: desenha HUD, painéis, telas |
| `client` | toda chamada lança | `ClientView`: o jogo rodando (jogador, blocos, câmera, teclas) |

Todo o resto — `blocks`, `items`, `recipes`, `events`, `commands`, `storage`, `render`, `audio`, `worldgen`,
`gases`, `modifiers` e companhia — existe nos dois lados, com o mesmo nome. Alguns desses grupos só **fazem**
algo de um lado: `ctx.storage` lança no navegador, `ctx.events.on` registra em qualquer lado mas só executa os
eventos de servidor no servidor, e os ganchos de bloco e item (`onInteract`, `onUse`) rodam no servidor.

Em TypeScript, `isServer()` e `isClient()` são type guards: dentro do `if` o `ctx` já é do tipo certo.

```ts
export default async function register(ctx: ModContext) {
  // conteúdo comum aqui: blocos, itens, receitas, texturas, mobs, geração
  if (ctx.isServer()) {
    const { default: server } = await import('./server/index.js');
    await server(ctx); // ctx é ServerModContext aqui
  }
  if (ctx.isClient()) {
    const { default: client } = await import('./client/index.js');
    await client(ctx); // ctx é ClientModContext aqui
  }
}
```

As seções seguintes percorrem um grupo de topo por seção, na ordem em que eles aparecem no tipo.

## `ctx.runtime`

O ciclo de vida do mod enquanto ele roda: escopos, tarefas com relógio e recursos que se soltam juntos. Existe
nos dois lados — no servidor as tarefas andam no tick, no navegador no quadro. O registro (`onStart`, `onStop`)
é feito dentro do `register`; o `onStart` é chamado com um escopo novo a cada ativação do mod naquele lado.

```ts
export interface ModLifecycle {
  onStart(callback: (scope: RuntimeScope) => void | (() => void) | { dispose(): void } | RuntimeTask): void;
  onStop(callback: (event: Readonly<{ reason: string }>) => void): void;
  stats(): RuntimeStats;
  capabilities(): Readonly<{ apiVersion: number; available: boolean; environment: 'server' | 'client' | 'worker'; updateKind: 'tick' | 'frame' | 'none' }>;
}
```

O `onStart` é síncrono. O que ele devolve é tratado como recurso do escopo: uma função de limpeza, um objeto com
`dispose()` ou uma tarefa — tudo se solta quando o escopo é descartado.

### O escopo

```ts
export interface RuntimeScope {
  readonly name: string; readonly active: boolean;
  child(name: string): RuntimeScope;
  track<T extends (() => void) | { dispose(): void }>(resource: T): T;
  listen(target: any, type: string, callback: (event: any) => void, options?: any): () => void;
  every(name: string, seconds: number, callback: (update: RuntimeUpdate) => void): RuntimeTask;
  after(name: string, seconds: number, callback: (update: RuntimeUpdate) => void): RuntimeTask;
  onUpdate(name: string, callback: (update: RuntimeUpdate) => void): RuntimeTask;
  dispose(): void;
}
export interface RuntimeTask { readonly active: boolean; cancel(): void }
export interface RuntimeUpdate { readonly dt: number; readonly time: number; readonly environment: 'server' | 'client' | 'worker' }
```

| Membro | O que faz |
|---|---|
| `child(name)` | um escopo dentro do escopo; descartar o pai descarta o filho |
| `track(resource)` | adota um recurso seu (função de limpeza ou objeto com `dispose()`) e o devolve |
| `listen(target, type, cb)` | registra um listener e devolve a função que o remove; o escopo também o remove |
| `every(name, s, cb)` | repete a cada `s` segundos |
| `after(name, s, cb)` | roda uma vez, `s` segundos depois |
| `onUpdate(name, cb)` | roda a cada atualização (tick no servidor, quadro no navegador) |
| `dispose()` | cancela as tarefas e solta os recursos do escopo |

`RuntimeUpdate` traz `dt` (segundos desde a atualização anterior), `time` (o relógio daquele lado) e
`environment`. `capabilities().updateKind` diz qual relógio você tem: `tick`, `frame` ou `none`.

### Os números

```ts
export interface RuntimeStats { mod: string; state: string; scopes: number; resources: number; tasks: number;
  calls: number; errors: number; deferred: number; totalMs: number; maxMs: number; activations: number }
```

`stats()` é a contabilidade do seu mod: quantos escopos, recursos e tarefas estão vivos, quantas chamadas e erros,
quanto tempo somaram (`totalMs`) e qual foi a chamada mais cara (`maxMs`).

```js
export default function register(ctx) {
  ctx.runtime.onStart((scope) => {
    scope.every('pulso', 5, (u) => console.log('meumod: +', u.dt, 's em', u.environment));
    return () => console.log('meumod: escopo encerrado');
  });
  ctx.runtime.onStop((e) => console.log('meumod: parou por', e.reason));
}
```

## `ctx.services`

Um mod publica uma API para os outros mods usarem, com nome e versão. Funciona nos dois lados, mas cada lado tem o
seu registro: um serviço publicado no servidor não aparece no navegador. Publique no `register`; consuma no
`whenReady` ou depois, enquanto o jogo roda.

```ts
export interface ServicesApi {
  provide<T extends object>(path: string, version: number, api: T): string;
  require<T extends object = any>(id: string, version?: number): Readonly<T>;
  get<T extends object = any>(id: string, version?: number): Readonly<T> | null;
  whenReady(callback: () => void): void;
  list(): ReadonlyArray<ModServiceInfo>;
}
export interface ModServiceInfo {
  readonly id: string; readonly mod: string; readonly version: number;
  readonly environment: 'server' | 'client' | 'worker';
}
```

| Método | Para que serve |
|---|---|
| `provide(path, version, api)` | publica o serviço deste mod; devolve o id completo (`meumod:clima`) |
| `require(id, version?)` | declara que você **precisa** daquele contrato; use os membros no `whenReady` ou em tempo de jogo |
| `get(id, version?)` | pergunta opcional: devolve a API ou `null` |
| `whenReady(cb)` | roda depois que todos os mods registraram, antes de o conteúdo congelar |
| `list()` | os serviços deste lado, com mod, versão e ambiente |

```js
export default function register(ctx) {
  ctx.services.provide('clima', 1, { friozinho: () => true });
  const clima = ctx.services.get('outromod:clima', 1);
  ctx.services.whenReady(() => { if (clima) console.log('meumod:', clima.friozinho()); });
}
```

## `ctx.components`

Dados por instância de item, com esquema, valores padrão e migração — a mochila guarda o que você escreveu na
pilha, e o dado acompanha o item pelo inventário, pelo baú e pelo chão. Declare nos dois lados (o navegador precisa
do esquema para desenhar a dica da pilha).

```ts
export interface ComponentsApi {
  register(path: string, definition: ComponentDefinition): string;
  attachItem(item: string, component: string, initial?: Record<string, ComponentValue>): void;
}
export interface ComponentDefinition {
  version: number; schema: Record<string, ComponentField>; default: Record<string, ComponentValue>;
  migrate?(data: Record<string, any>, fromVersion: number): Record<string, ComponentValue>;
}
export type ComponentValue = number | boolean | string;
export type ComponentField = 'number' | 'integer' | 'boolean' | 'string' | { type: 'number' | 'integer' | 'boolean' | 'string'; min?: number; max?: number; maxLength?: number };
export interface ItemInstance {
  item: string; n: number; dur?: number;
  components: Record<string, { version: number; data: Record<string, unknown> }>;
}
```

| Campo | O que é |
|---|---|
| `version` | versão do formato guardado; subir a versão exige `migrate` |
| `schema` | um `ComponentField` por chave: o tipo, e opcionalmente `min`, `max` e `maxLength` |
| `default` | o valor de cada chave numa pilha nova |
| `migrate(data, fromVersion)` | recebe o dado salvo e a versão dele; devolve o dado completo no formato atual |

`attachItem(item, component, initial?)` prega o componente num item (o seu ou de outro mod) e pode dar um valor
inicial diferente do `default`. Uma pilha vista pelo mod é um `ItemInstance`: o item, a quantidade `n`, a
durabilidade `dur` quando houver, e os componentes com a versão de cada um. Um item também pode declarar os
componentes dele direto, no campo `components` das props (ver `ctx.items`).

```js
export default function register(ctx) {
  ctx.components.register('carga', {
    version: 1,
    schema: { nivel: { type: 'integer', min: 0, max: 100 } },
    default: { nivel: 0 },
  });
  ctx.components.attachItem('meumod:varinha', 'meumod:carga', { nivel: 10 });
}
```

## `ctx.mods`

Quem mais está carregado, em que versão, e o rastro de quem mudou o conteúdo de quem. Vale nos dois lados.

```ts
export interface ModsApi {
  list(): readonly ModMetadata[];
  get(id: string): ModMetadata | null;
  isLoaded(id: string, spec?: VersionSpec): boolean;
  modifications(): readonly Modification[];
}
export interface ModMetadata { readonly id: string; readonly version: string }
export type VersionSpec = string | readonly string[];
```

- `isLoaded(id, spec?)` confere presença e, com `spec`, a versão. Um `VersionSpec` é uma string ou uma lista: os
  termos de uma string são combinados com E, e as strings da lista com OU. O `^` mantém o major, inclusive o zero.
- `modifications()` devolve o rastro das mudanças de conteúdo na ordem em que foram aplicadas: o que mudou, em que
  registro e por quem. A lista só está completa depois que todos os mods carregaram, então leia-a de um evento ou
  de um gancho, nunca dentro do `register`.

```js
export default function register(ctx) {
  if (ctx.mods.isLoaded('outromod', '^1.2.0')) {
    ctx.recipes.add({ out: 'meumod:liga', n: 1, in: [['outromod:cristal', 2]] });
  }
  console.log('meumod: carregados', ctx.mods.list().map((m) => `${m.id}@${m.version}`).join(', '));
}
```

## `ctx.tags`

Tags são conjuntos nomeados de registros — `#c:crystals`, `#meumod:minerios` — que vários mods alimentam juntos.
Servem de ingrediente de receita (`#mod:tag`), de alvo de `modify` e de filtro de ferramenta. Cada tipo tem o seu
conjunto: a tag `#c:crystals` de item e a de bloco são duas tags diferentes. Vale nos dois lados.

```ts
export interface TagsApi {
  add(kind: TagKind, tag: string, definition: { values: TagEntry[]; replace?: boolean; remove?: TagEntry[]; 'fabric:remove'?: TagEntry[] }): void;
  register(kind: TagKind, tag: string, definition: { values: TagEntry[]; replace?: boolean; remove?: TagEntry[]; 'fabric:remove'?: TagEntry[] }): void;
  has(kind: TagKind, tag: string, registryName: string): boolean;
  values(kind: TagKind, tag: string): readonly string[];
  revision(): number;
}
export type TagKind = 'item' | 'block' | 'mob' | 'fluid' | 'biome' | 'effect' | 'damage_type' | 'dimension' | 'zone' | 'weather';
export type TagEntry = string | { id: string; required?: boolean };
```

| Membro | O que faz |
|---|---|
| `add(kind, tag, def)` | acrescenta entradas à tag; `register` é apelido dele |
| `def.values` | os nomes a acrescentar; cada um é um nome completo ou `{ id, required }` |
| `def.replace` | `true` joga fora o que outros mods já tinham posto, em vez de somar |
| `def.remove` | tira entradas da tag (`fabric:remove` é aceito com o mesmo efeito) |
| `has(kind, tag, nome)` | aquele registro está na tag? |
| `values(kind, tag)` | os nomes que a tag tem agora |
| `revision()` | muda a cada recarga dos dados: serve para invalidar um cache seu |

Uma entrada com `required: false` não derruba o boot quando o registro não existe (o mod dono pode não estar
instalado). O mesmo conjunto pode ser declarado em JSON, na pasta `data/<mod>/` do seu mod.

```js
export default function register(ctx) {
  ctx.items.register('rubi', { name: 'Rubi', icon: 'gem' });
  ctx.tags.add('item', 'c:gems', { values: ['meumod:rubi', { id: 'outromod:safira', required: false }] });
  ctx.recipes.add({ out: 'meumod:anel', n: 1, in: [['#c:gems', 1]], station: 'crafting_table' });
}
```

## `ctx.lang`

Os idiomas do mod. Os arquivos `lang/<código>.json` da pasta do mod (`pt_br.json`, `en_us.json`) já estão
carregados quando o `register` roda; `add` faz a mesma coisa em código. Toda chave começa com o id do mod. Vale
nos dois lados: o servidor resolve em `pt_br`, o navegador no idioma da página.

```ts
export interface LangApi {
  add(code: string, texts: Record<string, string>): string;
  register(code: string, texts: Record<string, string>): string;
  text(key: string, args?: TranslatableText['args'], fallback?: string): TranslatableText;
  get(key: string, args?: TranslatableText['args'], code?: string): string;
  has(key: string, code?: string): boolean;
  codes(): string[];
  current(): string;
  autoKey(kind: string, registryName: string): string | null;
  readonly default: string;
}
export interface TranslatableText {
  readonly key: string;
  readonly args?: Readonly<Record<string, string | number | boolean | TranslatableText>>;
  readonly fallback?: string;
}
export type Text = string | TranslatableText;
```

O importante é o `text`: ele monta um **texto traduzível**, aceito em todo lugar onde cabe uma string de tela —
nome de bloco, de item, de mob, de efeito e de regra, `lore`, ajuda de comando, mensagens ao jogador, HUD e telas
de mod. A resolução acontece do lado de quem lê, no idioma dele: a língua do jogador, depois `pt_br`, depois o
`fallback` e por fim a própria chave. Os `{nome}` do texto são trocados pelos `args`, e um arg pode ser outro
texto traduzível.

| Método | Quando usar |
|---|---|
| `text(key, args?, fallback?)` | para tudo que o jogador vai ler: a tradução é feita no lado dele |
| `get(key, args?, code?)` | quando você precisa da string agora, neste lado (log, comparação) |
| `has(key, code?)` | a chave tem texto naquele idioma? |
| `codes()` | todos os idiomas carregados, `pt_br` primeiro |
| `current()` | o idioma deste lado |
| `autoKey(kind, nome)` | a chave que um registro gera: `autoKey('item', 'meumod:rubi')` → `meumod:item.rubi` |
| `default` | `'pt_br'`, o idioma em que os literais do jogo estão escritos |

```js
export default function register(ctx) {
  ctx.lang.add('pt_br', { 'item.rubi': 'Rubi', 'msg.oi': 'Oi, {nome}!' });
  ctx.lang.add('en_us', { 'item.rubi': 'Ruby', 'msg.oi': 'Hi, {nome}!' });
  ctx.items.register('rubi', { name: ctx.lang.text('item.rubi'), icon: 'gem' });
}
```

## `ctx.resources`

O lado de leitura dos recursos do mod: o que reagir quando os dados recarregam, as condições que um JSON de receita
ou de loot cita no campo `conditions`, e a sobreposição de recurso de outro mod (o que um resource pack faz). Os
listeners de recarga são do servidor; as condições e a sobreposição valem nos dois lados.

```ts
export interface ResourcesApi {
  onReload(fn: (e: ResourceReloadEvent) => void, opts?: { id?: string, after?: string | string[] }): string;
  reloadOrder(): string[];
  condition(name: string, test: (e: { values: string[], mods: string[], side: string, condition: string }) => boolean): string;
  flag(name: string, on?: boolean): string;
  met(conditions: ResourceCondition | ResourceCondition[] | undefined): boolean;
  conditions(): string[];
  overlay: ResourceOverlayApi;
}
export interface ResourceCondition {
  condition: string;
  values?: string | string[];
  value?: ResourceCondition;
  mods?: string[];
  items?: string[];
  flags?: string[];
}
export interface ResourceReloadEvent {
  readonly reason: string;
  readonly listener: string;
  readonly success?: boolean;
  readonly server?: ServerApi;
}
```

| Método | O que faz |
|---|---|
| `onReload(fn, opts?)` | roda a cada recarga dos dados; `opts.id` nomeia o listener (padrão `default`) e `opts.after` lista os que têm de rodar antes. Devolve o nome completo. Erro num listener não derruba os outros nem a recarga |
| `reloadOrder()` | os listeners registrados, na ordem em que vão rodar |
| `condition(name, test)` | registra uma condição deste mod; `test(e)` recebe os `values` escritos no JSON |
| `flag(name, on?)` | liga ou desliga uma marca deste mod, lida pela condição embutida `engine:flag` |
| `met(conditions)` | avalia um `conditions` aqui mesmo. Condição que ninguém registrou é erro, não um `false` calado |
| `conditions()` | as condições que existem, as embutidas (`engine:*`) incluídas |

No JSON, o campo `condition` aceita `engine:all_mods_loaded`, `engine:flag`, `engine:not` (com a condição
contrária em `value`) ou o nome de uma condição sua, como `meumod:minha_condicao`. Um nome curto vale como
`engine:`.

`overlay` sobrepõe recurso alheio:

```ts
export interface ResourceOverlayApi {
  lang(code: string, texts: Record<string, string>, opts?: { priority?: number }): string;
  texture(target: string, painterOrFile: string | ((t: PainterTools) => void), opts?: { size?: number, priority?: number, sha256?: string }): string;
  list(): { mod: string, kind: string, target: string, priority: number }[];
}
```

`overlay.lang` é a única porta além da regra "um mod só nomeia as chaves dele" do `ctx.lang.add`, e a chave precisa
vir com o namespace do dono. `overlay.texture` troca o **desenho** de uma textura já registrada mantendo a fatia
dela no atlas: o id não se move, só o desenho muda — `painterOrFile` é uma função de pintura (como em
[guia-de-mods.md](guia-de-mods.md), seção 7) ou um `.png` deste mod.

```js
export default function register(ctx) {
  ctx.resources.flag('festa', true);
  ctx.resources.condition('tem_festa', (e) => e.values.includes('sim'));
  ctx.resources.onReload((e) => console.log('meumod: recarregou por', e.reason), { id: 'cache' });
  ctx.resources.overlay.lang('pt_br', { 'mineclaude:item.bread': 'Pãozinho' });
}
```

## `ctx.blocks`

Registrar blocos, mudar blocos que já existem e ler o estado de uma célula. O registro acontece nos dois lados; o
que é só do navegador (`dataAt`) ou só do servidor está marcado abaixo. Um bloco registrado ganha de graça o
**item** que o coloca, com o mesmo nome completo.

```ts
export interface BlocksApi extends RegistryListApi<BlockDefinition> {
  modify(target: FullName | `#${string}`, change: BlockPatch | ((block: BlockProps, info: ModifyInfo) => BlockProps | void), opts?: ModifyOptions): void;
  wrap<K extends BlockHookName>(target: FullName | `#${string}`, hook: K, wrapper: HookWrapper<BlockProps, K>, opts?: ModifyOptions): void;
  stateId(name: FullName, properties?: Record<string, StateValue>): number;
  stateAt(x: number, y: number, z: number): BlockState | null;
  register(path: string, props: BlockProps | BlockType): BlockDefinition;
  dataAt(x: number, y: number, z: number): Record<string, number | boolean | string> | null;
}
export interface RegistryListApi<D> {
  list(): FullName[];
  find(pred: (definition: D, name: FullName) => boolean): FullName[];
}
```

| Método | O que faz |
|---|---|
| `register(path, props)` | `path` é `[a-z0-9_]+` sem `:`; o nome completo é `<id do mod>:<path>`. Devolve o objeto do bloco: `registryName` é o nome completo, `String(bloco)` também dá o nome, e o objeto vale onde uma receita pede nome (`in: [[bloco, 1]]`) |
| `modify(target, change, opts?)` | muda um bloco de qualquer mod ou do jogo base — nome completo ou `#tag`. `change` é um patch parcial ou uma função que recebe uma cópia do descritor. O resultado passa pela mesma validação do registro |
| `wrap(target, hook, wrapper, opts?)` | envolve um gancho do bloco: `wrapper(original, e)`. Não chamar `original` troca o gancho |
| `stateId(name, properties?)` | o id numérico daquele estado do bloco |
| `stateAt(x, y, z)` | o estado da célula: `{ block, version, properties }`, ou `null` |
| `dataAt(x, y, z)` | só no navegador: os dados que o servidor mandou daquela célula (as chaves de `data.client` mais os padrões), em cópia; `null` quando o bloco não declara `data.client` ou não está carregado |
| `list()` / `find(pred)` | percorrer o registro. Pergunte de um evento, de um comando ou de um gancho, **nunca** dentro do `register`: a lista tirada durante a carga não teria o que um mod posterior acrescenta |

`opts.priority` é um inteiro de -1000 a 1000 (padrão 0): maior quer dizer aplicado depois, e portanto vencedor.
A função de `modify` recebe também um `info` com `name` e `kind`.

### As propriedades de um bloco

`BlockProps` tem dezenas de campos. Estas são as que a maioria dos mods usa; `name` e `tiles` são obrigatórias, e
`key`, `id` e `registryName` são reservadas (o jogo as define).

| Prop | O que é |
|---|---|
| `name` | o nome mostrado ao jogador (string ou texto traduzível) |
| `tiles` | `{ top, side, bottom, front? }`, ou `{ all }`: nome completo de textura registrada, ou nome curto de tile base (`'stone'`). Textura desconhecida recusa o bloco |
| `solid`, `noCollide`, `cutout`, `transparent` | sólido e com colisão; atravessável; sólido com pixels transparentes; não esconde o que está atrás |
| `translucent`, `doubleSided` | vidro: manda o bloco para o passe misturado do terreno; `doubleSided` desenha também o lado de dentro de cada face |
| `hardness` | segundos-base para quebrar (0 = instantâneo) |
| `tool`, `minTier`, `needsTool` | ferramenta que acelera (`pickaxe`...), nível mínimo (1 madeira, 2 pedra, 3 ferro), e se sem ela o bloco não dropa |
| `drop` | nome completo de item, ou `null` (nada). Omitido: dropa o próprio bloco |
| `chanceDrop` | `{ item, chance }`: um sorteio por quebra, `chance` de 0 a 1, além do `drop` |
| `loot` | tabela de loot (`mod:nome`) sorteada ao quebrar, no lugar de `drop` |
| `light` | luz emitida, 0 a 14 |
| `shape` | `cube`, `slab`, `stairs`, `torch`, `panel`, `cross`, `fence` ou `gate` |
| `top`, `replaceable`, `liquid` | altura do topo, se outro bloco pode substituí-lo, se é líquido |
| `gravity`, `needsFloor` | cai quando não tem apoio; solta a célula quando falta bloco sólido embaixo |
| `hidden` | o bloco não ganha item próprio na paleta |
| `group` | a aba criativa do item do bloco |
| `container`, `inventory` | baú do jogo (27 espaços, clique direito abre, derrubado ao quebrar); ou um inventário próprio guardado com o bloco |
| `sign` | placa: guarda um texto editável por posição |
| `data` | dados por bloco, só no servidor: `{ schema, default?, client?, version?, migrate? }`. As chaves de `client` chegam ao navegador (até 256 bytes de JSON por bloco) |
| `states` | estados declarados: `properties`, `default`, `variants` que trocam props, `placement` |
| `geometry`, `model`, `connections` | a forma: caixas, um modelo declarado, ou núcleo mais um braço por face que o jogo liga aos vizinhos |
| `tint` | a cor de cada `tintindex`; sem `model`, uma só entrada tinge todas as faces |
| `emissive`, `sway` | ignora a luz do mundo (não é fonte de luz: isso é `light`); balança no vento nos presets com sombreamento |
| `trunk` | tronco natural de árvore — ver abaixo |
| `climbable` | escada, trepadeira: tocando nele, andar para frente ou pular sobe, agachar segura |
| `speedFactor`, `groundFriction`, `jumpFactor`, `bounceFactor`, `fallDamageMultiplier` | o chão sobre o bloco: velocidade, aceleração e freio (menor escorrega), impulso do pulo, quanto da queda volta para cima, e o multiplicador do dano de queda |
| `blastResistance` | resistência a explosão, 0 a 8, independente da `hardness`: a célula sobrevive quando o valor é maior ou igual à força da explosão |
| `explosive` | o bloco é um explosivo: acendê-lo o troca pelo bloco `lit` e, vencido o pavio, o jogo faz a explosão declarada |
| `randomTicks`, `growthTicks` | põe a célula nos relógios de tique aleatório e de crescimento (um por segundo, perto de jogadores); exigem o gancho correspondente |
| `toggle`, `lighters` | o estado a que o clique direito leva (só o navegador lê, para prever a troca na hora); os itens que acendem este bloco na mão |
| `sounds`, `soundGroup`, `footstep`, `soundAbsorption` | sons de cavar, quebrar, colocar e pisar; o grupo de som; o material do passo; quanto o bloco absorve som |
| `onInteract`, `onPlace`, `onBreak` | os ganchos principais; `interactive` liga sozinho quando há `onInteract` |
| `onNeighborUpdate`, `onScheduledTick`, `onRandomTick`, `onGrowthTick`, `onEntityTick` | os ganchos de relógio e de vizinhança |
| `onSteppedOn`, `onEntered`, `onInside`, `onExited`, `onLanded` | contato: alguém em cima, entrou na célula, está dentro, saiu, caiu nela |
| `canPlaceAt`, `canSurvive`, `canOpenInventory`, `canConnect` | as perguntas de sim ou não, síncronas, só no servidor |

Os ganchos devolvem `'success'`, `'fail'`, `'pass'` ou um booleano. Blocos em detalhe:
[guia-de-mods.md](guia-de-mods.md), seção 5.

### `trunk`: o tronco natural de uma árvore

O tronco de uma árvore do mundo é um bloco **natural**, à parte do tronco que o jogador constrói. Para o jogo ele é
um cubo sólido inteiro — colisão, mira, luz, física e servidor iguais ao tronco comum. Só o **desenho** muda: o
navegador o monta como um tronco 3D, escolhido pelos vizinhos de cada célula (miolo que afina para o topo, casca em
relevo, nós, raízes descendo em degraus no pé, galhos curtos e forquilha onde começa a copa). O detalhe só vale
perto da câmera; de longe o tronco volta a ser o cubo de sempre, e a sombra é sempre a do cubo.

```ts
trunk?: { of: string; style: 'oak' | 'conifer' | 'ipe' | 'savanna' | 'palm' | 'mossy' | 'canopy' | 'dead'; accent?: string };
```

| Campo | O que é |
|---|---|
| `of` | o tronco **comum** de que este é a forma natural. É o que cai quando o bloco é quebrado (construir não muda nada), e é o que o gerador troca: num gerador que pede troncos naturais, cada `of` que as árvores puseram vira este bloco depois de todos os estágios do chunk |
| `style` | o visual: `oak`, `conifer`, `ipe`, `savanna`, `palm`, `mossy`, `canopy` (raízes de escora) ou `dead` (topo quebrado) |
| `accent` | um tile a mais, para manchas (o musgo) |

Exige `solid: true` e recusa `geometry`, `model`, `connections`, `states`, `shape`, `cutout`, `noCollide` e
`translucent`. Use `hidden: true`: o item do bloco é o do `of`, não precisa de outro.

```js
ctx.blocks.register('carvalho_natural', {
  name: 'Tronco', solid: true, hidden: true, hardness: 2, tool: 'axe',
  tiles: { top: 'meumod:carvalho_top', side: 'meumod:carvalho_side', bottom: 'meumod:carvalho_top' },
  trunk: { of: 'meumod:carvalho', style: 'oak' },   // accent?: 'meumod:musgo'
});
```

### O clique agachado: `e.sneaking`

Nos ganchos `onInteract` (bloco) e `onUse` (item), o evento traz `e.sneaking`: `true` quando o jogador clicou
agachado — Shift no teclado, o botão de descer no toque. O costume é usar o clique comum para abrir o painel da
máquina e guardar a **ação rápida** para o clique agachado.

```ts
export interface HookEvent extends BaseEvent { readonly sneaking?: boolean; readonly random: BlockRandomSource; readonly structure?: BlockStructureSnapshot | null; readonly pos: Pos; readonly block: FullName; readonly item: FullName | null; readonly placement?: PlacementContext | null; readonly stack?: Readonly<ItemInstance>; readonly data?: Record<string, any> | null }
export interface UseHookEvent extends BaseEvent { readonly sneaking?: boolean; readonly random: BlockRandomSource; readonly pos: Pos | null; readonly block: FullName | null; readonly item: FullName | null }
```

### Exemplo

```js
import { BlockType } from './mineclaude-sdk.js';

class Forno extends BlockType {
  name = 'Forno de rubi'; solid = true; hardness = 2; tool = 'pickaxe';
  tiles = { all: 'meumod:forno' };
  data = { schema: { on: 'boolean' }, default: { on: false } };
  onInteract(e) {
    if (e.sneaking) { e.world.setBlockData(e.pos, { on: !e.data.on }); return 'success'; }
    e.player.openScreen('meumod:painel_forno', { pos: e.pos });
    return 'success';
  }
}
export default function register(ctx) { ctx.blocks.register('forno', new Forno()); }
```

## `ctx.items`

Registrar itens, abas criativas e desenhos de ícone, e mudar itens que já existem. Registro nos dois lados. O item
de um bloco segue o bloco: para mexer nele, use `ctx.blocks.modify`.

```ts
export interface ItemsApi extends RegistryListApi<ItemProps> {
  group(def: ItemGroupType | { id: string; name: Text; icon: FullName; order?: number }): string;
  groups: { modify(target: FullName, change: ItemGroupPatch | ((group: { id: string; name: Text; icon: FullName; order?: number }, info: ModifyInfo) => any), opts?: ModifyOptions): void };
  icon(path: string, icon: IconType | { rows: string[] }): string;
  iconPalette(fn: (item: ItemProps) => IconPalette): void;
  register(path: string, props: ItemProps | ItemType): FullName;
  modify(target: FullName | `#${string}`, change: ItemPatch | ((item: ItemProps, info: ModifyInfo) => ItemProps | void), opts?: ModifyOptions): void;
  wrap<K extends ItemHookName>(target: FullName | `#${string}`, hook: K, wrapper: HookWrapper<ItemProps, K>, opts?: ModifyOptions): void;
}
```

| Método | O que faz |
|---|---|
| `register(path, props)` | devolve o nome completo (`<id do mod>:<path>`) |
| `modify(target, change, opts?)` | muda um item de qualquer mod ou do jogo base, por nome completo ou `#tag` |
| `wrap(target, hook, wrapper, opts?)` | envolve `onUse`, `onEaten`, `onDamage` ou `onTooltip`: `wrapper(original, e)` |
| `icon(path, { rows })` | registra um **desenho** de ícone: 16 linhas de letras da paleta. Um desenho serve muitos itens e toma a cor de cada um — é por isso que não é textura. Registre antes de nomeá-lo no `icon` de um item |
| `iconPalette(fn)` | as cores dos ícones deste mod, uma função por mod: `(item) => ({ letra: '#rrggbb' })`. Ícone sem paleta própria é pintado com a do jogo |
| `list()` / `find(pred)` | percorrer o registro, depois da carga (nunca dentro do `register`) |

### `ctx.items.group`: a aba criativa

```js
ctx.items.group({ id: 'magia', name: 'Magia', icon: 'meumod:varinha', order: 25 });
```

Registra uma aba da paleta do criativo e devolve o id completo (`meumod:magia`). A ordem é pelo `order` — o jogo
usa 10, 20 e 30, então 25 entra no meio. Também aceita uma classe `ItemGroupType`. Registre a aba **antes** de
nomeá-la no `group` de um item; `group = 'magia'` é a aba do próprio mod, `'mineclaude:gear'` é uma do jogo. Item
sem grupo não está em aba nenhuma: só a busca o acha. `ctx.items.groups.modify` muda o rótulo, o ícone e o lugar de
uma aba de qualquer mod; para mover um item de aba, mude o item (`ctx.items.modify(item, { group })`).

### As propriedades de um item

`name` é obrigatório; `key`, `id`, `registryName` e `block` são reservadas.

| Prop | O que é |
|---|---|
| `name` | o nome mostrado ao jogador (string ou texto traduzível), não vazio |
| `icon` | um ícone embutido (`apple`, `stick`, `gem`, `sword`...) ou o nome de uma textura já registrada |
| `texture`, `textureSize` | o caminho de um PNG dentro da pasta do mod (`textures/item/gema.png`) e o lado dele: 16 (padrão), 32 ou 64. Dispensa `icon` |
| `icon3d` | `false` deixa o ícone plano no inventário, na barra e nas telas; a mão e o chão continuam 3D. Padrão: 3D |
| `model`, `tint` | um modelo 3D próprio para item que não é bloco (dispensa `icon`, não vale com `texture`), e a cor de cada `tintindex` dele |
| `group` | a aba criativa |
| `stack` | 1 a 64 (padrão 64) |
| `maxDur` | durabilidade máxima, 1 a 1.000.000; exige `stack: 1` explícito |
| `damage` | o dano de ataque usado pelo servidor (padrão 1) |
| `food`, `foodEffects`, `foodRemainder`, `alwaysEdible` | pontos de fome; até 4 efeitos ao comer; o que sobra depois (uma tigela vazia); se pode ser comido de barriga cheia |
| `tool` | `{ type, tier, speed, effectiveBlocksTag?, transformer?, attackWear? }` |
| `weapon`, `guards` | `{ reach?, cooldownMs?, shieldBreakMs? }`; e `guards` faz o item virar escudo ao segurar o clique direito (exige `maxDur`) |
| `armor` | `{ part, points }`: 0 capacete, 1 peitoral, 2 calça, 3 bota; `points` de 0 a 20 |
| `attributes` | `[{ attribute, amount, operation, slot? }]` com o item na mão (ou vestido, se armadura) |
| `ranged` | atira projéteis: `{ mode, ammo }`, com `mode` sendo `'charge'` (carrega segurando) ou `'load'` (arma e depois dispara) |
| `places` | o bloco que o clique direito num bloco põe (as sementes põem o trigo); onde ele cabe é regra do bloco |
| `useRemainder` | o item que fica na mão quando este é gasto ao ser posto no mundo (o balde vazio) |
| `inventory` | uma mochila: `{ size, screen }`, de 1 a 27 slots. O item não empilha nem tem durabilidade; cada pilha leva o conteúdo nos componentes |
| `components` | os componentes por instância que o item nasce com (declarados em `ctx.components.register`) |
| `lore`, `rarity` | até 6 linhas de 80 caracteres sob o nome; `common`, `uncommon`, `rare` ou `epic` |
| `use` | uso com duração: `{ duration, start?, tick?, finish?, stop? }`, contado em ticks pelo servidor (20 por segundo) |
| `onUse`, `onEaten`, `onDamage`, `onTooltip` | clique direito (num bloco ou no ar); depois de comer; ao gastar durabilidade; linhas a mais na dica da pilha, no navegador |

Itens e receitas em detalhe: [guia-de-mods.md](guia-de-mods.md), seção 6. Ícones e texturas: seção 7.

```js
import { ItemType } from './mineclaude-sdk.js';

class Varinha extends ItemType {
  name = 'Varinha'; icon = 'stick'; stack = 1; maxDur = 100; group = 'magia';
  onUse(e) { if (e.sneaking) return 'pass'; e.player.message('faísca!'); return 'success'; }
}
export default function register(ctx) {
  ctx.items.group({ id: 'magia', name: 'Magia', icon: 'mineclaude:diamond', order: 25 });
  ctx.items.register('varinha', new Varinha());
}
```

## `ctx.recipes`

Receitas de bancada, fornalha e das estações que um mod registra, as abas do livro de receitas, e os tipos de
processamento próprios. Registro nos dois lados; as consultas (`find`, `match`, `list`) só valem em tempo de jogo.

```ts
export interface RecipesApi {
  add(recipe: Recipe | RecipeType): FullName;
  register(recipe: Recipe | RecipeType): FullName;
  modify(key: FullName, change: RecipePatch | ((recipe: Recipe, info: ModifyInfo) => Recipe | void), opts?: ModifyOptions): void;
  remove(key: FullName, opts?: ModifyOptions): void;
  category(def: RecipeBookCategoryType | { id: string; name: string; icon: FullName; order?: number; station?: 'crafting' | 'furnace' }): string;
  registerType(path: string, definition?: { parse?: (fields: Record<string, unknown>) => Record<string, unknown> | void }): string;
  addTo(type: FullName, recipe: ProcessingRecipeInput): void;
  find(type: FullName, item: FullName | ItemResource): ProcessingRecipe | null;
  match(type: FullName, stacks: readonly (ItemResource & { amount: number })[]): readonly ProcessingMatch[];
  list(type: FullName): readonly ProcessingRecipe[];
}
```

| Método | O que faz |
|---|---|
| `add(recipe)` | acrescenta a receita e devolve a chave dela (`<id do mod>:<chave>`). `register` é apelido |
| `modify(key, change, opts?)` | muda uma receita de qualquer mod ou do jogo base, mantendo a chave e o lugar. Um `pattern` novo recalcula o `in` |
| `remove(key, opts?)` | tira a receita do jogo; `opts.priority` ordena as remoções |
| `category(def)` | registra uma aba do livro de receitas e devolve o id completo; ordem por `order` (o jogo usa 10, 20, 30, 40) |
| `registerType(path, def?)` | declara um tipo de processamento seu; `parse` valida os campos próprios dele |
| `addTo(type, recipe)` | fornece uma receita a um tipo de processamento de qualquer mod |
| `find(type, item)` | a receita daquele tipo que aquela pilha satisfaz; entrada exata vence tag. Só em tempo de jogo |
| `match(type, stacks)` | todas as receitas que aquelas pilhas satisfazem; cada entrada usa uma pilha diferente |
| `list(type)` | todas as receitas registradas naquele tipo |

Os nomes só são resolvidos depois que todos os itens existem, então uma receita pode citar item de um mod que
carrega depois; um nome inexistente derruba o boot. Nome curto (`'rubi'`) é do **seu** mod; o do jogo base leva
`mineclaude:`.

### A receita

```ts
export interface Recipe {
  out: FullName;
  n: number;
  in?: Array<[FullName | `#${FullName}`, number]>;
  pattern?: string[];
  legend?: Record<string, FullName>;
  type?: 'shaped' | 'shapeless' | 'smelting';
  station?: null | 'crafting_table' | 'furnace' | FullName;
  category?: string;
  craftTab?: string;
  group?: string;
  key?: string;
}
```

| Campo | O que é |
|---|---|
| `out`, `n` | o que sai e quanto (1 a 64) |
| `in` | `[nome completo, quantidade]`; um `#mod:tag` vale como ingrediente. Opcional com `pattern`: sai do desenho |
| `pattern`, `legend` | com formato: 1 a 3 linhas de até 3 letras, `.` = casa vazia; `legend` diz o que cada letra é. Vale também o desenho espelhado. Sem `pattern`, a receita é sem formato |
| `station` | `null` (a mochila, o padrão), `'crafting_table'`, `'furnace'` ou o nome de uma tela de mod com `crafting` |
| `category`, `group` | a aba do livro de receitas (id curto = do próprio mod); receitas com o mesmo `group` viram um card só que alterna entre elas |
| `craftTab` | a aba da lista "Criar": `basico`, `ferramentas`, `combate`, `construcao` ou `fornalha`; outro nome é ignorado |
| `key` | `[a-z0-9_]+`: distingue duas receitas com a mesma saída |

```js
import { RecipeType } from './mineclaude-sdk.js';

class PicaretaRubi extends RecipeType {
  key = 'picareta_rubi'; type = 'shaped'; station = 'crafting_table';
  pattern = ['RRR', '.S.', '.S.']; legend = { R: 'meumod:rubi', S: 'mineclaude:stick' };
  out = 'meumod:picareta_rubi'; n = 1;
}
export default function register(ctx) {
  ctx.recipes.add(new PicaretaRubi());
  ctx.recipes.add({ out: 'meumod:bloco_rubi', n: 1, in: [['meumod:rubi', 9]], station: 'crafting_table' });
}
```

## `ctx.screens`

As telas com slots: o baú, a bancada, o painel de uma máquina. O servidor guarda e valida os slots; o navegador
só desenha. Quem define a tela é um `ScreenHandlerType`.

```ts
register(path: string, screen: ScreenHandlerType): FullName;
client(path: string, screen: Classe | { draw(ctx, frame) }): void;
station(name: string, opts?: { block?: FullName }): void;
modify(name: FullName, change: Partial<ScreenModifiableFields> | ((draft, info) => Partial<ScreenModifiableFields> | void), options?: { priority?: number }): void;
wrap(name: FullName, hooks: Record<string, (e, previous) => any>, options?: { priority?: number }): void;
```

`register` registra a tela nos dois lados. `client` dá a ela uma tela de navegador própria (uma classe com
`draw(ctx, frame)` e, se quiser, `onPointer(e)` e `onKey(e)`); sem ela o motor desenha uma tela padrão com a
grade dos slots, as barras e o inventário do jogador. `station` amarra uma estação de criação a um bloco, sem
tela própria.

### Os campos de um `ScreenHandlerType`

| Campo | Significado |
|---|---|
| `title` | o título do painel |
| `slots` | os slots, como campo (`slots = [...]`) ou como método (`slots({ size, data, player })`) que os devolve |
| `playerInventory` | desenhar também os 36 slots do jogador sob o painel (padrão `true`) |
| `temp` | tamanho do inventário temporário (slots `'temp'`), até 1024 |
| `properties` | nomes de inteiros que o servidor calcula e sincroniza (até 8). Exige `readProperties` |
| `bars` | barras de progresso sobre as propriedades (até 4), desenhadas pela tela padrão |
| `buttons` | quantos botões (ids 0..buttons-1) o `onButton` aceita, até 16 |
| `crafting` | uma grade 2×2 ou 3×3: `{ size, station?, block?, x?, y? }`. Faz da tela uma estação que receitas citam em `station` |
| `data` | JSON (até 512 bytes) que a tela do navegador recebe |

Os ganchos, todos de servidor: `canInsert(e)`, `canTake(e)`, `readProperties(e)`, `quickMove(e)` (shift-clique;
use `e.insert`), `canOpen(e)`, `onOpen(e)`, `onClose(e)`, `onSlotChange(e)`, `onButton(e)`.

Um `Slot` nasce de `new Slot(source, index, x, y, rules)` ou de um atalho estático: `Slot.block`, `Slot.item`,
`Slot.temp`, `Slot.player`, `Slot.armor`, `Slot.offhand`. O `source` diz de onde vem a pilha — `'block'`
(inventário do bloco aberto), `'item'` (conteúdo guardado no item aberto), `'temp'` (inventário temporário desta
abertura: o que sobra volta ao jogador ao fechar) — ou, só para posicionar os do jogador, `'player'` (0..35),
`'armor'` (0..3) e `'offhand'`. As regras são `maxCount` (1..64), `outputOnly` e `label`.

```js
import { ScreenHandlerType, Slot } from './mineclaude-sdk.js';

class Prensa extends ScreenHandlerType {
  title = 'Prensa';
  properties = ['progresso'];
  bars = [{ label: 'Prensando', value: 'progresso', max: 'total' }];
  slots = [Slot.block(0, 44, 20), Slot.block(1, 116, 20, { outputOnly: true })];
  readProperties(e) { return { progresso: e.data?.progresso ?? 0 }; }
}
ctx.screens.register('prensa', new Prensa());
```

### Telas de controle: o esquema `controls`

Uma tela de controle é o painel de uma máquina: campos que o **motor** desenha, no computador e no celular, sem
você escrever nenhuma classe de navegador. Declare `controls` como campo (uma lista) ou como método
`controls(e)` que devolve a lista ao abrir — útil quando as opções vêm de um registro.

Os sete tipos de campo (`kind`). Todos têm `id`, `label` e um `hint` opcional (uma linha ou até quatro):

| `kind` | Campos próprios | Para quê |
|---|---|---|
| `switch` | `on?`, `off?` (os rótulos dos dois lados) | um interruptor |
| `button` | — | uma ação |
| `selector` | `options: [{ value, label, color? }]` | escolher uma de várias |
| `slider` | `min`, `max`, `step?`, `unit?`, `decimals?`, `presets?` | um número contínuo |
| `slot` | `slot` (o índice em `slots`) | um dos slots da própria tela, com uma barra ao lado |
| `readout` | `style?` (`'text'`, `'bar'`, `'mix'`, `'dial'`), `unit?`, `decimals?`, `min?`, `max?`, `danger?` | uma leitura, só mostrar |
| `graph` | `series: [{ label, color, min, max, unit? }]`, `seconds?` | um histórico, uma linha por série |

Três membros completam o painel:

- **`readControls(e)`** devolve os valores ao vivo dos campos, por `id`. É lido duas vezes por segundo enquanto a
  tela está aberta, e só o que mudou vai ao navegador. **É obrigatório quando há `controls`.** Um campo que o
  jogador muda aceita também a forma `{ value, disabled?, note? }` (cinza e/ou uma linha embaixo).
- **`onControl(e)`** é chamado quando um jogador muda um campo (`switch`, `button`, `selector`, `slider`). O
  `e.value` já vem conferido contra a declaração do campo, e com o bloco ao alcance do jogador.
- **`controlsHint`** é uma linha que o painel mostra nas primeiras aberturas (até 160 caracteres) — o lugar de
  explicar o atalho do clique agachado.

O valor de um `readout` depende do `style`: `text` aceita texto, número ou `{ text, color }`; `bar` aceita
`{ ratio, text?, color? }`; `mix` aceita `[[nome, fração, cor], ...]`; e `dial` aceita um número ou
`{ value, text }`, entre `min` e `max`, vermelho depois de `danger`. O valor de um `graph` é `number[][]`, uma
série por linha, até 180 pontos cada, o mais novo no fim. O de um `slot` é `{ ratio?, text? }`.

### Os blocos que abrem essas telas

`blocks` é a lista de blocos (nomes completos) em que a tela de controle **abre mesmo sem inventário**, e em que
ela **fica aberta enquanto o bloco ali for um deles**. É o que liga o painel ao mundo: o jogador clica no bloco e
o painel abre; se o bloco for quebrado, o painel fecha.

```js
import { ScreenHandlerType } from './mineclaude-sdk.js';

class PainelDaBomba extends ScreenHandlerType {
  title = 'Bomba';
  playerInventory = false;
  blocks = ['meumod:bomba'];
  controlsHint = 'Clique agachado na bomba para ligar e desligar sem abrir o painel.';
  controls = [
    { id: 'ligada', kind: 'switch', label: 'Bomba', on: 'ligada', off: 'parada' },
    { id: 'vazao', kind: 'slider', label: 'Vazão', min: 0, max: 100, step: 5, unit: '%' },
    { id: 'alvo', kind: 'selector', label: 'Filtro', options: [
      { value: 'tudo', label: 'Tudo' }, { value: 'metano', label: 'Metano', color: '#8fd49a' },
    ] },
    { id: 'pressao', kind: 'readout', label: 'Pressão', style: 'dial', min: 0, max: 3, danger: 2, unit: 'atm' },
  ];
  readControls(e) {
    const d = e.data || {};
    return {
      ligada: !!d.ligada,
      vazao: { value: d.vazao ?? 50, disabled: !d.ligada, note: d.ligada ? null : 'Ligue a bomba.' },
      alvo: d.alvo ?? 'tudo',
      pressao: d.pressao ?? 1,
    };
  }
  onControl(e) {
    if (e.id === 'ligada') e.world.setBlockData(e.pos, { ligada: e.value });
    if (e.id === 'vazao') e.world.setBlockData(e.pos, { vazao: e.value });
  }
}
ctx.screens.register('painel_da_bomba', new PainelDaBomba());
```

O **clique agachado** é o par natural disso: no `onInteract` do bloco, `e.sneaking` vem `true` quando o jogador
clicou agachado, e aí o costume é fazer a ação rápida (ligar, esvaziar) em vez de abrir o painel.

### Mexer na tela de outro mod

`modify` troca campos de uma tela de qualquer mod, pelo nome completo. Livres: `title`, `playerInventory`,
`temp`, `buttons`, `data` e `extraSlots`. Barrados, com o motivo: `slots`, `properties`, `bars`, `crafting` e o
tamanho do inventário do bloco (está salvo no mundo). As mudanças são aplicadas depois que todos os mods
registraram, em ordem de `priority` (a última aplicada vence).

Um `extraSlots` é um slot em JSON (`x`, `y`, `maxCount?`, `outputOnly?`, `label?`, `accepts?`) que vive no
inventário **temporário** da tela — o que está nele volta ao jogador ao fechar — e entra no fim do layout, para
nenhum slot da tela original mudar de lugar.

`wrap` embrulha um gancho da tela de outro mod. O `previous(e?)` roda o de baixo. Dá para embrulhar
`canInsert`, `canTake`, `onOpen`, `onClose`, `onSlotChange`, `onButton`, `quickMove`, `canOpen` e
`readProperties`.

```js
ctx.screens.modify('mineclaude:chest', { title: 'Baú reforçado' });
ctx.screens.wrap('mineclaude:chest', {
  canInsert: (e, previous) => (e.stack.item === 'meumod:lixo' ? false : previous()),
});
```

## `ctx.capabilities`

Capacidades são APIs que um bloco, um item, um mob ou um jogador **oferecem** por nome: quem quer usar procura pelo
nome, quem oferece registra um provedor. É o jeito de dois mods se encaixarem sem se conhecer. O objeto existe nas
duas cargas; as consultas valem dentro de callbacks de execução, no servidor.

```ts
get<A = unknown>(name: FullName): BlockCapability<A>;
item<A = unknown>(name: FullName): ItemCapability<A>;
entity<A = unknown>(name: FullName): EntityCapability<A>;
```

| Método | Para quem |
|---|---|
| `get(nome)` | a capacidade de um **bloco** numa posição do mundo |
| `item(nome)` | a capacidade de um **item** (o fluido de um balde é `mineclaude:fluid_storage` por aqui) |
| `entity(nome)` | a capacidade de um **mob** ou de um **jogador** |

Cada um devolve uma alça com os métodos de registro e de busca:

```ts
export interface BlockCapability<A> {
  readonly id: FullName;
  registerForBlocks(provider: (e: BlockCapabilityEvent) => A | null | undefined, ...blocks: FullName[]): void;
  registerFallback(provider: (e: BlockCapabilityEvent) => A | null | undefined): void;
  find(world: WorldApi, pos: Pos, context?: unknown): A | null;
  cache(world: WorldApi, pos: Pos): BlockApiCache<A>;
}
export interface ItemCapability<A> {
  readonly id: FullName;
  registerForItems(provider: (e: ItemCapabilityEvent) => A | null | undefined, ...items: FullName[]): void;
  registerFallback(provider: (e: ItemCapabilityEvent) => A | null | undefined): void;
  find(item: FullName | ItemResource, context?: unknown): A | null;
}
export interface EntityCapability<A> {
  readonly id: FullName;
  registerForMobs(provider: (e: EntityCapabilityEvent) => A | null | undefined, ...mobs: FullName[]): void;
  registerForPlayers(provider: (e: EntityCapabilityEvent) => A | null | undefined): void;
  registerFallback(provider: (e: EntityCapabilityEvent) => A | null | undefined): void;
  find(entity: unknown, context?: unknown): A | null;
}
export interface BlockApiCache<A> {
  readonly pos: Pos;
  readonly block: FullName | null;
  find(context?: unknown): A | null;
  invalidate(): void;
}
```

Regras que valem para os três:

- O **primeiro** provedor de cada bloco fica; nomear um bloco que não existe falha o boot.
- O `registerFallback` só é consultado quando não há provedor para aquele bloco, ou quando ele devolve `null`.
- `find` devolve `null` quando o chunk não está carregado.
- `cache(world, pos)` guarda o provedor de **uma** posição e só pergunta de novo quando o bloco dali muda.

O evento que o provedor recebe traz o contexto da consulta: `BlockCapabilityEvent` tem `world`, `pos`, `block`,
`state` e `context`; `ItemCapabilityEvent` tem `item`, `stack` e `context`; `EntityCapabilityEvent` tem `entity`
(o jogador ou o mob), `target`, `player` (se é jogador) e `context`.

```js
export default function register(ctx) {
  const armazem = ctx.capabilities.get('mineclaude:item_storage');
  armazem.registerForBlocks((e) => ({
    insert: () => 0,
    extract: () => 0,
    list: () => [{ item: 'meumod:po_de_pedra', amount: 8 }],
  }), 'meumod:silo');
}
```

## `ctx.interactions`

O clique direito do jogador, antes dos ganchos do bloco e do item. Serve para um mod reagir a um clique que não é
dele — num bloco do jogo, ou com um item de outro mod. Só no servidor.

```ts
onUseBlock(callback: (e: InteractionEvent) => InteractionResult | void): void;
onUseItem(callback: (e: InteractionEvent) => InteractionResult | void): void;
```

A resposta é `'success'`, `'fail'` ou `'pass'`. A **primeira** resposta diferente de `'pass'` encerra a cadeia, antes
do gancho de interação do bloco e dos demais ganchos. Não responder nada equivale a `'pass'`.

O `InteractionEvent` é só leitura: `pos` e `block` (ambos `null` quando o clique foi no ar), `item` (o que o jogador
segura, ou `null`), `hand` (sempre `'main'`), `player`, `world` e `server`.

```js
export default function register(ctx) {
  ctx.interactions.onUseBlock((e) => {
    if (e.block !== 'meumod:sino' || e.item !== 'meumod:martelo') return 'pass';
    e.player.message('Dong!');
    return 'success';
  });
}
```

## `ctx.blockTransforms`

Transformadores são tabelas com nome que dizem "esta ferramenta troca este bloco por aquele". A enxada do jogo é uma
delas (`mineclaude:tilling`). Um item aponta para a tabela em `tool.transformer`, e qualquer mod acrescenta, muda ou
tira entradas dela. A tabela vale nas duas cargas: o navegador a usa para prever o clique e o servidor decide.

```ts
add(transformer: FullName, entry: BlockTransformEntry): void;
register(transformer: FullName, entry: BlockTransformEntry): void;
modify(transformer: FullName, change: { entries: BlockTransformEntry[] } | ((draft: BlockTransformDef, info: ModifyInfo) => BlockTransformDef | void), opts?: ModifyOptions): void;
remove(transformer: FullName, from: FullName, opts?: ModifyOptions): void;
```

- `register` é apelido de `add`.
- Uma entrada é `{ from, to, airAbove? }`: o bloco `from` vira `to`, e com `airAbove: true` só quando o bloco de cima
  é ar.
- Dois mods com entrada para o mesmo bloco **não** derrubam o boot: vale a do mod carregado depois, e um aviso nomeia
  os dois. O mesmo mod repetir o bloco no mesmo transformador é erro.
- `modify` e `remove` rodam depois de todos registrarem. Transformador desconhecido, ou `remove` de um bloco que não
  está na tabela, derruba o boot nomeando o mod.
- `opts.priority` é um inteiro de −1000 a 1000 (padrão 0): maior aplica depois e vence.

```js
export default function register(ctx) {
  // o item 'meumod:raspador' declara tool.transformer = 'meumod:raspagem'
  ctx.blockTransforms.add('meumod:raspagem', { from: 'meumod:cobre_velho', to: 'meumod:cobre' });
  ctx.blockTransforms.remove('mineclaude:tilling', 'mineclaude:grass');
}
```

## `ctx.transfer`

As ferramentas para mover itens e fluidos entre recipientes sem perder nada no meio do caminho. Tudo acontece dentro
de uma **transação**: ou a operação inteira vale, ou nada vale. Só no servidor.

```ts
participant<S>(definition: { createSnapshot: () => S; readSnapshot: (snapshot: S) => void; onFinalCommit?: () => void }): { updateSnapshots(tx: Transaction): void };
readonly BUCKET: FluidAmount;
readonly BOTTLE: FluidAmount;
buckets(n: number): FluidAmount;
fluid(fluid: FullName | FluidVariant | null | undefined): FluidVariant | null;
sameFluid(a: FluidVariant | FullName | null | undefined, b: FluidVariant | FullName | null | undefined): boolean;
move<R>(from: ResourceStorage<R>, to: ResourceStorage<R>, filter: ((resource: R) => boolean) | null, maxAmount: number, parent?: Transaction | null): number;
simulateInsert<R>(storage: ResourceStorage<R>, resource: R, maxAmount: number, parent?: Transaction | null): number;
simulateExtract<R>(storage: ResourceStorage<R>, resource: R, maxAmount: number, parent?: Transaction | null): number;
findStoredResource<R>(storage: ResourceStorage<R>, filter?: ((resource: R) => boolean) | null): R | null;
findExtractableResource<R>(storage: ResourceStorage<R>, filter?: ((resource: R) => boolean) | null, parent?: Transaction | null): R | null;
extractAny<R>(storage: ResourceStorage<R>, maxAmount: number, filter?: ((resource: R) => boolean) | null, parent?: Transaction | null): { resource: R; amount: number } | null;
findExtractableContent<R>(storage: ResourceStorage<R> | null | undefined, filter?: ((resource: R) => boolean) | null, parent?: Transaction | null): { resource: R; amount: number } | null;
insertStacking<R>(slots: readonly ResourceStorage<R>[], resource: R, maxAmount: number, parent?: Transaction | null): number;
tryInsertStacking<R>(storage: ResourceStorage<R> | null | undefined, resource: R, maxAmount: number, parent?: Transaction | null): number;
getRedstoneSignal(storage: (ResourceStorage<unknown> & { signalViews?(): readonly { amount: number; capacity: number }[] }) | null | undefined): number;
combined<R>(parts: ResourceStorage<R>[]): ResourceStorage<R> & { readonly parts: readonly ResourceStorage<R>[] };
filtered<R>(backing: ResourceStorage<R>, opts?: { insert?: boolean | ((resource: R) => boolean); extract?: boolean | ((resource: R) => boolean) }): ResourceStorage<R> & { readonly backing: ResourceStorage<R> };
singleVariant<R>(opts: { capacity: number | ((resource: R) => number); keyOf?: (resource: R) => string; variant?: R | null; amount?: number; accepts?: ((resource: R) => boolean) | null; onChanged?: (() => void) | null }): ResourceStorage<R> & { readonly variant: R | null; readonly amount: number; readonly capacity: number; updateSnapshots(tx: Transaction): void };
tank(opts: { capacity: FluidAmount | ((fluid: FluidVariant) => FluidAmount); accepts?: ((fluid: FluidVariant) => boolean) | null; onChanged?: (() => void) | null; fluid?: FullName | null; amount?: FluidAmount }): ResourceStorage<FluidVariant> & { readonly fluid: FullName | null; readonly amount: FluidAmount; readonly capacity: FluidAmount; readonly bucketsHeld: number; updateSnapshots(tx: Transaction): void };
```

O que cada grupo faz:

| Grupo | Métodos |
|---|---|
| Medidas de fluido | `BUCKET` (1000), `BOTTLE` (250), `buckets(2.5)` = 2500 |
| Fluido como recurso | `fluid(nome)` dá a variante (`null` é o vazio; fluido desconhecido lança), `sameFluid(a, b)` compara duas |
| Mover | `move` simula a extração, insere e extrai só o que foi aceito; devolve quanto moveu |
| Simular | `simulateInsert` / `simulateExtract` dizem quanto caberia ou sairia, sem mexer em nada |
| Procurar | `findStoredResource`, `findExtractableResource`, `extractAny`, `findExtractableContent` (o primeiro recurso que sai e quanto dele há) |
| Encher slots | `insertStacking` enche as pilhas existentes antes dos slots vazios; `tryInsertStacking` faz isso se o recipiente tem slots, ou um `insert` direto se não |
| Leitura | `getRedstoneSignal` dá 0 a 15: a média do enchimento dos slots (os vazios contam) mais 1 se houver algo |
| Compor | `combined` mostra vários recipientes como um; `filtered` fecha um lado ou decide por recurso |
| Escrever o seu | `singleVariant` guarda um recurso por vez com capacidade; `tank` é a mesma coisa já pronta para fluido |
| Desfazer o seu estado | `participant` registra `createSnapshot` / `readSnapshot`; chame `updateSnapshots(tx)` antes de cada mudança |

### Transação

```ts
export interface Transaction {
  readonly nestingDepth: number;
  addCloseCallback(fn: (tx: Transaction, result: 'aborted' | 'committed') => void): void;
  addOuterCloseCallback(fn: (result: 'aborted' | 'committed') => void): void;
}
```

A transação vem do mundo: `world.transact(fn)` confirma quando `fn` retorna e desfaz quando ela lança (não pode ser
assíncrona), e `world.simulate(fn)` roda e **sempre** desfaz — é assim que se simula. Transações se aninham:
`nestingDepth` diz a que profundidade você está, `addCloseCallback` avisa quando esta fecha e
`addOuterCloseCallback` quando a mais externa fecha.

### ItemStorage

O recipiente de itens que `world.getItemStorage(pos, face?)` devolve (`null` sem recipiente ali ou com a face
fechada). O recurso é um `ItemResource`: `{ item, dur?, components? }`, imutável, sem quantidade.

| Membro | O que é |
|---|---|
| `size` | quantos slots (0 num recipiente escrito por código de mod, que não tem slots) |
| `supportsInsertion()` / `supportsExtraction()` | se entra e se sai |
| `isValid()` | `false` depois que o bloco foi trocado; dali em diante as operações devolvem 0 |
| `insert(item, amount, tx)` / `extract(item, amount, tx)` | devolvem quanto de fato entrou ou saiu |
| `list()` | o conteúdo, `{ item, amount }` |
| `views()` | o mesmo conteúdo no formato que o `ctx.transfer` lê, `{ resource, amount }` |
| `signalViews()` | todo slot, vazio também, com quanto tem e quanto caberia |
| `slot(i)` | o recipiente de um único slot desta visão (slot fora dela lança) |
| `getVersion()` | muda a cada alteração: serve para saber se algo mexeu |
| `getSlotCount?` / `getSlot?` / `getSlots?` | só em recipiente de slots do jogo (baú, inventário), não em recipiente escrito por mod |

O inventário do jogador é um `PlayerInventoryStorage` (de `player.itemStorage()`): os 36 slots da barra e da mochila,
sem armadura nem mão esquerda. Ele acrescenta `offer` (insere o que couber, pilhas existentes primeiro), `drop`
(larga no chão à frente do jogador, só se a transação externa confirmar) e `offerOrDrop` (um e, do que não couber, o
outro: nada se perde com o inventário cheio).

### FluidStorage

O tanque que `world.getFluidStorage(pos, face?)` devolve. A quantidade é em unidades, com 1000 = um balde; o recurso
é um `FluidVariant`, que diz **qual** fluido e nunca quanto.

| Membro | O que é |
|---|---|
| `capacity` | quanto cabe (0 em tanque de mod que não declara capacidade) |
| `fluid` | o nome completo do que está dentro, ou `null` com o tanque vazio |
| `amount` / `buckets` | quanto há, em unidades e em baldes inteiros |
| `supportsInsertion()` / `supportsExtraction()` / `isValid()` | como no `ItemStorage` |
| `insert(fluido, amount, tx)` / `extract(fluido, amount, tx)` | devolvem quanto entrou ou saiu |
| `list()` / `views()` | o conteúdo, e o conteúdo no formato que o `ctx.transfer.move` lê |
| `getVersion()` | muda a cada alteração |

Um bloco declara o tanque dele em `fluidStorage` (`BlockFluidStorage`): `capacity` de 1 a 1.024.000 unidades,
`fluids` com até 16 nomes ou `#tag` de fluido aceitos, `accepts(fluid)` para a última palavra na inserção e `faces`
para abrir ou fechar cada face. Trocar o bloco leva o fluido embora. Para itens, o equivalente é o `inventory` do
bloco; veja [guia-de-mods.md](guia-de-mods.md).

Quem escreve o próprio recipiente devolve um `ModItemStorage` ou um `ModFluidStorage` pela capacidade correspondente
(`insert`, `extract`, `list` e, opcionalmente, `capacity`, `supportsInsertion`, `supportsExtraction`, `isValid`,
`getVersion`) — e sempre o **mesmo objeto** para a mesma posição.

```js
export default function register(ctx) {
  ctx.interactions.onUseBlock((e) => {
    const caixa = e.world.getItemStorage(e.pos);
    const mochila = e.player.itemStorage();
    if (!caixa || !mochila) return 'pass';
    const n = e.world.transact((tx) => ctx.transfer.move(caixa, mochila, null, 64, tx));
    return n > 0 ? 'success' : 'pass';
  });
}
```

## `ctx.mobs`

O registro dos mobs: registrar os seus, mudar os de qualquer mod (o jogo base inclusive) e dizer onde, quando e
quanto cada um nasce. O registro acontece nas duas cargas, na mesma ordem (o id numérico vai pela rede); os ganchos
de comportamento correm só no servidor.

```ts
list(): FullName[];
find(pred: (definition: MobDefinition, name: FullName) => boolean): FullName[];
register(path: string, desc: MobDesc | MobType): string;
modify(target: FullName | `#${string}`, change: MobPatch | ((mob: MobDesc, info: ModifyInfo) => MobDesc | void), opts?: ModifyOptions): void;
wrap<K extends MobHookName>(target: FullName | `#${string}`, hook: K, wrapper: HookWrapper<MobDesc, K>, opts?: ModifyOptions): void;
spawnRule(mob: string, rule: SpawnRule | SpawnRuleType): void;
removeSpawn(mob: string, match?: { when?: string; zones?: string[]; category?: string } | ((rule: SpawnRule) => boolean)): void;
spawnCategory(path: string, desc: { cap: number; capByZone?: (zone: { key: string; hostileCap: number }) => number; attempt?: number; role?: 'passive' | 'hostile' }): string;
spawnCondition(path: string, desc: { situation: SpawnSituation; test: (e: SpawnSpot) => boolean } | ((e: SpawnSpot) => boolean)): string;
```

- `register(path, desc)` registra `<seumod>:<path>` e devolve o nome completo. O id vem depois dos mobs do jogo, na
  ordem de carga.
- `modify` troca números, drops e ganchos de um mob; o alvo é um nome completo ou uma `#tag` de mobs. No patch em
  objeto, `goals` troca o comportamento inteiro (veja abaixo).
- `wrap(alvo, gancho, wrapper)` envolve um gancho (`ai`, `onHurt`, `onDeath`...): o wrapper recebe `(original, e)`.
- `list()` dá os nomes registrados e `find(pred)` filtra pela definição.
- `spawnCategory` cria um **grupo de nascimento**: `cap` mobs dele perto de um jogador (48 blocos), `capByZone(zona)`
  para um teto que a zona escala, `attempt` (0 a 1) a chance por segundo de tentar havendo vaga, e `role`
  (`'passive'` ou `'hostile'`) para **ser** o grupo padrão daquele papel — um só no jogo inteiro.
- `spawnCondition` dá nome a uma condição para usar no `when` de uma regra.

### As propriedades de um mob

`MobDesc` é o descritor; `MobDefinition` é o que o registro guarda dele (o descritor conferido mais a `key`, o `mod`
dono, o `id`, o `registryName` e as flags que o motor lê) e é o que o `pred` de `find` recebe.

| Campo | Regra |
|---|---|
| `name` | o nome que aparece no jogo |
| `halfW`, `height` | meia largura 0,2 a 1,5 e altura 0,3 a 3 blocos (caixa de colisão e mira) |
| `behavior` | `'hostile'`, `'passive'`, `'neutral'`, `'npc'` (parado, não apanha de nada, não conta nos tetos) ou `'boss'` (hostil que também passa pelo caminho de chefe) |
| `role` | `'dungeon_boss'` ou `'camp_trader'`: este é o mob que o motor põe nessa estrutura. Um por papel no jogo inteiro; `modify` não troca o papel |
| `hp`, `speed` | 1 a 200 e 0,5 a 8 (`speed: 0` só em `npc`) |
| `damage` | 0 a 20; obrigatório em hostil, neutro e chefe, proibido em passivo e `npc` |
| `burn` | só hostil (chefe inclusive); padrão `true`, queima de dia |
| `xp` | experiência de quem mata, 0 a 1000 |
| `drops` | lista de `[item, min, max, chance?]` com nomes completos |
| `loot` | tabela de loot sorteada na morte, no lugar de `drops` |
| `gravity` | 0 (flutua) a 2; 1 é a do jogo |
| `knockbackTaken` | quanto do empurrão de um golpe o mob leva, 0 a 1 (padrão 1) |
| `attributes` | os atributos padrão do tipo, até 24, como `{ 'mineclaude:max_health': 40 }`; escrito aqui, este valor ganha de `hp`, `speed`, `damage`, `gravity` e `knockbackTaken` |
| `spawn` | as regras de nascimento (veja abaixo) |
| `category` | o grupo de nascimento; sem ele, o grupo padrão do papel do mob |
| `emoji` | o ícone dele na paleta do criativo |
| `model` | `{ parts: [{ size, pos, color, role?, pivotTop? }] }`: caixas de pixel-art; `role: 'leg' \| 'arm' \| 'head'` balança ao andar |
| `animations` | arquivo `.json` de animações, com `model` sendo uma classe |
| `sound` | a voz: o nome de um som registrado, ou `{ freq, end?, dur, wave?, gain?, count?, spacing?, step?, endStep?, hurt? }`. Sem ela, a voz neutra do motor |
| `breed` | `{ food, growMs?, cooldownMs? }`: criação com filhote que cresce em `growMs` (1000 a 3600000 ms, padrão 10 min) |
| `tame` | `{ item, chance }`: doma com o item na mão e clique direito; domado segue o dono e senta no clique dele |
| `mount` | `{ seat, speed, saddle?, free?, item? }`: montaria. `seat` 0,2 a 3 (altura do cavaleiro), `speed` 1 a 14 blocos/s, `saddle: true` pede a sela posta (e `item` diz qual item é a sela), `free: true` faz um veículo em que qualquer um entra na hora |
| `persistent` | `true`: o mob é salvo com o mundo e volta no reinício. Só em mob de mod, e não combina com `breed`/`tame`/`mount`. Tetos: 200 salvos por mod e 16 por mod por chunk |
| `feedRefusal` | 1 a 200 caracteres: o que o jogador ouve quando o clique direito não faz nada |
| `aiEvery` | de quantos em quantos ticks o `ai` é chamado, 1 a 20 (padrão 4) |
| `hurtLimit` | quantos mobs o `e.nearby` do `onHurt` lista, 1 a 256 (padrão 32) |
| `aiBudget` | quantos ms o `ai` pode demorar antes de ser cortado, 1 a 1000 (padrão 20) |
| `offscreenBudget` | quantas chamadas de `offscreen` por tick este tipo tem, 1 a 1024 |
| `offscreenNear` | `true`: o `offscreen` também roda dentro do raio de simulação |

Os ganchos, todos só no servidor:

| Gancho | Quando |
|---|---|
| `ai(e)` | a cada `aiEvery` ticks; devolve a decisão do tick (ou `null` para o comportamento padrão) |
| `travel(e)` | a cada tick, depois do movimento do jogo: altere `e.velocity` (blocos/s) |
| `control(e)` | a cada tick com alguém montado: dirija por `e.input`, mudando `e.velocity` e `e.yaw`. Precisa de `mount` |
| `onHit(e)` | o mob apanhou. `e.damage` é editável (0 a 100) e `e.cancel()` anula o golpe |
| `onHurt(e)` | o mob apanhou e o dano já valeu. `e.nearby` são os mobs vivos a até 16 blocos |
| `onDeath(e)` | o mob morreu, antes do evento de morte. `e.drops` é editável |
| `onInteract(e)` | clique direito de um jogador. `'success'` encerra, `'pass'` (ou nada) deixa o jogo seguir, `{ refuse }` recusa com um motivo |
| `onMount(e)` | um jogador montou no mob. Precisa de `mount` |
| `offscreen(e)` | a cada 10 ticks com o mob fora do raio de simulação (80 blocos) |

### O comportamento em peças (`GoalMob` e os goals)

Um **goal** é um pedaço de comportamento. `GoalMob` é a classe base de um mob feito de goals: `goals` é uma lista de
`[prioridade, goal]`, menor número primeiro, e a cada tick o primeiro goal cujo `canUse` aceita decide o tick.
`GoalMob` já traz o `ai` e o `onHurt` prontos, com `aiEvery = 1`, e repassa `onMount` e `onInteract` a todos os goals
(no `onInteract`, o primeiro que responder algo diferente de `'pass'` decide).

```ts
export declare class Goal {
  canUse(e: MobAiEvent, mem: Record<string, any>): boolean;
  tick(e: MobAiEvent, mem: Record<string, any>): MobAiDecision | null;
  onHurt(e: MobHurtEvent): void;
  onMount(e: MobMountEvent): void;
  onInteract(e: MobInteractEvent): MobInteractResult;
}
```

O goal é **compartilhado por todos os mobs do tipo**: o estado de cada mob fica em `e.mob.data`. O `mem` é um
rascunho por mob e por tick, compartilhado entre `canUse` e `tick`.

Os goals prontos do SDK:

| Goal | O que faz |
|---|---|
| `WanderGoal({ keepCd })` | passeia: para, escolhe um rumo e anda |
| `LookAtPlayerGoal({ range })` | olha para o jogador mais perto (padrão 6 blocos) e fica parado |
| `FleeGoal()` | foge de onde levou o golpe enquanto dura o susto |
| `TemptGoal({ item, range, stop })` | segue quem segura o item, a até `range` (6), parando a `stop` (1,5) |
| `MoveToGoalGoal()` | anda até o alvo fixo que o mundo deu ao mob; ponha depois dos goals que perseguem jogadores |
| `MeleeAttackGoal({ range, maxDy, reach, every, knock, speed, nav, climb, pack })` | persegue o jogador mais perto e bate corpo a corpo. `nav`: `'direct'`, `'steer'` ou `'straight'`; `climb` sobe a parede; `pack` faz o grupo virar a caça junto |
| `RangedAttackGoal({ sight, noticeDy, near, seeEvery, keepMin, keepMax, every, windup, range, maxDy, maxPitch })` | guarda distância e atira flechas: recua dentro de `keepMin` (6), aproxima além de `keepMax` (12), atira a cada `every` s (3) |
| `BurnInSunGoal({ damage, every, sky, light })` | queima à luz do dia: a cada `every` ticks (20) perde `damage` (4) de vida. `sky`: `'surface'` ou `'open'`. Não toma o tick: ponha primeiro |
| `BreedGoal({ food, loveMs, growMs, cooldownMs, dist, reach, every, messages })` | o jogador dá `food` e o mob fica pronto por `loveMs` (30 s); dois prontos a até `dist` (3) fazem um filhote, que cresce em `growMs` (10 min); cada pai descansa `cooldownMs` (5 min). Não toma o tick |
| `TameGoal({ item, chance, reach, subject, plural, chanceEnv, messages })` | o jogador segura `item` e clica: o mob come um e fica dele com `chance` (padrão 1/3); domado, o clique do dono senta e levanta. Não toma o tick |
| `MountGoal({ item, saddle, free, reach, subject, plural, messages })` | **o clique que monta**, e a sela: `item` é qual item é a sela, `saddle` se ela é necessária, `free` faz um veículo. Não toma o tick |
| `BondWithRiderGoal({ after, step, tries, rearMs, pace, messages })` | montaria selvagem com alguém em cima: pinoteia por `after` ms (1500 a 3000) e então fica domada de quem montou, ou derruba e empina por `rearMs` (900) |
| `RideGoal({ speed, gallop, gallopAfter, back, side, jump })` | leva o cavaleiro para onde ele manda: `speed` (7 blocos/s) à frente, ré e lado a uma fração, galope `gallop` (1,5) depois de `gallopAfter` s |
| `StayPutGoal()` | mob domado e sem ninguém fica onde o dono o deixou (menos fugindo: ponha o `FleeGoal` antes) |

`BreedGoal` e `TameGoal` expõem a regra como dado em `rule` (`{ food, growMs, cooldownMs }` e `{ item, chance }`), e
`GoalMob.kindData(mob)` junta as duas: é por elas que o navegador sabe que comida oferecer e que o motor sabe que o
mob se doma. `BreedGoal.canMate(mob, other)` decide o par, e cada goal com falas tem os textos padrão em
`MESSAGES` e os números em `DEFAULTS` (estáticos), para você trocar só o que quiser em `messages`.

Os campos `breed`, `burn`, `tame` e `mount` num mob registrado por objeto ligam esses goals com os padrões. Para
outros números, outras falas ou outra regra, use o goal na sua classe. Para escrever um goal seu, estenda `Goal` e
implemente `canUse` e `tick`.

`NeutralMob` é a classe pronta do neutro que investe em quem bate: `onHurt` e `ai` já feitos, `aiEvery = 1`, e os
estáticos `RALLY` (8 blocos dos do mesmo tipo que ficam bravos junto), `GIVE_UP` (24), `ANGER_MS` (20000) e `CHARGE`
(o golpe) para trocar na subclasse.

Pelo `modify` de outro mod, `goals` aceita a lista inteira (que **substitui** o comportamento) ou
`{ add, remove }` (que **muda** o que o mob registrou). A forma `{ add, remove }` exige o nome completo de um mob
feito de goals, nunca uma `#tag`, e `remove` aceita a classe do goal ou o nome dela. Dois mods somam: o `add` do
segundo cai em cima da lista que o primeiro deixou.

### As regras de nascimento

Uma regra (`SpawnRule`) diz onde e quando o mob nasce. O jogo tenta um ponto por segundo por jogador e olha a
**situação** dele.

| Campo | Regra |
|---|---|
| `when` | a situação, o nome de uma condição sua, ou uma lista. Situações: `'night'` (céu aberto à noite), `'day'` (céu aberto de dia), `'underground'` (caverna sob o jogador), `'dungeon'` (dentro de sala de masmorra: um mob, só hostil) |
| `zones` | as zonas em que vale (as do jogo, ou `mod:zona`) |
| `biomes` | nomes completos de bioma e/ou `#tag` de bioma; só em mundo com biomas |
| `ground` | os blocos em que pode nascer; `null` = qualquer um. Padrão: grama de dia, qualquer um nas outras situações |
| `light` | `{ min?, max? }` da luz do dia no momento (0 a 1) |
| `test(e)` | qualquer outra condição; o `e` é o ponto (`SpawnSpot`: `x`, `y`, `z`, `zone`, `biome`, `day`, `daylight`, `ground`, `underground`, `player`) |
| `weight` \| `chance` \| `fallback` | **escolha um** jeito de ser sorteada: `weight` 1 a 100 (o sorteio dos mods), `chance` 0 a 1 (em sequência, cada regra sorteia a sua) ou `fallback` + `weight` (o resto, por peso) |
| `group` | quantos nascem juntos: `[min, max]`, de 1 a 32 |
| `spread` | `'row'` (em fila), `'cluster'` (num bolo) ou `'pack'` (bolo com o mesmo grupo) |
| `cap` | no máximo tantos desse tipo a 48 blocos do jogador |
| `category` | o grupo de nascimento desta regra |

As regras vão no campo `spawn` do mob, ou por `ctx.mobs.spawnRule(mob, regra)` para acrescentar uma a **qualquer**
mob (os do jogo também), que vale na ordem de carga, depois das regras do próprio mob. `removeSpawn(mob, match?)`
tira regras: todas, as que casam com `{ when?, zones?, category? }`, ou as que a função aceitar. `SpawnRuleType` é a
mesma regra escrita como classe, com `when` nos campos e `test(e)` como método.

Somados, os mods nunca levam mais da metade dos sorteios: com peso total W das regras que valem ali, um mob de mod
sai em min(W, 100) / (min(W, 100) + 100) das vezes. Sem nenhuma regra servindo, nada é sorteado e o jogo sorteia como
sempre.

```js
import { GoalMob, MeleeAttackGoal, WanderGoal } from './mineclaude-sdk.js';

class Lobo extends GoalMob {
  name = 'Lobo'; halfW = 0.4; height = 0.9; behavior = 'neutral'; hp = 12; speed = 2.4; damage = 3;
  spawn = [{ when: 'night', weight: 20, group: [1, 2] }];
  goals = [[1, new MeleeAttackGoal({ range: 12, nav: 'steer' })], [2, new WanderGoal()]];
}

export default function register(ctx) {
  ctx.mobs.register('lobo', new Lobo());   // 'meumod:lobo'
}
```

## `ctx.effects`

Os efeitos de status (o veneno, a pressa). Registre nos dois lados, na mesma ordem: o id vai pela rede. Os ganchos
correm só no servidor; o navegador desenha o ícone no canto com o tempo restante.

```ts
register(path: string, desc: EffectDesc | EffectType): string;
modify(target: FullName | `#${string}`, change: EffectPatch | ((effect: EffectDesc, info: ModifyInfo) => EffectDesc | void), opts?: ModifyOptions): void;
wrap<K extends EffectHookName>(target: FullName | `#${string}`, hook: K, wrapper: HookWrapper<EffectDesc, K>, opts?: ModifyOptions): void;
```

- `register` devolve o nome completo.
- `modify` muda um efeito de qualquer mod (nome completo ou `#tag` de efeitos). Dá para mudar `name`, `color`, `icon`,
  `beneficial`, `every`, `attributes` e os três ganchos; a identidade não muda.
- `wrap(alvo, gancho, wrapper)` envolve `onApply`, `onTick` ou `onRemove`: o wrapper recebe `(original, e)`.

### EffectDesc

| Campo | O que é |
|---|---|
| `name` | o nome do efeito |
| `color` | a cor do ícone no HUD |
| `icon` | o ícone |
| `beneficial` | `true` dá borda verde, `false` vermelha |
| `every` | o intervalo do `onTick` em segundos, 0,25 a 60 (padrão 1) |
| `attributes` | modificadores enquanto o efeito dura: `[{ attribute, amount, operation }]`, com o `amount` valendo uma vez por nível. A forma antiga `{ speed, attack, defense }` (0,2 a 3) continua aceita |
| `onApply(e)` / `onTick(e)` / `onRemove(e)` | os ganchos, só no servidor |

`EffectType` é a mesma coisa escrita como classe: os campos são propriedades e os ganchos, métodos.

### EffectEvent

O que os três ganchos recebem:

```ts
export interface EffectEvent { readonly player: PlayerApi | null; readonly mob?: MobInfo | null; readonly effect: string; readonly level: number; readonly seconds?: number; world: WorldApi; server: ServerApi }
```

Num jogador vem `e.player` (e `e.mob` é `null`); num mob vem `e.mob` (e `e.player` é `null`). `effect` é o nome do
efeito, `level` o nível e `seconds` o tempo.

No jogador, quem liga e desliga é a `PlayerApi`: `addEffect(nome, segundos, nível?)`, `removeEffect`, `hasEffect` e
`effects()`. Até 3600 s, nível de 1 a 10 e no máximo 16 efeitos ativos; nível maior substitui, no mesmo nível vale o
tempo maior e nível menor é ignorado. A morte limpa tudo, rodando `onRemove`. Ao sair, os efeitos ficam salvos na
conta pelo nome com o tempo que faltava e voltam na entrada sem rodar `onApply` de novo; efeito de um mod que saiu é
descartado.

```js
import { EffectType } from './mineclaude-sdk.js';

class Energizado extends EffectType {
  name = 'Energizado'; color = '#68fff0'; beneficial = true; every = 1;
  attributes = [{ attribute: 'mineclaude:movement_speed', amount: 0.25, operation: 'add_multiplied_total' }];
  onTick(e) { e.player?.heal(1); }
}

export default function register(ctx) {
  ctx.effects.register('energizado', new Energizado());   // 'meumod:energizado'
}
```

## `ctx.gases`

Os gases do mundo: o que existe no ar, de onde ele sai, como ele se junta em volumes fechados e como uma máquina
o move. O **registro** (`register`, `source`, `field`, `device`, `rated`) roda nos dois lados, na mesma ordem; o
resto é do servidor e lança no navegador. O motor só mede e transporta: quem decide sufocar, ferir ou explodir é
o conteúdo.

### Registrar um gás

```ts
register(path: string, desc: GasDesc): FullName;
```

Um gás tem `name` e `color` (obrigatórios) e, opcionalmente, `formula` (só para mostrar), `density` (0,05..20 em
relação ao ar: acima de 1 desce e se junta no chão, abaixo de 1 sobe para o teto), `diffusion` (0..1 por
segundo), `outdoor` (a fração dele no ar livre, antes dos campos), `decay` (quanto some sozinho por segundo),
`background` (é o ar: não é rastreado, é o que sobra de cada camada; um por jogo), `breathable`,
`asphyxiant: { at, full }`, `toxic: { at, full, damage? }`, `flammable: { lower, upper }`, `smell`, `sound`,
`heatCapacity` (0,1..10) e dois campos que merecem nome próprio:

- **`spectrum`**: o espectro de absorção, 1 a 8 faixas `{ at, width?, strength }` — `at` é o centro, de 0 a 1 do
  espectro do jogo, `width` vai de 0,003 a 0,3 e `strength` de 0,01 a 10. Sem ele, o jogo deriva um da cor.
  É o que um analisador lê para dizer qual gás está ali.
- **`visibility`**: como o gás aparece. `from`..`full` é a fração em que ele começa a aparecer e em que já está
  cheio, `opacity` é a tinta na tela, e **`nakedEye`** (0 a 1) é o quanto ele aparece **a olho nu** como névoa no
  mundo. `nakedEye: 0` quer dizer que só um instrumento o vê. Sem o campo, o padrão é derivado da `opacity` e da
  cor (até 0,4 de opacidade fica invisível a olho nu).

```js
ctx.gases.register('metano', {
  name: 'Metano', formula: 'CH₄', color: '#8fd49a',
  density: 0.55, diffusion: 0.4,
  flammable: { lower: 0.05, upper: 0.15 },
  visibility: { from: 0.03, full: 0.4, opacity: 0.35, nakedEye: 0 }, // invisível sem instrumento
  spectrum: [{ at: 0.33, width: 0.02, strength: 3 }, { at: 0.71, width: 0.04, strength: 1.2 }],
});
```

### Fontes e campos

```ts
source(path: string, desc: GasSourceDesc): FullName;
field(path: string, desc: GasFieldDesc): FullName;
```

Uma **fonte** (`source`) são blocos que soltam ou gastam gás quando estão dentro de um volume fechado (ou na
borda dele). As vazões são em volumes de célula por segundo. `emits` solta, `consumes` gasta, `needs: { gas, min }`
só funciona com pelo menos aquela fração daquele gás ali (o fogo sem oxigênio apaga), `day: true` só de dia e
`false` só de noite, `flame: true` marca o bloco como chama (acende gás inflamável na faixa dele) e `heat` é o
calor por segundo, de -1000 a 1000 (1 esquenta uma célula de ar em 1 °C; negativo esfria).

```js
ctx.gases.source('fenda', {
  blocks: 'meumod:fenda_de_metano',
  emits: { 'meumod:metano': 0.2 },
  heat: 2,
});
```

Um **campo** (`field`) é uma contribuição procedural ao **ar livre**, avaliada só onde alguém pergunta. O
`sample(env)` recebe a posição e o que o motor sabe dela (`dimension`, `biome`, `underground`, `daylight`,
`height`, `seaLevel`, `time`) e devolve `pressure` (multiplica), `mix` (fixa uma fração), `add` (soma) e
`temperature` em °C (fixa a temperatura do ar) — ou `null` para não contribuir.

```js
ctx.gases.field('pantano', {
  dimensions: ['mineclaude:overworld'],
  sample(env) {
    if (env.biome !== 'mineclaude:swamp' || env.underground) return null;
    return { add: { 'meumod:metano': 0.01 }, temperature: 24 };
  },
});
```

### Dispositivos: `device`

```ts
device(path: string, desc: GasDeviceDesc): FullName;
devices(): GasDeviceDef[];
```

Um dispositivo são blocos que formam uma rede de dutos, face com face. O `kind` escolhe o papel: `pump` puxa da
célula livre ao lado e empurra para a rede; `conduit` leva (com no máximo um vizinho de rede é ponta aberta e
vaza); `vent` solta na célula livre do lado até `maxPressure`; `store` guarda até `capacity`; `cap` tampa; e
`sensor` lê. As vazões (`rate`, 0,001..100 por segundo) são em volumes de célula ao nível do mar.

O **controle** é abstrato, para uma rede de energia poder dirigir o dispositivo depois. Três ganchos de servidor:

- **`power(e)`** devolve 0..1, a fração de `rate` neste segundo (combustível, energia). Sem ele, 1.
- **`signal(e)`** devolve ligado ou desligado (um interruptor, um fio). Um `conduit` desligado fecha como um `cap`.
- **`filter(e)`** (só `pump`) devolve o que entra: `{ only: [...] }` ou `{ except: [...] }`, ou `null`.
- **`trip(e, reading)`** (só `sensor`) devolve o sinal de saída pela leitura, `true`/`false` ou 0..1 — um alarme.
  A última leitura fica guardada em `sensor(world, pos)`.

```js
ctx.gases.device('bomba', {
  blocks: 'meumod:bomba', kind: 'pump', rate: 0.5,
  power: (e) => (e.world.getBlock({ ...e.pos, y: e.pos.y - 1 }) === 'meumod:gerador' ? 1 : 0),
  filter: () => ({ only: ['meumod:metano'] }),
});
```

`rated(path, { blocks, burst })` classifica blocos que **cedem** quando a diferença de pressão entre os dois
lados passa de `burst` (0,05..20; 1 é a pressão ao nível do mar). O motor só mede: `stressed(world, maxAgeS?)`
lista os blocos sob pressão demais, o maior excesso primeiro, e quem decide o estouro é o conteúdo.

### Pendência: `sample`, `room` e `volumeAt`

Os volumes fechados são montados **preguiçosamente**, numa fila com orçamento por segundo. Por isso as três
leituras principais podem responder "ainda não sei":

- **`sample(world, pos, opts?)`** devolve um `GasSample` com `outdoors`, `pressure`, `gases` (fração de cada um),
  `partial` (fração × pressão: o que o corpo sente), `temperature`, `pressureRate`, `wind`, `room` — e
  **`pending`**. Com `pending: true` a resposta é a última conhecida daquela seção (ou, se nunca vista, os
  números do ar de fora como estimativa) e `outdoors` nunca é `true`. Pergunte de novo no segundo seguinte.
  `opts.exchange` soma ou tira gás ali no próximo passo: é assim que quem respira respira.
- **`room(world, pos)`** devolve o volume fechado com as camadas e as fontes, ou `null` ao ar livre. O
  `truncated` do resultado diz que ainda falta montar parte dele (longe demais, ou num trecho não carregado).
- **`volumeAt(world, x, y, z)`** é a alça única por onde um dispositivo fala com o gás. Enquanto o `pending` dela
  for `true`, `take`/`put` não movem nada — e isso **não** significa ar livre. Espere o tique seguinte.
  (`refused` é o nome antigo de `pending`.)

`emit(world, pos, gas, amount)` segue a mesma regra: devolve `false` ao ar livre **e** enquanto o volume ali está
pendente.

```js
ctx.events.on('tick', (e) => {
  for (const p of ctx.server.online()) {
    const air = ctx.gases.sample(e.world, p.pos(), { exchange: { 'mineclaude:oxygen': -0.001 } });
    if (air.pending) continue;                       // ainda montando: tente no próximo segundo
    if (air.partial['mineclaude:oxygen'] < 0.1) p.damage(1, 'meumod:asfixia');
  }
});
```

### Ver e ler o ar livre: `view` e `outdoor`

```ts
view(world, center, opts?): { nodes: GasViewNode[]; built: number };
outdoor(world, pos, underground?): { pressure: number; temperature: number; gases: Record<FullName, number> };
```

`view` é a leitura de instrumento: os volumes fechados até `radius` blocos de `center`, o mais perto primeiro,
cada um com as suas camadas e as folhas (seções de 16³) que o compõem. `maxNodes`, `maxLeaves` e `advance`
limitam o trabalho, e `build` deixa montar seções novas dentro do orçamento de fundo. É só leitura.

`outdoor` é o oposto: o ar **livre** numa posição calculado **só pelos campos**, sem montar seção nem varrer
coluna. O terceiro argumento diz se a célula está sob um teto. É a leitura barata, boa para um HUD.

```js
ctx.commands.register('ar', { run(e) {
  const o = ctx.gases.outdoor(e.world, e.player.pos());
  e.reply(`${o.pressure.toFixed(2)} atm, ${o.temperature.toFixed(0)} °C`);
  const perto = ctx.gases.view(e.world, e.player.pos(), { radius: 32, maxNodes: 4 });
  e.reply(`${perto.nodes.length} volumes fechados por aqui`);
} });
```

### O resto

`get(name)` e `list()` dão a definição registrada (com o espectro final e o `spectrumDeclared`, que diz se ele
foi declarado ou derivado da cor). `shape(dimension)` dá a régua vertical da dimensão (`height`, `seaLevel`) e
vale nos dois lados. `invalidate(dimension, pos, to?)` avisa que um bloco mudou. `onIgnite(fn)` é chamado quando
uma chama está num gás inflamável: devolva `true` para o gás queimar. `withdraw`, `inject` e `transfer` movem gás
sem dutos; `network`, `stored`, `draw` e `tickDevices` cuidam das redes; `sensor` dá a última leitura;
`save`/`load` e `saveDevices`/`loadDevices` guardam o estado; `stats()` e `skip(seconds)` servem a depuração e a
comandos de administrador.

## `ctx.attributes`

Os atributos de uma entidade: números com nome que jogadores e mobs carregam e que modificadores alteram. O
registro vale nos dois lados, na mesma ordem.

```ts
register(path: string, desc: AttributeDesc | AttributeType): string;
modify(target: FullName, change: AttributePatch | ((attribute: AttributeDesc, info: ModifyInfo) => AttributeDesc | void), opts?: ModifyOptions): void;
```

A descrição tem `name?`, `default`, `min`, `max`, `sync?` (manda o valor ao navegador do jogador: obrigatório
quando o cliente prevê algo com ele) e `role?`.

O **papel** (`role`) é o significado que o motor pergunta, em vez de escrever o nome do registro. Há um atributo
por papel no jogo inteiro, e os catorze papéis são do jogo base: `max_health`, `armor`,
`knockback_resistance`, `player_speed`, `player_damage`, `jump_strength`, `block_reach`, `entity_reach`,
`gravity`, `step_height`, `safe_fall_distance`, `scale`, `fly_speed`, `air_friction` e `max_hunger`. Um atributo
de mod normalmente deixa o papel de fora. O `modify` não troca o papel: ele é a identidade do atributo.

O valor final sai desta conta:

```text
valor = clamp(min, max, (base + soma(add_value)) * (1 + soma(add_multiplied_base)) * produto(1 + add_multiplied_total))
```

As três operações (`AttributeOperation`) são `'add_value'`, `'add_multiplied_base'` e `'add_multiplied_total'`.

```js
ctx.attributes.register('sorte', { name: 'Sorte', default: 0, min: 0, max: 10, sync: true });

ctx.events.on('playerJoin', (e) => {
  e.player.attributes.addModifier('meumod:sorte', { id: 'meumod:bonus', amount: 2, operation: 'add_value' });
});
```

Quem lê e escreve os valores é a entidade, não este grupo. Num jogador, `player.attributes` (`PlayerAttributes`)
tem `names()`, `get(name)` (o valor final), `base(name)`, `setBase(name, value)`, `addModifier`,
`removeModifier`, `hasModifier` e `modifiers(name)` — até 32 modificadores por atributo, e o mesmo `id`
substitui o anterior. Um modificador com `persistent: true` fica salvo na conta.

Num mob, `mob.attributes` (`MobAttributes`) tem os mesmos, mais `kindBase(name)` (o padrão do **tipo** do mob),
`clearBase(name)` (volta ao do tipo) e o par `addItem(item, id)` / `removeItem(id)`, que põe e tira de uma vez os
modificadores que um **item** declara. Num mob o `persistent` é aceito e ignorado: mob não é conta.

Um item ou um efeito declara os seus com `AttributeModifierDecl`:
`{ attribute, amount, operation, slot? }`, em que `slot` (só item) é `mainhand`, `offhand`, `armor`, `head`,
`chest`, `legs` ou `feet`.

## `ctx.movement`

O movimento do jogador como dado. São duas coisas: o **perfil** (as velocidades, o pulo, a aceleração e os tetos
que o servidor autoriza) e o **modo** (o `travel` que decide a vertical do corpo). As duas valem nos dois lados,
na mesma ordem, porque o navegador prevê o movimento com o mesmo perfil e o mesmo `travel` com que o servidor o
valida.

```ts
profile(path: string, desc: MovementProfileDesc | MovementProfileType): string;
mode(path: string, mode: MovementModeType): string;
wrap(target: FullName, fn: (e: MovementTravelEvent, next: (e: MovementTravelEvent) => void) => void): string;
modes(): Array<{ registryName: FullName; id: number; name: string; priority: number }>;
modify(target: FullName, change: MovementProfilePatch | ((profile: MovementProfileDesc, info: ModifyInfo) => MovementProfileDesc | void), opts?: ModifyOptions): void;
list(): Array<MovementProfileDesc & { registryName: FullName; id: number }>;
```

### O perfil

Tudo em blocos por segundo. Um campo que você deixa de fora fica com o número do jogo.

| Campo | O que é (o número do jogo) |
|---|---|
| `walk` | andando (4,4). O atributo de velocidade multiplica este e o `sprint` |
| `sprint` | correndo (6,4) |
| `fly` | voando, no criativo ou com o comando de voo (11) |
| `guardWalk` | com o escudo levantado (2) |
| `carryWalk` | quando a sala pede devagar (3) |
| `jump` | o impulso de um pulo (8,7) |
| `groundAccel` | quanto o passo demora a chegar à velocidade, no chão e na água (14); o atrito do bloco multiplica |
| `airAccel` | a mesma coisa no ar (4) — o "atrito no ar" |
| `flyAccel` | a mesma coisa na subida e na descida do voo (12) |
| `serverWalkLimit` | o teto horizontal autorizado andando (11); não pode ser menor que `walk`/`sprint` |
| `serverFlyLimit` | o teto voando (40); não pode ser menor que `fly` |
| `serverGuardLimit` | o teto com escudo ou carregando (5) |
| `serverClimbLimit` | o orçamento de subida por segundo: pulo, degraus e nado (10) |

O `role: 'player'` marca o perfil com que o motor move o jogador deste mundo — o jogo base o declara. Sem papel,
o perfil fica só declarado.

```js
ctx.movement.modify('mineclaude:human_walk', { sprint: 8 });     // correr mais rápido
ctx.movement.profile('leve', { walk: 5.5, jump: 10, serverWalkLimit: 13 });
```

### O modo

Um `MovementModeType` tem `priority` (0..1000, maior decide primeiro; no jogo o voo é 300, o nado 200 e o chão
0), um `applies(e)` que diz se ele vale no estado de agora e um `travel(e)` que decide `e.velocity` e chama
`e.move()`. O `travel` tem de ser puro: nada de DOM, de biblioteca 3D nem de estado próprio, porque o mesmo
código roda nos dois lados.

O `role` de um modo diz qual dos três caminhos que o servidor já autoriza por si ele ocupa — `'ground'`,
`'swim'` ou `'flight'`. Os três são do jogo base. Declarar um papel **não** dá envelope a mais (o do motor já
cobre), então declarar sem precisar só aperta o próprio modo: um modo de mod deixa de fora.

O `MovementTravelEvent` traz `input` (`forward`, `strafe`, `jump`, `sprint`, `down`, `guard`), `velocity`
(mutável, em blocos/s), `pos`, `dt`, `profile`, `gravity`, `onGround`, `inLiquid`, `wading`, `flying`,
`blockedH`, `speed` (a velocidade horizontal alvo do estado), `jumpFactor`, `wadeScale`, `fluidScale`, mais
`blockName(dx, dy, dz)`, `touching(name)`, `move()` (integra com colisão e degrau; no servidor não move nada) e
`rebound(impact)`.

```js
import { MovementModeType } from './mineclaude-sdk.js';

class Planar extends MovementModeType {
  priority = 250;
  applies(e) { return !e.onGround && e.input.jump && !e.flying; }
  travel(e) { e.velocity.y = Math.max(e.velocity.y - e.gravity * e.dt * 0.2, -3); e.move(); }
}
ctx.movement.mode('planar', new Planar());
```

`wrap` embrulha o `travel` de um modo já registrado, os do jogo também. O `fn(e, next)` recebe o mesmo `e` e o
`travel` de baixo: chamar `next(e)` roda a física de quem declarou o modo, e não chamar a substitui. O modo
embrulhado deixa de ser coberto pelo envelope do motor e passa a ganhar o envelope derivado de rodar o `travel`
novo. Um alvo que não existe neste mundo faz o embrulho não fazer nada.

```js
ctx.movement.wrap('mineclaude:ground', (e, next) => { next(e); e.velocity.y *= 1.1; });
```

## `ctx.modifiers`

Os **modificadores de mundo**: os interruptores com nome que o jogador marca na tela "Criar mundo". Não confunda
com uma regra de jogo. Uma regra (`ctx.rules`, o `/gamerule`) é um número que um sistema lê; um modificador é a
**escolha com que o mundo nasceu**, e ele embrulha sistemas inteiros mais as regras que esses sistemas leem. O
valor fica no mundo, chega a cada navegador quando o jogador entra, e um administrador muda com `/modificador`.

### Registrar

```ts
register(path: string, desc: WorldModifierDesc | WorldModifierType): FullName;
preset(path: string, desc: ModifierPresetDesc | ModifierPresetType): FullName;
gate(name: FullName | string, kinds: ModifierGate): void;
```

`register` vale nos dois lados, na mesma ordem, e só dentro do `register` do mod. Os campos:

| Campo | Significado |
|---|---|
| `name` | o nome que o jogador lê (1 a 60 caracteres; aceita texto traduzível) |
| `description` | a explicação da tela e da dica (até 240; aceita texto traduzível) |
| `category` | agrupa na tela: `atmosfera`, `clima`, `sobrevivencia`, `mundo`, `combate`, `criaturas`, `fisica`, `outros` — ou qualquer `[a-z0-9_]` seu, desenhado no fim com o próprio nome |
| `order` | onde ele fica dentro da categoria (menor primeiro; empate = ordem de registro) |
| `type` | `boolean` (o padrão: um interruptor), `integer`, `number` ou `enum` |
| `default` | o valor de um mundo **novo** que não escolheu nada |
| `legacy` | o valor que um mundo criado **antes** deste modificador lê, para sempre. Ausente = o `default` |
| `choices` | só `enum`: 2 a 32 textos `[a-z0-9_]`, sem repetir; o `default` tem de estar entre eles. `off` quer dizer desligado |
| `min`, `max` | só `integer` e `number` |
| `parent` | o nome completo do modificador **pai**: com o pai desligado, este também para |
| `requiresRestart` | a mudança só vale no próximo boot do mundo (o `/modificador` avisa) |
| `worldgenOnly` | decidido quando o mundo nasce (geração): implica `requiresRestart` |
| `conflicts` | nomes completos que não podem estar ligados junto com este (até 16) |
| `gamerules` | as regras de jogo que ele embrulha: `{ '<valor>': { 'mod:regra': valor } }` |

O `legacy` é o campo que salva mundos antigos: um modificador que transforma um sistema **que já existia** numa
opção declara em `legacy` o que esse sistema já fazia, e nenhum mundo salvo muda de comportamento.

```js
import { WorldModifierType } from './mineclaude-sdk.js';

class Vacuo extends WorldModifierType {
  name = 'Vácuo';
  description = 'Fora de um lugar fechado não há ar para respirar.';
  category = 'atmosfera';
  type = 'boolean';
  default = false;
  legacy = false;                                          // mundos antigos continuam com ar
  gamerules = { false: { 'meumod:consumo_de_oxigenio': 0 } }; // desligado, nada consome oxigênio
}
ctx.modifiers.register('vacuo', new Vacuo());              // -> 'meumod:vacuo'
```

Em `gamerules`, um valor **sem** entrada não mexe em regra nenhuma. É assim que um interruptor força algo só do
lado desligado, como no exemplo acima.

### A árvore

`parent` monta uma árvore. Com o pai desligado, o filho também para, e `get` devolve o valor de desligado dele
(`false` num `boolean`, o `min` ou 0 num número, `'off'` num `enum`). Assim um sistema grande ganha um
interruptor-mestre e detalhes embaixo dele.

```js
ctx.modifiers.register('gases', { name: 'Gases', type: 'boolean', default: true });
ctx.modifiers.register('vazamento', { name: 'Vazamento', type: 'boolean', default: true, parent: 'meumod:gases' });
```

### Predefinições

Uma predefinição é um botão da tela "Criar mundo" que escolhe um conjunto inteiro de valores de uma vez. O que
ela não nomeia fica no padrão de cada um.

```js
ctx.modifiers.preset('estacao_orbital', {
  name: 'Estação orbital',
  description: 'Sem ar fora, frio, sem chuva.',
  order: 20,
  values: { 'meumod:vacuo': true, 'meumod:gases': true, 'mineclaude:rain': false },
});
```

### O conteúdo que um modificador embrulha: `gate`

`gate` diz **que conteúdo pertence** ao modificador. Nada é jamais tirado do registro (os ids são do mundo e os
saves dependem deles); enquanto o modificador está desligado, esse conteúdo sai da paleta do criativo e do livro
de receitas, e o servidor recusa fabricá-lo. Só dentro do `register`.

```js
ctx.modifiers.gate('vacuo', {
  items: ['meumod:tanque_de_ar', 'meumod:capacete'],
  blocks: ['meumod:bomba'],
  recipes: ['meumod:tanque_de_ar'],
});
```

### Ler, dentro do jogo

```ts
get(name: string): ModifierValue;      // o valor EFETIVO (um filho de algo desligado lê o valor de desligado dele)
enabled(name: string): boolean;        // ele e cada ancestral dele estão ligados?
has(name: string): boolean;            // está registrado?
list(): WorldModifierInfo[];           // todos, na ordem de desenho dentro de cada categoria
presets(): ModifierPresetInfo[];
categories(): string[];                // as que têm ao menos um modificador, as conhecidas primeiro
```

`enabled` é a única chamada que um sistema precisa. Um nome curto é do próprio mod; um nome completo é de
qualquer um.

```js
ctx.events.on('tick', (e) => {
  if (!ctx.modifiers.enabled('vacuo')) return;   // o mundo não escolheu isto: nem rode
  // ...
});
```

`has` serve ao mod que lê o modificador **de outro** e funciona sem ele. O `WorldModifierInfo` de `list()` traz
`value` (o efetivo), `own` (o valor próprio, sem a árvore), `default`, `legacy`, `enabled`, `parent`,
`requiresRestart`, `worldgenOnly`, `conflicts` e, quando existem, `choices`, `min` e `max`.

### Quando alguém muda: o evento

Não há um `onChange` dentro de `ctx.modifiers`. A mudança chega como um **evento de servidor**,
`worldModifierChanged`, com o nome completo, o valor novo e o antigo:

```js
ctx.events.on('worldModifierChanged', (e) => {
  if (e.name !== 'meumod:vacuo') return;
  e.server.broadcast(e.value ? 'O ar acabou.' : 'Voltou a dar para respirar.');
});
```

(A regra de jogo tem o seu par: `gameRuleChanged`, com `name`, `value` e `old`.)

## `ctx.rules`

As **regras de jogo**: valores com nome que um sistema lê e que um administrador muda com `/gamerule`. O motor só
guarda o mecanismo — as regras do jogo em si são conteúdo do **mod base**, e o seu mod registra as dele.

```ts
register(path: string, desc: GameRuleDesc | GameRuleType): string;
modify(target: FullName, change: GameRulePatch | ((rule: GameRuleDesc, info: ModifyInfo) => GameRuleDesc | void), opts?: ModifyOptions): void;
get(name: string): boolean | number | string;
```

`register` vale nos dois lados, na mesma ordem, e devolve o nome completo. Os campos de uma regra:

| Campo | Significado |
|---|---|
| `name`, `description` | textos para mostrar (aceitam texto traduzível) |
| `type` | `boolean`, `integer`, `number` ou `enum` |
| `default` | o valor inicial; num `enum`, um dos `choices` |
| `choices` | só `enum`: 1 a 32 textos `[a-z0-9_]`, sem repetir; o `default` tem de estar entre eles, e o `/gamerule` só aceita um deles |
| `min`, `max` | só `integer` e `number` |
| `category` | agrupa a regra (texto `[a-z0-9_]`, até 32); só descreve |
| `sync` | manda o valor a todos os navegadores (na entrada e a cada mudança) |
| `role` | o significado que o **motor** lê sozinho desta regra (veja abaixo) |

```js
import { GameRuleType } from './mineclaude-sdk.js';

class Pontos extends GameRuleType {
  name = 'Pontos'; type = 'integer'; default = 3; min = 0; max = 10; sync = true;
}
ctx.rules.register('pontos', new Pontos());
ctx.rules.register('flag', { type: 'boolean', default: false });

ctx.rules.get('pontos');            // o valor de agora (nome curto: tenta este mod primeiro)
ctx.rules.get('keep_inventory');    // uma regra do jogo
```

No navegador, `get` só vê o valor das regras marcadas `sync`. Como o valor de um `enum` é texto, `get` devolve
`string` nele.

### As regras que o mod base registra

O mod base declara `keep_inventory`, `fall_damage`, `fall_damage_multiplier`, `drowning_damage`,
`natural_regeneration`, `hunger_seconds`, `regeneration_seconds`, `starvation_seconds`, `cactus_damage` e
`armor_reduction`, mais os quatro **custos de exaustão** descritos a seguir. Os nomes completos levam o prefixo
do mod base: `mineclaude:keep_inventory`.

### Papel (`role`): o custo de exaustão

Uma regra `number` pode tomar um **papel**: um significado que o motor lê sozinho, sem conhecer o nome da regra.
Há um papel por significado, e sem regra num papel o motor lê **0** (não inventa número). Os papéis são os custos
de exaustão, o que cada ação gasta de fome (1 de exaustão = 1 ponto de fome):

| Papel | Quando é cobrado |
|---|---|
| `exhaustion_break_block` | por bloco quebrado em sobrevivência |
| `exhaustion_walk` | por bloco andado (correr e pular não se distinguem: o movimento é do navegador) |
| `exhaustion_dodge` | por esquiva |
| `exhaustion_regeneration` | por ponto de vida regenerado |

O mod base declara `mineclaude:exhaustion_break_block` 0,025, `exhaustion_walk` 0,003, `exhaustion_dodge` 0,3 e
`exhaustion_regeneration` 0,4. Um mod muda um custo pelo `modify` (que alcança `default`, `min` e `max`), e um
administrador muda com `/gamerule`:

```js
ctx.rules.modify('mineclaude:exhaustion_walk', { default: 0.006 });   // andar cansa o dobro
```

O `role` em si não se muda pelo `modify`: ele é a identidade da regra.

### A mudança

Uma regra alterada chega como o evento de servidor `gameRuleChanged`, com `name`, `value` e `old`:

```js
ctx.events.on('gameRuleChanged', (e) => {
  if (e.name === 'meumod:pontos') e.server.broadcast(`Agora valem ${e.value} pontos.`);
});
```

## `ctx.damage`

Os TIPOS DE DANO: cada um diz se a armadura reduz, se um escudo bloqueia, se é jogador contra jogador e que frase
a morte escreve. Os tipos do jogo base (queda, cacto, afogamento, golpe de mob...) são conteúdo de mod, não do
motor. Registre no servidor.

```ts
type(path: string, desc: DamageTypeDesc | DamageType): string;
/** Apelido de `type`. */
register(path: string, desc: DamageTypeDesc | DamageType): string;
modify(target: FullName | `#${string}`, change: DamageTypePatch | ((type: DamageTypeDesc, info: ModifyInfo) => DamageTypeDesc | void), opts?: ModifyOptions): void;
```

Os campos de `DamageTypeDesc`:

| Campo | O que é |
|---|---|
| `name` | o nome do tipo |
| `armored` | a armadura reduz o dano (e gasta) |
| `shield` | um escudo levantado pode bloquear |
| `pvp` | jogador contra jogador: marca o combate, sem fogo amigo, vale a trégua |
| `prefix` | toda causa que começa com isto vale este tipo (ex.: `'mob:'`) |
| `deathMessage` | o texto, ou `(e) => string` com `e = { player, attacker, cause, mobName }` |

O `modify` muda `name`, `armored`, `shield`, `pvp` e `deathMessage` de um tipo de qualquer mod, ou de uma `#tag` de
tipos de dano. O `prefix` fica de fora: trocá-lo moveria o dano de uma família inteira de causas para outro tipo.
Causa que nenhum tipo reconhece dá dano simples: nada reduz e a morte vira uma frase genérica.

```js
import { DamageType } from './mineclaude-sdk.js';
class Acido extends DamageType {
  name = 'Ácido';
  armored = true;
  deathMessage(e) { return `${e.player} derreteu`; }
}
ctx.damage.type('acido', new Acido());        // vira meumod:acido
e.player.damage(5, 'meumod:acido');
```

## `ctx.combat`

O combate corpo a corpo como DADO: um moveset descreve os golpes de uma arma, a cadeia que eles formam, o golpe
pesado, a guarda e o aparar. O motor só tem o mecanismo; as armas são conteúdo. O moveset vale nos dois lados — o
navegador anima, o servidor confere —, então registre fora de qualquer `if (ctx.side === …)`.

```ts
/** Registra um moveset (nos dois lados, na mesma ordem). Devolve o nome completo (`mod:path`). */
moveset(path: string, def: MovesetDesc): string;
/** Dá um moveset a itens (nomes completos). O último `bind` de um item vale. */
bind(items: FullName | FullName[], moveset: string): void;
/** O FÔLEGO de todo jogador: máximo, recarga por segundo e espera depois de gastar. Sem regra, custos de fôlego são ignorados. */
stamina(rule: { max: number; regen: number; delayS?: number }): void;
```

### O moveset (`MovesetDesc`)

| Campo | O que é |
|---|---|
| `moves` | os golpes, por id curto (`[a-z0-9_]`, até 32). Cada um vira o registro `<mod>:<moveset>_<id>` |
| `chain` | a cadeia de golpes leves, 1 a 12 passos: cada toque toca o próximo |
| `branches` | ramos que valem em todo passo que não os desliga: `air`, `sprint`, `down`, `up` |
| `resetS` | pausa (s) que recomeça a cadeia (padrão 0,8) |
| `cadenceMs` | ritmo mínimo entre dois golpes que o servidor aceita; sem ele, a espera da arma |
| `heavy` | `{ move, minS, fullS, bonus?, air? }`: segurar o ataque mais que `minS` carrega até `fullS`; soltar dispara `move` (ou `air` no ar), com `bonus` de dano na carga cheia |
| `guard` | `{ parryMs, reduce, stamina?, stagger?, arcDeg? }`: a guarda da própria arma, no botão de usar |
| `name` | o nome do moveset |

Um passo da cadeia é um id de golpe, ou `{ default, air?, sprint?, down?, up? }`; um ramo `null` desliga naquele
passo o ramo geral. A guarda apara nos primeiros `parryMs` depois de levantar (nenhum dano, e quem atacou fica
`stagger` ms sem atacar); passada a janela, ela só bloqueia `reduce` do dano gastando `stamina`, e sem fôlego quebra.

### O golpe (`CombatMoveDesc`)

A linha do tempo é u = 0..1 em `dur` segundos: preparação, a janela `strike` em que a lâmina vale, acompanhamento
e volta.

| Campo | O que é |
|---|---|
| `dur`, `strike` | duração em segundos (0,08..3) e a janela `[início, fim]` em u |
| `yaw`, `pitch` | o arco da lâmina em volta do olhar durante a janela, em radianos (+ para a esquerda / + para cima) |
| `sectorDeg`, `reachAdd` | o setor que o servidor confere (1..360 graus, padrão 90) e o alcance a mais (0..3 blocos) |
| `damage`, `knockback`, `lift` | multiplicador do dano da arma (0..10), do empurrão (0..5) e empurrão a mais para cima (0..2) |
| `stagger`, `guardBreak` | ms em que o alvo não ataca (0..5000) e ms em que uma guarda atingida fica abaixada (0..10000) |
| `stamina`, `lock`, `hitStop` | fôlego gasto (0..100); espera mínima até o próximo golpe, contada do começo deste; congelamento no contato (0..0,3 s) |
| `finisher` | marca de finalizador (só informativa para a cadeia e o visual) |
| `step`, `hop` | `{ at, dist, dur? }`: um passo real de até 1,2 bloco para a frente; `hop` é o pulinho do corpo (cosmético, 0..1,5) |
| `camera`, `trail`, `sound` | `{ kick?, roll?, shake? }` em 1ª pessoa (-0,5..0,5); rastro da lâmina (`true` ou `{ color }`); até 4 sons em momentos do golpe |
| `fp`, `tp` | as trilhas de pose: 1ª pessoa (canais `px py pz rx ry rz`) e o corpo inteiro em 3ª (`x y z elbow twist lean lunge spin hop roll crouch lx ly lz lelbow head`) |

Uma trilha de pose é uma lista de quadros-chave `[u, { canal: valor }]`, com u de 0 a 1, começando em 0 e
terminando em 1.

O servidor confere o que importa: o golpe é mesmo do moveset do item na mão, o tempo desde o último golpe aceito
respeita `cadenceMs` e a trava do anterior, quem está atordoado não bate, o fôlego paga e o alvo está no setor e no
alcance. Ele não confere a ORDEM dos golpes, então um golpe leve qualquer não deve render mais dano por segundo que
a cadeia inteira. Mobs de mod ganham os mesmos golpes com um `bind` no item que eles seguram.

```js
ctx.combat.stamina({ max: 10, regen: 4, delayS: 0.8 });
ctx.combat.moveset('martelo', {
  cadenceMs: 600,
  moves: {
    golpe: { dur: 0.6, lock: 0.7, strike: [0.35, 0.6], yaw: [-1, 1], pitch: [0.6, -0.6], sectorDeg: 120, trail: true },
    esmagar: { dur: 0.8, lock: 1, damage: 1.8, guardBreak: 3000, stamina: 5, strike: [0.4, 0.6], yaw: [0, 0], pitch: [1.4, -1.1] },
  },
  chain: ['golpe', 'golpe', { default: 'esmagar', air: null }],
  heavy: { move: 'esmagar', minS: 0.45, fullS: 1.4, bonus: 1 },
  guard: { parryMs: 200, reduce: 0.5, stamina: 2, stagger: 800 },
});
ctx.combat.bind(['meumod:martelo_de_ferro'], 'martelo');
```

## `ctx.systems`

Os SISTEMAS DO JOGADOR: as regras de vida rodam aqui, não no motor. Fome, regeneração, inanição, afogamento,
sufocamento, redução por armadura, dano de queda, drops da morte, renascer e comer são sistemas, e um mod registra
os seus ao lado — ou desliga e troca os que já existem. Só servidor.

```ts
register(path: string, system: PlayerSystemType): string;
/** Desliga um sistema de qualquer mod (nome completo, ex.: `'mineclaude:hunger'`), mesmo registrado depois. */
disable(name: FullName): void;
/** Apelido de `disable` (o nome que os outros registros usam para "tirar"). */
remove(name: FullName): void;
/** Troca um sistema pelo seu. Em cadeia: a forma função recebe `previous`, os ganchos do que estava antes. Dois mods no mesmo alvo geram aviso. */
replace(name: FullName, system: PlayerSystemType | ((previous: Readonly<Partial<PlayerSystemType>>) => PlayerSystemType), opts?: ChainOptions): void;
/** Embrulha ganchos do sistema de qualquer mod; `previous` é o ÚLTIMO argumento (`tick`: `(player, dt, tick, world, previous)`). */
wrap(name: FullName, hooks: ChainWrappers<PlayerSystemType>, opts?: ChainOptions): void;
```

### `PlayerSystemType`

Campos: `order` (menor roda primeiro, padrão 0; empate pela ordem de registro), `every` (a cada N ticks, padrão 1;
o jogo roda a 20 Hz) e `needsAlive` (pula quem já morreu neste mesmo tick).

```ts
/** A cada `every` ticks, para cada jogador vivo, em survival, no mundo. */
tick?(player: PlayerApi, dt: number, tick: number, world: WorldApi): void;
/** Devolve o novo dano (ou nada). Na ordem de `order`, depois dos encantamentos e do atributo de armadura. */
modifyDamage?(e): number | void;
/** Depois de anunciada a morte (o jogo larga os itens aqui). */
onDeath?(e): void;
onRespawn?(e): void;
/** Os vitais com que o jogador volta; o último sistema que responder um campo vence. */
respawnState?(e): { health?: number; hunger?: number; exhaustion?: number; air?: number } | void;
/** Onde o jogador volta; o motor só teleporta. */
respawnPoint?(e): Pos | void;
/** Pode comer agora? `false` recusa (nada é gasto). */
canEat?(e): boolean | void;
/** O que a comida faz: somado entre os sistemas (o motor limita a fome e a vida máximas). */
eat?(e): { hunger?: number; heal?: number } | void;
```

O que cada gancho recebe:

- `modifyDamage`: `{ player, amount, type, cause, attacker }`. O `type` traz `{ name, armored, shield, pvp }`, ou
  `null` numa causa sem tipo.
- `onDeath`: `{ player, cause, attacker }`. `onRespawn` e `respawnState`: `{ player }`.
- `respawnPoint`: `{ player, world, spawn }`. Devolver `{ x, y, z }` decide (com y dentro do mundo); não devolver
  nada deixa o que os sistemas anteriores escolheram (`e.spawn`, ou `null`), e sem resposta de ninguém o motor usa
  o spawn do mundo.
- `canEat`: `{ player, item, food, alwaysEdible }`. `eat`: `{ player, item, food }`.

O `replace` aceita também uma função `(previous) => def`, em que `previous` tem os ganchos do que estava antes para
você chamar. O `wrap` vai em volta de um gancho e deixa o resto como estava; `previous` é sempre o último argumento,
`previous()` sem argumento repete os que o embrulho recebeu, e não chamá-lo troca o gancho. A ordem é `priority`
crescente e depois a de carga; o último aplicado fica por cima, e um `replace` descarta os `wrap` anteriores. Dois
mods trocando o mesmo alvo geram um aviso no log. Vale para `ctx.stays`, `ctx.parties` e `ctx.showcase` do mesmo
jeito.

```js
import { PlayerSystemType } from './mineclaude-sdk.js';
class Frio extends PlayerSystemType {
  order = 5;
  every = 20;
  tick(player, dt, tick, world) { if (player.pos.y > 80) player.damage(1, 'meumod:frio'); }
}
ctx.systems.register('frio', new Frio());
ctx.systems.disable('mineclaude:hunger');
```

## `ctx.stays`

As ESTADIAS: um lugar DENTRO do mundo em que o jogador entra com as coisas dele guardadas. O inventário do mundo
fica parado em segurança e ele chega de mãos vazias; `player.room` continua o mesmo. Só servidor.

```ts
/** Registra uma estadia (só servidor). Devolve o nome completo. */
register(path: string, stay: StayType): string;
/** Desliga a estadia de qualquer mod (nome completo, ex.: `'mineclaude:quarentena'`), mesmo registrada depois. */
disable(name: FullName): void;
/** Apelido de `disable`. */
remove(name: FullName): void;
/** Troca uma estadia pela sua. Em cadeia: a forma função recebe `previous`. */
replace(name: FullName, stay: StayType | ((previous: Readonly<Partial<StayType>>) => StayType), opts?: ChainOptions): void;
/** Embrulha ganchos da estadia de qualquer mod; `previous` é o ÚLTIMO argumento. */
wrap(name: FullName, hooks: ChainWrappers<StayType>, opts?: ChainOptions): void;
```

### `StayType`

| Campo | O que é |
|---|---|
| `area` | o nome completo da ÁREA que contém a estadia |
| `dimension` | o nome completo da DIMENSÃO em que ela mora (opcional). Sem ele, a caixa é uma região do mundo em que o jogador já está; com ele, entrar é uma troca de dimensão, e sair ou morrer devolve à dimensão e ao ponto de onde veio |
| `every` | ticks entre as chamadas de `tick` (padrão 20, uma vez por segundo) |
| `leaveOutside` | a varredura desfaz a estadia de quem está fora da caixa (padrão `true`) |
| `holdInCombat` | ... a não ser que ele esteja em combate: aí volta ao ponto de chegada (padrão `true`) |
| `arrival` | os números do sorteio do ponto de chegada: `{ columns, step, range, margin, aboveSea, scatter }` |

```ts
/** Onde o jogador chega. Sem ele, o motor sorteia pelo `arrival` dentro da área. */
spawn?(e: StayEvent): Pos | void;
/** Ele entrou: a saudação, e `e.data` começa aqui. */
onEnter?(e: StayEvent): void;
/** Ele saiu; `e.data` é o que ele tinha. */
onLeave?(e: StayEvent & { readonly reason: StayLeaveReason }): void;
/** A varredura o pôs de volta dentro (em combate ninguém sai). */
onHold?(e: StayEvent): void;
/** A cada `every` ticks, para cada jogador dentro. */
tick?(e: StayEvent): void;
/** A frase de uma recusa (nada = nada a dizer). */
refuse?(e: StayEvent & { readonly what: StayRefusalWhat; readonly reason?: StayEnterReason; readonly seconds?: number }): Text | string | null | void;
```

Todo gancho recebe `{ player, data, world }`, em que `data` é o objeto da estadia para aquele jogador. O
`onLeave` traz `reason`: `'command'`, `'death'`, `'outside'` ou `'mod'`. O `refuse` traz `what` — o caminho que
está sendo recusado: `'enter'`, `'leave'`, `'spawn'` ou `'lobby'` — e, nos dois primeiros, `reason` (`'room'`,
`'combat'`, `'hurt'`, `'liquid'`, `'air'`, `'wait'`, `'blocked'`) e `seconds`.

O motor cuida das travas do caminho de entrada (morto, outra sala, combate, dano recente, chão, a espera entre
trocas de lugar), de guardar o inventário no estado de mundo que a conta salva, do teleporte, da varredura de quem
saiu da caixa e da morte que desfaz a estadia. Nenhum texto é do motor: toda linha vem dos ganchos. Sem `spawn`,
o ponto de chegada é sorteado dentro da área a cada entrada, nunca o mesmo duas vezes em seguida.

```js
import { StayType } from './mineclaude-sdk.js';
class Retiro extends StayType {
  area = 'meumod:claustro';
  onEnter(e) { e.data.dias = 0; e.player.message('Bem-vindo.'); }
  refuse(e) { return e.what === 'lobby' ? 'Saia daqui primeiro.' : null; }
}
ctx.stays.register('claustro', new Retiro());
```

## `ctx.parties`

Os GRUPOS: alguns jogadores andando juntos, com líder, convites e teto de tamanho. Um grupo vive só na memória:
acaba quando o servidor reinicia, e quem desconecta sai dele. Só servidor.

```ts
/** Registra um grupo (só servidor). Devolve o nome completo. */
register(path: string, party: PartyType): string;
/** Desliga o grupo de qualquer mod (nome completo, ex.: `'mineclaude:grupo'`), mesmo registrado depois. */
disable(name: FullName): void;
/** Apelido de `disable`. */
remove(name: FullName): void;
/** Troca um grupo pelo seu. Em cadeia: a forma função recebe `previous`. */
replace(name: FullName, party: PartyType | ((previous: Readonly<Partial<PartyType>>) => PartyType), opts?: ChainOptions): void;
/** Embrulha ganchos do grupo de qualquer mod; `previous` é o ÚLTIMO argumento. */
wrap(name: FullName, hooks: ChainWrappers<PartyType>, opts?: ChainOptions): void;
```

### `PartyType`

| Campo | O que é |
|---|---|
| `role` | o sentido que o MOTOR lê neste grupo, um por jogo. `'queue'` é "o grupo que entra junto na fila e fica no mesmo time"; dois grupos com o mesmo papel derrubam o boot, dizendo qual. Um grupo sem papel é só do mod dele |
| `max` | quantos cabem, contando o líder (padrão 4) |
| `inviteMs` | quanto tempo um convite vale (padrão 60000 ms) |
| `inviteGapMs` | um convite por alvo a cada tanto (padrão 10000 ms) |

```ts
/** O convite saiu: `e.target` é quem recebeu, `e.seconds` quanto vale, `e.reason` o rótulo de quem chamou. */
onInvite?(e): void;
/** `e.player` entrou: `e.members` é todo mundo agora. */
onJoin?(e): void;
/** `e.player` saiu; `e.by` é quem o tirou, `e.members` quem ficou, `e.newLeader` se a liderança mudou e `e.over` se o grupo acabou. */
onLeave?(e): void;
/** A frase de uma recusa (nada = nada a dizer). */
refuse?(e): Text | string | null | void;
```

Todo gancho recebe `{ player, party, max, world }`. O `onLeave` traz `reason`: `'command'`, `'kick'` ou `'mod'` —
quem simplesmente desconecta não passa por aqui, o motor poda em silêncio. O `refuse` traz `what`
(`'invite'`, `'accept'`, `'leave'`, `'kick'`) e `reason`: `'self'`, `'unreachable'`, `'offline'`, `'not_leader'`,
`'full'`, `'target_in_party'`, `'invite_pending'`, `'no_invite'`, `'already_in'`, `'inviter_not_leader'`,
`'no_party'`, `'no_name'`, `'not_member'`.

O motor cuida de quem está no grupo e de quem lidera (com a sucessão quando o líder sai), dos convites com prazo e
do um-por-alvo, do teto de `max`, de podar quem saiu do servidor e da regra de que quem te ignora não recebe
convite nem fica sabendo. Nenhum texto é do motor. Do lado do jogador, `player.party(nome)` devolve
`{ name, max, size, leader, members, isLeader }` ou `null`.

```js
import { PartyType } from './mineclaude-sdk.js';
class Esquadrao extends PartyType {
  role = 'queue';
  max = 6;
  onJoin(e) { for (const m of e.members) m.message(`Esquadrão: ${e.size}/${e.max}`); }
  refuse(e) { return e.reason === 'full' ? 'Está cheio.' : null; }
}
ctx.parties.register('esquadrao', new Esquadrao());
```

## `ctx.showcase`

As CENAS da vitrine ao vivo da home: antes de entrar, o navegador abre uma conexão anônima só de olhar e o servidor
passa uma rotação de cenas do jogo acontecendo agora. O motor não escolhe lugar nenhum nem voa câmera nenhuma — as
duas coisas são da cena. A cena é o mesmo objeto nos dois lados: registre-a fora de qualquer
`if (ctx.side === …)`, o servidor chama o `point` e o navegador chama o `camera`.

```ts
/** Registra uma cena da vitrine (os dois lados). Devolve o nome completo. */
register(path: string, scene: ShowcaseSceneType): string;
/** Desliga a cena de qualquer mod (nome completo, ex.: `'mineclaude:alto'`), mesmo registrada depois. */
disable(name: FullName): void;
/** Apelido de `disable`. */
remove(name: FullName): void;
/** Troca uma cena pela sua. Em cadeia: a forma função recebe `previous`. */
replace(name: FullName, scene: ShowcaseSceneType | ((previous: Readonly<Partial<ShowcaseSceneType>>) => ShowcaseSceneType), opts?: ChainOptions): void;
/** Embrulha `point` / `camera` da cena de qualquer mod; `previous` é o ÚLTIMO argumento. */
wrap(name: FullName, hooks: ChainWrappers<ShowcaseSceneType>, opts?: ChainOptions): void;
/** As cenas da rotação, na ordem em que passam. */
names(): string[];
```

### `ShowcaseSceneType`

| Campo | O que é |
|---|---|
| `ms` | quanto a cena dura, em ms (padrão 20000) |
| `near` | blocos em volta do ponto cujos jogadores aparecem nela (padrão 48) |
| `point(e)` | **servidor**: onde a câmera olha, `{ x, y, z }`, ou `null` para PULAR a cena desta vez |
| `camera(e)` | **navegador**: a pose da câmera neste instante, `{ x, y, z, yaw, pitch }` |

O `point` recebe `{ world, spawn, lobby, players, busiestMatch() }`: o spawn do mundo, o spawn do lobby, quem está
jogando agora e a geometria da área de partida com mais gente, ou `null` sem ninguém jogando. O `camera` recebe o
ponto que o `point` escolheu (`x`, `y`, `z`), `t` em segundos desde o começo da cena, `light` (`true` no celular,
onde a vitrine é barata) e `aim(cx, cy, cz, tx, ty, tz)`, que monta a pose de quem olha para um ponto.

O motor cuida da conexão, do teto de olhares, de escolher a cena da vez e a seguinte (o navegador carrega o próximo
lugar enquanto o atual passa) e de entregar chunks só em volta do ponto da cena — a vitrine não pode virar um jeito
de varrer o mapa atrás de bases. Uma cena cujo gancho estoura três vezes seguidas é desligada, com uma linha no
log, e a rotação segue sem ela.

```js
import { ShowcaseSceneType } from './mineclaude-sdk.js';
class Orbita extends ShowcaseSceneType {
  ms = 15000;
  point(e) { return e.busiestMatch() ?? e.spawn; }
  camera(e) {
    const a = e.t * 0.06;
    return e.aim(e.x + Math.sin(a) * 20, e.y + 9, e.z + Math.cos(a) * 20, e.x, e.y + 1, e.z);
  }
}
ctx.showcase.register('orbita', new Orbita());
```

## `ctx.serverRules`

As REGRAS DO SERVIDOR: a lista que o comando de regras imprime e que a aba **Regras** da tela de pausa mostra.
**Não** são as regras de jogo de `ctx.rules` (o `/gamerule`): aquelas são interruptores do mundo, estas são o
código de conduta de quem roda o servidor. Vale nos dois lados, na ordem de registro.

```ts
/** Registra uma regra do servidor (os dois lados, na ordem de registro). Devolve o nome completo. */
register(path: string, rule: ServerRuleType | ServerRuleDesc): string;
/** Troca o título ou o texto de uma regra de qualquer mod, as do jogo base inclusive (`'mineclaude:respeito'`). */
modify(target: FullName, change: ServerRulePatch | ((rule: ServerRuleDesc, info: ModifyInfo) => ServerRuleDesc | void), opts?: ModifyOptions): void;
/** Tira uma regra de qualquer mod da lista; o número das outras é só o lugar delas, então fecha o vão. */
remove(target: FullName, opts?: ModifyOptions): void;
```

Uma `ServerRuleType` tem dois textos e nada mais:

| Campo | O que é |
|---|---|
| `title` | o começo da linha (em negrito na tela de pausa), até 48 caracteres |
| `text` | o texto da regra, até 400 caracteres |

Cada um pode ser literal ou traduzível (`ctx.lang.text`). A ordem de registro é a ordem da lista, e o número de
cada regra é só o lugar dela nela — nada salva esse número.

```js
import { ServerRuleType } from './mineclaude-sdk.js';
class SemAltar extends ServerRuleType {
  title = ctx.lang.text('rule.altar.title', {}, 'Nada de altar');
  text = ctx.lang.text('rule.altar.text', {}, 'Neste servidor não se constrói altar no lobby.');
}
ctx.serverRules.register('altar', new SemAltar());
ctx.serverRules.modify('mineclaude:respeito', { text: 'Respeito, sempre.' });
```

## `ctx.permissions`

As PERMISSÕES NOMEADAS. O nível 0..4 diz QUANTO um jogador pode; um NÓ diz O QUÊ: `meumod:abrir` é "pode abrir" e
mais nada. Com nós, um mod de permissões dá um comando a uma pessoa sem fazê-la operador. O `node` se declara na
entrada `main`; a consulta roda no servidor.

```ts
/** Só dentro de `register`: declara um nó (`'abrir_cofre'` vira `meumod:abrir_cofre`; com o prefixo, tem de ser o do seu mod). Devolve o nome completo. Vale em sandbox. */
node(path: string, opts?: PermissionNodeOptions): PermissionNodeName;
/** Apelido de `node`. */
register(path: string, opts?: PermissionNodeOptions): PermissionNodeName;
/** O jogador tem o nó? O `permissionRequest` responde primeiro (o primeiro que responde vence), senão vale o `default`. Nó não declarado é erro. Fora do sandbox. */
check(player: PlayerApi, node: PermissionNodeName): boolean;
/** O nó existe? */
has(node: string): boolean;
/** Todos os nós declarados, na ordem de declaração (um mod de permissões os lista). */
nodes(): PermissionNodeInfo[];
```

O nome de um nó é `mod:caminho`, com letras minúsculas, dígitos, `_` e `.`. As opções:

| Opção | O que é |
|---|---|
| `default` | quem tem o nó quando ninguém respondeu: `true` (todos), `false` (ninguém, nem o operador; é o padrão) ou um nível `0..4`, e aí o nó segue o nível do jogador. Para "só o operador", use `default: 4` |
| `description` | para um mod de permissões listar, até 200 caracteres |

Um nó serve como `requires` de qualquer comando ou subcomando. Quem responde por ele é o evento
`permissionRequest`: o primeiro mod que responde vence, e sem resposta vale o `default`. Pedir um nó que ninguém
declarou é erro, de propósito, para um erro de digitação não virar um "não" calado. O `nodes()` devolve
`{ key, mod, path, default, description }` por nó. No sandbox só o `node` vale; `check`, `has` e `nodes` ficam
fechados. Ver [guia-de-mods.md](guia-de-mods.md) para o evento e para os comandos.

```js
import { ModInitializer } from './mineclaude-sdk.js';
export default class Mod extends ModInitializer {
  onInitialize(ctx) {
    ctx.permissions.node('abrir_cofre', { default: 2, description: 'Abrir o cofre do mod' });
    ctx.commands.register('cofre', {
      help: '/cofre', requires: 'meumod:abrir_cofre',
      run(e) { e.reply('Aberto.'); },
    });
  }
}
```

## `ctx.help`

A AJUDA da tela de pausa: as três tabelas da aba **Atalhos e comandos**. Serve para um mod acrescentar linhas de
texto — um atalho que não é uma ação remapeável, um botão do toque, uma linha de comando. O registro vale nos dois
lados, mas se chama de uma entrada `main`; quem desenha a aba é o navegador.

```ts
/** Registra uma seção da ajuda (os dois lados, na ordem de registro). Devolve o nome completo. */
register(path: string, section: HelpSectionType | HelpSectionDesc): string;
/** Muda uma seção de qualquer mod, as do jogo base inclusive (`'mineclaude:atalhos'`): as `rows` (ou o `kind`), por remendo ou por função. */
modify(target: FullName, change: Partial<HelpSectionDesc> | ((section: HelpSectionDesc, info: ModifyInfo) => HelpSectionDesc | void), opts?: ModifyOptions): void;
/** Tira a seção inteira da tabela dela (para tirar só uma linha, use `modify` nas `rows`). Aplicada depois de todos os `modify`. */
remove(target: FullName, opts?: ModifyOptions): void;
```

Uma seção diz de que tabela são as linhas dela (`kind`) e quais são (`rows`):

| `kind` | A tabela | A linha |
|---|---|---|
| `'keys'` | atalhos fixos do computador | `[o que faz, qual tecla]` |
| `'touch'` | botões da tela de toque, só no celular | `[o que faz, qual botão]` |
| `'commands'` | comandos de chat | `[nome sem a barra, como se escreve, o que faz]`, com um quarto campo `boolean` opcional que marca "só admin" |

A ordem de registro é a ordem em que as linhas são desenhadas, e a seção de um mod vem depois das do jogo base.
Várias seções do mesmo `kind` se juntam numa tabela só. Cada célula é uma string de 1 a 400 caracteres, literal —
esta aba não aceita texto traduzível.

Num servidor de verdade o navegador mostra a lista de comandos que o próprio servidor manda, então as linhas de uma
seção `commands` de mod normalmente não aparecem: para documentar um comando, escreva o `help` dele no registro do
comando. Um mod também não precisa registrar nada para as ações de entrada — cada ação que ele registra já ganha
linha própria na aba, com a tecla atual.

```js
import { HelpSectionType } from './mineclaude-sdk.js';
class AtalhosDoPescador extends HelpSectionType {
  /** @type {'keys'} */
  kind = 'keys';
  /** @type {[string, string][]} */
  rows = [['Recolher a rede', 'Clique direito (segurando a vara)']];
}
ctx.help.register('atalhos', new AtalhosDoPescador());
ctx.help.register('toque', { kind: 'touch', rows: [['Recolher a rede', 'Botão da rede']] });
```

## `ctx.rooms`

Salas e minigames como classes. Um jogo com fila é um `MinigameType`; uma sala sem fila (parkour, lote de
construção, treino) é um `SoloRoomType`. Os dois dividem o mesmo espaço de nomes: a chave é o `path`
(`[a-z][a-z0-9_]{1,23}`), que vira o comando `/<path>`, o contador de vitórias e o `player.room` de quem está
dentro. **Só servidor** — no navegador o registro é apenas conferido.

O motor cuida da fila, da contagem, dos times, do mapa reservado, do inventário guardado e devolvido, do placar
no chat, do espectador, do bot de treino, do fim, da revanche e dos recordes da conta. O mod descreve campos
(`name`, `icon`, `min`, `max`, `teams`, `duration`, `pvp`, `spectate`, `bots`, `area`...) e ganchos
(`buildArena`, `spawnPoint`, `giveKit`, `onStart`, `onTick`, `tiebreak`, `scoreboard`...). Todo gancho recebe
`e.room`, com `players`, `teams`, `world` limitado à arena, `data`, `timer`, `score`, `eliminate`, `win` e
`setPhase`. A lista inteira de campos e ganchos das duas classes está no
[guia-de-mods.md](guia-de-mods.md).

```ts
register(path: string, game: MinigameType | SoloRoomType): string;
of(player: PlayerApi): Room | null;
modify(name: string, change: Partial<RoomModifiableFields> | ((draft: Partial<RoomModifiableFields>, info: { name: string; mod: string; kind: 'queue' | 'solo' }) => Partial<RoomModifiableFields> | void), options?: { priority?: number }): void;
wrap(name: string, hooks: { [hook: string]: (e: any, previous: (e?: any) => any) => any }, options?: { priority?: number }): void;
disable(name: string, options?: { priority?: number }): void;
remove(name: string, options?: { priority?: number }): void;
```

- `modify` muda só o que é **dado** de uma sala de outro mod: limites de jogadores, tempos, áreas, textos e
  regras declaradas (ver `RoomModifiableFields`). O alvo é o `path` (`'spleef'`) ou `'mod:path'`. Vale depois
  que todos os mods registraram, antes de o motor montar as salas; a ordem é por `priority` (padrão 0, o último
  aplicado vence) e o resultado passa pelo mesmo validador do `register`.
- Campo barrado é recusado com o motivo: `command`, `help`, `commands`, `shop` e os registros de recordes da
  sala sem fila. Gancho não é campo — para gancho, use `wrap`.
- `wrap` embrulha um gancho: `previous(e?)` roda o gancho de baixo (o da sala, ou o embrulho anterior); não
  chamar `previous` troca o gancho. Gancho que a sala não tinha nasce com `previous` devolvendo `undefined`.
- `disable` (e o apelido `remove`) tira a sala da fila, do painel do lobby e do `/ajuda`, e apaga os comandos
  dela. O nome segue ocupado.

```js
import { MinigameType, ModInitializer } from './mineclaude-sdk.js';

class Queda extends MinigameType {
  name = 'Queda'; min = 2; max = 8; duration = 120; pvp = true; spectate = true;
  onStart(e) { e.room.broadcast('Último de pé ganha.'); }
  onTick(e) { if (e.room.players.length === 1) e.room.win(e.room.players[0]); }
}
export default class M extends ModInitializer {
  onInitialize(ctx) { if (ctx.isServer()) ctx.rooms.register('queda', new Queda()); }
}
```

## `ctx.loot`

Tabelas de loot como dado: `pools`, cada pool sorteado `rolls` vezes entre as `entries` pelo `weight`. Uma
tabela também pode vir de arquivo, em `data/<mod>/loot_tables/<nome>.json`, e aí só o servidor a lê. O sorteio
é do servidor (`world.rollLoot`, o `loot` de um mob, o `loot` de um bloco). `LootTableType` é a mesma tabela
escrita como classe.

```ts
register(path: string, table: LootTable): string;
modify(table: FullName, change: ((table: LootTable, info: ModifyInfo) => LootTable | void) | { pools: LootTable['pools'] }, opts?: ModifyOptions): void;
```

A forma do dado:

```ts
type LootRange = number | { min: number; max: number };
type LootCondition =
  | { type: 'random_chance'; chance: number }
  | { type: 'killed_by_player' }
  | { type: 'match_tool'; item?: string; tag?: string }
  | { type: 'time'; when: 'day' | 'night' }
  | { type: 'not'; term: LootCondition };
interface LootTable {
  pools: {
    rolls?: LootRange;
    conditions?: LootCondition[];
    entries: ({ item: string; weight?: number; count?: LootRange; conditions?: LootCondition[] } | { empty: true; weight?: number })[];
  }[];
}
```

- `modify` **edita**, não substitui: a função recebe uma cópia (`{ pools }`), altera e devolve (ou só altera).
  Tabela de arquivo é modificada depois de os arquivos serem lidos, só no servidor.
- Para trocar uma tabela inteira, espere o momento em que todas existem (o evento de tabelas carregadas, só no
  servidor, uma vez por boot) e use o `set(nome, tabela)` dele.
- Um mob ou bloco que aponta para uma tabela que não existe impede o servidor de subir, com o nome na mensagem.

```js
ctx.loot.register('sentinela', {
  pools: [{
    rolls: { min: 1, max: 3 },
    entries: [
      { item: 'meumod:nucleo', weight: 3, count: { min: 1, max: 2 } },
      { item: 'meumod:lasca', weight: 1, conditions: [{ type: 'killed_by_player' }] },
    ],
  }],
});
ctx.loot.modify('meumod:sentinela', (t) => { t.pools[0].rolls = 4; });
```

## `ctx.cosmetics`

Capas e marcas. Uma capa é a aparência que se ganha jogando e nunca se compra: destrava com `wins` (vitórias em
minigame) **ou** com `feat` (o caminho curto de uma marca registrada), nunca os dois. A arte é pixel-art por
código — `paint(e)` responde a cor de **um** pixel, numa capa de 8 × 12. Uma marca (`FeatType`) tem `text` (o
que o `/capa` imprime) e `test(e)`, que **só lê** a conta. Registre nos **dois lados**, na mesma ordem.

```ts
cape(path: string, cape: CapeTypeLike): string;
feat(path: string, feat: FeatTypeLike): string;
capes: { modify(target: FullName, change: CapePatch | ((cape: CapeTypeLike, info: ModifyInfo) => CapeTypeLike | void), opts?: ModifyOptions): void };
feats: { modify(target: FullName, change: FeatPatch | ((feat: FeatTypeLike, info: ModifyInfo) => FeatTypeLike | void), opts?: ModifyOptions): void };
```

| campo | para que serve |
| --- | --- |
| `name` | o nome que o `/capa` lista |
| `wins` / `feat` | o destrave: vitórias em minigame, ou uma marca registrada |
| `pattern` | o nome do desenho |
| `colors` | a paleta que o `paint` recebe em `e.colors` |
| `paint(e)` | a cor de um pixel; `e` = `{ x, y, width, height, colors }` |

A conta guarda o **índice** da capa vestida, que é a ordem de registro: capa nova entra sempre no **fim**.
Os caminhos de capa e de marca são únicos entre mods, e capa que cita marca que ninguém registrou para o boot.
Uma capa nunca muda dano, alcance nem colisão — campo fora da lista é recusado no boot. O `test` de uma marca
lê a conta por `e.account.get(campo)` e, melhor, pelas estatísticas registradas em `e.progress`
(ver [ctx.progress](#ctxprogress)).

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
ctx.cosmetics.feat('fundo', new Fundo());   // a marca primeiro: a capa a cita pelo nome curto
ctx.cosmetics.cape('veio', new Veio());
```

## `ctx.trades`

As trocas do mercador. Um conjunto (`TradeSetType`) é a lista de ofertas de **uma** zona: `zone` (a chave da
zona, ou o nome completo de uma zona de mod), `perCamp` (quantas delas um mercador mostra, 1..32, padrão 4) e
`offers`. Cada oferta é `{ give: [item, quantos], get: [item, quantos] }`, com os itens citados por nome — então
um conjunto cabe já na fase de bootstrap. Registre nos **dois lados**, na mesma ordem.

```ts
register(path: string, set: TradeSetTypeLike): string;
modify(set: FullName, change: TradeSetTypeLike | ((set: TradeSetTypeLike, info: ModifyInfo) => TradeSetTypeLike), opts?: ModifyOptions): void;
```

O motor fica com o mecanismo: o alcance até o mercador, a troca atômica e o sorteio determinístico de quais
ofertas cada acampamento mostra. As trocas de uma zona são os conjuntos dela **concatenados na ordem de
registro** (os do jogo base primeiro), e o `perCamp` da zona é o do primeiro conjunto dela. A ordem é o índice
que a mensagem de troca leva: oferta nova vai no **fim**.

```js
import { TradeSetType } from './mineclaude-sdk.js';

class Ermos extends TradeSetType {
  zone = 'ermos'; perCamp = 3;
  offers = [{ give: ['mineclaude:wheat', 6], get: ['meumod:lasca', 2] }];
}
ctx.trades.register('ermos', new Ermos());
ctx.trades.modify('meumod:ermos', { perCamp: 4 });
```

## `ctx.npcs`

NPCs que vivem no mundo: alguém com nome, casa, ofício, mochila, fome e sono, que lembra de quem conhece, anda
até os lugares abrindo portas, cava, põe blocos, ergue uma construção a partir de uma planta, usa baús, come,
dorme, conversa e foge — e continua sendo ele depois de o servidor reiniciar. Um tipo de NPC é um **mob
persistente** cujo `ai` é o cérebro do motor; o corpo é do mod e pode ter qualquer forma, desenhado pelo
renderizador de mob dele, que lê a vista sincronizada (`view`).

```ts
register(path: string, def: NpcTypeDef): string;
goal(path: string, def: NpcGoal): string;
action(path: string, def: NpcAction): string;
blueprint(path: string, def: NpcBlueprint): string;
blueprintOf(name: string): any;
view(mobId: number): Record<string, any> | null;
spawn(type: string, world: any, pos: { x: number; y: number; z: number }, init?: Partial<NpcState>): any;
stateOf(mobId: number): NpcState | null;
activityOf(mobId: number): { goal: string | null; step: number; action: string | null; target: NpcCell | null; lastFail: string | null; pose: string | null } | null;
list(): { id: number; type: string; pos: { x: number; y: number; z: number } }[];
stats(): any;
resetStats(): void;
readonly governor: NpcGovernor;
readonly lib: NpcLib;
```

- `register`, `goal`, `action` e `blueprint` são declarados nos dois lados; `spawn` é do **servidor** e `view` é
  a vista que o **navegador** lê para desenhar o corpo.
- **O tipo** (`NpcTypeDef`): `name`, `halfW`, `height`, `hp`, `speed`, `walkSpeed`, `bodyCells` (altura em
  células que o caminho pede), `reach`, `digSpeed`, `needs` (queda por dia de `hunger`, `energy`, `safety`,
  `social`), `goals` (nomes, ou `[nome, objetivo]`), `think` (segundos entre escolhas) e os ganchos
  `init(n, e)`, `tick(n, e)`, `view(state, mem)`, `onInteract(e, npc)`, `onHurt(e, npc)`, `onDeath(e)`.
- **O registro** (`NpcState`, salvo com o mob): `name`, `seed`, `role`, `home`, `work`, `places`, `areas` (as
  caixas onde ele pode editar o mundo — sem caixa, nenhuma edição), `inv`, `held`, `needs`, `rel` e `data`.
- **O cérebro**: a cada `think` segundos cada objetivo dá uma nota (`score`, 0..1, a maior vence; o objetivo em
  andamento ganha `stick`); o vencedor faz um plano (`plan`), uma lista de passos `{ do: 'ação', ...args }`. Uma
  ação devolve `'run'`, `'done'` ou um motivo de falha começando com `'!'`. Ações do motor: `walk`, `wait`,
  `work`, `dig`, `place`, `build`, `store`, `take`, `drop`, `eat`, `sleep`, `talk`, `flee`, `wander`, `harvest`
  e `fight`.
- **Plantas** (`blueprint`): camadas de texto de baixo para cima (`.` deixa a célula como está, espaço vira ar)
  mais a paleta de blocos.
- `governor` é o interruptor e o teto de edições de NPC do mundo inteiro (`paused`, `perMinute`, `setLimit`,
  `snapshot`). `lib` são os ajudantes puros do cérebro (caminho, agenda, mochila, recusa de edição) para quem
  escreve objetivos e ações próprios. Os ganchos, os motivos de falha e as regras de segurança das edições
  estão no [guia-de-mods.md](guia-de-mods.md).

```js
const L = ctx.npcs.lib;
ctx.npcs.goal('dormir', {
  score: (n) => (L.scheduleAt([[0.52, 0.98, 'noite']], n.host.time) ? 0.8 : 0),
  plan: (n) => [{ do: 'sleep', bed: n.state.home, onTop: false }],
});
ctx.npcs.blueprint('cabana', { palette: { c: 'mineclaude:cobblestone' }, layers: [['ccc', 'c c'], ['ccc', 'ccc']] });
ctx.npcs.register('morador', { name: 'Morador', height: 1.8, hp: 20, speed: 2, goals: ['dormir'] });
if (ctx.isServer()) ctx.npcs.spawn('meumod:morador', world, pos, { role: 'miner', home: { x: 4, y: 64, z: 4 } });
```

## `ctx.progress`

A progressão da conta: estatísticas, metas, páginas de bestiário e o rodízio do Destaque do Dia. Os quatro
registros valem nos **dois lados**, na mesma ordem, e ficam na entrada principal do mod. Ler e escrever número
é só no **servidor**.

```ts
stat(path: string, stat: StatTypeLike): string;
highlight(path: string, entry: HighlightTypeLike): string;
goal(path: string, goal: GoalTypeLike): string;
bestiary(path: string, entry: BestiaryTypeLike): string;
of(name: FullName): StatHandle;
firstSession(path: string, session: FirstSessionType): string;
stats: ProgressRegistryEdit<StatPatch, StatTypeLike>;
highlights: ProgressRegistryEdit<HighlightPatch, HighlightTypeLike>;
goals: ProgressRegistryEdit<GoalPatch, GoalTypeLike>;
bestiaries: ProgressRegistryEdit<BestiaryPatch, BestiaryTypeLike>;
firstSessions: FirstSessionsApi;
```

Cada registro de progressão aceita as mesmas duas edições sobre o registro de qualquer mod:

```ts
interface ProgressRegistryEdit<Patch, Like> {
  modify(target: FullName, change: Patch | ((entry: Like, info: ModifyInfo) => Like | void), opts?: ModifyOptions): void;
  remove(target: FullName, opts?: ModifyOptions): void;
}
```

| registro | o que é |
| --- | --- |
| `StatType` | **um número de uma conta**, acumulado entre sessões. `scope` (`'total'`, `'day'`, `'week'`, ou uma lista) é o que faz a chave virar sozinha, com o fuso em `dayOffsetMs` e o começo da semana em `weekStart`. `kind: 'count'` soma; `kind: 'record'` guarda a melhor marca (`better: 'higher' \| 'lower'`). `group` diz de que lado do jogo o número é contado, e por isso o caminho de uma estatística com `group` é único entre mods. |
| `GoalType` | a **meta ou conquista**: a condição é "a estatística `stat` chegou a `n`", e ela não guarda número próprio. `pool` diz de qual sorteio sai (`'day'`, `'week'`, `'debut'`) e `scope` qual escopo da estatística a condição lê. Uma meta não paga nada: só conta. |
| `BestiaryType` | a **página de um mob**: o `group` cujos `tiers` são os cortes de cada nível, a `hint` de onde procurar um nunca caçado e o `bred`. Mob sem página não está no bestiário. |
| `HighlightType` | uma entrada do rodízio do **Destaque do Dia**: o `mode` que vai ao topo do painel naquele dia, o `text` do cartão e, nos dias virados, o um número daquele modo que a virada troca (`field`/`from`/`to`, os três juntos). **A ordem de registro é o rodízio**: entrada nova vai no fim. |

- Registre a estatística **antes** da meta que a lê; meta de sorteio pede `group` na estatística. Estatística
  ainda lida por uma meta não sai do jogo (tire a meta primeiro).
- `of(nome)` devolve o punho de uma estatística **do próprio mod**, para ler e escrever:
  `get(jogador | uuid, escopo?)`, `add(jogador, n?)` num contador e `offer(jogador, marca)` num recorde. A
  estatística de outro mod se lê pelo `e.progress` que os ganchos recebem: `get('mod:stat', escopo?)` devolve o
  número (0 = nada guardado) e nome que ninguém registrou é **erro**, não `undefined`.
- `firstSession` registra a **primeira sessão** de uma conta: a saudação de quem acabou de criar a conta
  (`greetAfter`, `idleAfter`, `onStart`, `greet`, `roomWelcome`, `idle`). Só no servidor. Por `firstSessions` dá
  para desligar (`disable`/`remove`), trocar (`replace`) ou embrulhar (`wrap`) a de qualquer mod.
- `remove` deixa o id como um buraco: a ordem do resto não anda e o que as contas já guardaram continua
  guardado.

```js
import { GoalType, StatType } from './mineclaude-sdk.js';

class Pedras extends StatType { scope = ['total', 'day']; group = 'mundo'; }
class DezPedras extends GoalType { stat = 'pedra'; n = 10; text = 'Quebre 10 pedras'; pool = 'day'; }
ctx.progress.stat('pedra', new Pedras());
ctx.progress.goal('dez_pedras', new DezPedras());   // depois da estatística que ela lê
if (ctx.isServer()) {
  const pedra = ctx.progress.of('meumod:pedra');    // só o do PRÓPRIO mod
  ctx.events.on('blockBreak', (e) => { if (!e.cancelled) pedra.add(e.player, 1); });
}
```

## `ctx.projectiles`

Projéteis: uma flecha, um estilhaço, uma bola de fogo. Registre nos **dois lados**, na mesma ordem (a mensagem
de rede leva o id do tipo). O voo, a colisão e o crédito da morte são do motor; o navegador desenha.

```ts
register(path: string, desc: ProjectileDesc | ProjectileType): string;
modify(target: FullName, change: ProjectilePatch | ((projectile: ProjectileDesc, info: ModifyInfo) => ProjectileDesc | void), opts?: ModifyOptions): void;
wrap<K extends ProjectileHookName>(target: FullName, hook: K, wrapper: HookWrapper<ProjectileDesc, K>, opts?: ModifyOptions): void;
```

| campo | o que é |
| --- | --- |
| `name` | o nome do tipo |
| `gravity`, `life`, `damage` | a gravidade (vezes a da flecha), a vida em segundos e o dano |
| `size`, `color`, `glow` | o desenho: tamanho, cor e se brilha |
| `shape` | `'cube'` (padrão, um cubo girando) ou `'arrow'` (uma flecha de ponta, alinhada ao voo) |
| `onHitEntity(e)` | acertou alguém: `e.target.player` ou `e.target.mob`, `e.damage` editável, `e.cancel()`, `e.owner` |
| `onHitBlock(e)` | acertou um bloco: `e.pos`, `e.block` |

O `wrap` envolve `onHitEntity` ou `onHitBlock`: `wrapper(original, e)`. No servidor, quem atira é
`world.shootProjectile(nome, { from, velocity, owner })`, que devolve o id ou `null`.

```js
import { ProjectileType } from './mineclaude-sdk.js';

class Estilhaco extends ProjectileType {
  name = 'Estilhaço'; gravity = 0.25; life = 3; damage = 3; size = 0.18; color = '#68fff0'; glow = true;
  onHitEntity(e) { e.damage += 1; }
}
ctx.projectiles.register('estilhaco', new Estilhaco());
// no servidor, do olho do jogador para onde ele olha:
const { eye: from, look } = e.player;
e.world.shootProjectile('meumod:estilhaco', { from, velocity: { x: look.x * 20, y: look.y * 20, z: look.z * 20 }, owner: e.player });
```

## `ctx.particles`

Partículas, emissores e partículas de ambiente. O tipo é registrado nos **dois lados**, na mesma ordem (a
mensagem de rede leva o id); o desenho e o movimento são do navegador.

```ts
register(path: string, desc: ParticleDesc | ParticleType): string;
modify(target: FullName, change: ParticlePatch | ((particle: ParticleDesc, info: ModifyInfo) => ParticleDesc | void), opts?: ModifyOptions): void;
wrap(target: FullName, hook: 'onTick', wrapper: HookWrapper<ParticleDesc, 'onTick'>, opts?: ModifyOptions): void;
remove(target: FullName, opts?: ModifyOptions): void;
emitter(path: string, desc: ParticleEmitterDesc | ParticleEmitterType | null): string;
ambient(path: string, desc: AmbientParticleDesc | null): string;
spawn(name: string, pos: Pos, count?: number, opts?: { block?: string }): void;
```

- **O tipo** (`ParticleDesc` / `ParticleType`): `colors` (1..8 cores), `sprites` (1..8 texturas do atlas: a
  partícula vira billboard e os quadros andam pela vida dela), `size`, `life`, `gravity`, `speed`, `spread`,
  `rise`, `shrink`, `drag`, `collide`, `bounce`, `blend` (`'normal'` ou `'add'`), `burst` (o teto dela por
  rajada, 1..512), `fromBlock` (a rajada carrega um bloco e, sem `sprites`, tira as cores da textura dele) e
  `role`, o papel do motor que ela atende (`'block_dust'`, `'heart'` — um papel tem um dono só).
  `onTick(p, e)` roda depois do passo do motor: `p` tem `x/y/z`, `vx/vy/vz`, `age`, `life`, `grounded`, e `e`
  tem `dt`, `solidAt(x, y, z)` e `remove()`.
- **`emitter`** é um registro preso a um bloco (toda célula dele à vista emite) **ou** a um mob (todo mob
  daquele tipo), exatamente um dos dois: `particle`, `block`/`mob`, `rate`, `count`, `radius`, `offset` e
  `when(e)`. `emitter('outromod:fumaca', ...)` troca o do outro mod e `emitter('outromod:fumaca', null)` o
  tira do jogo. Até 32 por mod.
- **`ambient`** é a vida do ar em volta do jogador nos presets gráficos sombreados: `particle`, `anchor`
  (`'canopy'`, `'ground'`, `'air'`, `'water'`, `'blocks'`), `blocks`, `height`, `rate`, `radius`, `max`,
  `when`, `light`, `gust`, `wind`, `flutter`, `blink`, `glow`, `fromBlock`. Até 24 por mod.
- `modify` alcança tudo o que o dono declarou, menos o `role` e o `fromBlock`. `remove` devolve o papel ao
  motor, que não desenha nada até alguém tomá-lo; o id fica como um vão.
- Quem solta: no servidor, `world.spawnParticles('mod:faisca', pos, { count, block })` para quem está perto; no
  navegador, `ctx.particles.spawn(...)`. O `count` é cortado no `burst` do tipo. Cada mod tem um orçamento de
  partículas vivas dentro de um teto global: o que não couber não nasce.

```js
import { ParticleType } from './mineclaude-sdk.js';

class Faisca extends ParticleType {
  colors = ['#68fff0', '#ffffff'];
  size = 0.07; life = 0.7; gravity = -0.15; speed = 2.5; blend = 'add'; collide = true; bounce = 0.4;
  onTick(p, e) { p.vx += Math.sin(p.age * 9) * 18 * e.dt; if (p.grounded) e.remove(); }
}
ctx.particles.register('faisca', new Faisca());
ctx.particles.emitter('fumaca', { particle: 'meumod:faisca', block: 'meumod:fumarola', rate: 6, offset: { y: 0.55 } });
```

## `ctx.weather`

O clima. São duas camadas. A **global** é um `WeatherType` registrado nos dois lados (chuva, neve, eclipse,
aurora): o motor guarda um estado por dimensão, o sorteio periódico, o fim de cada clima e a transição no
navegador. A **regional** é o tempo como função pura de semente, lugar e instante — pressão, vento,
temperatura, umidade e células que andam com o vento —, declarada também nos dois lados, na mesma ordem. O
modelo regional, com as unidades de cada campo, está no [guia-de-mods.md](guia-de-mods.md).

```ts
register(path: string, type: WeatherTypeLike): string;
list(): { name: string; command: string; chance: number; dimensions: string[] }[];
modify(target: FullName | `#${string}`, change: WeatherPatch | ((weather: WeatherTypeLike, info: ModifyInfo) => WeatherTypeLike | void), opts?: ModifyOptions): void;
wrap<K extends WeatherHookName>(target: FullName | `#${string}`, hook: K, wrapper: HookWrapper<WeatherTypeLike, K>, opts?: ModifyOptions): void;
remove(target: FullName, opts?: ModifyOptions): void;
event(path: string, def: ClimateEventDef): FullName;
events(): { name: FullName; label: string; icon: string; command: string; precipitation: ClimatePrecipitation; natural: boolean; rarity: number }[];
environment(path: string, def: ClimateEnvironmentDef): FullName;
profile(biome: FullName, def: { temperature?: number; humidity?: number; environment?: FullName | null }): FullName;
terrain(def: ClimateTerrainDef, dimension?: FullName): void;
source(path: string, def: ClimateSourceDef | null): FullName;
surfaceField(path: string, def: ClimateSurfaceFieldDef): FullName;
sample(x: number, y: number, z: number, dimension?: FullName): ClimateSample | null;
forecast(x: number, z: number, hours?: number, dimension?: FullName): ClimateForecastRow[];
surface(field: FullName, x: number, z: number, dimension?: FullName): number | null;
clock(dimension?: FullName): number;
cells: ClimateCellsApi;
```

- **Campos de um `WeatherType`:** `name`, `command` (a palavra do comando de clima), `dimensions` (ids
  completos; o padrão é só o Overworld), `chance` (0..1 por janela de sorteio), `minMs`/`maxMs`, `cooldown`
  (janelas de espera depois que acaba), `order` (o céu aplica os efeitos em ordem crescente) e `refusal`/
  `already` (o que o comando diz quando não dá para começar, ou já está ativo).
- **Ganchos de servidor**, com `e` = `{ dimension, now, frac, dayMs, rng, forced, name, from, until, left,
  world, server }`: `canStart(e)`, `duration(e)` (ms; 0 = não começa), `shouldEnd(e)`, `onStart(e)`,
  `onTick(e)` (cerca de uma vez por segundo), `onEnd(e)` e `status(e)`. Use `e.rng()` no lugar de
  `Math.random`.
- **Ganchos de navegador**, com `f` = o quadro (`dt`, `now`, `eye`, `active`, `elapsed`, `dur`, `left`,
  `level(nome)`, `enabled`, `solidAt`, `columnAt`, `noise(nível, opts)`, `sky.body('sun')`...): `build(kit)`
  uma vez, `tick(f)` devolve a força 0..1, `render(f)` desenha, `modifySky(s, força)` mexe no estado do céu e
  `reset()` ao trocar de dimensão.
- `modify` e `wrap` aceitam um nome completo ou uma `#tag` de climas, e alcançam os ganchos dos dois lados.
  `remove` tira o clima do sorteio, do desenho e da lista; o id fica como um vão.
- No servidor, `world.weather` comanda a dimensão em que o mod age: `active()`, `has(nome)`, `types()`,
  `start(nome, ms?)`, `stop(nome)` e `clear()`.
- O estado de cada dimensão vai no save daquela dimensão, então uma reinicialização não apaga a chuva forçada.
  Um clima que nenhum mod registra mais é ignorado na carga.

```js
import { WeatherType } from './mineclaude-sdk.js';

class Petalas extends WeatherType {
  name = 'Pétalas'; command = 'petalas'; chance = 0.2; minMs = 60000; maxMs = 180000; cooldown = 2; order = 5;
  dimensions = ['mineclaude:overworld'];
  onTick(e) { if (e.rng() < 0.1) for (const p of e.server.players()) p.addEffect('meumod:calma', 4); }
  tick(f) { return Math.min(1, f.elapsed / 4000); }
}
ctx.weather.register('petalas', new Petalas());
```

## `ctx.registries`

Registros do próprio mod: uma tabela com nome em que qualquer mod põe entradas, para dados que não têm um
registro pronto no SDK (tipos de máquina, papéis, receitas de outro sistema). Vale nos dois lados; com
`synced: true` a lista entra no acordo de versão do handshake e o navegador adota os valores do servidor.

```ts
create<T = any>(path: string, opts?: ModRegistryOptions): ModRegistry<T>;
register(registry: FullName, entry: string, value: any): FullName;
get<T = any>(name: FullName): ModRegistry<T> | undefined;
list(): { name: FullName; mod: string; synced: boolean; size: number }[];
```

Um `ModRegistry` tem `name`, `synced`, `register(entrada, valor)`, `get(entrada)`, `has(entrada)`, `ids()`,
`list()` e `size`. O valor é JSON puro, conferido pelo `schema` (ou `codec`) declarado no `create`, com até
4096 bytes por entrada; entrada só se põe na entrada principal do mod e antes do fim do carregamento. No
navegador, `get` só dá a resposta final **depois** do congelamento, então leia de um evento de início de
cliente, nunca de dentro do seu `register`.

```js
export default class M extends ModInitializer {
  onInitialize(ctx) {
    const papeis = ctx.registries.create('papeis', { synced: true, schema: { nome: 'string', peso: 'int' } });
    papeis.register('ferreiro', { nome: 'Ferreiro', peso: 3 });
    ctx.registries.register('meumod:papeis', 'padeiro', { nome: 'Padeiro', peso: 1 });
  }
}
```

## `ctx.enchantments`

Encantamentos. Cada um também vira um componente de item `<mod>:<nome>` = `{ level }`, então a pilha o guarda,
salva e sincroniza como qualquer componente. Registre nos dois lados; os ganchos rodam no servidor.

```ts
register(path: string, desc: EnchantmentDesc | EnchantmentType): string;
modify(target: FullName, change: EnchantmentPatch | ((enchantment: EnchantmentDesc, info: ModifyInfo) => EnchantmentDesc | void), opts?: ModifyOptions): void;
wrap<K extends EnchantmentHookName>(target: FullName, hook: K, wrapper: HookWrapper<EnchantmentDesc, K>, opts?: ModifyOptions): void;
```

Campos: `name`, `maxLevel` e `items` (uma `#tag` de item ou uma lista de nomes; sem isso, qualquer item).
`onAttack(e)` roda no golpe com o item (`e.damage` é editável, `e.target` é `{ player }` ou `{ mob }`) e
`onHurt(e)` quando quem veste a peça leva dano, antes da armadura. O `modify` não muda `maxLevel`, que é o teto
do componente.

```js
import { EnchantmentType } from './mineclaude-sdk.js';

class Ressonancia extends EnchantmentType {
  name = 'Ressonância'; maxLevel = 3; items = '#c:swords';
  onAttack(e) { e.damage += 1.5 * e.level; }
}
ctx.enchantments.register('ressonancia', new Ressonancia());
e.player.enchant('held', 'meumod:ressonancia', 2);   // false se não há item, ou o item não aceita
```

## `ctx.potions`

Poções. O registro cria o item bebível `<mod>:<path>` — um frasco que não empilha, pintado na cor da poção — e
beber aplica os efeitos. Registre nos dois lados.

```ts
register(path: string, desc: PotionDesc | PotionType): string;
modify(target: FullName, change: PotionPatch | ((potion: PotionDesc, info: ModifyInfo) => PotionDesc | void), opts?: ModifyOptions): void;
wrap(target: FullName, hook: 'onEaten' | 'onTooltip', wrapper: (original: (...args: any[]) => any, ...args: any[]) => any, opts?: ModifyOptions): void;
```

Campos: `name`, `color`, `effects` (até quatro, cada um `{ effect, seconds, level?, chance? }`), `lore` e
`rarity` (`'common'`, `'uncommon'`, `'rare'`, `'epic'`). O alvo do `modify` é o nome do **item** que a poção
deixou, e a garrafa é repintada.

```js
import { PotionType } from './mineclaude-sdk.js';

class Elixir extends PotionType {
  name = 'Elixir'; color = '#3fd9c8'; rarity = 'rare';
  effects = [{ effect: 'meumod:calma', seconds: 90, level: 2 }];
}
ctx.potions.register('elixir', new Elixir());   // cria o item bebível meumod:elixir
```

## `ctx.fluids`

Fluidos. O motor não sabe o que é água: ele simula, desenha e move o jogador por **qualquer** fluido
registrado, e a água do jogo base é um fluido como os outros. Registrar cria o bloco da fonte `<mod>:<path>` e
os blocos de corrente `<mod>:<path>_1..N` (N = `flowDistance`, escondidos da paleta) e, com `bucket`, o item
`<mod>:<path>_bucket`. A corrente não vai para o save: a física a refaz a partir das fontes.

```ts
register(path: string, desc: FluidDesc | FluidType): string;
container(desc: FluidContainerDesc): FullName;
attributes(name: FullName): FluidAttributes | null;
modify(target: FullName | `#${string}`, change: FluidPatch | ((fluid: FluidDesc, info: ModifyInfo) => FluidDesc | void), opts?: ModifyOptions): void;
wrap<K extends FluidHookName>(target: FullName | `#${string}`, hook: K, wrapper: HookWrapper<FluidDesc, K>, opts?: ModifyOptions): void;
```

| campo | o que é |
| --- | --- |
| `texture`, `flowingTexture`, `paint(t)`, `render` | a aparência: textura da fonte e da corrente, ou a pixel-art por código (alfa por pixel = translucidez) |
| `tickRate`, `flowDistance`, `infinite` | ticks entre passos do fluxo, blocos que escorre para o lado (1..7) e se duas fontes vizinhas criam uma fonte |
| `viscosity`, `swimmable`, `drowns` | quanto freia quem anda (0..0.95), se dá para nadar e se a cabeça dentro gasta o ar |
| `damage`, `ignites`, `light`, `fog` | vida por segundo a quem está dentro, segundos de fogo, luz emitida e a névoa com a câmera dentro |
| `bucket` | `true` cria `<path>_bucket`; uma string usa um item do mod; um objeto dá nome, textura e cor ao balde |
| `adopt` | usa blocos que o mod já registrou (`<adopt>` e `<adopt>_1..N`) em vez de criar novos |
| `fillSound`, `emptySound`, `temperature`, `gaseous` | atributos que outros mods leem por `attributes(nome)` |
| `onEntityInside(e)`, `onTick(e)`, `onMeet(e)` | servidor: a cada meio segundo por jogador dentro, a cada passo do fluxo de uma célula, e o encontro com outro fluido (`true` = tratei) |

`container` declara um recipiente: o item `empty` que, ao receber `amount` do fluido, vira o item `full` (e o
contrário) — uma garrafa, um frasco. O `amount` é em unidades de transferência (1000 = um balde) e só o
recipiente de exatamente um balde pega e põe fonte no mundo. Os dois itens têm de existir quando o jogo carrega.

```js
import { FluidType } from './mineclaude-sdk.js';

class Seiva extends FluidType {
  name = 'Seiva'; texture = 'seiva'; tickRate = 12; flowDistance = 3; viscosity = 0.8; light = 4;
  fog = { color: '#c98a1a', near: 0.3, far: 6 };
  bucket = { name: 'Balde de seiva', color: '#d99a2b' };
  onEntityInside(e) { e.player.heal(1); }
}
ctx.fluids.register('seiva', new Seiva());
ctx.fluids.container({ empty: 'meumod:frasco', full: 'meumod:frasco_seiva', fluid: 'meumod:seiva', amount: 250 });
```

## `ctx.worldgen`

Tudo o que entra na geração do mundo: minério, decoração, estruturas, biomas, estágios do gerador, funções de
densidade, paisagem e as zonas de perigo. O registro vale **nos dois lados, na mesma ordem**, porque o navegador
regenera o terreno pela seed: o mesmo código tem de rodar no servidor e na página e dar o mesmo chunk. Por isso
todo passo é **determinístico** — só `api.rand` e os ruídos com nome, nada de `Math.random`, `Date`,
`performance.now` nem variável guardada entre chamadas. O texto corrido sobre o assunto está na seção 22 do
[guia-de-mods.md](guia-de-mods.md).

Cada registro devolve o id do passo, `<mod>:<caminho>@<worldgenVersion>` (a `worldgenVersion` do `mod.json`; sem
ela, a `version`). O navegador recebe a lista e recusa entrar se a dele for diferente, então mantenha o
comportamento dos passos estável dentro de uma `worldgenVersion`. O `modkit check` gera o mesmo chunk duas vezes,
compara byte a byte e mede o custo (aviso acima de 2 ms por chunk).

### Minério e features

```ts
ore(path: string, desc: OreDesc | (new (ctx: GenerationContext) => OreFeature)): string;
feature(path: string, desc: FeatureDesc): string;
```

| Campo de `OreDesc` | Regra |
|---|---|
| `block` | nome completo do bloco; troca **só** `mineclaude:stone` |
| `zones` / `biomes` | filtros opcionais: zonas de perigo e nomes de bioma ou `#tag` (num mundo sem biomas o filtro de bioma nunca casa) |
| `minY` / `maxY` | a faixa do veio |
| `perChunk` | 1..20 veios por chunk |
| `veinSize` | 1..12 blocos por veio (cortado no chunk) |

`FeatureDesc` tem `zones`, `biomes`, `placement` e `run(api, pos?)`. Sem `placement`, o `run` roda uma vez por
chunk cujo centro passa nos filtros. Com `placement`, ele roda uma vez por posição que sobrar dos passos de
posicionamento.

O `api` (`WorldgenApi`) traz `cx`, `cz`, `x0`, `z0`, `terrain` (1 ou 2), `rand(salt, x?, y?, z?)`,
`get(lx, y, lz)`, `set(lx, y, lz, bloco, soNoAr?)`, `heightAt(wx, wz)`, `zoneAt(wx, wz)`, `columnAt(wx, wz)`,
`biomeAt(wx, wz)` e `undergroundAt(wx, y, wz)`. `get` e `set` usam coordenadas locais 0..15 e ignoram o que cair
fora do chunk.

```js
ctx.worldgen.ore('jade_ore', {
  block: 'meumod:jade_ore', zones: ['sombrias'],
  minY: 5, maxY: 40, perChunk: 6, veinSize: 4,
});
```

### Biomas

```ts
biome(path: string, desc: BiomeDesc): string;
terrain(path: string, desc: TerrainDesc): string;
```

| Campo de `BiomeDesc` | Regra |
|---|---|
| `name` | nome na tela, 1..32 caracteres |
| `climate` | `{ temp: [min, max], humidity: [min, max] }` em −1..1 |
| `weight` | 1..100: peso no sorteio entre os biomas que cabem no mesmo clima |
| `zones` | filtro opcional de zona de perigo |
| `surface` / `filler` | o bloco do chão e os 3 logo abaixo (só em coluna que seria grama) |
| `placement` | o nicho no terreno novo: campo 2D com nome ou `'altitude'` → `[min, max]` |
| `treeDensity` / `grassDensity` | 0..2 (padrão 1) |
| `color` | `'#rrggbb'`: tinge o topo da grama nas colunas do bioma |

Biomas são decididos quando o mundo nasce e **nunca mudam um mundo que já existe**; quem roda o servidor controla
isso com `MODLOADER_BIOMES`. O `terrain` é um passo que move o chão depois das colunas do jogo e antes de árvores e
estruturas (`api.setHeight`, `api.height`, `api.baseHeight`, `api.noise2`, `api.biomeWeight`); ele exige um mundo
com biomas. Para mexer em biomas que já existem, veja `biomes` em **Modificar o que já existe**.

```js
ctx.worldgen.biome('mangue', {
  name: 'Mangue', climate: { temp: [-0.05, 1], humidity: [0, 1] }, weight: 50,
  surface: 'meumod:lama', filler: 'meumod:lama', treeDensity: 2, grassDensity: 0, color: '#5a6b3a',
});
```

### Estágios e passos do gerador

```ts
stage(path: string, Stage: new (ctx: GenerationContext) => WorldgenStage, opts?: { after?: string }): string;
carver(path: string, Stage: new (ctx: GenerationContext) => Carver, opts?: { after?: string }): string;
surface(path: string, Stage: new (ctx: GenerationContext) => SurfaceRule, opts?: { after?: string }): string;
migration(id: string, desc: MigrationDesc): string;
```

- `stage` acrescenta um estágio no fim do pipeline, ou depois do estágio que `after` nomear (id completo).
- `carver` roda logo depois das cavernas do jogo; `surface`, logo depois da regra de superfície do jogo.
- `migration` é a migração do save: `id` estável, roda uma vez num mundo que ainda não a lista e então fica
  marcada. Mundo novo nasce com todas marcadas.

As classes base, que dizem de que tipo é cada estágio:

```ts
export declare class WorldgenStage {
  constructor(ctx: GenerationContext);
  readonly ctx: GenerationContext;
  provides?(): Record<string, (...args: any[]) => any>;
  generate?(chunk: GenerationChunk): void;
}
export declare class TerrainShaper extends WorldgenStage { column(wx: number, wz: number): WorldgenColumn; reshape?(info: WorldgenColumn, wx: number, wz: number, h: number): WorldgenColumn }
export declare class BiomeSource extends WorldgenStage { biomeAt(wx: number, wz: number): { key: string; [field: string]: any } | null }
export declare class SurfaceRule extends WorldgenStage { generate(chunk: GenerationChunk): void }
export declare class Carver extends WorldgenStage { generate(chunk: GenerationChunk): void }
export declare class OreFeature extends WorldgenStage { generate(chunk: GenerationChunk): void }
export declare class Feature extends WorldgenStage { generate(chunk: GenerationChunk): void }
export declare class StructureFeature extends WorldgenStage { generate(chunk: GenerationChunk): void }
export declare class ChunkGenerator { stages: string[]; locators: Record<string, (...args: any[]) => any>; oreHost: string | null; naturalTrunks?: boolean }
```

| Classe | Para que serve |
|---|---|
| `TerrainShaper` | a altura de cada coluna (função pura de x/z); `reshape` recebe a coluna já movida por um passo anterior |
| `BiomeSource` | onde cresce cada bioma (só perguntado em mundo com biomas) |
| `SurfaceRule` | do que o chão é feito: camadas e cobertura |
| `Carver` | escava o chão: cavernas, ravinas |
| `OreFeature` | minério em classe (a forma declarativa `ore(path, desc)` continua valendo) |
| `Feature` | qualquer coisa que se põe no chunk: árvores, flores, água |
| `StructureFeature` | estrutura com lugar sorteado; costuma declarar `provides()` |
| `ChunkGenerator` | um gerador inteiro: a ordem dos estágios, as respostas padrão das consultas e o bloco que os minérios de mod trocam |

O `generate(chunk)` escreve em `chunk.data` ou por `chunk.set`; `chunk.info(lx, lz)` dá a coluna, e `chunk.state`
é o espaço de recado entre estágios do mesmo chunk. O `this.ctx` (`GenerationContext`) traz `seed`, `size`,
`height`, `seaLevel`, `opts`, `noise(offset)`, `namedNoise(nome)`, `hash3`, `block(nome)`, `zoneAt`, `columnInfo`,
`biomeAt`, `stage(id)`, `locate`, `density(nome)`, `sampleVolume`, `climateAt`, `blendAt` e as ferramentas de
subsolo, estrutura e paisagem.

```js
import { Carver } from './mineclaude-sdk.js';
class Ravina extends Carver {
  generate(chunk) {
    const n = this.ctx.noise(31);
    for (let lx = 0; lx < 16; lx++) for (let lz = 0; lz < 16; lz++) {
      const h = chunk.info(lx, lz).h;
      if (n.noise2((chunk.x0 + lx) / 90, (chunk.z0 + lz) / 90) > 0.72) {
        for (let y = h - 12; y <= h; y++) chunk.set(chunk.x0 + lx, y, chunk.z0 + lz, 0);
      }
    }
  }
}
ctx.worldgen.carver('ravina', Ravina);
```

### Densidade e clima

```ts
readonly density: DensityBuilders;
readonly placement: PlacementBuilders;
densityFn(path: string, node: DensityNode, opts?: { description?: string }): string;
climate(path: string, node: DensityNode, opts?: { description?: string }): string;
densityFns: {
  modify(target: FullName, fn: (inner: DensityNode) => DensityNode): string;
  replace(target: FullName, node: DensityNode): string;
};
```

Uma função de densidade dá um número para cada ponto (x, y, z): **> 0 é sólido**. Quem não lê y é um **campo 2D**
(um valor por coluna). Os nós são dado puro (`{ type, ... }`), feitos pelos construtores de `ctx.worldgen.density`,
e o grafo é determinístico por construção: ao amostrar não roda código seu. `climate` registra um campo 2D que o
`placement` dos biomas lê. `densityFns.modify` e `densityFns.replace` editam a função de qualquer um, do jogo base
inclusive; alvo desconhecido recusa o mod no boot.

| Construtor (`ctx.worldgen.density`) | O que é |
|---|---|
| `constant(v)`, `coord('x' \| 'y' \| 'z')` | número fixo; a coordenada do mundo |
| `noise2(nome, { scale, octaves?, fractal?, warp? })` | ruído 2D pelo nome (semente própria); `scale` = 1/blocos; `fractal` `'fbm'` ou `'ridged'`; `warp` dobra o campo |
| `noise3(nome, { scale, yScale?, octaves? })` | ruído 3D, cerca de −1..1 |
| `add`, `mul`, `min`, `max`, `abs`, `neg`, `square`, `sqrt`, `clamp` | aritmética |
| `smoothstep(a, de, até)`, `lerp(t, a, b)` | transições suaves |
| `spline(entrada, [{ at, value, slope? }])` | curva pelos nós; `value` pode ser outro nó (splines aninhadas) |
| `yGradient(y0, y1, v0, v1)`, `radial({ x, z, radius })` | rampa em y; 1 no centro caindo a 0 no raio |
| `ref('mod:nome')` | outra função com nome, resolvida quando o gerador nasce (vale o `modify` de outros mods) |
| `cache2d(a)`, `zeroDistance(a, step?)` | avalia uma vez por coluna; blocos até a linha onde um campo 2D cruza zero (faixas de largura constante, como rios) |
| `tube(a, b, raio)`, `chambers(campo, limiar)` | túneis longos onde dois campos 3D cruzam zero; bolhas acima do limiar |
| `zoneParam(param)`, `drainage(rede, saída)` | o parâmetro misturado da zona de paisagem; uma saída da rede de rios |

Os passos de posicionamento (`ctx.worldgen.placement`) transformam a lista de posições de uma feature:
`count(n)`, `oneIn(n)`, `inSquare()`, `heightmap(offset?)`, `heightRange(min, max)` e
`scan({ down?, up?, match })`. O que sobra chega ao `run(api, pos)` como `{ lx, y, lz }`.

```js
const D = ctx.worldgen.density, P = ctx.worldgen.placement;
ctx.worldgen.climate('pedregosidade', D.clamp(D.add(0.5, D.noise2('meumod:pedras', { scale: 1 / 300, octaves: 2 })), 0, 1));
ctx.worldgen.feature('pedregulhos', {
  placement: [P.count(2), P.inSquare(), P.heightmap(), P.scan({ down: 1, match: ['mineclaude:grass'] })],
  run(api, pos) { api.set(pos.lx, pos.y, pos.lz, 'mineclaude:stone', true); },
});
```

### Paisagem: zonas de paisagem, marcos e rios

```ts
landZoneLayout(spec: LandZoneLayoutSpec): string;
landZone(path: string, spec: LandZoneSpec): string;
drainage(path: string, spec: DrainageSpec): string;
landmark(path: string, spec: LandmarkSpec): string;
```

As **zonas de paisagem** são regiões grandes com nome e identidade; não confunda com a zona de perigo de
`ctx.worldgen.zone`. O desenho (`landZoneLayout`) é um por jogo: `cell` e `jitter` (o tamanho e a irregularidade
das células), `warp` (a deformação das bordas), `blend` (os blocos em que os parâmetros de duas zonas se misturam),
`select` e `units` (os campos 2D que julgam cada célula e a unidade de cada um), `params` (os parâmetros e o valor
padrão) e `fixed` (células presas a uma zona).

| Registro | Campos que importam |
|---|---|
| `landZone` | `name` (o que o jogador vê), `niche` (faixas dos campos `select`), `weight` 1..100, `params` (o que ela muda), `color`, `biomes` (multiplicador de peso por bioma), `structures` (multiplicador de frequência por conjunto) |
| `landmark` | `name`, `zones` (zona → peso), `radius` 4..30 (o `build` não passa disso), `needs` (`ground`, `altitude`, `relief`, `seaDepth`, `water`, `river`), `fits?`, `plan?`, `build(api, site)` |
| `drainage` | `potential`, `ground`, `rain` (campos 2D com nome), `outlet` (o y do mar), `cell`, `jitter`, `minFlow`, `width`/`depth`/`incision` `[min, por, máx]`, `fill`, `meander`, `lake`, `estuary`, `delta`, `falls`, `reach` |

O `build` de um marco recebe coordenadas do **mundo** e uma api cortada no chunk que está sendo gerado
(`set`, `get`, `ground`, `rand`, `has`, mais `seaLevel` e `height`), então o mesmo marco sai igual em qualquer
ordem de geração. No contexto de geração, `ctx.landZones`, `ctx.drainage(nome)` e `ctx.landmarks` leem o que já
está registrado.

### Subsolo: salas, depósitos e aquíferos

```ts
caveRoom(path: string, spec: CaveRoomSpec): string;
caveDecor(path: string, spec: CaveDecorSpec & { rooms?: FullName[] | null }): string;
oreDeposit(path: string, spec: OreDepositSpec): string;
aquiferRule(path: string, spec: AquiferRuleSpec): string;
```

Aqui a **profundidade é sempre uma fração do nível do mar**, nunca um y fixo: `0` é o nível do mar, `1` é o fundo
do mundo, negativo é acima do mar. Assim os números continuam valendo se a forma vertical do mundo mudar.

| Registro | Campos que importam |
|---|---|
| `caveRoom` | `weight`, `depth` `[de, até]`, `biomes?`, `shape` (`dome`, `ellipsoid`, `hall`, `shaft`), `radius` e `height` `[min, max]`, `wobble?`, `pool?` (lago selado por um anel de rocha), `pillars?`, `mound?`, `decor?` |
| `caveDecor` | `block`, `on` (`floor`, `ceiling`, `wall`), `chance`, `replace?`, e `rooms` (nomes completos; ausente = todas as salas, de qualquer mod) |
| `oreDeposit` | `kind` (`vein`, `blob`, `layer`), `block`, `depth`, `host?`, `size`, `thickness?`, `frequency`, `density?`, `filler?`/`fillerShare?`, `undulation?`; o campo vira a função de densidade `<mod>:deposit/<path>` |
| `aquiferRule` | `fluid` (ou `null`: célula seca de propósito), `depth`, `chance`, `level` `[lo, hi]` em volta do centro da célula, `belowSea?` — a regra do mod pega a sua parte da faixa antes da do jogo |

### Estruturas

```ts
structure(path: string, desc: StructureDesc): string;
structureSet(path: string, spec: StructureSetSpec): string;
structurePieces(path: string, spec: StructurePieceSet): string;
structureKind(path: string, desc: StructureKindDesc): string;
```

- `structure` é a forma declarativa: `region` 4..16 chunks, `chance` 0..1, `size` 1..48 blocos, `zones`, `biomes`
  e `build(api)`. Até 14 blocos a estrutura cabe num chunk; acima disso a origem é sorteada na região e **cada
  chunk sob a área** chama `build` com a mesma origem e um `api` cortado nele — escreva a estrutura inteira sem
  olhar o chunk. `api.origin` é `{ x, y, z, lx, lz }`.
- `structureSet` é **onde** uma estrutura grande pode ficar: `spacing` (lado da região em chunks),
  `separation`, `footprint`, `salt`, `spread` (`'linear'` ou `'triangular'`), `frequency`, `attempts` e
  `exclusion` (distância de outro conjunto, sem ciclos).
- `structurePieces` é **de que** ela é feita: `pieces` (cada uma com `id`, `size`, `height?`, `connectors`,
  `maxCount?`), `pools`, `start`, `maxDepth`, `maxRadius` e `gap`. Um conector com `pool` puxa uma peça do pool e
  a encaixa virada, com o conector `target` dela de frente para ele.
- `structureKind` declara um **tipo** que o motor conhece pelo que ele faz: `locator` (o nome da consulta que um
  estágio seu `provides()`), `near?`, `role?` (`dungeon`, `ruin`, `camp` ou um nome seu), `protects?` (padrão
  `true`: estruturas declarativas de mods nunca dividem chunk com ela) e `loot?` (`{ chest, boss }`).

A montagem, o cache de inícios e a adaptação do chão ficam em `ctx.structures`, dentro do estágio: `set`,
`starts`, `startsOf`, `pieces`, `assemble`, `validate`, `adapt.{ chunk, target, survey, height }` e `ground(fn)`.

### Zonas de perigo e áreas

```ts
zone(path: string, Zone: new () => ZoneType): string;
area(path: string, desc: { role: 'lobby' | 'quarantine' | 'match' | (string & {}); x: number; z: number; r: number; y?: number; zone?: string; box?: { pad?: number; below?: number; above?: number } }): string;
areaRole(path: string, desc?: { required?: boolean; description?: string }): string;
```

Uma zona de perigo é uma `ZoneType` com `name` e uma de duas formas: **anel** (`from`, a distância da origem em que
ela começa) ou **lugar** (`contains(x, z)`). Valem mais `hp`, `damage`, `hostileCap`, `loot`, `stars`, `color`,
`hostileDay`, a regra do mob (`scaleMob`) e o céu (`sky`). As zonas de mod entram no mesmo registro das do jogo, e
`zoneAt` pergunta primeiro aos lugares, na ordem de registro, depois ao maior anel que couber — então uma zona de
mod nunca vem antes do lobby e da quarentena do jogo.

Uma **área** é um lugar que o motor pergunta pelo **papel**, nunca pelo nome: um quadrado de meia largura `r` em
volta de (x, z), com `y` de piso quando tem; `zone` faz a zona de quem está dentro ser aquela. Os três papéis do
motor são `lobby` (aqui não se edita, não explode e não nasce hostil), `quarantine` e `match`. O `areaRole`
declara um papel seu (declare antes da área): ele não muda nada no motor, quem pergunta por ele é o seu código, e
`required: true` faz o boot recusar um jogo que não declarou nenhuma área daquele papel.

### Modificar o que já existe

```ts
replace(target: string, Stage: new (ctx: GenerationContext) => WorldgenStage, opts?: ChainOptions): string;
modify(target: string, fn: (inner: any, ctx: GenerationContext) => any): string;
generator(path: string, Type: new () => ChunkGenerator): string;
zones: {
  modify(target: FullName, change: ZonePatch | ((zone: ZoneModifiableFields, info: ModifyInfo) => ZoneModifiableFields | void), opts?: ModifyOptions): void;
  disable(target: FullName, opts?: ModifyOptions): void;
  remove(target: FullName, opts?: ModifyOptions): void;
};
areas: {
  modify(target: FullName, change: AreaPatch | ((area: AreaModifiableFields, info: ModifyInfo) => AreaModifiableFields | void), opts?: ModifyOptions): void;
  disable(target: FullName, opts?: ModifyOptions): void;
  remove(target: FullName, opts?: ModifyOptions): void;
};
biomes: BiomeModificationsApi;
```

- `replace` troca um estágio por uma classe do **mesmo tipo**; os alvos do jogo são `mineclaude:terrain`,
  `:biomes`, `:surface`, `:fluids`, `:caves`, `:ores`, `:trees`, `:vegetation`, `:dungeons`, `:ruins`, `:lakes`,
  `:dry_beds`, `:rivers`, `:camps` e `:wells`, mais os de outros mods. Dois mods no mesmo alvo: vale o último
  aplicado (por `priority`, depois a ordem de carga), com um aviso que nomeia os dois.
- `modify` embrulha o estágio: `fn(inner, ctx)` devolve o que roda no lugar, em geral chamando
  `inner.generate(chunk)` e fazendo mais. Um objeto simples herda do `inner`. É o caminho quando você quer manter
  o que estava e só acrescentar.
- `generator` põe um `ChunkGenerator` inteiro no lugar do do jogo: um só por servidor.
- `replace`, `modify` e `generator` valem só num mundo feito para isso (`MODLOADER_BIOMES=1`).
- `zones.modify` muda `name`, `from` (só de anel), `hp`, `damage`, `hostileCap`, `loot`, `stars`, `color`,
  `hostileDay`, `sky` e `disabled`; `areas.modify` muda `x`, `z`, `r`, `y`, `box` e `zone`. O formato
  (`contains`) e a regra do mob (`scaleMob`) são funções do motor e ficam de fora. `disable` (e o apelido
  `remove`) faz o motor parar de perguntar pela zona, mas a chave segue valendo em filtros e regras de
  nascimento; a última zona por distância, a zona de uma área `lobby`/`quarantine` e as áreas de partida não
  saem, e o lobby e a quarentena do jogo não mudam de lugar. Num mod `sandbox` só o patch (JSON) passa: a forma de
  função é recusada com o motivo.
- `biomes.modify(seletor, fn, { phase })` muda biomas que já existem. O seletor é um nome completo, uma `#tag` de
  bioma ou uma função; as fases rodam `additions` → `removals` → `replacements` → `post_processing` e, dentro da
  fase, na ordem de registro. O contexto dá `e.climate`, `e.generation`, `e.effects` e `e.spawns`. O que mexe no
  terreno (clima do bioma, `addFeature`/`removeFeature`, peso, superfície, densidades) só vale em região nova; a
  cor da grama e os nascimentos valem na hora, em toda região.

```js
// rios 40% mais largos: o campo de rios é "blocos até o centro do rio"
ctx.worldgen.densityFns.modify('mineclaude:overworld/rivers', (inner) => ctx.worldgen.density.mul(1 / 1.4, inner));
// mais minério, sem perder o estágio do jogo
ctx.worldgen.modify('mineclaude:ores', (inner) => ({
  generate(chunk) { inner.generate(chunk); /* ...o seu minério */ },
}));
// um bioma de outro mod ganha a sua feature e uma cor nova
ctx.worldgen.biomes.modify('#c:is_wet', (e) => {
  e.generation.addFeature('meumod:juncos');
  e.effects.setGrassColor('#3f7a2e');
}, { phase: 'additions' });
```

### O mundo não tem teto de altura

Hoje **não existe altura fixa de construção**: o limite é o ar. O chunk guarda a **faixa gerada** — a parte que o
gerador preenche — e acima dela o mundo cresce em **seções verticais de 16 × 16 × 16** blocos, que nascem conforme
alguém constrói. Logo, um gerador não deve supor um teto.

Na prática:

- Use a altura do chão e profundidade **relativa**, não constantes de altura: `api.heightAt(wx, wz)` e
  `api.columnAt(wx, wz).h` num passo, `ctx.columnInfo(wx, wz).h` num estágio.
- Use o **nível do mar** como referência (`ctx.seaLevel`, `api.seaLevel` no `build` de um marco). É o que o
  subsolo faz: a profundidade é fração do nível do mar, então os números seguem valendo se a forma vertical mudar.
- Os limites que existem de verdade chegam pelo contexto, não por constante: `ctx.size`, `ctx.height` e
  `ctx.seaLevel` num estágio; o `api` que o `createGenerator` de uma dimensão recebe traz `size` e `height`; e
  `ctx.gases.shape(dimension)` devolve `{ height, seaLevel }` — a régua da altitude daquela dimensão, nos dois
  lados.
- Um passo de `terrain` tem a altura presa em 4..altura−14 pelo próprio `setHeight`: não repita a conta.
- Fora da geração, a API de mundo diz o resto: `minY` (o chão do mundo), `generatedTop` (até onde o gerador
  preenche; acima só existe o que foi construído) e `buildLimit`, que é uma trava numérica de sanidade, não uma
  regra de jogo.

### Eras de geração

A geração é função pura de (seed, cx, cz): o servidor guarda só as **edições** e o navegador gera o mesmo terreno.
O que protege o mundo salvo é a **era do gerador gravada por região**. Uma era é a lista de ids dos passos daquele
momento; uma região é 16 × 16 chunks, e ela ganha a marca da era de agora quando um chunk dela vai para um jogador
— e nunca mais muda. Mudou a lista de passos (um mod de geração entrou, saiu ou subiu de `worldgenVersion`)? Nasce
uma era nova: as regiões já marcadas seguem geradas com o gerador da era delas, os passos que vieram depois ficam
desligados, e o chunk delas sai byte a byte igual ao de antes; região sem marca sai com a geração de agora. **Um
passo de terreno novo, portanto, não muda o que já existe** — ele aparece onde ninguém chegou ainda, e na borda
entre duas eras os campos de densidade entram em rampa em vez de paredão. Os passos que só acrescentam coisa
(`feature`, `ore`, `structure`) seguem outra regra: chunks sem edição ganham a novidade e, nos chunks com obra, o
terreno de antes fica guardado onde o jogador não mexeu.

## `ctx.dimensions`

Dimensões de verdade: outros mundos, com o próprio terreno, as próprias edições, os próprios mobs e o próprio
relógio. **Cada dimensão tem o seu relógio** (hora do dia e contador de dias): mudar a hora de uma não muda a das
outras, e uma dimensão nova nasce de manhã. Para sincronizar duas, leia `world.timeOfDay()` de uma e chame
`setTimeOfDay(ms)` na outra.

```ts
register(path: string, definition: DimensionDefinition): string;
readonly terrain: DimensionTerrainPresets;
modify(target: FullName, change: DimensionPatch | ((dimension: DimensionDefinition, info: ModifyInfo) => DimensionDefinition | void), opts?: ModifyOptions): void;
list(): string[];
teleport(player: PlayerApi, destination: string, target?: { x: number; y: number; z: number } | { position: { x: number; y: number; z: number }; yaw?: number; pitch?: number }, options?: DimensionTeleportOptions): boolean;
world(id: string): DimensionWorldApi;
```

`teleport` e `world` são só do servidor. `teleport` devolve `false` quando o jogador está morto, fora de
sobrevivência ou com o destino obstruído. `world(id)` devolve um `WorldApi` daquela dimensão, mais o `spawn` dela
e um `prepare(position)` que manda gerar o terreno ao redor de um ponto antes de alguém chegar.

### A definição

| Campo | Significado |
|---|---|
| `name` | o nome mostrado |
| `version` | a versão da dimensão; junto com `createGenerator`, fixa o terreno já salvo |
| `spawn` | `{ x, y, z }`, onde se nasce |
| `sky`, `light` | o céu e a luz ambiente |
| `voidBelow` | não há chão sob o mundo |
| `naturalSpawns` | mobs nascem sozinhos |
| `seed` | a seed (uint32) com que o mundo desta dimensão é criado. Sem ela, o servidor deriva uma |
| `clientGenerates` | `false` faz a dimensão **autoritativa no servidor**: o navegador não gera nada (cada chunk nasce ar) e o servidor manda o chunk completo. O padrão é `true` (o navegador regenera pela seed e o servidor manda só as edições) |
| `border` | até onde, em blocos da origem, um jogador desta dimensão anda (1..1000000); passando disso o servidor o devolve. Sem ele vale a borda do mundo do servidor |
| `createGenerator(seed, api)` | devolve `{ generateChunk(cx, cz), heightAt(x, z) }` |

`version`, `seed`, `clientGenerates` e `createGenerator` fixam o terreno já salvo: o `modify` não troca nenhum
dos quatro.

### Terrenos prontos: `ctx.dimensions.terrain`

Quatro ajudantes que **constroem** um `createGenerator` para os formatos comuns:

- **`void()`** — tudo ar. Combine com `voidBelow` e monte o lugar à mão.
- **`flat({ layers })`** — camadas fixas, de baixo (y = 0) para cima: `[[bloco, contagem], ...]`.
- **`full({ surface, filler, stone, base?, amplitude?, scale?, fillerDepth?, octaves? })`** — terreno de ruído
  autocontido: um mapa de altura pela seed, preenchido com `stone`, `fillerDepth` camadas de `filler` e `surface`
  no topo. Determinístico pela seed.
- **`overworld()`** — o terreno do mundo principal, byte a byte: o mesmo gerador, com a seed dele. Faz da
  dimensão uma "gêmea" do mundo principal (mesmas coordenadas, mesmo chão) que ainda é um lugar à parte, com
  edições, mobs, relógio e jogadores próprios. Use o resultado direto como `createGenerator`: embrulhá-lo numa
  função sua perde a marca e a seed volta a ser derivada.

```js
ctx.dimensions.register('cofre', {
  name: 'Cofre',
  version: 1,
  spawn: { x: 0, y: 65, z: 0 },
  voidBelow: true,
  createGenerator: ctx.dimensions.terrain.flat({ layers: [['mineclaude:stone', 64], ['meumod:piso', 1]] }),
});
```

### Troca sem costura

Sem opções, a troca de dimensão é a de sempre: o navegador descarta o mundo, solta as teclas e zera a velocidade
e o clima. Com `seamless: true`, o servidor gera e manda os chunks ao redor do ponto de chegada **antes** do
pacote da troca; o navegador mantém o terreno antigo na tela até o novo estar desenhado, não solta as teclas,
mantém a velocidade e não zera o clima de repente. Mobs, partículas, itens no chão e jogadores da dimensão antiga
somem. Só com `seamless` valem `velocity` (blocos/s, cada componente de -1000 a 1000) e `radius` (o raio, em
chunks, do terreno mandado antes: 0 a 3, padrão 2 = 5×5 chunks).

```js
ctx.dimensions.teleport(e.player, 'meumod:cofre', { x: 0, y: 65, z: 0 }, { seamless: true, radius: 3 });
```

O Nether e o End pertencem ao jogo base, e `modify` alcança a dimensão de qualquer mod ou do jogo base
(`ctx.dimensions.modify('mineclaude:nether', ...)`).

## `ctx.sounds`

Os sons do mod: sintetizados por código, de arquivo, o grupo de som de um bloco e a paisagem sonora. Os
registros valem nos dois lados, na entrada comum.

```ts
group(path: string, desc: SoundGroupDesc): string;
modifyGroup(target: FullName, change: SoundGroupPatch | ((group: SoundGroupDesc, info: ModifyInfo) => SoundGroupDesc | void), opts?: ModifyOptions): void;
synth(path: string, desc: { layers: SoundLayer[] }): string;
file(path: string, file: string, opts?: { sha256?: string; loop?: boolean; category?: 'sfx' | 'music' | 'ambient' }): string;
modify(target: FullName, change: SoundPatch | ((sound: SoundDesc, info: ModifyInfo) => SoundDesc | void), opts?: ModifyOptions): void;
play(name: string, opts?: SoundOptions): void;
ambience(path: string, def: AmbienceDef): string;
cue(name: string, data?: { delay?: number; strength?: number }): void;
```

- **`synth`** registra um som sintetizado, de 1 a 8 camadas. Não precisa de arquivo nenhum.
- **`file`** registra um som de arquivo da pasta do mod (`.ogg`, `.mp3` ou `.wav`). A `category` escolhe o canal:
  `'sfx'` (o padrão: até 4 s e 256 KB), `'music'` (tocado por jogador) ou `'ambient'` (tocado pelo servidor num
  ponto) — os dois últimos até 10 minutos e 4 MB. O `loop` só vale com `music`/`ambient`, e o padrão é ligado no
  ambiente e desligado na música.
- **`group`** registra um grupo de som de bloco; cite-o em `soundGroup` **antes** de registrar o bloco.
  `modifyGroup` muda o grupo de qualquer mod, o do jogo também, e os blocos que o citam passam a soar assim.
- **`play`** é só do navegador (som de interface): no servidor lança. Para tocar um som no mundo, use
  `e.player.playSound` ou `e.server.playSound`.
- **`ambience`** registra uma paisagem sonora (chuva, vento, pássaros, caverna). O navegador a toca quando as
  condições valem, com transição gradual. **`cue`**, só do navegador, dispara os sons de paisagem marcados com
  aquele nome — o trovão de um relâmpago, por exemplo —, com `delay` em segundos e `strength` de 0 a 1.

```js
ctx.sounds.synth('gongo', { layers: [{ wave: 'sine', freq: 180, ms: 900, gain: 0.5 }] });
ctx.sounds.file('tema', 'sounds/tema.ogg', { category: 'music', loop: true });

ctx.commands.register('gongo', { run(e) { e.player.playSound('meumod:gongo'); } });
```

## `ctx.textures`

As texturas do mod. Há dois caminhos, e os dois aceitam `{ size }` em 16, 32, 64, 128 ou 256 (padrão 16).
**Registre a textura antes do bloco ou do item que a usa.**

```ts
paint(path: string, fn: (t: PainterTools) => void, opts?: TextureOptions): void;
redraw(path: string, painter: (t: PainterTools) => void): boolean;
png(path: string, file: string, opts?: TextureOptions): void;
```

- **`paint`** pinta por código, sem arquivo. A função roda **só no navegador** e recebe as ferramentas do pintor
  (`t.S` é o lado da textura; `set`, `fill`, `speckle`, `ore`, `voronoi`, `pick`, `rand`, mais as paletas prontas
  `DIRT`, `GRASS`, `STONE` e `SNOW`). Um erro na pintura vira a textura de "faltando" mais um aviso no console: o
  jogo não cai.
- **`redraw`**, só no navegador, redesenha uma textura **deste mod** já carregada; todos os blocos que a usam
  mudam na hora. Devolve `false` se o atlas ainda não existe.
- **`png`** usa um PNG da pasta do mod. O arquivo tem de ser quadrado, de 16, 32, 64, 128 ou 256 px, e o `size`
  declarado tem de bater com o tamanho real.

A lista das ferramentas do pintor, com o que cada uma faz, está na
[seção 7 do guia](guia-de-mods.md#7-texturas-ctxtextures).

```js
ctx.textures.paint('bloco_rubi', (t) => {
  t.fill(['#9c1b2c', '#a81f31', '#921727']);
  t.speckle(['#d8263a', '#ff8a96'], 0.2);
}, { size: 32 });
ctx.blocks.register('bloco_rubi', { name: 'Bloco de rubi', solid: true, tiles: { all: 'meumod:bloco_rubi' } });
```

## `ctx.events`

O lugar onde o mod reage ao que acontece. A API é um método só:

```ts
on<E extends AnyEventName>(name: E, handler: (e: AnyEventMap[E]) => void, opts?: EventOptions): void;
```

Só dentro do `register`. Cada lado registra os seus e ignora os do outro — os de servidor estão no `EventMap`
dos tipos, os de navegador no `ClientEventMap` —, então a entrada comum pode registrar os dois sem checar o lado.

O `opts.priority` ordena os ouvintes: **maior roda primeiro** (padrão 0; empate, ordem de registro). Atenção,
porque é o contrário do `priority` de `modify`/`wrap`/`replace`, em que a maior aplica por último e vence. Outra
chave no objeto é recusada, com a lista das válidas.

Limites: um handler lento é avisado (mais de 50 ms no servidor, mais de 8 ms no navegador) e o aninhamento
máximo é 8. No navegador há um orçamento de 1 ms por mod e 2 ms no total por quadro nos eventos de quadro, de
chunk e de entidade, e um handler que falha 8 vezes é desligado.

Os eventos **canceláveis** ganham `e.cancel()` e `e.cancelled`. Os que têm jogador, mundo ou servidor traem
`e.player`, `e.world` e `e.server`.

```js
ctx.events.on('chat', (e) => { if (e.text.includes('spam')) e.cancel(); }, { priority: 10 });
ctx.events.on('blockBreak', (e) => { e.drops = [{ item: 'meumod:rubi', n: 1 }]; });
```

A lista completa, com os campos de cada evento, está no `EventMap` e no `ClientEventMap` dos tipos que vêm na
pasta do mod (`types/mineclaude-mod`), e as tabelas comentadas estão na
[seção 9 do guia](guia-de-mods.md#9-eventos-ctxeventsonname-fn-priority) e nas suas continuações.

## `ctx.commands`

Os comandos de chat. Só dentro do `register` e **só no servidor**: no navegador a definição é checada e ignorada
(para um comando que roda no navegador, veja `ctx.client.commands`).

```ts
register(name: string, def: CommandDef | CommandType): string;
argumentType<T>(id: string, def: ArgumentTypeDef<T>): string;
selectorOption<S>(id: string, def: SelectorOptionDef<S>): void;
alias(name: string, target: string): void;
modify(name: string, change: (command: CommandDraft, info: { name: string; owner: string; mods: readonly string[] }) => CommandDraft | void, opts?: { priority?: number }): void;
wrap(name: string, wrapper: (e: CommandWrapEvent, previous: () => void) => void, opts?: { priority?: number }): void;
remove(name: string, opts?: { priority?: number }): void;
```

O nome é `[a-z][a-z0-9_]{1,23}`, sem a barra. Um nome igual ao de um comando de outro mod (ou do motor) **funde**
quando não colide — num comando do motor, só subcomandos novos, com o mesmo `rooms` — e, quando colide, o
segundo é recusado por nome no log, sem derrubar o boot. O mesmo vale para um apelido. `/<modid>:<nome>` sempre
funciona.

### A definição

| Campo | Significado |
|---|---|
| `help` | uma linha para a ajuda (até 200 caracteres), de preferência começando por `/nome` |
| `requires` | quem pode rodar: `'all'`, `'admin'`, um nível 0..4, um nó de permissão ou uma função do jogador. Quem não passa vê "Comando desconhecido" |
| `admin` | forma antiga de `requires: 'admin'`; prefira um nó de permissão, que um mod de permissões consegue abrir para um jogador só |
| `rooms` | `'world'` (padrão: só no mundo) ou `'all'` (também no lobby e nas partidas) |
| `aliases` | outros nomes para o mesmo comando (até 8); despacham e completam com Tab, e a ajuda lista só o nome real |
| `args` | a forma declarativa: os argumentos em fila (os últimos podem ser `optional`). `e.args` vira `{ nome: valor }` |
| `sub` | subcomandos: `sub: { dar: { args: [...], run(e) {} } }` |
| `tree` | a forma do construtor, em vez de `args`/`sub`: `literal('nome').then(...)`. A palavra da raiz é o nome do comando |
| `run(e)` | o que o comando faz |

O `e` que o `run` recebe traz `player`, `args`, `raw` (as palavras digitadas, nos comandos tipados), `world`,
`server` e `reply(text)` (uma mensagem de sistema só para quem rodou). Depois de um `fork` vêm também `source` e
`sources`.

Os tipos de argumento embutidos: `string`, `greedy`, `integer`, `number`, `boolean`, `enum`, `player`,
`players`, `entities`, `item`, `block`, `block_state`, `item_stack`, `mob`, `pos`, `time`, `uuid`, `angle`,
`color` e `text`. Use-os pelo nome em `args`, ou pelos construtores de `ArgumentTypes` (`ArgumentTypes.integer(0, 9)`,
`ArgumentTypes.enumOf(['a', 'b'])`, `ArgumentTypes.custom('meumod:cor')`...).

```js
import { ArgumentTypes } from './mineclaude-sdk.js';

ctx.commands.register('pagar', {
  help: '/pagar <jogador> <n> — dá rubis a alguém',
  args: [{ name: 'quem', type: 'player' }, { name: 'n', type: ArgumentTypes.integer(1, 64) }],
  run(e) { e.args.quem.give('meumod:rubi', e.args.n); e.reply('Pago.'); },
});
```

### Tipo de argumento próprio

`argumentType(id, def)` registra um tipo do mod (antes dos comandos que o usam) e devolve `modid:id`. O `parse`
recebe o texto e devolve o valor, ou lança `Error('motivo')` — o motivo vai para o jogador. O `suggest` dá as
sugestões do Tab, `words` diz quantas palavras o tipo consome (1 a 8, ou `'rest'`; padrão 1) e `label` é o que o
jogador deve digitar, para a mensagem de erro.

`selectorOption(id, def)` registra uma opção do seletor de entidades: registrada em `modid:id` e digitada com
underscore, `@e[modid_id=valor]`.

### Mexer no comando de outro

`modify` muda o comando de outro mod — os do jogo e os do motor também —, depois que todos registraram. O
rascunho (`CommandDraft`) traz `name`, `help`, `requires`, `rooms`, `aliases` e, quando há, `tree`. Num comando
do motor a `tree` tem duas partes, a raiz e um nó de texto livre que roda o comando de sempre, e
`tree.then(literal('fila').executes(...))` acrescenta um subcomando (a palavra do subcomando vale antes do texto
livre). A permissão do próprio motor continua valendo por cima do `requires` novo. O `priority` vai de -1000 a
1000, e o último aplicado vence.

`wrap` embrulha a execução: `previous()` roda o que está por dentro, e não chamá-lo recusa o comando. `remove`
esconde o comando — ele some do despacho, do Tab, da ajuda e da tela de pausa, com os apelidos. `alias` dá outro
nome a um comando que **este** mod já registrou.

```js
ctx.commands.wrap('tp', (e, previous) => {
  if (e.player.name === 'convidado') return e.reply('Não aqui.');
  previous();
});
```

## `ctx.config`

Os valores que o dono do servidor pode ajustar sem mexer no código do mod. Os padrões vêm do `mod.json`:

```json
{ "id": "meumod", "config": { "preco": 1, "aberta": true, "mensagem": "Oi" } }
```

Cada valor é número, booleano ou texto de até 200 caracteres, e há no máximo 50 chaves. O dono do servidor
sobrescreve num arquivo de configuração por mod, dentro da pasta de dados do servidor.

```ts
get(key: string): number | boolean | string;
onChange(fn: (values: Readonly<Record<string, number | boolean | string>>) => void): void;
```

`get` devolve o valor efetivo no servidor; no navegador, só o padrão do `mod.json`. Uma chave que o `mod.json`
não declara lança erro — não devolve `undefined`.

`onChange` (só no servidor, até 16 por mod) é chamado depois de um administrador recarregar a configuração do
mod, com os valores novos numa cópia congelada.

```js
ctx.commands.register('preco', { help: '/preco', run(e) { e.reply(`${ctx.config.get('preco')} rubis`); } });
ctx.config.onChange((v) => console.log('[meumod] preço agora', v.preco));
```

## `ctx.render`

O desenho 3D. Quase tudo aqui é do navegador: o servidor guarda o registro e não executa nada. Alguns registros
(`mesher`, `fluid`, `blockQuads`, `blockColor`) são **síncronos e só em entrada comum**, porque o montador de
malhas roda num worker e carrega o mesmo código.

```ts
mesher(name: string, desc: RenderMesherDesc): void;
fluid(fluid: string, handler: FluidRenderDesc): string;
blockQuads(block: string, emitter: BlockQuadsDesc | ((e: BlockQuadsEvent) => void | null)): string;
blockColor(block: string, fn: (e: BlockColorEvent) => string | [number, number, number] | null | undefined): string;
pass(name: string, desc: RenderPassDesc): RenderPassHandle;
playerModel(desc: { geometry: object; texture?: string; color?: string; tint?: Record<string, 'skin' | 'shirt' | 'pants' | null>; skinBlend?: number }): void;
accessory(name: string, desc: { geometry: object; texture?: string; color?: string; hidesUnder?: 'helmet' | 'chestplate' | 'leggings' | 'boots' }): void;
armorModel(key: string | { tier: string }, desc: { geometry: object; texture?: string; color?: string }): void;
playerAttachments(desc: { held?, flag?, cape?, shieldPose?, nameTag? }): void;
mobModel(mob: string, def: MobRendererDef | MobRenderer): FullName;
mobRenderer(mob: string, renderer: MobRendererDef | MobRenderer): FullName;
mobFeature(mob: string, name: string, feature: MobFeatureDef | MobFeatureRenderer | null): FullName;
itemModel(item: string, def: ItemModelDef): FullName;
blockEntity(block: string, renderer: Partial<Pick<BlockEntityRenderer, 'maxDistance' | 'priority' | 'worldLight' | 'create' | 'update' | 'render' | 'dispose'>>): FullName;
skyType(path: string, type: SkyTypeLike): string;
sky(dimension: string, skyType: string): void;
modifySky(dimension: string, fn: (s: SkyState) => void): void;
skyLayer(dimension: string, id: string, layer: SkyLayerLike | null): void;
skyBody(dimension: string, id: string, body: Omit<SkyBody, 'id'> & { id?: string } | null): void;
cloudType(id: string, type: CloudType | null): void;
capabilities(): Readonly<RenderCapabilities>;
shadeMaterial<T>(material: T, options?: { mode?: 'auto' | 'lit' | 'basic' }): T;
graphics(): Readonly<GraphicsInfo>;
```

### Blocos e fluidos

`blockQuads` decide a geometria de um bloco por código, célula por célula, dentro do montador de malhas. O
emissor vê o `data`, o estado, o vizinho e a posição no mundo, então um cano liga nos vizinhos e um tanque mostra
o nível. Até 32 blocos por mod e `maxQuads` quads por célula (padrão 64, máximo 256). Um segundo emissor para o
mesmo bloco **embrulha** o primeiro, que ele alcança por `e.previous()`. Emitir nada (ou devolver `null`) deixa o
bloco no desenho de sempre. Ganha de um `model` declarado.

`blockColor` decide a cor de um índice de tinta de um bloco por código, em vez de pelo `tint` dele. Devolva
`'#rrggbb'`, três fatores lineares de 0 a 1, ou `null` para cair no `tint` do próprio bloco. Até 64 blocos por
mod, e um segundo registro embrulha o primeiro.

`fluid` diz como um fluido de qualquer mod (ou do jogo base) é desenhado. Até 32 por mod; um segundo handler para
o mesmo fluido embrulha o primeiro, campo por campo, e alcança o de baixo por `e.previous()` na tinta.

```js
ctx.render.blockQuads('cano', (e) => {
  if (!e.neighbor('up')) return null;             // sem vizinho em cima: desenho de sempre
  e.quad({ face: 'up', tile: 'meumod:cano_topo' });
});
```

### O jogador e os mobs

`playerModel` troca o modelo e a textura do jogador — **um mod só**. Os ossos exigidos são `head`, `body`,
`arm_left`, `arm_right`, `leg_left` e `leg_right`; o `material` de cada osso escolhe o canal de tinta. Há
localizadores opcionais (ossos sem caixas): `hand_right`, `hand_left`, `shield_right`, `shield_left`, `cape`,
`flag` e `name`.

`accessory` põe um cosmético em todo jogador: cada osso diz `attach` (um osso do jogador). Até 8 por mod. O
`hidesUnder` faz a peça desaparecer enquanto aquela peça de armadura estiver vestida.

`armorModel` dá o modelo de armadura de um item (`'mod:item'`) ou de um material (`{ tier }`): cada osso diz
`attach` e `slot` (0 capacete, 1 peitoral, 2 calças, 3 botas).

`playerAttachments` define as formas do que o jogador carrega. As do jogo vêm do jogo base, e um mod troca cada
uma — só um mod por chave: `held` (o item na mão), `flag` (a bandeira do time), `cape` (a capa), `shieldPose` (a
pose do escudo) e `nameTag` (a etiqueta de nome).

`mobModel` (e o seu apelido `mobRenderer`) dá o renderer de um mob. É uma **cadeia**: o último a registrar vence
e alcança o anterior por `kit.previous`, até 8 na cadeia; o jogo base, que carrega por último, entra por baixo. O
`build(kit)` devolve o grupo e as partes, `flags` roda quando os estados do mob mudam (domado, sentado, selado,
dono, pelagem) e `animate` roda a cada quadro, depois do balanço das pernas.

`mobFeature` põe uma **camada** por cima de quem quer que desenhe aquele mob (`'*'` = todo mob): a sela, uma
armadura, um brilho, uma etiqueta. Várias por mob, de vários mods, na ordem de `priority` (maior primeiro). Um
nome curto vira `'<seu mod>:<nome>'`; o nome completo de outro mod **troca** a camada dele, e `null` a tira do
jogo. Até 16 por mod. Oito falhas de um gancho desligam a camada até a próxima sessão.

```js
ctx.render.mobFeature('mineclaude:horse', 'mineclaude:saddle', null);   // tira a sela do cavalo
```

### Itens e blocos-entidade

`itemModel` dá o modelo 3D de um item (fora os blocos cúbicos) na mão em primeira pessoa, no chão e no display de
um bloco-entidade. Sem registro, o item é o próprio ícone **extrudado**: cada pixel opaco vira um voxel de 1/16
de espessura. É uma cadeia — o último vence e alcança o de baixo por `kit.previous.build()`, e no fundo está a
extrusão (`kit.icon()`). O `build(kit)` devolve um objeto 3D de 1 bloco de largura, centrado, com o topo do ícone
em +y e a frente em +z; o motor escala e posiciona pelo `kit.context`. O `animate` roda a cada quadro enquanto o
item aparece. Até 8 na cadeia e 256 por mod.

`blockEntity` dá o renderer de bloco-entidade de um bloco (registre o bloco antes). Até 32 por mod e 8 por bloco;
com vários no mesmo bloco, o de maior `priority` é o que o motor chama, e ele alcança os outros por `e.previous`.

### O céu

`skyType` registra um tipo de céu; `sky(dimension, skyType)` diz qual céu uma dimensão mostra (o último mod
vence), e sem isso a dimensão usa um céu liso com o `sky`/`light` dela. `modifySky` ajusta o estado final do céu
de uma dimensão (`'*'` = todas), depois do tipo e do clima. `skyLayer` acrescenta, troca ou remove (`null`) uma
camada do céu, e `skyBody` faz o mesmo com um corpo celeste — os do jogo no mundo principal são `'sun'` e
`'moon'`. `cloudType` acrescenta, troca ou tira um tipo de nuvem da camada de nuvens.

```js
ctx.render.skyLayer('mineclaude:overworld', 'clouds', null);   // tira as nuvens
```

### Gráficos: `capabilities`, `shadeMaterial` e `graphics`

`capabilities()` diz o que esta máquina aguenta. `shadeMaterial(material, options?)` dá ao material 3D do seu mod
a luz do sol e da lua e as sombras do preset do jogador, para um bloco-entidade ou um modelo de mob não ficar
chapado ao lado do terreno sombreado. Ele remenda **no lugar** (é idempotente) e devolve o mesmo material;
acompanha a troca de preset ao vivo; e no preset mais baixo, no servidor e sem WebGL2 não muda nada. O `mode`
escolhe o caminho: `'lit'`, `'basic'` ou `'auto'` (o padrão, que decide pelo tipo). Um material de shader é
devolvido intacto.

`graphics()` é um retrato só de leitura dos gráficos do jogador agora — o preset e quais recursos estão ligados:

| Campo | O que é |
|---|---|
| `preset` | `'baixo'`, `'medio'`, `'alto'`, `'ultra'` (ou outro nome) |
| `shading` | sombreamento do mundo |
| `shadows` | sombras do sol |
| `water` | a água com reflexo |
| `sway` | o balanço das plantas |
| `bloom` | o brilho estourado |
| `planetCurve` | **a curvatura do planeta**: o mundo se dobra para longe conforme a altitude. Ligada nos presets Médio e acima |

Leia `graphics()` para não desenhar algo que o preset do jogador não comporta — e, no caso do `planetCurve`, para
saber que um objeto distante não está na linha reta que você calculou: o terreno longe está dobrado para baixo.

```js
if (ctx.isClient()) {
  const g = ctx.render.graphics();
  if (g.planetCurve) ctx.client.debug.line('curva', () => 'o horizonte está dobrado');
}
```

## `ctx.audio`

O áudio 3D do mod, um nível abaixo de `ctx.sounds`: canais próprios, vozes que você controla depois de começar,
emissores parados no mundo, acústica do lugar e som ao vivo. É do navegador.

```ts
bus(name: string, options?: { volume?: number; effects?: AudioEffect[]; environment?: boolean }): AudioBus;
play(name: string, options?: AudioPlayOptions): AudioVoice;
stream(options?: AudioStreamOptions): AudioStream;
emitter(name: string, sound: string, options: AudioEmitterOptions): AudioEmitter;
environment(): AudioEnvironment;
setVolume(volume: number): void;
mute(muted: boolean): void;
stopAll(): void;
listener(): AudioListenerPose | null;
stats(): AudioStats;
capabilities(): AudioCapabilities;
```

`setVolume` é o volume **deste mod**, e vale também para a música e o ambiente que ele toca por `ctx.sounds`.

### Canais, vozes e emissores

`bus(name, options)` cria (ou devolve) um canal do mod. Um `AudioBus` tem `play`, `stream`, `setVolume`,
`setEffects`, `processor(factory)` (um processador de Web Audio, ou `null` para tirar), `stopAll` e
`setEnvironment(enabled)`.

`play(name, options)` toca um som registrado e devolve uma `AudioVoice` — `playing`, `stop()`, `setVolume`,
`setRate`, `setPosition`. As opções (`AudioPlayOptions`) são `volume`, `rate`, `loop`, `radius`, `position` e
`mob` (o id do mob a que o som segue).

`emitter(name, sound, options)` cria um emissor fixo no mundo. Além das opções de `play`, ele exige `position` e
aceita `autoplay` e `bus`. O `AudioEmitter` tem `playing`, `start()`, `stop()`, `remove()`, `setPosition` e
`setVolume`.

```js
if (ctx.isClient()) {
  const forja = ctx.audio.bus('forja', { volume: 0.8, environment: true });
  const voz = forja.play('meumod:martelo', { position: { x: 10, y: 64, z: -3 }, radius: 16, loop: true });
  ctx.audio.emitter('fornalha', 'meumod:chama', { position: { x: 10, y: 64, z: -4 }, autoplay: true });
}
```

### A acústica do lugar

`environment()` diz como o lugar onde o ouvinte está soa agora: `name` (`'open'`, `'sheltered'`, `'room'`,
`'cave'` ou `'underwater'`), `mix`, `seconds`, `absorption`, `enclosure`, `meanDistance` e `lowpass`. Um canal
criado com `environment: true` (ou com `setEnvironment(true)`) acompanha isso sozinho.

`listener()` dá a pose do ouvinte, ou `null` fora de uma sessão. `capabilities()` diz o que este navegador
aguenta, e `stats()` traz a contagem de canais, vozes, streams, quadros na fila, nós e erros.

### Som ao vivo: `stream`

Um stream é uma voz cujas amostras **ainda não existem** quando ela começa: os quadros entram por `push`
enquanto ela toca. `ctx.audio.stream(options)` é o mesmo que `bus.stream` no canal principal do mod. Até 8 por
mod e 24 na página.

As opções: `codec` (`'opus'` ou `'pcm16'`), `frameMs` (10..120, padrão 20: é o relógio do stream), `sampleRate`,
`channels`, `jitterMs` (0..600, padrão 60: o atraso que absorve a rede), `maxJitterMs`, `volume`, `radius`
(1..128, padrão 24) e `position` — com posição o stream é espacial, sem ela é central.

O `AudioStream` tem `push(bytes, meta?)` (oferece **um** quadro codificado; `meta.seq` numera os quadros e, sem
ele, são tomados como consecutivos), `setPosition`, `setVolume`, `flush()` (joga fora o buffer sem fechar o
stream: quem falava parou, e a próxima fala começa limpa), `stop()` e `stats()`, mais os campos de leitura
`playing`, `queued`, `delayMs`, `codec` e `frameMs`.

```js
const fala = ctx.audio.stream({ codec: 'opus', position: { x: 0, y: 64, z: 0 } });
ctx.net.on('voz', (e) => fala.push(e.data.bytes, { seq: e.data.seq }));
```

## `ctx.storage`

Os dados persistentes do mod. **Só no servidor**: no navegador toda chamada lança. As chaves são
`[A-Za-z0-9_.:-]`, de 1 a 64 caracteres, e os valores são JSON, copiados na entrada e na saída.

```ts
world: WorldStorage;
player: {
  get<T = any>(player: PlayerApi, key: string): T | undefined;
  set(player: PlayerApi, key: string, value: Json): void;
  delete(player: PlayerApi, key: string): void;
};
account(uuid: string): AccountStorage;
accountsWith(key: string): string[];
accountByName(name: string): string | null;
```

Três lugares, com cotas diferentes:

| Lugar | O que guarda | Cota |
|---|---|---|
| `ctx.storage.world` | o dado que é **do mundo**, não de ninguém | até 64 KB por mod |
| `ctx.storage.player` | o dado de um jogador **online** | até 8 KB por mod por jogador |
| `ctx.storage.account(uuid)` | o dado de uma conta pelo **id permanente** dela, legível e escrevível com a conta **offline** | até 64 KB por mod por conta |

`account` é o lugar do progresso que atravessa sessões, porque o `uuid` sobrevive à troca de nome. O
`AccountStorage` traz `uuid`, `exists` (há conta com este uuid, online ou não), `name` (o nome de agora, ou
`null`), `get`, `set` (lança quando a conta não existe), `delete`, `field` e `keys`.

`accountsWith(key)` devolve os uuids de todas as contas que têm aquela chave do mod: é como um mod percorre os
próprios dados. `accountByName(name)` acha o uuid pelo nome, sem diferenciar maiúsculas.

```js
// Um contador por conta, que sobrevive à desconexão e à troca de nome.
ctx.events.on('playerJoin', (e) => {
  const acc = ctx.storage.account(e.player.uuid);
  const n = (acc.get('entradas') ?? 0) + 1;
  acc.set('entradas', n);
  e.player.message(`Esta é a sua ${n}ª entrada.`);
});
```

### `field` e `adopt`: migrar um dado que era do jogo

`WorldStorage` e `AccountStorage` têm o mesmo par. `field(name)` lê, **só leitura**, um campo que o motor guarda
no mundo (ou na conta) e que o mod não escreve. `adopt(field, key)` é a migração: uma vez por mundo (ou por
conta), e sem perder nada, ele move aquele campo para o armazenamento do mod sob `key`. O campo só sai do
arquivo depois de a escrita ter passado, e as duas vão no mesmo salvamento. O retorno é o que está sob `key`
agora: o valor recém-movido, o que já estava lá, ou `undefined` quando não havia nenhum.

```js
const recorde = ctx.storage.account(uuid).adopt('parkourBest', 'recorde');
```

`WorldStorage` completa a lista com `get`, `set`, `delete` e `keys`.

## `ctx.net`

A conversa entre o servidor e o navegador. Cada mod fala só no **seu** canal: o espaço de nomes é o id do mod, e
você escolhe o nome do canal (`[a-z0-9_]{1,32}`). O campo tem forma diferente de cada lado.

No servidor, `ServerNet`:

```ts
on(ch: string, handler: (player: PlayerApi, data: Json) => void): void;
send(player: PlayerApi, ch: string, data?: Json): boolean;
broadcast(ch: string, data?: Json): void;
channel(ch: string, opts?: ChannelOptions): ServerChannel;
canSend(player: PlayerApi, ch: string): boolean;
channelsOf(player: PlayerApi): { name: string; version: number }[];
```

No navegador, `ClientNet`:

```ts
on(ch: string, handler: (data: Json) => void): void;
send(ch: string, data?: Json): void;
channel(ch: string, opts?: ChannelOptions): ClientChannel;
```

Regras que valem nos dois lados:

- `on` e `channel` só dentro do `register`. Depois disso lançam. Vários `on` no mesmo canal rodam todos, na ordem
  de registro, e recebem o **mesmo** objeto `data`: não o altere se houver outro ouvinte.
- `data` é qualquer valor JSON; sem `data` chega `null`. Teto de 4 KB de JSON e 16 níveis de aninhamento. Dado fora
  disso **lança** no `send`.
- `send` no servidor devolve `false` quando o envio foi descartado pelo orçamento de saída (32 KB/s por jogador) e
  `true` quando saiu. No navegador, `send` antes do login (ou com a conexão caída) lança `not connected`: não há
  fila, então mande a partir de algo que o servidor disparou ou de um clique.
- O servidor aceita 20 mensagens por segundo por jogador, com rajada de 40. O excesso é descartado em silêncio.
- **Nunca confie no que vem do cliente.** Qualquer jogador pode mandar qualquer coisa à mão. Confira tipo, faixa e
  permissão no servidor antes de agir.

### O canal tipado: `channel`

`ctx.net.channel(nome, opts)` declara o canal **uma vez**, nos dois lados, e põe o contrato no meio. O payload é
validado pelo esquema **antes** de chegar ao mod: o que não bate é recusado sem o seu código ver.

```ts
interface ChannelOptions {
  version?: number;            // 1..65535 (padrão 1)
  schema?: ValueSchema;        // valida o payload nos dois lados
  direction?: 'both' | 'toClient' | 'toServer';
  maxBytes?: number;           // teto do payload serializado, 1..4096 (padrão 4096)
  rate?: number;               // mensagens por segundo por jogador que este canal aceita de entrada, (0, 100]
  bulk?: boolean;              // a faixa de alto volume: sai do balde global e paga só o que declarou
  bytesPerSecond?: number;     // 256..65536; padrão 16384 num canal `bulk`
}
```

A **versão** é negociada quando o jogador entra: o canal só vale entre os dois lados com o mesmo número, e subir a
versão desliga o canal do cliente velho em vez de entregar um payload que ele não entende. Um campo do esquema pode
ser bytes (`{ type: 'bytes', maxBytes }`): o mod dá e recebe `Uint8Array`, e o campo viaja codificado dentro do
mesmo JSON do resto.

O que `channel` devolve no servidor (`ServerChannel`):

```ts
readonly name: string; readonly channel: string; readonly version: number;
readonly direction: ChannelDirection; readonly maxBytes: number;
readonly rate: number | null; readonly bulk: boolean; readonly bytesPerSecond: number | null;
on(handler: (player: PlayerApi, data: Json) => void): ServerChannel;
onOpen(handler: (player: PlayerApi) => void): ServerChannel;
onClose(handler: (player: PlayerApi) => void): ServerChannel;
canSend(player: PlayerApi): boolean;
send(player: PlayerApi, data?: NetJson): boolean;
broadcast(data?: Json): void;
```

E no navegador (`ClientChannel`), os mesmos campos de leitura mais:

```ts
on(handler: (data: Json) => void): ClientChannel;
onOpen(handler: () => void): ClientChannel;
onClose(handler: () => void): ClientChannel;
canSend(): boolean;
send(data?: NetJson): void;
```

`onOpen` entra quando um jogador conecta com este canal compatível; `onClose`, quando esse jogador sai. Num canal
`toClient`, o `on` do servidor lança: o sentido é parte do contrato.

### `canSend`: perguntar antes de falar

Nem todo jogador tem o seu mod, e nem todo mod instalado está na mesma versão. `canSend` responde se o outro lado
tem o canal declarado na mesma versão — com um canal que você não declarou, ele lança (é bug do mod, não dado de
fora).

- No servidor: `ctx.net.canSend(player, ch)`, ou `canal.canSend(player)`. `ctx.net.channelsOf(player)` devolve
  `[{ name, version }]` com os canais que o navegador **daquele** jogador declarou (lista vazia quando não há
  nenhum).
- No navegador, a metade de negociação mora em `ctx.client.net`, que é `ClientNetView`:

```ts
interface ClientNetView {
  canSend(ch: string): boolean;                           // canal não declarado lança
  channels(): { name: string; version: number }[];        // os canais tipados que o servidor publicou na entrada
  readonly connected: boolean;
}
```

```js
// server/index.js — um canal tipado, com versão e esquema.
const placar = ctx.net.channel('placar', { version: 1, schema: { pontos: 'integer' } });
placar.onOpen((player) => placar.send(player, { pontos: 0 }));
ctx.events.on('playerJoin', (e) => {
  if (!ctx.net.canSend(e.player, 'placar')) return; // esse jogador não tem o meumod:placar
  placar.send(e.player, { pontos: 10 });
});
```

## `ctx.server`

Quem está online, quem está perto e quem está vendo um lugar. São as três respostas que o jogo usa para decidir o
que manda a cada jogador. **Só no servidor**: no navegador toda chamada lança.

```ts
interface ServerLookup {
  players(): PlayerApi[];
  playersNear(target: LookupTarget, radius?: number): PlayerApi[];
  playersTracking(target: LookupTarget): PlayerApi[];
}
```

- `players()` devolve todo jogador online deste mundo, fora de partida.
- `playersNear(alvo, raio)` devolve quem está a `raio` blocos do alvo em linha reta (padrão 160). Alvo que traz
  `dimension` (um jogador, um mob) filtra pela dimensão dele.
- `playersTracking(alvo)` devolve quem **recebe** esse lugar hoje: a mesma caixa que o jogo usa para mandar estado e
  mobs. Mob que já foi embora dá `[]`.

O alvo é uma posição, qualquer coisa com `pos` (um jogador, o mob de um gancho), um id de mob ou um chunk:

```ts
type LookupTarget =
  | { x: number; y: number; z: number; dimension?: string }
  | { pos: { x: number; y: number; z: number }; dimension?: string }
  | { mob: number }
  | { chunk: { x: number; z: number } };
```

O resto do API de servidor continua sendo o `e.server` que os ganchos entregam; `ctx.server` é só a busca de
jogadores.

```js
// server/index.js — avisa só quem está a 32 blocos de quem acabou de entrar.
const aviso = ctx.net.channel('aviso', { version: 1, direction: 'toClient', schema: { de: 'string' } });
ctx.events.on('playerJoin', (e) => {
  for (const perto of ctx.server.playersNear(e.player, 32)) {
    if (perto !== e.player) aviso.send(perto, { de: e.player.name });
  }
});
```

## `ctx.attachments`

Um valor com nome pregado em algo do jogo: um **jogador**, uma **conta offline** (pelo uuid), um **mob**, um
**chunk** ou um **bloco de qualquer mod**. No servidor lê e escreve; no navegador o mesmo anexo é **só leitura** — o
que você vê lá é o que o `sync` do servidor mandou, e `set`, `modify` e `delete` lançam.

```ts
interface AttachmentsApi {
  register<T = Json>(path: string, opts?: AttachmentOptions<T>): Attachment<T>;
}
```

O nome registrado fica completo (`meumod:fome`), então dois mods nunca colidem. As opções:

```ts
interface AttachmentOptions<T = Json> {
  target?: 'world' | 'dimension';   // alvo global: um valor só no mundo, ou um por dimensão
  default?: T;                      // sem ele, `get` devolve `undefined`
  persistent?: boolean;             // salva junto com o alvo; num mob não há save: vale enquanto o mob existir
  sync?: AttachmentSync;            // manda ao navegador sem o mod escrever rede
  schema?: ValueSchema;             // valida o valor
  codec?: { encode(value: T): Json; decode(json: Json): T };  // para valor que não é JSON puro (um `Map`)
}
```

`sync` diz **quem** recebe: `true` é o sensato para o tipo de alvo (o dono, ou quem vê a entidade; num anexo de
mundo ou de dimensão, todo jogador de lá), e as outras formas são `'owner'`, `'tracking'`, `'all'` e
`'allButTarget'` (todos menos o jogador alvo). Uma **função** `(player, target) => boolean` decide jogador a
jogador, só no servidor e só quando o valor muda; um mod em sandbox não pode usá-la. `'owner'`, `'tracking'` e
`'allButTarget'` não valem com `target: 'world' | 'dimension'`.

O que `register` devolve:

```ts
interface Attachment<T = Json> {
  readonly name: string; readonly path: string;
  readonly target: 'world' | 'dimension' | null;
  readonly persistent: boolean; readonly sync: AttachmentSync;
  get(target?: AttachmentTarget): T | undefined;     // o valor, ou o `default`; sempre uma cópia nova
  has(target?: AttachmentTarget): boolean;           // há valor anexado? (o `default` não conta)
  set(target: AttachmentTarget | null | undefined, value: T | undefined): void;
  modify(target: AttachmentTarget | null | undefined, fn: (current: T | undefined) => T | undefined): T | undefined;
  delete(target: AttachmentTarget | null | undefined): boolean;
  onSet(fn: (e: AttachmentSetEvent<T>) => void): Attachment<T>;
}
```

`set` com `undefined` limpa; fora do esquema, acima de 8 KB ou com um alvo que não existe, lança. `modify` lê e
escreve num passo (uma função que lança deixa o valor antigo) e não é reentrante. `onSet` só dentro do `register`,
até 8 ouvintes, e recebe:

```ts
interface AttachmentSetEvent<T = Json> {
  readonly kind: 'player' | 'account' | 'mob' | 'chunk' | 'block' | 'world' | 'dimension';
  readonly key: string;
  readonly target: AttachmentTarget | null;
  readonly old: T | undefined;
  readonly value: T | undefined;
  readonly player: PlayerApi | null;
  readonly mob?: number;
}
```

O alvo que se passa a `get`/`set` tem muitas formas: um `PlayerApi`, um uuid de conta (ou o id da dimensão num anexo
`target: 'dimension'`), `{ dimension }`, `{ account }`, `{ mob }`, `{ id }`, `{ chunk: { x, z } }`,
`{ block: { x, y, z } }` ou uma posição solta. No navegador, `{ player: uuid }` lê o valor de **outro** jogador,
quando o `sync` o mandou. Num anexo `target: 'world'` o alvo é dispensado (`get()`); num `target: 'dimension'`, sem
alvo, vale a dimensão onde o código roda. As cotas são as mesmas do `ctx.storage`.

```js
// O mesmo anexo nos dois lados: o servidor escreve, o navegador lê.
const sede = ctx.attachments.register('sede', { default: 100, persistent: true, sync: true, schema: 'integer' });
if (ctx.isServer()) {
  ctx.events.on('playerJoin', (e) => sede.modify(e.player, (n) => Math.min(100, (n ?? 100) + 10)));
}
if (ctx.isClient()) {
  sede.onSet((e) => console.log('sede agora:', e.value));   // o anexo chama-se meumod:sede
}
```

## `ctx.ui`

A interface. **Só o navegador desenha**: no servidor, `ctx.ui` é `ServerUi` e toda chamada lança. Teste
`ctx.isClient()` (ou `ctx.side === 'client'`) antes.

### No servidor: `ServerUi`

São cinco membros, todos presentes apenas para o tipo fechar nos dois lados. Nenhum deles faz nada:

```ts
interface ServerUi {
  dom(desc: DomUiDesc): never;
  canvas(desc: CanvasUiDesc): never;
  panel(desc: PanelDesc): never;
  hud(desc: HudDesc): never;
  gui: { /* os mesmos nomes de `GuiApi`, todos `never` */ };
}
```

### No navegador: `ClientUi`

```ts
interface ClientUi {
  dom(desc: DomUiDesc): CustomUiHandle;
  canvas(desc: CanvasUiDesc): CustomUiHandle;
  panel(desc: PanelDesc): PanelHandle;
  hud(desc: HudDesc): HudHandle;
  gui: GuiApi;
}
```

Os quatro primeiros são o caminho curto: uma linha no canto da tela, uma caixa com botões, ou HTML e canvas livres.
O `gui` é o caminho longo, que alcança a camada de GUI do jogo inteira. Esta é a maior parte do `ctx`, e o contrato
completo de cada componente está na seção 16 de [guia-de-mods.md](guia-de-mods.md); aqui ficam os membros
principais.

**Linha de HUD e painel.** Tudo é escrito como texto puro, nunca como HTML: um nome com `<script>` aparece escrito.

```ts
type HudDesc = { id: string; corner?: 'top-right' | 'top-left' | 'bottom-right' } &
  ({ text: string; body?: never } | { body: UiElement[]; text?: never });
interface HudHandle { set(text: string): void; update(body: UiElement[]): void; remove(): void }

interface PanelDesc { title?: string; body?: UiElement[] }
interface PanelHandle { open(): void; close(): void; update(body: UiElement[]): void; readonly isOpen: boolean }
```

O mesmo `id` de HUD de novo substitui a linha. `update` troca o corpo mantendo o que foi digitado nos campos. Só um
painel de mod fica aberto por vez: abrir o seu fecha o do outro mod. `open()` durante o `register` lança, e fora do
jogo não abre.

O `body` é uma lista de `UiElement`, cada um com **uma** chave de tipo (até 200 elementos, contando os filhos de
`row`, e 2000 caracteres por texto):

```ts
type UiElement =
  | { card: UiVisual & { title?: string; subtitle?: string; badge?: string; body: UiElement[] } }
  | { stat: UiVisual & { label: string; value: string | number; unit?: string; hint?: string } }
  | { progress: UiVisual & { label: string; value: number; max?: number; text?: string } }
  | { text: string }
  | { button: string; onClick?: (values: Record<string, string>) => void }
  | { input: true; id: string; placeholder?: string; value?: string }
  | { row: UiElement[] }
  | { item: FullName; n?: number };

interface UiVisual { tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
                     icon?: 'temperature' | 'drop' | 'activity' | 'shield' | 'sun' | 'snow' }
```

Botões e campos só valem em painéis; no HUD, apenas o que se olha.

**HTML e canvas livres.** `dom` e `canvas` dão a você uma caixa inteira, no HUD, como painel, ou **no mundo**,
seguindo uma âncora:

```ts
interface CustomUiDesc {
  id: string;
  mode?: 'hud' | 'panel' | 'world';
  corner?: HudCorner;
  width?: number; height?: number;     // dimensões CSS 16..1024; padrões 280×160
  css?: string;
  anchor?: UiAnchor;
  data?: any;
}
interface UiAnchor { position?: Pos; player?: string | number; mob?: number; offset?: Pos;
                     maxDistance?: number; occlude?: boolean }   // escolha exatamente um alvo

interface DomUiDesc extends CustomUiDesc {
  mount(root: ShadowRoot, data: any): void | (() => void) | { update?(data: any): void; destroy?(): void };
}
interface CanvasUiDesc extends CustomUiDesc {
  animate?: boolean; label?: string;
  draw(context: CanvasRenderingContext2D,
       frame: { width: number; height: number; dpr: number; time: number; delta: number; data: any }): void;
  onPointer?(event: { type: string; x: number; y: number; buttons: number; pointerId: number; data: any }): void;
}

interface CustomUiHandle {
  open(): void; close(): void; remove(): void;
  update(data: any): void; setAnchor(anchor: UiAnchor): void;
  readonly isOpen: boolean;
}
```

O `mount` do `dom` recebe um `ShadowRoot`, então o seu CSS não escapa nem é afetado. `remove()` é definitivo: solta
animação, DOM e callbacks.

**`ctx.ui.gui`: a camada de GUI do jogo.** O HUD do jogo é desenhado num canvas sobre o 3D, em pixels inteiros
(escala 1× a 4×). Um mod desenha no mesmo lugar e do mesmo jeito — o HUD que você vê jogando é conteúdo do mod base,
registrado por este mesmo caminho. Os membros, por grupo:

```ts
// camadas
layer(name: string, desc: { draw(ctx: CanvasRenderingContext2D, frame: GuiFrame): void;
                            priority?: number; animates?(): boolean }): void;

// o HUD como lista ordenada de peças com nome
hud: HudElementApi;
hudPart(id: HudPartId, draw: (ctx: CanvasRenderingContext2D, frame: HudFrame) => void, opts?: HudElementOpts): void;
hudLayout(place: (e: { width: number; height: number; px: number; count: number },
                  previous: ((e: { width: number; height: number; px: number; count: number }) =>
                    { x0: number; y0: number; barW: number; slot: number; gap: number; rowY: number }) | null) =>
                    { x0: number; y0: number; barW: number; slot: number; gap: number; rowY: number },
           opts?: GuiChainOpts): void;

// telas
screen(id: string, desc: GuiChainOpts & { draw(...): void; onPointer?(...); onDrag?(...);
                                          onRelease?(...); onKey?(...); onOpen?(...); onClose?(...) }): void;
screen(id: string, desc: GuiChainOpts & { dom: { mount(e: GuiDomScreenEvent): void;
                                                 update?(e: GuiDomScreenEvent): void;
                                                 unmount?(e: GuiDomScreenEvent): void }; /* os mesmos ganchos */ }): void;
screenEvents(id: string, handlers: ScreenEventHandlers, opts?: { priority?: number }): void;
widgets(id: string, draw: (frame: GuiScreenFrame) => void, opts?: { priority?: number }): void;

// o kit de componentes
widget: GuiWidgetApi;

// menus e páginas da pausa
menu(id: MenuId | (string & {}), desc: GuiMenuDesc, opts?: GuiChainOpts): string;
menus: GuiMenusApi;
pausePage(name: string, desc: { title: string; icon?: string; hint?: string; dom?: string | GuiDomMenu;
                                draw?(...); onPointer?(...); controls?: PauseControl[]; config?: boolean;
                                open?(...); close?(...); render?(...) }, opts?: GuiChainOpts): string;
pausePages: PausePagesApi;

// tema, forma, fonte e ícones
theme(colors: Record<string, string>): void;
skin(parts: Partial<GuiSkin>): void;
font(desc: { glyphs: Record<string, string[]> }): void;
accent(ch: string, desc: { base: string; above?: string[]; below?: [number, number][] }): void;
icon(kind: 'heart' | 'food' | 'armor' | 'air',
     desc: { rows: string[]; colors: { '#': string; o: string; h: string } }): void;
```

Quatro ideias atravessam tudo isso:

- **Cadeia.** Vários mods podem registrar no mesmo lugar. `GuiChainOpts` (`priority` de -1000 a 1000, `exclusive`)
  decide quem desenha: o maior ganha e, no empate, o último registrado; o jogo base registra em -1000. Quem ganhou
  alcança o de baixo por `frame.previous` (ou `e.previous`, ou `g.previous`), então você pode **embrulhar** em vez de
  refazer. Quem lança erro cai para o registro de baixo.
- **A camada só redesenha quando algo a suja.** Uma peça que muda sozinha (um cronômetro, um indicador de volume)
  devolve `true` no `animates()` enquanto está mudando.
- **O HUD é uma lista ordenada.** `HudElementApi` tem `add`, `addFirst`, `addBefore(anchor, ...)`,
  `addAfter(anchor, ...)`, `replace(id, ...)`, `remove(id)` e `ids()`, e o `anchor` pode ser uma peça do jogo
  (`'hotbar'`, `'health'`, `'food'`, `'armor'`, `'air'`, `'xp'`, `'effects'`, `'itemName'`, `'crosshair'`, `'chat'`,
  `'debug'`...) ou de outro mod. Até 16 elementos por mod; o id do seu fica `meumod:nome`.
- **O kit de componentes é ajuda, não exigência.** O `frame.ui` de uma tela traz `panel`, `slot`, `button`, `text`,
  `item`, `tooltip`, `list`, `textField`, `checkbox`, `slider`, `tabs`, `dropdown`, `progress`, `tip`, `label`,
  `iconButton`, mais `column`/`row` como cursor de layout e `hit`/`tap`/`focusable` para o clique e o teclado. A
  mesma tela pode ser montada em HTML (`dom: { mount }`), com o mesmo kit em DOM. Desenhar tudo na mão é permitido.

Os seis menus em HTML do jogo (`'entry'`, `'pause'`, `'options'`, `'death'`, `'shop'`, `'trade'`) entram na mesma
cadeia: `menu('pause', ...)` troca o da pausa, `menu('guia', ...)` declara um menu novo seu (id `meumod:guia`), e
`menus.replace`/`remove`/`ids`/`open`/`close` alcançam o de outro mod pelo id completo. `pausePage` acrescenta uma
aba na pausa: com `controls` o jogo desenha a lista declarada por você, e com `config: true` ele monta a tela de
configuração do seu mod sozinho. Até 8 páginas por mod.

O contrato completo de cada tipo citado aqui (`GuiFrame`, `HudFrame`, `GuiUiKit`, `GuiDomKit`, `ScreenEventHandlers`,
`GuiSkin`, `PauseControl` e companhia) está nos tipos que vêm na pasta do mod, em `types/mineclaude-mod`, e explicado
com exemplos na seção 16 de [guia-de-mods.md](guia-de-mods.md).

```js
// client/index.js — uma linha de HUD e uma peça nova depois da barra de fome.
const linha = ctx.ui.hud({ id: 'sede', corner: 'top-left', text: 'Sede: 100%' });
ctx.ui.gui.hud.addAfter('food', 'sede', (c, frame) => {   // a peça fica meumod:sede
  frame.font.drawText(c, 'Sede', 4 * frame.scale, 4 * frame.scale, { px: frame.scale });
}, { priority: 0 });
const painel = ctx.ui.panel({ title: 'Meu mod', body: [{ text: 'Tudo certo.' }] });
ctx.client.keys.register({ id: 'abrir', name: 'Abrir o painel', key: 'KeyG' }).onPress(() => painel.open());
```

## `ctx.client`

O que o mod vê do jogo rodando: o jogador local, os blocos em volta, os mobs, a luz do dia, o teclado e a câmera.
**Só no navegador**: no servidor toda chamada lança. É tudo leitura, e antes de o jogo começar (na tela de entrada)
os valores vêm `null` ou lista vazia, sem erro.

```ts
interface ClientView {
  player(): { name: string; x: number; y: number; z: number; yaw: number; pitch: number; dimension: string;
              climb: 'none' | 'ledge' | 'mantle' | 'climb' } | null;
  playerState(): { health: number; maxHealth: number; hunger: number; maxHunger: number; armor: number;
                   air: number; maxAir: number; creative: boolean; selected: number;
                   hand: { name: string | null; count: number } | null;
                   target: { kind: 'block'; x: number; y: number; z: number; block: string | null }
                         | { kind: 'mob'; id: number; type: string | null; distance: number }
                         | { kind: 'player'; id: number; distance: number } | null } | null;
  getBlock(pos: { x: number; y: number; z: number }): string | null;
  topBlock(x: number, z: number, from?: number): { y: number; block: string } | null;
  groundBelow(x: number, y: number, z: number, depth?: number): number | null;
  blockColor(name: string): string | null;
  mobs(): { id: number; type: string; x: number; y: number; z: number }[];
  players(): { name: string; color: string; x: number; y: number; z: number }[];
  daylight(): number;
  sun(): { x: number; y: number; z: number };
}
```

- `player()` traz a posição e o olhar do jogador local, mais o estado de escalada (`climb`). A identidade que um mod
  usa é o `name` (o nome mostrado) e o `uuid` (o id permanente da conta, que vem no `player` dos eventos de
  servidor).
- `playerState()` é o estado que o HUD já mostra, só leitura, numa cópia nova a cada chamada: `armor` em pontos de
  armadura, `air` e `maxAir` em segundos de fôlego, `selected` como índice da barra (0 a 8), `hand` com o item na
  mão, e `target` com o que a mira aponta — o mais perto entre bloco, mob e jogador.
- `getBlock` devolve o nome completo do bloco, ou `null` quando o chunk não está carregado. `topBlock` sobe a coluna
  e devolve o bloco mais alto, pulando ar, plantas e tochas. `groundBelow` devolve a altura do chão (o topo da
  colisão: laje em 0,5, escada pelo degrau) descendo de `y` até `depth` blocos (1 a 16, padrão 4) — é o número certo
  para pés que pisam no bloco de verdade.
- `blockColor(nome)` devolve a cor média do topo da textura, `'#rrggbb'`, inclusive de blocos de mods. É como um
  minimapa pinta o mundo sem desenhá-lo de novo.
- `daylight()` vai de 0 (noite) a 1 (dia). `sun()` é um vetor unitário apontando para o sol, que anda pelo céu
  (`y < 0` quando ele está abaixo do horizonte).

As sub-APIs:

```ts
keys: { register(desc: { id: string; name: string; key: string }): ClientKeyBinding };
input: ClientInput;
camera: ClientCamera;
net: ClientNetView;
commands: ClientCommandsApi;
debug: ClientDebugApi;
media: ClientMediaApi;
```

### ctx.client.keys

O caminho curto para uma tecla do mod. Até 8 por mod.

```ts
interface ClientKeyBinding {
  readonly name: string; readonly code: string;
  onPress(fn: () => void): void;
  wasPressed(): boolean;   // true uma vez por aperto desde a última chamada
}
```

`key` é um `KeyboardEvent.code` (`'KeyG'`, `'F6'`). A tecla aparece como ação na categoria de mods das Opções, onde
o jogador remapeia, e cede a vez a qualquer ação do jogo na mesma tecla. Para o resto, use `input.action`.

### ctx.client.input

Entrada como **registro de ações nomeadas**, do jogo e dos mods. O jogo lê ações, nunca teclas fixas, e um
dispositivo (teclado, mouse, toque, controle, ou um que você crie) liga e desliga ações.

```ts
interface ClientInput {
  action(desc: Omit<InputAction, 'onPress' | 'onRelease'> & { onPress?(e: InputEvent): void;
                                                             onRelease?(e: InputEvent): void }): InputActionHandle;
  on(action: string, fn: (e: InputEvent) => void): () => void;
  get(action: string): InputActionHandle | null;
  list(): { id: string; name: string; category: string; defaultKeys: string[]; keys: string[] }[];
  isDown(action: string): boolean;
  wasPressed(action: string): boolean;
  value(action: string): number;                      // 0..1 (analógico; booleano vale 0 ou 1)
  axis(negative: string, positive: string): number;
  press(action: string): boolean; release(action: string): void; tap(action: string): boolean;
  rebind(action: string, code: string | null): void;  // só nesta sessão; a escolha salva do jogador vence
  device(desc: { id: string; update(dt: number, api: InputDeviceApi): void; dispose?(): void }): { id: string };
}
```

Um id sem `:` é o do próprio mod, ou o do jogo (`'jump'`, `'attack'`, `'inventory'`...). `on` escuta também as ações
do jogo, e `e.cancel()` num evento de aperto consome a tecla: o jogo não faz o que faria. `press`/`release`/`tap`
injetam a ação como se um dispositivo a tivesse feito, e devolvem `false` quando outro mod a consumiu. O que
`action` devolve (`InputActionHandle`) tem `isDown`, `value`, `wasPressed`, `keys`, `onPress`, `onRelease`, `press`,
`release` e `tap`.

### ctx.client.camera

A câmera é um registro de **modos** mais **modificadores** empilháveis. O jogo aplica a pose por quadro, com
suavização opcional e colisão com blocos. O que o jogador mira continua saindo do olho do personagem.

```ts
interface ClientCamera {
  mode(desc: CameraMode | { id: string; name: string; update(frame: CameraFrame): CameraPose;
                            cyclable?: boolean; showBody?: boolean; collide?: boolean; smooth?: number;
                            onEnter?(): void; onExit?(): void }): { id: string };
  modify(fn: (pose: CameraEditPose, frame: CameraFrame) => void | Partial<CameraEditPose>,
         opts?: { order?: number }): () => void;
  modifyLook(fn: (look: { dx: number; dy: number; source: string;
                          sensitivity: number; invertY: boolean }) => void): () => void;
  set(mode: string): boolean;
  cycle(): string | null;
  current(): { id: string; name: string } | null;
  modes(): { id: string; name: string; cyclable: boolean }[];
}
```

`modify` e `modifyLook` devolvem quem desfaz. `set` lança com um id desconhecido (um id sem `:` vale o do próprio
mod, depois o do jogo).

### ctx.client.net

A metade de negociação dos canais tipados, descrita em [ctx.net](#ctxnet): `canSend(ch)`, `channels()` e
`connected`.

### ctx.client.commands

Comandos de chat que rodam **só no navegador** e não vão ao servidor. A definição é a mesma do
`ctx.commands.register` (tipos, `sub`, `tree`, `requires`, `aliases`), com tipos de argumento e opções de seletor
próprios do cliente. No evento vêm `player` (o jogador local), `args`, `raw`, `side: 'client'`, `reply` e `client`.

```ts
interface ClientCommandsApi {
  register(name: string, def: CommandDef | CommandType): string;
  argumentType<T>(id: string, def: ArgumentTypeDef<T>): string;
  selectorOption<S>(id: string, def: SelectorOptionDef<S>): string;
  list(): { name: string; help: Text; admin: boolean }[];
}
```

### ctx.client.debug

As linhas da **caixa de depuração** (a do F3) e o desenho 3D de depuração. O jogo só entrega os números do quadro e
desenha; o texto é de quem registra. Até 32 linhas por mod.

```ts
interface ClientDebugApi {
  line(id: string, fn: (info: DebugInfo) => DebugLineResult, opts?: { order?: number }): string;
  remove(id: string): boolean;
  list(): string[];
  shape(id: string, fn: (info: DebugInfo, draw: DebugDraw) => void): string;
  removeShape(id: string): boolean;
  shapes(): string[];
}

type DebugLineResult = Text | null | undefined | false;   // texto, '' (linha vazia) ou nada neste quadro
interface DebugDraw {
  box(min: DebugPoint, max: DebugPoint, color?: string): void;   // as arestas da caixa
  line(from: DebugPoint, to: DebugPoint, color?: string): void;
  text(pos: DebugPoint, text: string | number, color?: string): void;  // um rótulo que olha para a câmera
}
```

`line` registra `meumod:<id>` e `order` ordena a caixa (as linhas do jogo vão de 100 a 900; o padrão é 1000, depois
delas). `remove` aceita o id local (do próprio mod) ou `mod:id` (de qualquer um), e só dentro do `register`.

`shape` é o **desenho 3D**: a cada quadro, e só com a caixa de depuração aberta, `fn(info, draw)` descreve caixas,
linhas e rótulos no mundo, e o jogo os desenha — o mod só descreve. Orçamento: 16 desenhos por mod, 128 primitivas
por desenho e 512 por quadro, rótulo de até 48 caracteres e 3 ms por quadro; o que passa é cortado. Um desenho que
lança erro oito vezes é desligado. O `info` traz os números do quadro (quadros por segundo, posição, chunks, malhas,
zona, mobs, clima, o alvo da mira e a dica de como esconder a caixa, já na tecla que o jogador escolheu).

### ctx.client.media

Captura de áudio de um aparelho, **com a permissão do jogador**. O aparelho fica fechado até um mod chamar
`start()`, e `start()` é a única coisa que pede permissão. Até 2 capturas por mod e 4 na página.

```ts
interface ClientMediaApi {
  capabilities(): MediaCapabilities;
  capture(options?: MediaCaptureOptions): MediaCapture;
  states(): readonly MediaState[];
}

interface MediaCapture {
  readonly name: string; readonly source: MediaSource; readonly codec: MediaCodec;
  readonly frameMs: number; readonly state: MediaState;
  readonly level: number;    // 0..1, o volume do que está entrando agora
  readonly live: boolean;
  start(): Promise<boolean>;            // é aqui que o navegador pergunta ao jogador
  setPaused(paused: boolean): boolean;  // mantém o aparelho aberto e para de entregar quadros
  stop(): void;                         // fecha o aparelho (a luz do microfone apaga)
  close(): void;                        // stop(), e esta alça não conta mais na cota do mod
  stats(): MediaCaptureStats;
}
```

As opções (`MediaCaptureOptions`): `name`, `source` (`'microphone'` ou `'synthetic'`, um tom gerado na página — o
mesmo caminho, sem microfone e sem permissão), `codec` (`'opus'` ou `'pcm16'`), `bitrate` (6000 a 128000, padrão
20000), `frameMs` (10 a 120, padrão 20), `channels`, `sampleRate`, `tone` (só no sintético, 20 a 8000 Hz, padrão
440), `deviceId` e os ganchos `onFrame`, `onLevel`, `onState` e `onError`. Um quadro (`MediaFrame`) traz `bytes`
(`Uint8Array`), `seq` (a numeração desta captura, de 0 em diante), `ms` e `codec`.

O `state` é `'idle'` antes e depois, `'starting'` enquanto o navegador pergunta, `'live'` entregando quadros,
`'paused'` aberto mas sem entregar (apertar-para-falar solto), e `'denied'`, `'unsupported'` ou `'error'` quando não
funciona. `capabilities()` diz de antemão se este navegador entrega áudio, se tem microfone, se codifica e
decodifica, quais codecs, se o contexto é seguro, e `reason` traz em uma frase **por que não**, para o mod mostrar ao
jogador.

Chame `start()` a partir de uma ação do jogador (uma tecla, um botão), nunca no `register`.

```js
// client/index.js — uma tecla que mostra o alvo da mira e gira a câmera.
ctx.client.debug.line('alvo', () => {               // a linha fica meumod:alvo
  const s = ctx.client.playerState();
  return s && s.target ? `alvo: ${s.target.kind}` : null;
});
const tecla = ctx.client.keys.register({ id: 'girar', name: 'Girar a câmera', key: 'KeyC' });
tecla.onPress(() => ctx.client.camera.cycle());
```

## Duas notas finais

**A versão do protocolo de rede hoje é 107.** Ela é o número que o servidor e a página do navegador comparam no
login: se não baterem, a página é recusada em vez de entrar e desenhar um mundo errado. Um mod não escolhe esse
número e não precisa mexer nele — ele muda quando o **formato das mensagens do jogo** muda. O que um mod precisa
saber é a consequência prática: o servidor e o navegador têm de estar na mesma versão, e um mod cujo conteúdo
registrado difere entre os dois lados (bloco a mais, ordem diferente, receita que só existe num lado) também
derruba o login, com uma mensagem dizendo qual registro divergiu. Para os canais do seu próprio mod, a versão é
sua: declare-a em `ctx.net.channel` e use `canSend` antes de mandar (veja
[a seção de rede do guia](guia-de-mods.md#15-rede-ctxnet)).

**O apelido e o login do jogador não fazem parte da API de mods.** Um mod não cria contas, não lê nem grava
senhas, não escolhe como alguém entra no servidor e não vê credencial nenhuma. O que ele recebe é um jogador já
autenticado: `player.name` (o nome mostrado, que pode mudar) e `player.uuid` (o id permanente da conta, que não
muda — use esse como chave de dados). Para guardar progresso de uma conta, use `ctx.storage.account(uuid)`, que
funciona com a conta offline. Quem decide a autenticação é o dono do servidor, fora do alcance dos mods.

