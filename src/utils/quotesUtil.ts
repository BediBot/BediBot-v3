// Take in response and set up collector
import {Formatters, Message, User} from 'discord.js';

import {addQuote} from '../database/models/QuoteModel';
import {getSettings} from '../database/models/SettingsModel';
import {BediEmbed} from '../lib/BediEmbed';

import colors from './colorUtil';
import logger from './loggerUtil';

export const TITLE_BEFORE_NUM_APPROVALS = 'Add Quote Reply - Approvals: ';

export const setupQuoteCollector =
    async (response: Message, quoteAuthor: User|string|null, author: User, quote: string, date: Date, guildId: string) => {
    let numApprovals = 0;
    let approvedByString = '';
    let displayQuote = quote;
    const settingsData = await getSettings(guildId);

    const collector = response.createMessageComponentCollector({componentType: 'BUTTON', time: 10000000});
    collector.on('collect', async interaction => {
        if (!interaction.isButton() || interaction.customId != 'QuoteApprove') return;

        await interaction.deferUpdate();

        collector.resetTimer();  // If someone interacts, reset the timer to give more time for approvals to come in

        const message = interaction.message;
        if (!(message instanceof Message)) return;

        let description = message.embeds[0].description;

        if (description?.includes(interaction.user.toString())) return;

        numApprovals++;

        approvedByString += ` ${interaction.user}`;

        const settingsData = await getSettings(interaction.guildId as string);

        if (numApprovals < settingsData.quoteApprovalsRequired) {
            const embed = new BediEmbed()
                              .setColor(colors.ACTION)
                              .setTitle(`Add Quote Reply - Approvals: ${numApprovals}/${settingsData.quoteApprovalsRequired}`);

            if (typeof quoteAuthor === 'string') {
                embed.setDescription(`Quote: ${displayQuote}\nAuthor: ${Formatters.inlineCode(quoteAuthor as string)}\nDate: <t:${
                    Math.round(date.valueOf() / 1000)}:f>\nSubmitted By: ${author}\nApproved By: ${approvedByString}`);
            } else {
                embed.setDescription(`Quote: ${displayQuote}\nAuthor: ${quoteAuthor}\nDate: <t:${
                    Math.round(date.valueOf() / 1000)}:f>\nSubmitted By: ${author}\nApproved By: ${approvedByString}`);
            }

            await message.edit({embeds: [embed]});
        } else {
            const embed = new BediEmbed().setColor(colors.SUCCESS).setTitle('Add Quote Reply - Approved');

            if (typeof quoteAuthor === 'string') {
                embed.setDescription(`Quote: ${displayQuote}\nAuthor: ${Formatters.inlineCode(quoteAuthor as string)}\nDate: <t:${
                    Math.round(date.valueOf() / 1000)}:f>\nSubmitted By: ${author}\nApproved By: ${approvedByString}`);
            } else {
                embed.setDescription(`Quote: ${displayQuote}\nAuthor: ${quoteAuthor}\nDate: <t:${
                    Math.round(date.valueOf() / 1000)}:f>\nSubmitted By: ${author}\nApproved By: ${approvedByString}`);
            }

            await addQuote(interaction.guildId as string, quote as string, quoteAuthor!.toString(), date);

            await message.edit({
                embeds: [embed],
                components: [],
            });
            collector.stop();
        }
    });
    collector.on('end', async interaction => {
        if (numApprovals < settingsData.quoteApprovalsRequired) {
            const embed = response.embeds[0];
            embed.setTitle('Add Quote Reply - Timed Out').setColor(colors.ERROR);

            await response
                .edit({
                    embeds: [embed],
                    components: [],
                })
                .catch(
                    () => logger.error(
                        `Unable to edit Add Quote Response in ${response.guild?.name}.` +
                        `Usually due to response being deleted by an admin.`));
        }
    });
}