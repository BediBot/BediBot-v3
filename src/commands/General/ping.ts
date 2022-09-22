import {ApplyOptions} from '@sapphire/decorators';
import {Command} from '@sapphire/framework';
import {reply, send} from '@sapphire/plugin-editable-commands';
import {Message} from 'discord.js';

import {BediEmbed} from '../../lib/BediEmbed';
import logger from '../../utils/loggerUtil';

const initialEmbed = new BediEmbed().setTitle('Ping?');

@ApplyOptions
<Command.Options>({description: 'Send back the ping of the bot'}) export class UserCommand extends Command {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand({name: this.name, description: this.description});
        registry.registerContextMenuCommand({name: this.name, type: 'MESSAGE'});
        registry.registerContextMenuCommand({name: this.name, type: 'USER'});
    }

    public async messageRun(message: Message) {
        logger.warn(this.name);
        const msg = await reply(message, {
            embeds: [initialEmbed],
        });

        const editEmbed = new BediEmbed().setTitle('Pong!').setDescription(
            `Bot Latency ${Math.round(this.container.client.ws.ping)}ms. API Latency ${
                (msg.editedTimestamp || msg.createdTimestamp) - (message.editedTimestamp || message.createdTimestamp)}ms.`);

        return send(message, {embeds: [editEmbed]});
    }

    public async chatInputRun(interaction: Command.ChatInputInteraction) {
        const msg = await interaction.reply({embeds: [initialEmbed], fetchReply: true});

        const createdTime = msg instanceof Message ? msg.createdTimestamp : Date.parse(msg.timestamp);

        const editEmbed = new BediEmbed().setTitle('Pong!').setDescription(`Bot Latency ${
            Math.round(this.container.client.ws.ping)}ms. API Latency ${createdTime - interaction.createdTimestamp}ms.`);

        return await interaction.editReply({embeds: [editEmbed]});
    }

    public async contextMenuRun(interaction: Command.ContextMenuInteraction) {
        const msg = await interaction.reply({embeds: [initialEmbed], fetchReply: true});

        const createdTime = msg instanceof Message ? msg.createdTimestamp : Date.parse(msg.timestamp);

        const editEmbed = new BediEmbed().setTitle('Pong!').setDescription(`Bot Latency ${
            Math.round(this.container.client.ws.ping)}ms. API Latency ${createdTime - interaction.createdTimestamp}ms.`);

        return await interaction.editReply({embeds: [editEmbed]});
    }
}