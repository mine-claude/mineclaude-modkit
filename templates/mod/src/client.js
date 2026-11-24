// @ts-check
// Mod __ID__ — entrada "client": roda SÓ NA PÁGINA DO NAVEGADOR. Tudo aqui é público (qualquer um lê), então
// segredos e regras ficam em src/server.js.
import { ClientModInitializer } from '../mineclaude-sdk.js';

export default class Client extends ClientModInitializer {
  /** @param {import('../mineclaude-mod').ClientModContext} ctx */
  onInitializeClient(ctx) {
    // O servidor responde 'ping' com 'pong' (src/server.js); mostre num painel.
    ctx.net.on('pong', () => ctx.ui.panel({ title: 'Pong!', body: [] }));
    // Mande o ping da sua própria interface:  ctx.net.send('ping', {});
  }
}
