import {Args, PieceContext, Result, UserError} from '@sapphire/framework';
import {Formatters, Message, MessageActionRow, MessageButton, Snowflake, User} from 'discord.js';
import moment from 'moment-timezone/moment-timezone-utils';
import {Command} from '@sapphire/framework';

import {MAX_QUOTE_LENGTH} from '../../config';
import {addQuote} from '../../database/models/QuoteModel';
import {getSettings} from '../../database/models/SettingsModel';
import {BediEmbed} from '../../lib/BediEmbed';
import colors from '../../utils/colorUtil';
import logger from '../../utils/loggerUtil';

const initialEmbed = new BediEmbed().setTitle('Ping?');

const TITLE_BEFORE_NUM_APPROVALS = 'Add Quote Reply - Approvals: ';

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

    public async chatInputRun(interaction: Command.ChatInputInteraction)
    {
        //Get guildId from interaction
        const guildId = interaction.guildId;
        const settingsData = await getSettings(guildId as string);
        const date = moment().toDate();

        //As of now you cannot reply and run chatInput... only supporting message quotes for now
        let author: User = interaction.user;
        let quote: string = interaction.options.getString('quote')!;
        let displayQuote = quote;
        if (!displayQuote.includes('<')) displayQuote = Formatters.inlineCode(quote);
        let quoteAuthor: string = interaction.options.getString('author')!;

        const embed = new BediEmbed()
                          .setColor(colors.ACTION)
                          .setTitle(`${TITLE_BEFORE_NUM_APPROVALS}0/${settingsData.quoteApprovalsRequired}`);

        if (typeof quoteAuthor === 'string') {
            embed.setDescription(
                `Quote: ${displayQuote}\nAuthor: ${Formatters.inlineCode(quoteAuthor as string)}\nDate: <t:${
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
            await this.setupQuoteCollector(response, quoteAuthor, author, quote, date, guildId as string);
        }
    }

    public async contextMenuRun(interaction: Command.ContextMenuInteraction) {

        //Note: need to see if we can add arguments to context menu run?
        const msg = await interaction.reply({embeds: [initialEmbed], fetchReply: true});

        const editEmbed = new BediEmbed().setTitle('Test!').setDescription(`test`);

        return await interaction.editReply({embeds: [editEmbed]});

    }

    async messageRun(message: Message, args: Args) {
        const {guild, guildId, author} = message;
        const settingsData = await getSettings(guildId as string);

        let quote: string| null;
        let quoteAuthor: User | string | null;

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
            embed.setDescription(
                `Quote: ${displayQuote}\nAuthor: ${Formatters.inlineCode(quoteAuthor as string)}\nDate: <t:${
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

        await this.setupQuoteCollector(response, quoteAuthor, author, quote, date, guildId as string);
    }

    //Take in response and set up collector
    private async setupQuoteCollector(response: Message, quoteAuthor: User | string | null, author: User, quote: string, date: Date, guildId: string) {
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
                const embed =
                    new BediEmbed()
                        .setColor(colors.ACTION)
                        .setTitle(`Add Quote Reply - Approvals: ${numApprovals}/${settingsData.quoteApprovalsRequired}`);

                if (typeof quoteAuthor === 'string') {
                    embed.setDescription(
                        `Quote: ${displayQuote}\nAuthor: ${Formatters.inlineCode(quoteAuthor as string)}\nDate: <t:${
                            Math.round(date.valueOf() / 1000)}:f>\nSubmitted By: ${author}\nApproved By: ${approvedByString}`);
                } else {
                    embed.setDescription(`Quote: ${displayQuote}\nAuthor: ${quoteAuthor}\nDate: <t:${
                        Math.round(date.valueOf() / 1000)}:f>\nSubmitted By: ${author}\nApproved By: ${approvedByString}`);
                }

                await message.edit({embeds: [embed]});
            } else {
                const embed = new BediEmbed().setColor(colors.SUCCESS).setTitle('Add Quote Reply - Approved');

                if (typeof quoteAuthor === 'string') {
                    embed.setDescription(
                        `Quote: ${displayQuote}\nAuthor: ${Formatters.inlineCode(quoteAuthor as string)}\nDate: <t:${
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
};
