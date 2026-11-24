// Mod __ID__ — entrada "client": roda SÓ NA PÁGINA DO NAVEGADOR. Tudo aqui é público (qualquer um lê), então
// segredos e regras ficam em src/server.ts.
import { ClientModInitializer } from '../mineclaude-sdk.js';
import type { ClientModContext } from '../mineclaude-mod';

export default class Client extends ClientModInitializer {
  onInitializeClient(ctx: ClientModContext) {
    // O servidor responde 'ping' com 'pong' (src/server.ts); mostre num painel.
    ctx.net.on('pong', () => ctx.ui.panel({ title: 'Pong!', body: [] }));
    // Mande o ping da sua própria interface:  ctx.net.send('ping', {});
  }
}
