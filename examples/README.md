# Mods de exemplo

Três mods minúsculos, um assunto cada. São de verdade: conferem, empacotam e sobem num servidor.

| Pasta | Lado | O que mostra |
| --- | --- | --- |
| [ola_mundo](ola_mundo) | só servidor | o menor mod possível: um comando de chat |
| [bloco_lampada](bloco_lampada) | servidor + navegador | um bloco que acende, textura pintada por código, receita |
| [painel_hud](painel_hud) | só navegador | uma linha na HUD, sem nada do servidor |

## Rodar um deles

As fontes importam `../mineclaude-sdk.js` e `../mineclaude-mod`: a casca e os tipos não ficam copiados aqui (seriam
três cópias do mesmo arquivo grande). Traga-os para a pasta do exemplo e siga:

```sh
modkit sdk examples/bloco_lampada     # copia mineclaude-sdk.js e mineclaude-mod.d.ts para lá
modkit check examples/bloco_lampada
modkit pack examples/bloco_lampada    # sai bloco_lampada.mcmod
```

Num mod criado com `modkit new` esse primeiro passo já veio feito.

## Mods de exemplo maiores

Oito mods publicados, cada um com o repositório inteiro (fontes, empacotador, workflow de Release):
[chapelaria](https://github.com/mine-claude/mod-chapelaria),
[capa-extra](https://github.com/mine-claude/mod-capa-extra),
[descanso](https://github.com/mine-claude/mod-descanso),
[matilha](https://github.com/mine-claude/mod-matilha),
[minimapa](https://github.com/mine-claude/mod-minimapa),
[veiculos](https://github.com/mine-claude/mod-veiculos),
[voz-proximidade](https://github.com/mine-claude/mod-voz-proximidade),
[clima-criativo](https://github.com/mine-claude/mod-clima-criativo).
