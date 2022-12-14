import {Args, PieceContext} from '@sapphire/framework';
import {Formatters, Message, MessageActionRow, MessageButton, MessageSelectMenu} from 'discord.js';
import moment from 'moment-timezone/moment-timezone-utils';

import {removeDueDate} from '../../database/models/DueDateModel';
import {getSettings} from '../../database/models/SettingsModel';
import {BediEmbed} from '../../lib/BediEmbed';
import colors from '../../utils/colorUtil';
import {didDateChange, isValidMonth} from '../../utils/dateUtil';
import logger from '../../utils/loggerUtil';
import {agenda, DUE_DATE_UPDATE_JOB_NAME, isValidTime} from '../../utils/schedulerUtil';

const {Command} = require('@sapphire/framework');

module.exports = class RemoveDueDateCommand extends Command {
    constructor(context: PieceContext) {
        super(context, {
            name: 'removeDueDate',
            aliases: ['rdd', 'removedue', 'removedate'],
            description: 'Removes a due date',
            preconditions: ['GuildOnly', 'DueDatesEnabled', 'DueDatesSetup'],
            detailedDescription: 'removeDueDate <title> <month> <day> <year> <time:optional>`' +
                '\nThe month can be long (January), short (Jan), or number (1).' +
                '\nYou can specify the (optional) time in most common time formats.',
        });
    }

    async messageRun(message: Message, args: Args) {
        const {guildId} = message;
        const settingsData = await getSettings(guildId as string);

        const title = await args.pick('string').catch(() => null);
        let month;
        month = await args.pick('integer').catch(() => null);
        if (!month) month = await args.pick('string').catch(() => null);
        const day = await args.pick('integer').catch(() => null);
        const year = await args.pick('integer').catch(() => null);
        const timeString = await args.rest('string').catch(() => null);

        if (!title || !month || !day || !year) return invalidSyntaxReply(message, settingsData);

        // If month is a string, parse it into a date and extract the month number. This works with full month and short
        // forms as well.
        month = isValidMonth(month);

        if (!month) return invalidSyntaxReply(message, settingsData);

        let date = new Date(year, month - 1, day);

        // Sometimes an invalid date can be created but the date will change e.g Feb 29, 2021 becomes Mar 1, 2021. This
        // doesn't let those cases through
        if (didDateChange(date, day, month, year)) {
            const embed =
                new BediEmbed().setColor(colors.ERROR).setTitle('Remove Due Date Reply').setDescription('That date is invalid!');
            return message.channel.send({embeds: [embed]});
        }

        const dateMoment = moment.tz(moment(date).format('YYYY-MM-DD'), settingsData.timezone);

        let dateOnly = true;

        if (timeString) {
            if (!isValidTime(timeString)) {
                const embed = new BediEmbed()
                                  .setColor(colors.ERROR)
                                  .setTitle('Remove Due Date Reply')
                                  .setDescription('That is not a valid time.');
                return message.reply({embeds: [embed]});
            }

            const job = await agenda.schedule(timeString, 'Dummy Job', {});
            const tempDate = job.attrs.nextRunAt;
            await job.remove();

            dateMoment.set({h: tempDate?.getHours(), m: tempDate?.getMinutes()});
            dateOnly = false;
        }

        if (dateMoment < moment().subtract(1, 'd') || (!dateOnly && dateMoment < moment())) {
            const embed = new BediEmbed()
                              .setColor(colors.ERROR)
                              .setTitle('Remove Due Date Reply')
                              .setDescription('You can not set a date/time in the past.');
            return message.reply({embeds: [embed]});
        }

        date = dateMoment.toDate();

        const typeSelectMenu = new MessageSelectMenu().setCustomId('typeSelect').setPlaceholder('Select a Type');
        for (const type of settingsData.types) {
            typeSelectMenu.addOptions([{
                label: type,
                value: type,
            }]);
        }
        const typeSelect = new MessageActionRow().addComponents(typeSelectMenu);

        const categorySelectMenu = new MessageSelectMenu().setCustomId('categorySelect').setPlaceholder('Select a Category');
        for (const category of settingsData.categories) {
            categorySelectMenu.addOptions([{
                label: category,
                value: category,
            }]);
        }
        const categorySelect = new MessageActionRow().addComponents(categorySelectMenu);

        const courseSelectMenu = new MessageSelectMenu().setCustomId('courseSelect').setPlaceholder('Select a Course');
        for (const course of settingsData.courses) {
            courseSelectMenu.addOptions([{
                label: course,
                value: course,
            }]);
        }
        const courseSelect = new MessageActionRow().addComponents(courseSelectMenu);

        const buttons = new MessageActionRow().addComponents([
            new MessageButton().setCustomId('dueDateSubmit').setLabel('Submit').setStyle('SUCCESS'),
            new MessageButton().setCustomId('dueDateCancel').setLabel('Cancel').setStyle('DANGER'),
        ]);

        const embed = new BediEmbed().setColor(colors.ACTION).setTitle('Remove Due Date Reply');

        if (dateOnly)
            embed.setDescription(`${Formatters.inlineCode(title)} due <t:${Math.round(date.valueOf() / 1000)}:D>`);
        else
            embed.setDescription(`${Formatters.inlineCode(title)} due <t:${Math.round(date.valueOf() / 1000)}:F>`);
        const reply = await message.reply({
            embeds: [embed],
            components: [typeSelect, categorySelect, courseSelect, buttons],
        });

        let type: string|null = null;
        let category: string|null = null;
        let course: string|null = null;

        const selectCollector = reply.createMessageComponentCollector({componentType: 'SELECT_MENU', time: 60000});
        selectCollector.on('collect', async interaction => {
            if (!interaction.isSelectMenu()) return;
            if (interaction.user.id != message.author.id) {
                const embed = new BediEmbed()
                                  .setTitle('Remove Due Date Reply')
                                  .setColor(colors.ERROR)
                                  .setDescription('You did not run this command');

                return interaction.reply({
                    ephemeral: true,
                    embeds: [embed],
                });
            }
            await interaction.deferUpdate();

            if (interaction.customId === 'typeSelect')
                type = interaction.values[0];
            else if (interaction.customId === 'categorySelect')
                category = interaction.values[0];
            else
                course = interaction.values[0];
        });

        selectCollector.on('end', async collected => {
            await reply
                .edit({
                    embeds: [embed],
                    components: [],
                })
                .catch(
                    () => logger.error(
                        `Unable to edit Remove Due Date Response in ${message.guild?.name}.` +
                        `Usually due to response being deleted by an admin.`));
        });

        const buttonCollector = reply.createMessageComponentCollector({componentType: 'BUTTON', time: 60000});
        buttonCollector.on('collect', async interaction => {
            if (!interaction.isButton()) return;
            if (interaction.user.id != message.author.id) {
                const embed = new BediEmbed()
                                  .setTitle('Remove Due Date Reply')
                                  .setColor(colors.ERROR)
                                  .setDescription('You did not run this command');

                return interaction.reply({
                    ephemeral: true,
                    embeds: [embed],
                });
            }

            if (interaction.customId === 'dueDateCancel') {
                embed.setColor(colors.ERROR).setDescription('Remove Due Date cancelled.');

                await reply.edit({
                    embeds: [embed],
                    components: [],
                });
                return interaction.deferUpdate();
            }

            if (!type || !category || !course) {
                const embed = new BediEmbed()
                                  .setTitle('Remove Due Date Reply')
                                  .setColor(colors.ERROR)
                                  .setDescription('Please select a due date, category, and course first');

                return interaction.reply({
                    ephemeral: true,
                    embeds: [embed],
                });
            }

            if (!(await removeDueDate(guildId as string, title, date, type, category, course, dateOnly))) {
                const embed =
                    new BediEmbed().setTitle('Remove Due Date Reply').setColor(colors.ERROR).setDescription('Due Date not found');

                return interaction.reply({
                    ephemeral: true,
                    embeds: [embed],
                });
            }

            const jobs = await agenda.jobs({
                name: DUE_DATE_UPDATE_JOB_NAME,
                'data.guildId': guildId,
                'data.category': category,
            });

            if (jobs.length != 0) {
                await jobs[0].run();
            }

            embed.setColor(colors.SUCCESS).setDescription(embed.description += ' has been removed');

            await reply.edit({
                embeds: [embed],
                components: [],
            });

            return interaction.deferUpdate();
        });
    }
};

/**
 * Replies with the invalid syntax message - This function is purely to avoid repeated code
 * @param message
 * @param settingsData
 * @returns {Promise<Message>}
 */
const invalidSyntaxReply = async (message: Message, settingsData: {prefix: string;}) => {
    const embed =
        new BediEmbed()
            .setColor(colors.ERROR)
            .setTitle('Add Due Date Reply')
            .setDescription(
                `Invalid Syntax!\n\nMake sure your command is in the format ${
                    Formatters.inlineCode(settingsData.prefix + 'removeDueDate <title> <month> <day> <year> <time:optional>')}`,
            );
    return message.channel.send({embeds: [embed]});
};