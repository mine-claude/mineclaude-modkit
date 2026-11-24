// Mod __ID__ — entrada "main": roda NO SERVIDOR E NO NAVEGADOR. Todo o conteúdo (blocos, itens, mobs, receitas,
// sons, texturas) é registrado aqui, porque os ids têm de sair iguais nos dois lados.
// O guia: docs/guia-de-mods.md. Confira a qualquer momento com:  modkit check .
import { BlockType, ItemType, ModInitializer } from '../mineclaude-sdk.js';
import type { ModContext } from '../mineclaude-mod';

// Uma classe por item ou bloco. Os campos são as propriedades; os métodos on*/can* são os ganchos.
class Gema extends ItemType {
  name = 'Gema';
  texture = 'textures/__ID___gem.png'; // um arquivo 16x16 na pasta do mod (repinte à vontade)
}

class BlocoDeGema extends BlockType {
  name = 'Bloco de gema';
  solid = true;
  hardness = 1.5;
  tool = 'pickaxe';
  tiles = { all: '__ID__:gem_block' };
  sounds = { break: '__ID__:chime' };

  // Gancho: o clique direito. 'success' tratou, 'fail' recusou, 'pass' deixa passar.
  // `e.sneaking` diz se o clique veio agachado (a ação rápida, em vez de abrir o painel).
  onInteract(e: any) {
    e.player.message(e.sneaking ? 'A gema esquenta na mão.' : 'A gema brilha.');
    return 'success';
  }
}

export default class Mod extends ModInitializer {
  async onInitialize(ctx: ModContext) {
    ctx.items.register('gem', new Gema());

    // Textura pintada por código (t.S é o tamanho do tile; t.fill / t.set / t.speckle desenham nela).
    ctx.textures.paint('gem_block', (t) => {
      t.fill(['#2a7fb8', '#2f86c0', '#2679ad']);
      t.speckle(['#5fb8e8', '#9fd8f5'], 0.2);
      for (let i = 0; i < t.S; i++) {
        t.set(i, 0, '#174a6d'); t.set(i, t.S - 1, '#174a6d');
        t.set(0, i, '#174a6d'); t.set(t.S - 1, i, '#174a6d');
      }
    });

    // Som sintetizado (camadas de tons e ruído filtrado, como os sons do jogo).
    ctx.sounds.synth('chime', { layers: [
      { kind: 'tone', freq: 1200, end: 1800, dur: 0.15, type: 'triangle', gain: 0.1 },
      { kind: 'noise', freq: 3200, q: 3, dur: 0.06, gain: 0.08 },
    ] });

    ctx.blocks.register('gem_block', new BlocoDeGema());

    // Receitas: 9 gemas -> 1 bloco (na bancada), e 1 bloco -> 9 gemas (em qualquer lugar).
    ctx.recipes.add({ out: '__ID__:gem_block', n: 1, in: [['__ID__:gem', 9]], station: 'crafting_table' });
    ctx.recipes.add({ out: '__ID__:gem', n: 9, in: [['__ID__:gem_block', 1]] });
  }
}
