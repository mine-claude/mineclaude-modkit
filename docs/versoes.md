# Versões, dependências e Releases

## A versão do seu mod

Fica no `version` do `package.json`. Aceita 1 a 32 caracteres de `[0-9A-Za-z.+-]`; use **semver** (`1.4.2`,
`2.0.0-rc.1`), porque é o que os predicados de versão entendem para ordenar.

```json
{ "name": "meumod", "version": "0.3.1" }
```

Sem `version`, o servidor assume `0.0.0`.

Há uma segunda, opcional: `worldgenVersion`. Se o seu mod gera mundo, ela diz quando a **geração** mudou. Subi-la
faz o jogo gerar os chunks novos com o gerador novo e manter os antigos como estavam — sem ela, o mesmo mundo
passaria a gerar terreno diferente do que já está salvo.

## Depender de outro mod

No bloco `mineclaude` do `package.json`:

```json
{
  "mineclaude": {
    "depends": { "cristal_lab": "^1.2" },
    "optional_dependencies": { "minimapa": ">=0.4" },
    "conflicts": { "outro_clima": "*" },
    "dependency_sources": { "cristal_lab": "https://exemplo.com/cristal_lab/mod.json" }
  }
}
```

| Relação | O que faz |
| --- | --- |
| `depends` (ou `dependencies`) | **obrigatória**: sem ela, o servidor não sobe e diz qual falta |
| `optional_dependencies` | se estiver instalada, a versão tem de bater |
| `recommends`, `suggests` | só aviso no boot |
| `conflicts`, `breaks` | não podem estar instaladas junto |
| `dependency_sources` | de onde baixar uma dependência que falta (URL `https://` de um `mod.json`) |

Use `depends` **ou** `dependencies`, nunca os dois. Um mod não pode se referenciar. Até 256 relações por tipo.

Dependência também define a **ordem de carga**: quem é dependência carrega primeiro.

### Os predicados de versão

No modelo do Fabric. Num texto, os termos são **E**; numa lista, **OU**.

| Predicado | Casa com |
| --- | --- |
| `*` | qualquer versão |
| `1.2.3` | exatamente essa |
| `>=1.2`, `>1.2`, `<=2.0`, `<2.0` | comparação |
| `^1.2` | de `1.2` até antes de `2.0` — **mantém o major, inclusive o zero** (`^0.3` não aceita `0.4`) |
| `~1.2` | de `1.2` até antes de `1.3` |
| `1.2.x` | qualquer coisa que comece com `1.2` (só com igualdade) |
| `">=1.0 <2"` | os dois ao mesmo tempo |
| `["1.x", "2.x"]` | um **ou** o outro |

Um nome de versão que não é semver (`"natal"`) só aceita igualdade exata.

Atenção ao `^`: aqui ele **não** segue a regra do npm para o major zero. `^0.3` aceita `0.3.9` e recusa `0.4.0`.

## A Release por tag

O mod criado com `modkit new` já vem com `.github/workflows/release.yml`. O ciclo é:

```sh
# 1. suba a versão
#    package.json: "version": "0.3.2"
git add -A && git commit -m "v0.3.2"

# 2. marque e empurre a tag
git tag v0.3.2
git push origin main --tags
```

A tag `v*` dispara o workflow, que:

1. instala o Bun;
2. roda `bun tools/pack.mjs` (monta e empacota);
3. anexa **dois** arquivos à Release:
   - `<id>-<versão>.mcmod` — com a versão no nome, para guardar;
   - `<id>.mcmod` — o nome puro, que é o que o servidor exige na `MODS_DIR`.

Rodar a mesma tag de novo troca os anexos em vez de falhar.

O workflow não usa action de terceiros: só o `actions/checkout` do próprio GitHub, e o Bun vem do instalador
oficial. Quem instala um mod está instalando código que roda no servidor dele, então vale manter curta a lista de
quem pode mexer no que é publicado.

**A tag tem de bater com o `version`.** Se você marcar `v0.3.2` com o `package.json` em `0.3.1`, a Release sai com o
pacote `0.3.1` — o workflow usa o que está no `package.json`.

## A versão do modkit

Este kit tem versão própria, em semver, e é a **fonte** do contrato de mods: a casca, os tipos, as regras de
validação e o empacotador. O jogo é a implementação, e tem suítes que reprovam se ele deixar de cumprir o que a
versão do kit declara.

O que isso significa para você:

- a versão do kit diz **com qual contrato** o seu mod foi escrito;
- quando o kit sobe de versão, o `CHANGELOG.md` dele lista o que apareceu na API;
- para trazer um mod antigo para o contrato novo, rode `modkit sdk <pasta-do-mod>`: ele atualiza o
  `mineclaude-sdk.js` e o `mineclaude-mod.d.ts` de dentro do mod. Aí o editor te mostra o que mudou.

Fixar a versão do kit num repositório de mod:

```sh
bun add -d github:mine-claude/mineclaude-modkit#v0.2.0
```

## A versão do protocolo de rede

Existe uma terceira versão, que **não é sua**: a do protocolo entre o servidor e a página do navegador (hoje
**107**). Ela sobe quando o formato das mensagens muda, e serve para o jogo recusar uma página velha em vez de
deixá-la desenhar o mundo errado.

Um mod normal nunca a toca. Ela importa para você em um caso: se o seu mod depende de uma mensagem nova (os
modificadores de mundo chegaram na 107, os painéis de controle na 106), então ele precisa de um servidor e de uma
página dessa versão ou mais nova.
