import {Args, PieceContext} from '@sapphire/framework';
import {Formatters, Message} from 'discord.js';

import settingsModel, {getSettings} from '../../database/models/SettingsModel';
import {BediEmbed} from '../../lib/BediEmbed';
import colors from '../../utils/colorUtil';

const {Command} = require('@sapphire/framework');

module.exports = class SetEmailDomainCommand extends Command {
    constructor(context: PieceContext) {
        super(context, {
            name: 'setEmailDomain',
            aliases: ['sd', 'setdomain'],
            description: 'Changes the email domain used for verification',
            preconditions: ['GuildOnly', ['BotOwnerOnly', 'AdminOnly']],
            detailedDescription: 'setEmailDomain <domain>`',
        });
    }

    async messageRun(message: Message, args: Args) {
        const {guildId} = message;
        const settingsData = await getSettings(guildId as string);

        // Check if they even inputted a string
        const newValue = await args.peek('string').catch(() => null);
        if (!newValue) {
            const embed = new BediEmbed()
                              .setColor(colors.ERROR)
                              .setTitle('Set Email Domain Reply')
                              .setDescription(
                                  `Invalid Syntax!\n\nMake sure your command is in the format ` +
                                  `${Formatters.inlineCode(settingsData.prefix + 'setEmailDomain <domain>')}`);
            return message.reply({embeds: [embed]});
        }

        if (newValue.startsWith('@')) {
            const embed = new BediEmbed()
                              .setColor(colors.ERROR)
                              .setTitle('Set Email Domain Reply')
                              .setDescription('Your email domain should not include the @ symbol!');
            return message.reply({embeds: [embed]});
        }

        await settingsModel.updateOne({_id: guildId as string}, {emailDomain: newValue});

        const embed = new BediEmbed()
                          .setTitle('Set Email Domain Reply')
                          .setColor(colors.SUCCESS)
                          .setDescription(`The email domain has been updated to ${Formatters.inlineCode(newValue)}`);
        return message.reply({embeds: [embed]});
    };
};