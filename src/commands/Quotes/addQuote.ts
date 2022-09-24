import {Args, Command, PieceContext, Result, UserError} from '@sapphire/framework';
import {Formatters, Message, MessageActionRow, MessageButton, Modal, ModalActionRowComponent, Snowflake, TextInputComponent, User} from 'discord.js';
import moment from 'moment-timezone/moment-timezone-utils';

import {MAX_QUOTE_LENGTH} from '../../config';
import {addQuote} from '../../database/models/QuoteModel';
import {getSettings} from '../../database/models/SettingsModel';
import {BediEmbed} from '../../lib/BediEmbed';
import colors from '../../utils/colorUtil';
import logger from '../../utils/loggerUtil';
import {setupQuoteCollector, TITLE_BEFORE_NUM_APPROVALS} from '../../utils/quotesUtil';

module.exports = class AddQuoteCommand extends Command {
    constructor(context: PieceContext) {
        super(context, {
            name: 'addQuote',
            aliases: ['aq', 'addq', 'aquote'],
            description: 'Adds a quote from an individual of your choice.',
            preconditions: ['GuildOnly', 'QuotesEnabled'],
            detailedDescription: 'addQuote <quote> <author>`' +
                '\nThis command supports both regular names and mentions for the author parameter.',
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand({
            name: this.name,
            description: this.description,
            options: [
                {
                    name: 'quote',
                    description: 'The quote you want to add',
                    type: 'STRING',
                    required: true,
                },
                {
                    name: 'author',
                    description: 'The author of the quote',
                    type: 'STRING',
                    required: true,
                },
            ],
        });

        registry.registerContextMenuCommand({name: 'Add Quote', type: 'MESSAGE'});
    }

    public async chatInputRun(interaction: Command.ChatInputInteraction) {
        // Get guildId from interaction
        const guildId = interaction.guildId;
        const settingsData = await getSettings(guildId as string);
        const date = moment().toDate();

        // As of now you cannot reply and run chatInput... only supporting message quotes for now
        let author: User = interaction.user;
        let quote: string = interaction.options.getString('quote')!;
        let displayQuote = quote;
        if (!displayQuote.includes('<')) displayQuote = Formatters.inlineCode(quote);
        let quoteAuthor: string = interaction.options.getString('author')!;

        const embed = new BediEmbed()
                          .setColor(colors.ACTION)
                          .setTitle(`${TITLE_BEFORE_NUM_APPROVALS}0/${settingsData.quoteApprovalsRequired}`);

        if (typeof quoteAuthor === 'string') {
            embed.setDescription(`Quote: ${displayQuote}\nAuthor: ${Formatters.inlineCode(quoteAuthor as string)}\nDate: <t:${
                Math.round(date.valueOf() / 1000)}:f>\nSubmitted By: ${author}\nApproved By:`);
        } else {
            embed.setDescription(`Quote: ${displayQuote}\nAuthor: ${quoteAuthor}\nDate: <t:${
                Math.round(date.valueOf() / 1000)}:f>\nSubmitted By: ${author}\nApproved By:`);
        }

        const row = new MessageActionRow().addComponents(
            new MessageButton().setCustomId('QuoteApprove').setLabel('Approve').setStyle('SUCCESS'),
        );

        await interaction.reply({
            embeds: [embed],
            components: [row],
        });

        const response = await interaction.fetchReply();

        if (response instanceof Message) {
            await setupQuoteCollector(response, quoteAuthor, author, quote, date, guildId as string);
        }
    }

    public async contextMenuRun(interaction: Command.ContextMenuInteraction) {
        let quote: string = await interaction.channel!.messages.fetch(interaction.targetId).then((message) => message.content);

        const quoteInput = new TextInputComponent()
                               .setCustomId('quoteInput')
                               .setLabel('What is the quote?')
                               .setStyle('PARAGRAPH')
                               .setValue(quote)
                               .setMaxLength(MAX_QUOTE_LENGTH);

        const authorInput = new TextInputComponent().setCustomId('authorInput').setLabel('Who is the author?').setStyle('SHORT');

        const actionRow1 = new MessageActionRow<ModalActionRowComponent>().addComponents(quoteInput);
        const actionRow2 = new MessageActionRow<ModalActionRowComponent>().addComponents(authorInput);

        const modal = new Modal().setTitle('Add Quote').setCustomId('addQuoteModal').addComponents(actionRow1, actionRow2);

        await interaction.showModal(modal);
    }

    async messageRun(message: Message, args: Args) {
        const {guildId, author} = message;
        const settingsData = await getSettings(guildId as string);

        let quote: string|null;
        let quoteAuthor: User|string|null;

        if (message.reference) {
            // This implies that this is a reply
            quote = (await message.channel.messages.fetch(message.reference.messageId as Snowflake)).content;
            if (quote.length === 0) {
                const embed = new BediEmbed()
                                  .setColor(colors.ERROR)
                                  .setTitle('Add Quote Reply')
                                  .setDescription(
                                      `Please ensure that the message you're replying to contains text content (i.e. No embeds)`);
                return message.reply({embeds: [embed]});
            }
            quoteAuthor = await args.pick('user').catch(() => null);
            if (!quoteAuthor) quoteAuthor = await args.pick('string').catch(() => null);

            if (!quoteAuthor) {
                const embed = new BediEmbed()
                                  .setColor(colors.ERROR)
                                  .setTitle('Add Quote Reply')
                                  .setDescription(`Invalid Syntax!\n\nMake sure your command is in the format ${
                                      Formatters.inlineCode(settingsData.prefix + 'addQuote <author>')}`);
                return message.reply({embeds: [embed]});
            }
        } else {
            quote = await args.pick('string').catch(() => null);
            quoteAuthor = await args.pick('user').catch(() => null);
            if (!quoteAuthor) quoteAuthor = await args.pick('string').catch(() => null);

            if (!quote || !quoteAuthor) {
                const embed = new BediEmbed()
                                  .setColor(colors.ERROR)
                                  .setTitle('Add Quote Reply')
                                  .setDescription(`Invalid Syntax!\n\nMake sure your command is in the format ${
                                      Formatters.inlineCode(settingsData.prefix + 'addQuote <quote> <author>')}`);
                return message.reply({embeds: [embed]});
            }
        }

        if (quote.length === 0) {
            const embed = new BediEmbed()
                              .setColor(colors.ERROR)
                              .setTitle('Add Quote Reply')
                              .setDescription('You cannot submit an empty quote.');
            return message.reply({embeds: [embed]});
        }

        if (quote.length > MAX_QUOTE_LENGTH) {
            const embed = new BediEmbed()
                              .setColor(colors.ERROR)
                              .setTitle('Add Quote Reply')
                              .setDescription('Quote is too long! Please submit a quote that is 1000 characters or fewer.');
            return message.reply({embeds: [embed]});
        }
        const embed = new BediEmbed()
                          .setColor(colors.ACTION)
                          .setTitle(`${TITLE_BEFORE_NUM_APPROVALS}0/${settingsData.quoteApprovalsRequired}`);

        const date = moment().toDate();

        // displayQuote will be the string that is displayed, as this will have different formatting depending on quote
        // content
        let displayQuote = quote;
        if (!displayQuote.includes('<')) displayQuote = Formatters.inlineCode(quote);

        if (typeof quoteAuthor === 'string') {
            embed.setDescription(`Quote: ${displayQuote}\nAuthor: ${Formatters.inlineCode(quoteAuthor as string)}\nDate: <t:${
                Math.round(date.valueOf() / 1000)}:f>\nSubmitted By: ${author}\nApproved By:`);
        } else {
            embed.setDescription(`Quote: ${displayQuote}\nAuthor: ${quoteAuthor}\nDate: <t:${
                Math.round(date.valueOf() / 1000)}:f>\nSubmitted By: ${author}\nApproved By:`);
        }

        const row = new MessageActionRow().addComponents(
            new MessageButton().setCustomId('QuoteApprove').setLabel('Approve').setStyle('SUCCESS'),
        );

        const response = await message.reply({
            embeds: [embed],
            components: [row],
        });

        await setupQuoteCollector(response, quoteAuthor, author, quote, date, guildId as string);
    }
};