import {Args, Command, PieceContext} from '@sapphire/framework';
import {Formatters, Message, TextBasedChannel, TextChannel} from 'discord.js';

import {getSettings} from '../../database/models/SettingsModel';
import {BediEmbed} from '../../lib/BediEmbed';
import colors from '../../utils/colorUtil';

module.exports = class SayCommand extends Command {
    constructor(context: PieceContext) {
        super(context, {
            name: 'say',
            description: 'Sends a message from the bot',
            preconditions: ['GuildOnly', ['BotOwnerOnly', 'AdminOnly']],
            detailedDescription: 'say <title> <body> <#channel:optional>`',
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand({
            name: this.name,
            description: this.description,
            options: [
                {name: 'title', description: 'Title of the message', type: 'STRING', required: true},
                {name: 'body', description: 'Body of the message', type: 'STRING', required: true},
                {name: 'channel', description: 'Channel to send the message to', type: 'CHANNEL', required: false}
            ]
        });
    }

    async chatInputRun(interaction: Command.ChatInputInteraction) {
        const {guildId} = interaction;
        const settingsData = await getSettings(guildId as string);

        // Pick the title and content from args, return error if invalid
        const sayTitle = interaction.options.getString('title', true);
        const sayContent = interaction.options.getString('body', true);

        // Parse channel args
        let channel: TextBasedChannel|null = interaction.options.getChannel('channel') as TextBasedChannel | null;
        if (!channel) {
            channel = interaction.channel;
        }

        let descriptionToSend = sayContent;
        const BOT_OWNERS = process.env.BOT_OWNERS!.split(',');
        if (!BOT_OWNERS.includes(interaction.user.id)) {
            // Append the user's @ to the message so that $say messages aren't mistaken for actual bot messages
            descriptionToSend = descriptionToSend!.concat('\n\nMessage created by ' + interaction.user);
        }

        // Send the say command
        const embed = new BediEmbed().setTitle(sayTitle).setDescription(descriptionToSend);
        channel!.send({embeds: [embed]});

        const replyEmbed = new BediEmbed().setTitle('Say Reply').setDescription('Your message has been sent!');

        return interaction.reply({embeds: [replyEmbed], ephemeral: true});
    }

    async messageRun(message: Message, args: Args) {
        const {guildId} = message;
        const settingsData = await getSettings(guildId as string);

        // Pick the title and content from args, return error if invalid
        const sayTitle = await args.pick('string').catch(() => null);
        const sayContent = await args.pick('string').catch(() => null);
        if (!sayTitle || !sayContent) {
            const embed = new BediEmbed()
                              .setColor(colors.ERROR)
                              .setTitle('Say Reply')
                              .setDescription(`Invalid Syntax!\n\nMake sure your command is in the format ${
                                  Formatters.inlineCode(settingsData.prefix + 'say <title> <body> <#channel:optional>')}`);
            return message.reply({embeds: [embed]});
        }

        // Parse channel args
        let channel = message.channel;
        if (!args.finished) {
            const channelArg = await args.pick('guildTextChannel').catch(() => null);

            if (!channelArg) {
                const embed = new BediEmbed()
                                  .setColor(colors.ERROR)
                                  .setTitle('Say Reply')
                                  .setDescription(`Invalid Syntax!\n\nMake sure your command is in the format ${
                                      Formatters.inlineCode(settingsData.prefix + 'say <title> <body> <#channel:optional>')}`);
                return message.reply({embeds: [embed]});
            }
            channel = channelArg;
        }

        let descriptionToSend = sayContent;
        const BOT_OWNERS = process.env.BOT_OWNERS!.split(',');
        if (!BOT_OWNERS.includes(message.author.id)) {
            // Append the user's @ to the message so that $say messages aren't mistaken for actual bot messages
            descriptionToSend = descriptionToSend.concat('\n\nMessage created by ' + message.author);
        }

        // Delete the original message
        await message.delete();

        // Send the say command
        const embed = new BediEmbed().setTitle(sayTitle).setDescription(descriptionToSend);
        return channel.send({embeds: [embed]});
    }
};