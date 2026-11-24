// Um bloco e a receita dele. Conteúdo vive na entrada "main", que roda nos DOIS lados (servidor e navegador):
// os ids têm de sair iguais nos dois, senão o jogo recusa a entrada do jogador.
//
// A textura é pintada por código: nenhum arquivo de imagem, arte original de graça.
import { BlockType, ModInitializer } from '../mineclaude-sdk.js';
import type { ModContext } from '../mineclaude-mod';

class Lampada extends BlockType {
  name = 'Lâmpada de pedra';
  solid = true;
  hardness = 0.8;
  tool = 'pickaxe';
  light = 14; // 0 a 15: quanto o bloco ilumina em volta
  tiles = { all: 'bloco_lampada:lamp' };
}

export default class Mod extends ModInitializer {
  onInitialize(ctx: ModContext) {
    ctx.textures.paint('lamp', (t) => {
      t.fill(['#4a4a52', '#52525a', '#45454d']);
      // um miolo quente no meio, com borda
      for (let y = 4; y < t.S - 4; y++) for (let x = 4; x < t.S - 4; x++) t.set(x, y, '#ffd98a');
      for (let i = 4; i < t.S - 4; i++) {
        t.set(i, 4, '#c79a4a'); t.set(i, t.S - 5, '#c79a4a');
        t.set(4, i, '#c79a4a'); t.set(t.S - 5, i, '#c79a4a');
      }
    });
    ctx.blocks.register('lamp', new Lampada());
    ctx.recipes.add({ out: 'bloco_lampada:lamp', n: 1, in: [['mineclaude:stone', 4], ['mineclaude:coal', 1]], station: 'crafting_table' });
  }
}
