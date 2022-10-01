import {Command, PieceContext} from '@sapphire/framework';
import {reply} from '@sapphire/plugin-editable-commands';
import {Formatters, Message} from 'discord.js';

import {BediEmbed} from '../../lib/BediEmbed';
import {numGuilds, numUsers} from '../../utils/discordUtil';

module.exports = class StatsCommand extends Command {
    constructor(context: PieceContext) {
        super(context, {
            name: 'stats',
            aliases: ['stat'],
            description: 'Sends some statistics about the bot',
            detailedDescription: 'stats`',
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand({name: this.name, description: this.description});
    }

    async chatInputRun(interaction: Command.ChatInputInteraction) {
        return interaction.reply({embeds: [await this.getEmbed()], ephemeral: true});
    }

    async messageRun(message: Message) {
        return reply(message, {embeds: [await this.getEmbed()]});
    }

    private async getEmbed() {
        return new BediEmbed()
            .setTitle('Stats Reply')
            .setDescription(`Guild Count: ${Formatters.inlineCode(String(numGuilds(this.container.client)))}\nMember Count: ${
                Formatters.inlineCode(String(await numUsers(this.container.client)))}`);
    }
};