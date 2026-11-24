// Mod __ID__ — entrada "server": roda SÓ NO SERVIDOR, e nada daqui é mandado ao navegador. Comandos, eventos e a
// parte de rede do servidor vivem aqui; conteúdo (blocos, itens, receitas) é recusado aqui, pertence ao main.
import { DedicatedServerModInitializer } from '../mineclaude-sdk.js';
import type { ServerModContext } from '../mineclaude-mod';

export default class Server extends DedicatedServerModInitializer {
  onInitializeServer(ctx: ServerModContext) {
    // Comando de chat + configuração. Os padrões ficam no package.json, em "mineclaude": { "config": { ... } };
    // o dono do servidor pode sobrescrevê-los. /__ID__:gema é sempre seu, mesmo se outro mod já tiver /gema.
    ctx.commands.register('gema', {
      help: '/gema — ganha uma gema',
      run(e) {
        e.player.give('__ID__:gem', Number(ctx.config.get('gemas_por_uso')));
        e.reply(String(ctx.config.get('mensagem')));
        e.player.playSound('__ID__:chime');
      },
    });

    // Evento: descomente para dar as boas-vindas.
    // ctx.events.on('playerJoin', (e) => e.player.message(`Bem-vindo, ${e.player.name}!`));

    // Rede: responde o 'ping' do navegador (src/client.ts desenha a resposta).
    ctx.net.on('ping', (player) => ctx.net.send(player, 'pong', { ok: true }));
  }
}
