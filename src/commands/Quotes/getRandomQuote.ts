import {Args, PieceContext} from '@sapphire/framework';
import {Formatters, Message} from 'discord.js';

import {getRandomQuoteFromAuthor, getRandomQuoteInGuild} from '../../database/models/QuoteModel';
import {getSettings} from '../../database/models/SettingsModel';
import {BediEmbed} from '../../lib/BediEmbed';
import colors from '../../utils/colorUtil';

const {Command} = require('@sapphire/framework');

module.exports = class GetRandomQuoteCommand extends Command {
    constructor(context: PieceContext) {
        super(context, {
            name: 'getRandomQuote',
            aliases: ['grq'],
            description: 'Gets a random quote',
            preconditions: ['GuildOnly', 'QuotesEnabled'],
            detailedDescription: 'getRandomQuote <author:optional>`',
        });
    }

    async messageRun(message: Message, args: Args) {
        const {guildId} = message;
        const settingsData = await getSettings(guildId as string);

        let quoteAuthor;

        quoteAuthor = await args.pick('user').catch(() => null);
        if (!quoteAuthor) quoteAuthor = await args.pickResult('string');

        let quoteDoc;

        if (!quoteAuthor) {
            quoteDoc = await getRandomQuoteInGuild(guildId as string);
            quoteAuthor = quoteDoc?.name;
        } else {
            quoteDoc = await getRandomQuoteFromAuthor(guildId as string, quoteAuthor.toString());
        }

        if (!quoteDoc) {
            const embed =
                new BediEmbed().setColor(colors.ERROR).setTitle('Get Random Quote Reply').setDescription('No quotes found!');
            return message.reply({embeds: [embed]});
        }
        const embed = new BediEmbed().setTitle('Get Random Quote Reply');

        let quoteText = quoteDoc.quote;

        // If a quote contains a '<' then it probably contains a mention, so don't surround it with back ticks
        if (!quoteText.includes('<')) quoteText = Formatters.inlineCode(quoteText);

        if (quoteDoc.date) {
            if (typeof quoteAuthor === 'string') {
                embed.setDescription(`Quote: ${quoteText}\nAuthor: ${Formatters.inlineCode(quoteDoc.name)}\nDate: <t:${
                    Math.round(quoteDoc.date.valueOf() / 1000)}:f>`);
            } else {
                embed.setDescription(
                    `Quote: ${quoteText}\nAuthor: ${quoteDoc.name}\nDate: <t:${Math.round(quoteDoc.date.valueOf() / 1000)}:f>`);
            }
        } else {
            if (typeof quoteAuthor === 'string') {
                embed.setDescription(`Quote: ${quoteText}\nAuthor: ${Formatters.inlineCode(quoteDoc.name)}`);
            } else {
                embed.setDescription(`Quote: ${quoteText}\nAuthor: ${quoteDoc.name}`);
            }
        }
        return message.reply({embeds: [embed]});
    };
};