import {Args, PieceContext} from '@sapphire/framework';
import {Formatters, GuildChannel, Message} from 'discord.js';
import moment from 'moment-timezone/moment-timezone-utils';

import {getSettings} from '../../database/models/SettingsModel';
import {BediEmbed} from '../../lib/BediEmbed';
import colors from '../../utils/colorUtil';
import {agenda, isValidDurationOrTime, isValidTime, UNLOCK_JOB_NAME} from '../../utils/schedulerUtil';

const {Command} = require('@sapphire/framework');

module.exports = class LockdownCommand extends Command {
    constructor(context: PieceContext) {
        super(context, {
            name: 'lockdown',
            aliases: ['ld'],
            description: 'Prevents a role from speaking in the channel',
            preconditions: ['GuildOnly', ['BotOwnerOnly', 'AdminOnly'], 'ManageRolesPerms'],
            detailedDescription: 'lockdown <role> <durationOrTime>`' +
                '\nYou can either specify how long the channel should be locked down, or what time it should be unlocked.' +
                '\nPossible units for duration are: seconds, minutes, hours, days, weeks, months (30 days), years (365 days).',
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
                              .setTitle('Lockdown Reply')
                              .setDescription(`Invalid Syntax!\n\nMake sure your command is in the format ${
                                  Formatters.inlineCode(settingsData.prefix + 'lockdown <role> <durationORtime:optional>')}`);
            return message.reply({embeds: [embed]});
        }

        // Check if the string is a valid role
        const role = await args.pick('role').catch(() => null);

        if (!role) {
            const embed =
                new BediEmbed().setColor(colors.ERROR).setTitle('Lockdown Reply').setDescription('That is not a valid role.');
            return message.reply({embeds: [embed]});
        }

        // This should never return due to the GuildOnly precondition
        if (!(message.channel instanceof GuildChannel)) return;

        await message.channel.permissionOverwrites.edit(role, {SEND_MESSAGES: false});

        const durationOrTime = await args.rest('string').catch(() => null);
        if (!durationOrTime) {
            const embed =
                new BediEmbed().setTitle('Lockdown Reply').setDescription(`Channel has been locked for ${role.toString()}`);
            return message.reply({embeds: [embed]});
        }

        // Check if duration they entered is valid -> see human-interval module for valid durations
        if (!isValidDurationOrTime(durationOrTime)) {
            const embed = new BediEmbed()
                              .setColor(colors.ERROR)
                              .setTitle('Lockdown Reply')
                              .setDescription('That is not a valid duration or time.');
            return message.reply({embeds: [embed]});
        }

        // Remove old jobs
        await agenda.cancel({
            'name': UNLOCK_JOB_NAME,
            'data.guildId': guildId,
            'data.channelId': channelId,
            'data.roleId': role.id,
        });

        // Schedule job
        const job = await agenda.schedule(durationOrTime, UNLOCK_JOB_NAME, {
            guildId: guildId,
            channelId: channelId,
            roleId: role.id,
            messageId: message.id,
        });

        if (isValidTime(durationOrTime)) {
            const localRunTime = job.attrs.nextRunAt;

            const nextRun = moment.tz(moment().format('YYYY-MM-DD'), settingsData.timezone);
            nextRun.set({h: localRunTime?.getHours(), m: localRunTime?.getMinutes()});
            if (nextRun <= moment()) nextRun.add(1, 'd');

            await job.schedule(nextRun.toDate()).save();
        }

        // Response message with next run time
        const nextRun = job.attrs.nextRunAt;
        const embed = new BediEmbed()
                          .setTitle('Lockdown Reply')
                          .setColor(colors.SUCCESS)
                          .setDescription(`Channel has been locked for ${role.toString()}\nUnlock scheduled <t:${
                              Math.round(nextRun!.valueOf() / 1000)}:R>`);
        return message.reply({embeds: [embed]});
    }
};
