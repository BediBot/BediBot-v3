import {Command, PieceContext} from '@sapphire/framework';
import {reply} from '@sapphire/plugin-editable-commands';
import {Message, MessageActionRow, MessageButton} from 'discord.js';

import {BediEmbed} from '../../lib/BediEmbed';

const embed =
    new BediEmbed()
        .setTitle('GitHub Reply')
        .setDescription(
            'BediBot is an open source project managed by Tron 2025s. If you would like to contribute (or star!), head over to our repository.');

const row = new MessageActionRow().addComponents(
    new MessageButton().setLabel('GitHub').setStyle('LINK').setURL('https://github.com/BediBot/BediBot-v3'),
);

module.exports = class GithubCommand extends Command {
    constructor(context: PieceContext) {
        super(context, {
            name: 'github',
            aliases: ['git'],
            description: 'Shows the GitHub Repository for BediBot',
            detailedDescription: 'github`',
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand({name: this.name, description: this.description});
    }

    async chatInputRun(interaction: Command.ChatInputInteraction) {
        return interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true,
        });
    }

    async messageRun(message: Message) {
        return reply(message, {
            embeds: [embed],
            components: [row],
        });
    };
};