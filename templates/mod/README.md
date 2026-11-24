# __ID__

Mod do [MineClaude](https://mineclaude.com). Id `__ID__`, versão `0.1.0`.

## O que ele faz

Uma gema, um bloco de gema, as receitas entre os dois, um comando `/gema` e um painel que responde ao servidor.
Troque isso pelo seu mod.

## Montar e empacotar

Só precisa do [Bun](https://bun.sh):

```sh
modkit check .      # as regras do servidor, sem precisar do jogo
modkit pack .       # monta e escreve __ID__.mcmod
```

Sem o modkit à mão, o próprio repositório empacota (é o caminho que a CI usa):

```sh
bun tools/pack.mjs
```

O `.mcmod` é determinístico: mesma entrada, mesmos bytes.

## Instalar

- **Pasta de mods:** ponha **`__ID__.mcmod`** (o nome importa: é o id do mod) na `MODS_DIR` do servidor e reinicie.
- **No jogo:** `/mod previa <link do .mcmod>`, ou a tela **Mods**.

## Publicar uma versão

Suba a `version` do `package.json`, comite e marque:

```sh
git tag v0.1.0 && git push origin v0.1.0
```

O workflow `.github/workflows/release.yml` monta, empacota e cria a Release com o `.mcmod` anexado.

## Arte

Arte 100% original, pintada por código.
