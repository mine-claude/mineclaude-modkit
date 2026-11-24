# MineClaude modkit

O kit para fazer mods do [MineClaude](https://mineclaude.com), um jogo voxel multijogador no navegador.

Aqui está **só o que um autor de mod precisa**: a casca que o mod importa, as declarações de tipo da API, as regras
de validação do servidor e a ferramenta que monta o `.mcmod`. Nada do motor do jogo.

## Instalar

Precisa do [Bun](https://bun.sh) (ou do Node 20+). Nenhuma dependência de execução, nenhuma cópia do jogo.

Como dependência de um repositório de mod:

```sh
bun add -d github:mine-claude/mineclaude-modkit#v0.2.0
bunx mineclaude-modkit help
```

Ou baixe o `.tgz` (ou o `.zip`) da [última Release](../../releases/latest), descompacte e rode:

```sh
bun bin/mineclaude-modkit.mjs help
```

Para chamar só `modkit`, faça um atalho:

```sh
alias modkit='bun /caminho/do/modkit/bin/mineclaude-modkit.mjs'
```

Não está publicado no npm. A Release traz o pacote pronto (`bun pm pack`), que serve para `bun add` / `npm i` a
partir do arquivo.

## Seu primeiro mod

```sh
modkit new meumod        # cria a pasta meumod/ já pronta (TypeScript; --js para JavaScript)
cd meumod
modkit check .           # as regras do servidor, sem precisar do jogo
modkit pack .            # monta e escreve meumod.mcmod
```

Ponha `meumod.mcmod` na `MODS_DIR` do servidor e reinicie, ou no jogo use `/mod previa <link do .mcmod>`, ou a tela
**Mods**. O passo a passo está em [docs/comece-aqui.md](docs/comece-aqui.md).

## Os comandos

| Comando | O que faz |
| --- | --- |
| `modkit new <id> [--dir <pasta>] [--js]` | cria o repositório de um mod novo (TypeScript; `--js` para JavaScript) |
| `modkit build [pasta]` | monta as entradas declaradas em `scripts._sources` |
| `modkit pack [pasta] [--out <arquivo>] [--no-build] [--force]` | monta e empacota em `<id>.mcmod` |
| `modkit check [pasta] [--json]` | confere as regras do servidor |
| `modkit sdk [pasta]` | atualiza o `mineclaude-sdk.js` e o `mineclaude-mod.d.ts` de um mod já existente |

## O que tem dentro

O kit é escrito em **TypeScript estrito** (`src/`) e distribuído compilado (`dist/`: JavaScript mais os `.d.ts`),
então funciona no Bun e no Node sem passo de build na sua máquina.

| Caminho | O que é |
| --- | --- |
| `runtime/mineclaude-sdk.js` | a casca que o mod importa: as classes do SDK, que o jogo entrega ao carregar o mod. Não tem código de jogo. |
| `types/mineclaude-mod.d.ts` | as declarações de tipo da API: é o que faz o editor autocompletar o `ctx`. |
| `src/rules.ts` | as regras do servidor como dados: ids, versões, chaves do manifesto, caminhos de entrada, pastas de recurso, limites. |
| `src/versions.ts` | os predicados de versão do manifesto (`^1.2`, `>=1.0 <2`, `["1.x", "2.x"]`). |
| `src/pack.ts` | o empacotador: escreve o `.mcmod` determinístico. Os bytes são os mesmos que o jogo escreve. |
| `src/check.ts` | o conferidor: as mesmas recusas que a descoberta de mods do servidor. |
| `src/cli.ts` | a CLI; `bin/mineclaude-modkit.mjs` só chama o `dist/`. |
| `templates/` | o modelo de mod novo, o empacotador de um arquivo e o workflow de Release. |
| `examples/` | mods minúsculos, um assunto cada. |
| `docs/` | a documentação, em português. |

Cinco arquivos do contrato são **gerados a partir do jogo** e trazem um aviso no topo (não edite à mão, eles são
reescritos): `runtime/mineclaude-sdk.js`, `types/mineclaude-mod.d.ts`, `src/rules.ts`, `src/versions.ts` e
`templates/pack.mjs`. Esse último é o único arquivo em JavaScript puro de propósito: ele é copiado para dentro do
repositório de cada mod (`tools/pack.mjs`), cuja CI não tem passo de build.

### Como a API muda

Este kit é a FONTE do contrato, com versão própria (semver). O jogo é a implementação e tem suítes que reprovam se
ele deixar de cumprir o que a versão deste kit declara. Mexer na API é: mudar aqui, subir a versão daqui, marcar a
tag, e então o jogo passa a apontar para a tag nova.

### Usar como biblioteca

```ts
import { checkMod } from '@mineclaude/modkit/check';
import { packageEntries, makeZip } from '@mineclaude/modkit/pack';

const r = checkMod('./meumod');
if (!r.ok) throw new Error(r.error);
```

## Documentação

- [docs/comece-aqui.md](docs/comece-aqui.md) — seu primeiro mod, do zero ao `.mcmod`
- [docs/ctx.md](docs/ctx.md) — a referência da API: um grupo do `ctx` por seção, com exemplo
- [docs/guia-de-mods.md](docs/guia-de-mods.md) — o guia longo, em ordem de assunto
- [docs/empacotar.md](docs/empacotar.md) — o `.mcmod`, como instalar e o que é privado
- [docs/versoes.md](docs/versoes.md) — versões, dependências e a Release por tag

## Mods de exemplo, de verdade

Oito mods publicados, um assunto cada:
[chapelaria](https://github.com/mine-claude/mod-chapelaria) (itens vestíveis),
[capa-extra](https://github.com/mine-claude/mod-capa-extra) (cosmético e progressão),
[descanso](https://github.com/mine-claude/mod-descanso) (blocos e ganchos),
[matilha](https://github.com/mine-claude/mod-matilha) (um mob feito de Goals),
[minimapa](https://github.com/mine-claude/mod-minimapa) (interface, só no navegador),
[veiculos](https://github.com/mine-claude/mod-veiculos) (movimento),
[voz-proximidade](https://github.com/mine-claude/mod-voz-proximidade) (áudio e rede),
[clima-criativo](https://github.com/mine-claude/mod-clima-criativo) (clima).

## Licença

`UNLICENSED` por enquanto: o dono do projeto ainda vai decidir a licença deste kit — veja [LICENSE](LICENSE).
O código dos mods que você escreve é seu.

## Arte

Arte 100% original. Nada vindo de outros jogos.
