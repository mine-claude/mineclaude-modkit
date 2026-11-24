// Uma linha na HUD, desenhada pelo navegador. Só tem a entrada "client", então o mod é `environment: "client"`:
// o servidor não roda nada dele, e o mod funciona em qualquer servidor, mesmo num que não o tenha instalado.
//
// Tudo aqui é público: qualquer jogador lê este arquivo. Regra e segredo ficam no servidor.
import { ClientModInitializer } from '../mineclaude-sdk.js';
import type { ClientModContext } from '../mineclaude-mod';

export default class Client extends ClientModInitializer {
  onInitializeClient(ctx: ClientModContext) {
    ctx.ui.hud({
      id: 'hora',
      place: 'topo-direita',
      render: () => [`hora do mundo: ${Math.floor(ctx.client.world.timeOfDay() * 24)}h`],
    });
  }
}
