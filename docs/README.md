# Documentação do modkit

Cinco páginas. Se é a sua primeira vez, leia na ordem.

| Página | Para quê |
| --- | --- |
| [comece-aqui.md](comece-aqui.md) | seu primeiro mod, do zero ao `.mcmod`, em poucos minutos |
| [ctx.md](ctx.md) | a referência da API: um grupo do `ctx` por seção, com assinatura e exemplo |
| [guia-de-mods.md](guia-de-mods.md) | o guia longo, em ordem de assunto (blocos, itens, mobs, telas, rede, geração do mundo...) |
| [empacotar.md](empacotar.md) | o `.mcmod`, o que entra e o que fica fora, como instalar, o que é privado |
| [versoes.md](versoes.md) | versões, dependências entre mods e a Release por tag |

## Em duas frases

Um mod é uma pasta com um `package.json` e um arquivo de entrada que exporta `register(ctx)`. O `ctx` é tudo o que
o jogo te empresta; o mesmo código roda no servidor e no navegador, e você diz o que roda onde pelas entradas.

## Onde procurar o quê

| Quero... | Leia |
| --- | --- |
| criar um bloco, um item, uma receita | [guia](guia-de-mods.md) seções 5 e 6, [ctx.blocks / ctx.items](ctx.md) |
| criar um mob | [guia](guia-de-mods.md) seção 21, [ctx.mobs](ctx.md) |
| criar um comando de chat | [guia](guia-de-mods.md) seção 19, [ctx.commands](ctx.md) |
| reagir a um evento | [guia](guia-de-mods.md) seção 9, [ctx.events](ctx.md) |
| desenhar uma tela ou uma HUD | [guia](guia-de-mods.md) seções 16 e 36, [ctx.ui / ctx.screens](ctx.md) |
| o painel de uma máquina (interruptores, botões, gráficos) | [ctx.screens](ctx.md), o esquema `controls` |
| falar entre servidor e navegador | [guia](guia-de-mods.md) seção 15, [ctx.net](ctx.md) |
| guardar dados | [guia](guia-de-mods.md) seções 30 e 31, [ctx.storage / ctx.attachments](ctx.md) |
| gerar mundo (minério, estrutura, bioma) | [guia](guia-de-mods.md) seção 22, [ctx.worldgen](ctx.md) |
| gases, clima, câmera, partículas | [ctx.gases / ctx.weather / ctx.client / ctx.particles](ctx.md) |
| os modificadores da tela "Criar mundo" | [guia](guia-de-mods.md) seção 47, [ctx.modifiers](ctx.md) |
| pôr som | [guia](guia-de-mods.md) seção 23, [ctx.sounds / ctx.audio](ctx.md) |
| traduzir o mod | [guia](guia-de-mods.md) seção 29, [ctx.lang](ctx.md) |
| empacotar e instalar | [empacotar.md](empacotar.md) |
| publicar uma versão | [versoes.md](versoes.md) |
