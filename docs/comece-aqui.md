# Comece aqui

Seu primeiro mod do [MineClaude](https://mineclaude.com), do zero até um arquivo que sobe num servidor.

## 1. O que você precisa

O [Bun](https://bun.sh). Nada mais: o modkit não tem dependência de execução e não precisa de uma cópia do jogo.

```sh
bun --version
```

Instale o kit num lugar e faça um atalho para a mão doer menos:

```sh
alias modkit='bun /caminho/do/modkit/bin/mineclaude-modkit.mjs'
modkit help
```

## 2. Crie o mod

```sh
modkit new meumod
cd meumod
```

Saiu isto:

```
meumod/
  package.json              quem o mod é, e o que montar
  src/main.ts               conteúdo: roda no servidor E no navegador
  src/server.ts             só no servidor; nada daqui vai ao navegador
  src/client.ts             só no navegador
  textures/meumod_gem.png   uma gema 16x16, pintada na hora
  mineclaude-sdk.js         a casca: de onde você importa as classes
  mineclaude-mod.d.ts       os tipos, para o editor autocompletar
  tools/pack.mjs            o empacotador que a CI usa
  tsconfig.json
  .github/workflows/release.yml
```

O modelo já é um mod que funciona: uma gema, um bloco de gema, as receitas entre os dois, o comando `/gema` e um
painel que responde ao servidor. Para fontes em JavaScript em vez de TypeScript: `modkit new meumod --js`.

## 3. Entenda as três entradas

Esta é a única ideia que você precisa pegar antes de escrever qualquer coisa.

| Entrada | Onde roda | Para quê |
| --- | --- | --- |
| `main` | servidor **e** navegador | **todo o conteúdo**: blocos, itens, mobs, receitas, sons, texturas |
| `server` | só no servidor | comandos, eventos, regras, o lado servidor da rede |
| `client` | só no navegador | telas, HUD, desenho, som local |

Conteúdo só vale em `main` porque os ids têm de sair **iguais** nos dois lados — se divergirem, o jogo recusa a
entrada do jogador. E tudo o que está em `main` e `client` é **público**: qualquer jogador baixa e lê esses
arquivos. Regra e segredo ficam em `server`.

No `package.json`, `scripts` diz qual é o arquivo **montado** de cada lado e `scripts._sources` qual é a **fonte**:

```json
{
  "scripts": {
    "main": "dist/main/main.js",
    "server": "dist/server/main.js",
    "client": "dist/client/main.js",
    "_sources": { "main": "src/main.ts", "server": "src/server.ts", "client": "src/client.ts" }
  }
}
```

A pasta do script `server` fica **privada inteira**: nada debaixo de `dist/server/` é servido ao navegador.

## 4. Confira

```sh
modkit check .
```

São as mesmas regras que a descoberta de mods do servidor aplica: o id, a versão, as entradas, a pasta privada, as
dependências, o bloco `config`. Se passar aqui, o servidor aceita o arquivo.

O que o `check` **não** faz é carregar o mod. Ele não roda o seu `register(ctx)`, não registra bloco nenhum. Um erro
que só aparece ao carregar (um nome repetido, uma receita inválida, um `ctx` usado no lado errado) aparece no jogo —
veja o passo 6.

## 5. Empacote

```sh
modkit pack .
```

Monta as três entradas e escreve `meumod.mcmod`. O arquivo é determinístico: mesma entrada, mesmos bytes — o que
faz uma Release ser remontável a partir da tag. São os mesmos bytes que o empacotador do próprio jogo escreveria.

## 6. Rode de verdade

Três caminhos:

- **Pasta de mods do servidor:** ponha **`meumod.mcmod`** na `MODS_DIR` e reinicie. O nome importa: tem de ser o id
  do mod mais `.mcmod`.
- **No jogo:** `/mod previa <link do .mcmod>` mostra o que o mod registra antes de instalar; `/mod confirmar`
  instala.
- **Tela Mods:** a lista do que está carregado, com o que cada mod trouxe.

É aqui que você descobre os erros de carregamento, e é aqui que você vê o mod funcionando.

## 7. Agora escreva o seu

Abra `src/main.ts` e troque a gema pelo que você quer. A referência da API é o [ctx.md](ctx.md) — um grupo do `ctx`
por seção, com exemplo. O [guia-de-mods.md](guia-de-mods.md) é o texto longo, por assunto.

Três exemplos minúsculos e completos estão em [`examples/`](../examples): um comando só de servidor, um bloco que
acende, uma linha de HUD só de navegador.

## 8. Publique

Suba a `version` do `package.json`, comite e marque:

```sh
git tag v0.1.0 && git push origin v0.1.0
```

O workflow que veio no mod monta, empacota e cria a Release com o `.mcmod` anexado. Os detalhes estão em
[versoes.md](versoes.md).

## Quando algo der errado

| Sintoma | O que olhar |
| --- | --- |
| `scripts.X "..." não existe` | rode `modkit build .` antes de empacotar, ou confira o caminho em `scripts` |
| `scripts.server ... tem de estar numa pasta` | o script do servidor precisa de uma subpasta (ex.: `dist/server/main.js`), porque ela fica privada inteira |
| `scripts.client ... está dentro da pasta privada` | separe as pastas de saída de `client` e `server` |
| `package.json name "..." inválido` | o id só aceita `a-z`, `0-9` e `_` |
| o servidor recusa a entrada do jogador | você registrou conteúdo fora de `main`: bloco, item, mob e som só valem lá |
| o editor não autocompleta o `ctx` | rode `modkit sdk .` para atualizar o `mineclaude-sdk.js` e o `mineclaude-mod.d.ts` do mod |
