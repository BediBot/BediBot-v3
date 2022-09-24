import { InteractionHandler, InteractionHandlerTypes, PieceContext } from '@sapphire/framework';
import type { ModalSubmitInteraction } from 'discord.js';
import {getSettings} from "../../database/models/SettingsModel";
import moment from "moment-timezone/moment-timezone-utils";
import {Formatters, Message, MessageActionRow, MessageButton, User} from "discord.js";
import {BediEmbed} from "../../lib/BediEmbed";
import colors from "../../utils/colorUtil";
import {setupQuoteCollector, TITLE_BEFORE_NUM_APPROVALS} from "../../utils/quotesUtil";

module.exports = class AddQuoteHandler extends InteractionHandler {
    public constructor(ctx: PieceContext, options: InteractionHandler.Options) {
        super(ctx, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.ModalSubmit
        });
    }
    public override parse(interaction: ModalSubmitInteraction) {
        if (interaction.customId !== 'addQuoteModal') return this.none();
        return this.some();
    }
    public async run(interaction: ModalSubmitInteraction) {
        //Get guildId from interaction
        const guildId = interaction.guildId;
        const settingsData = await getSettings(guildId as string);
        const date = moment().toDate();

        //As of now you cannot reply and run chatInput... only supporting message quotes for now
        let author: User = interaction.user;

        let quote: string = interaction.components[0].components[0].value
        let displayQuote = quote;
        if (!displayQuote.includes('<')) displayQuote = Formatters.inlineCode(quote);
        let quoteAuthor: string = interaction.components[1].components[0].value

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
            await setupQuoteCollector(response, quoteAuthor, author, quote, date, guildId as string);
        }
    }
}