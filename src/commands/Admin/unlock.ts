import {Args, PieceContext} from '@sapphire/framework';
import {Formatters, GuildChannel, Message} from 'discord.js';

import {getSettings} from '../../database/models/SettingsModel';
import {BediEmbed} from '../../lib/BediEmbed';
import colors from '../../utils/colorUtil';
import {agenda, UNLOCK_JOB_NAME} from '../../utils/schedulerUtil';

const {Command} = require('@sapphire/framework');

module.exports = class UnlockCommand extends Command {
    constructor(context: PieceContext) {
        super(context, {
            name: 'unlock',
            description: 'Allows a role to speak in the channel',
            preconditions: ['GuildOnly', ['BotOwnerOnly', 'AdminOnly'], 'ManageRolesPerms'],
            detailedDescription: 'unlock <role>`',
        });
    }

    async messageRun(message: Message, args: Args) {
        const {guildId, channelId} = message;
        const settingsData = await getSettings(guildId as string);

        // Check if they even inputted a string
        const roleString = await args.peek('string').catch(() => null);
        if (!roleString) {
            const embed = new BediEmbed()
                              .setColor(colors.ERROR)
                              .setTitle('Unlock Reply')
                              .setDescription(`Invalid Syntax!\n\nMake sure your command is in the format ${
                                  Formatters.inlineCode(settingsData.prefix + 'unlock <role>')}`);
            return message.reply({embeds: [embed]});
        }

        // Check if the string is a valid role
        const role = await args.pick('role').catch(() => null);
        if (!role) {
            const embed =
                new BediEmbed().setColor(colors.ERROR).setTitle('Unlock Reply').setDescription('That is not a valid role.');
            return message.reply({embeds: [embed]});
        }

        // This should never return due to the GuildOnly precondition
        if (!(message.channel instanceof GuildChannel)) return;

        await message.channel.permissionOverwrites.edit(role, {SEND_MESSAGES: true});

        // Remove old jobs
        await agenda.cancel({
            'name': UNLOCK_JOB_NAME,
            'data.guildId': guildId,
            'data.channelId': channelId,
            'data.roleId': role.id,
        });

        const embed = new BediEmbed()
                          .setTitle('Unlock Reply')
                          .setColor(colors.SUCCESS)
                          .setDescription(`Channel has been unlocked for ${role.toString()}`);
        return message.reply({embeds: [embed]});
    }
};
