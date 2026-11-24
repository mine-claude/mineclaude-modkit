# Empacotar e instalar

O que é um `.mcmod`, o que entra nele, o que fica de fora, o que é privado e como o arquivo chega a um servidor.

## O formato

Um `.mcmod` é um **ZIP** com:

- o `package.json` **reduzido** (só as chaves que o servidor conhece);
- os scripts **já montados**, um por lado;
- as pastas de recursos do mod.

Nada mais. Não há código fonte, nem `node_modules`, nem a sua configuração de editor.

O arquivo é **determinístico**: entradas em ordem, data fixa, nomes com barra normal, nenhum campo extra. Empacotar
duas vezes a mesma pasta dá bytes idênticos — é isso que permite remontar uma Release a partir da tag e conferir
que ninguém trocou o arquivo no caminho.

## O que entra

```sh
modkit pack .
```

1. **`package.json`**, reduzido. Só estas chaves viajam: `name`, `version`, `description`, `author`, `authors`,
   `homepage`, `license`, `scripts`, `private`, `type`, `$schema`, `mineclaude`. As que começam com `_` também
   passam (são comentário seu). Qualquer outra o servidor recusaria, então o `pack` a deixa fora e te avisa.
   Em `scripts` sobram só `main`, `server` e `client`: o seu script de build e o `_sources` são ferramenta sua.
2. **Os scripts montados.** Para cada lado declarado em `scripts`: se o arquivo está na raiz, só ele; se está numa
   subpasta, a **pasta inteira**.
3. **As pastas de recursos**, se existirem na raiz do mod:

   | Pasta | O que é |
   | --- | --- |
   | `textures` | as imagens que o navegador busca |
   | `sounds` | os arquivos de som |
   | `models` | modelos de bloco e de entidade (`.json`, `.obj`) |
   | `animations` | as animações de um mob (`animations: "animations/<nome>.animation.json"`) |
   | `lang` | as traduções (`lang/pt_br.json`, `lang/en_us.json`) |
   | `data` | pacotes de dados locais: tags, loot, receitas |
   | `assets` | o resto que o seu mod busca sozinho |

## O que fica de fora

Em qualquer profundidade, dentro das pastas acima e das pastas de script:

- arquivos e pastas que começam com ponto, e `node_modules`;
- as pastas de topo `types/` e `tests/` — a cópia dos tipos e os seus testes não são do jogador;
- `tsconfig.json`, `jsconfig.json`, `package-lock.json`;
- qualquer `.d.ts` e qualquer `.zip`;
- um `.ts` que já tem o `.js` compilado ao lado.

**Link simbólico é recusado**, com o nome do arquivo: um link sairia do pacote e apontaria para o nada na máquina de
quem instalou.

## O que é privado

A pasta do script `server` fica **privada inteira**. Se `scripts.server` é `dist/server/main.js`, nada debaixo de
`dist/server/` é servido ao navegador — nem os módulos vizinhos. Por isso o servidor exige que esse script esteja
numa subpasta, e recusa um `main` ou `client` que caia dentro dela.

Vale lembrar o outro lado: **tudo que não é privado é público**. Os scripts `main` e `client` são baixados pelo
navegador de quem joga, e qualquer um pode lê-los. Não ponha ali nada que você não queira que se leia.

## Os limites

O leitor do servidor recusa um pacote acima deles, então o `pack` recusa antes:

| Limite | Valor |
| --- | --- |
| arquivos no pacote | 2048 |
| um arquivo | 32 MiB |
| tudo descompactado | 128 MiB |
| o zip | 160 MiB |

## Conferir antes

```sh
modkit check .
```

As mesmas recusas que a descoberta de mods do servidor: id, versão, entradas, pasta privada, bloco `mineclaude`,
dependências com os predicados de versão, bloco `config`. Passou aqui, o servidor aceita o arquivo.

O `check` **não carrega** o mod: não roda o seu `register(ctx)`, não registra nada, não desenha textura. Erro de
carregamento aparece no jogo.

## Instalar

### Na pasta de mods do servidor

Ponha o arquivo na `MODS_DIR` e reinicie. **O nome importa**: tem de ser `<id>.mcmod`, com o id do mod. Um
`meumod-0.3.1.mcmod` é recusado; renomeie para `meumod.mcmod`.

O servidor extrai o zip num cache e só o extrai de novo quando o arquivo muda. Um zip e uma pasta com o mesmo nome
ao mesmo tempo é recusado — escolha um.

### No jogo, por link

```
/mod previa <link do .mcmod>
```

Mostra o que o mod registra **antes** de instalar: id, versão, lado, blocos, itens, comandos, dependências que
faltam. Depois:

```
/mod confirmar
```

### Pela tela Mods

A lista do que está carregado, com o que cada mod trouxe. É o lugar de ver se o seu mod subiu e o que ele registrou.

## Empacotar sem o modkit

Um mod criado com `modkit new` leva o próprio empacotador em `tools/pack.mjs`, em JavaScript puro, sem dependência
nenhuma:

```sh
bun tools/pack.mjs
```

É o caminho que a CI usa, e escreve exatamente os mesmos bytes. Serve para quem clonou o seu repositório e não tem o
modkit à mão.

## Por que os bytes importam

O empacotador deste kit, o `tools/pack.mjs` que viaja dentro de cada mod e o empacotador do próprio jogo escrevem
**o mesmo arquivo**. Isso não é promessa: o repositório do jogo tem uma suíte que empacota os mesmos mods pelos três
caminhos e reprova se um único byte diferir. Se não fosse assim, uma Release poderia publicar um pacote que o
servidor recusa.
