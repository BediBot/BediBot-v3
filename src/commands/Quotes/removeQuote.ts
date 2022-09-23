import {Args, PieceContext} from '@sapphire/framework';
import {Formatters, Message} from 'discord.js';

import {removeQuote} from '../../database/models/QuoteModel';
import {getSettings} from '../../database/models/SettingsModel';
import {BediEmbed} from '../../lib/BediEmbed';
import colors from '../../utils/colorUtil';

const {Command} = require('@sapphire/framework');

module.exports = class RemoveQuoteCommand extends Command {
    constructor(context: PieceContext) {
        super(context, {
            name: 'removeQuote',
            aliases: ['rq'],
            description: 'Removes a quote from an individual of your choice',
            preconditions: ['GuildOnly', 'QuotesEnabled', ['BotOwnerOnly', 'AdminOnly']],
            detailedDescription: 'removeQuote <quote> <author>`',
        });
    }

    async messageRun(message: Message, args: Args) {
        const {guildId, author} = message;
        const settingsData = await getSettings(guildId as string);

        const quote = await args.pick('string').catch(() => null);

        let quoteAuthor;

        quoteAuthor = await args.pick('user').catch(() => null);
        if (!quoteAuthor) quoteAuthor = await args.pick('string').catch(() => null);

        if (!quote || !quoteAuthor) {
            const embed = new BediEmbed()
                              .setColor(colors.ERROR)
                              .setTitle('Remove Quote Reply')
                              .setDescription(`Invalid Syntax!\n\nMake sure your command is in the format ${
                                  Formatters.inlineCode(settingsData.prefix + 'removeQuote <quote> <author>')}`);
            return message.reply({embeds: [embed]});
        }

        const response = await removeQuote(guildId as string, quote, quoteAuthor.toString());

        if (!response) {
            const embed =
                new BediEmbed().setColor(colors.ERROR).setTitle('Remove Quote Reply').setDescription('Quote not found!');
            return message.reply({embeds: [embed]});
        }

        const embed = new BediEmbed().setTitle('Remove Quote Reply');

        if (typeof quoteAuthor === 'string') {
            if (response.date)
                embed.setDescription(`Quote: ${Formatters.inlineCode(quote)}\nAuthor: ${
                    Formatters.inlineCode(quoteAuthor as string)}\nDate: <t:${
                    Math.round(response.date.valueOf() / 1000)}:f>\nRemoved By: ${author}`);
            else
                embed.setDescription(`Quote: ${Formatters.inlineCode(quote)}\nAuthor: ${
                    Formatters.inlineCode(quoteAuthor as string)}\nRemoved By: ${author}`);
        } else {
            if (response.date)
                embed.setDescription(`Quote: ${Formatters.inlineCode(quote)}\nAuthor: ${quoteAuthor}\nDate: <t:${
                    Math.round(response.date.valueOf() / 1000)}:f>\nRemoved By: ${author}`);
            else
                embed.setDescription(
                    `Quote: ${Formatters.inlineCode(quote)}\nAuthor: ${quoteAuthor}\nRemoved By: ${author}`);
        }

        return message.reply({embeds: [embed]});
    };
};