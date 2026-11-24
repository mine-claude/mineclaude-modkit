// O menor mod possível: um comando de chat, e nada mais.
//
// Só tem a entrada "server", então o mod é `environment: "server"`: o navegador nem sabe que ele existe.
// Nenhum conteúdo é registrado aqui (bloco, item e receita só valem numa entrada "main").
import { DedicatedServerModInitializer } from '../mineclaude-sdk.js';
import type { ServerModContext } from '../mineclaude-mod';

export default class Server extends DedicatedServerModInitializer {
  onInitializeServer(ctx: ServerModContext) {
    ctx.commands.register('ola', {
      help: '/ola — diz oi',
      run(e) { e.reply(`Olá, ${e.player.name}!`); },
    });
  }
}
