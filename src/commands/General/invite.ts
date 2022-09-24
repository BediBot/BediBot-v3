import {Command, PieceContext} from '@sapphire/framework';
import {reply} from '@sapphire/plugin-editable-commands';
import {CommandInteraction, Formatters, Message, MessageActionRow, MessageButton} from 'discord.js';

import {BediEmbed} from '../../lib/BediEmbed';

const embed =
    new BediEmbed()
        .setTitle('Invite Reply')
        .setDescription(
            `Click the link below to invite BediBot to your own server!` +
            `\n\nEnsure that you have a ${Formatters.inlineCode('SYSTEM MESSAGES CHANNEL')} enabled!` +
            `\n\nThis can be found under ${Formatters.inlineCode('Server Settings -> Overview -> System Messages Channel')}`);

const row = new MessageActionRow().addComponents(
    new MessageButton().setLabel('Invite').setStyle('LINK').setURL(
        'https://discord.com/oauth2/authorize?client_id=873657761391587429&permissions=8&scope=bot%20applications.commands'),
);

module.exports = class InviteCommand extends Command {
    constructor(context: PieceContext) {
        super(context, {
            name: 'invite',
            aliases: ['inv'],
            description: 'Displays a link that will allow you to invite BediBot to your own server',
            detailedDescription: 'invite`',
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand({name: this.name, description: this.description});
    }

    async chatInputRun(interaction: CommandInteraction) {
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