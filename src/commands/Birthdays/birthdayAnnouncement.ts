import {Args, PieceContext} from '@sapphire/framework';
import {Formatters, Message, MessageActionRow, MessageButton} from 'discord.js';
import moment from 'moment-timezone/moment-timezone-utils';

import {getSettings} from '../../database/models/SettingsModel';
import {BediEmbed} from '../../lib/BediEmbed';
import colors from '../../utils/colorUtil';
import logger from '../../utils/loggerUtil';
import {agenda, BIRTH_ANNOUNCE_JOB_NAME, isValidTime} from '../../utils/schedulerUtil';

const {Command} = require('@sapphire/framework');

module.exports = class BirthdayAnnouncementCommand extends Command {
    constructor(context: PieceContext) {
        super(context, {
            name: 'birthdayAnnouncement',
            aliases: ['ba'],
            description: 'Schedules Birthday Announcements in the Current Channel',
            preconditions: ['GuildOnly', ['BotOwnerOnly', 'AdminOnly']],
            detailedDescription: 'birthdayAnnouncement <time> <role:optional>`' +
                '\nYou can specify the announcement time in most common time formats.' +
                '\nIf you make a mistake, simply run the command again, only one birthday announcement can be scheduled per day.' +
                '\nIf you specify a role, people will receive the role for the duration of their birthday.',
        });
    }

    async messageRun(message: Message, args: Args) {
        const {guildId, channelId} = message;
        const settingsData = await getSettings(guildId as string);

        const announcementTime = await args.pick('string').catch(() => null);

        if (!announcementTime) {
            const embed = new BediEmbed()
                              .setColor(colors.ERROR)
                              .setTitle('Birthday Announcement Reply')
                              .setDescription(`Invalid Syntax!\n\nMake sure your command is in the format ${
                                  Formatters.inlineCode(settingsData.prefix + 'birthdayAnnouncement <time> <role:optional>')}`);
            return message.reply({embeds: [embed]});
        }

        if (!isValidTime(announcementTime)) {
            const embed =
                new BediEmbed()
                    .setColor(colors.ERROR)
                    .setTitle('Birthday Announcement Reply')
                    .setDescription('That is not a valid time. Remember that a time like "12 am" must be surrounded in quotes');
            return message.reply({embeds: [embed]});
        }

        // Check if they even inputted a string
        let role = null;
        const roleString = await args.peek('string').catch(() => null);
        if (roleString) {
            // Check if the string is a valid role
            const roleArg = await args.rest('role').catch(() => null);
            if (!roleArg) {
                const embed = new BediEmbed()
                                  .setColor(colors.ERROR)
                                  .setTitle('Birthday Announcement Reply')
                                  .setDescription('That is not a valid role.');
                return message.reply({embeds: [embed]});
            }
            role = roleArg;
        }

        await agenda.cancel({
            'name': BIRTH_ANNOUNCE_JOB_NAME,
            'data.guildId': guildId,
        });

        let data;

        if (role) {
            data = {
                guildId: guildId,
                channelId: channelId,
                autoDelete: false,
                roleId: role.id,
            };
        } else {
            data = {
                guildId: guildId,
                channelId: channelId,
                autoDelete: false,
            };
        }

        const job = await agenda.create(BIRTH_ANNOUNCE_JOB_NAME, data);

        await job.repeatEvery('one day', {skipImmediate: true}).schedule(announcementTime);

        const localRunTime = job.attrs.nextRunAt;

        const nextRun = moment.tz(moment().format('YYYY-MM-DD'), settingsData.timezone);
        nextRun.set({h: localRunTime?.getHours(), m: localRunTime?.getMinutes()});
        if (nextRun < moment()) nextRun.add(1, 'd');

        const buttonRow = new MessageActionRow().addComponents([
            new MessageButton().setCustomId('birthDeleteYes').setLabel('Yes').setStyle('SUCCESS'),
            new MessageButton().setCustomId('birthDeleteNo').setLabel('No').setStyle('DANGER'),
        ]);

        const embed =
            new BediEmbed()
                .setTitle('Birthday Announcement Reply')
                .setColor(colors.ACTION)
                .setDescription(`Birthday Announcements have been scheduled for <t:${
                    Math.round(nextRun.valueOf() / 1000)}:t>\n\nDo you want to auto delete each announcement after 24 hours?`);
        const reply = await message.reply({
            embeds: [embed],
            components: [buttonRow],
        });

        const buttonCollector = reply.createMessageComponentCollector({componentType: 'BUTTON', time: 15000});
        buttonCollector.on('collect', async interaction => {
            if (!interaction.isButton()) return;

            if (interaction.user.id != message.author.id) {
                const embed = new BediEmbed()
                                  .setTitle('Birthday Announcement Reply')
                                  .setColor(colors.ERROR)
                                  .setDescription('You did not run this command');

                return interaction.reply({
                    ephemeral: true,
                    embeds: [embed],
                });
            }

            if (interaction.customId === 'birthDeleteYes') {
                job.attrs.data!.autoDelete = true;
            }

            await job.schedule(nextRun.toDate()).save();

            const embed = new BediEmbed()
                              .setTitle('Birthday Announcement Reply')
                              .setColor(colors.SUCCESS)
                              .setDescription(
                                  `Birthday Announcements have been scheduled for <t:${Math.round(nextRun.valueOf() / 1000)}:t>`);

            await reply.edit({
                embeds: [embed],
                components: [],
            });
        });

        buttonCollector.on('end', async interaction => {
            if (buttonCollector.total === 0) {
                const embed = new BediEmbed()
                                  .setTitle('Birthday Announcement Reply')
                                  .setColor(colors.ERROR)
                                  .setDescription(`You took too long to choose. Announcements have not been scheduled.`);

                await reply
                    .edit({
                        embeds: [embed],
                        components: [],
                    })
                    .catch(
                        () => logger.error(
                            `Unable to edit Birthday Announcement Response in ${message.guild?.name}.` +
                            `Usually due to response being deleted by an admin.`));
            }
        });
    }
};
