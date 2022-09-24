import type {Events} from '@sapphire/framework';
import {Listener} from '@sapphire/framework';
import {MessageReaction, User, Permissions} from 'discord.js';
import {BediEmbed} from '../../lib/BediEmbed';
import {getSettings} from '../../database/models/SettingsModel';
import colors from '../../utils/colorUtil';

module.exports = class PinReactionListener extends Listener<typeof Events.MessageReactionAdd> {
    public async run(messageReaction: MessageReaction, user: User) {
        const {message} = messageReaction;
        const {guild, guildId} = message;

        const settingsData = await getSettings(guildId as string);

        if (!guild || messageReaction.emoji.name != settingsData.pinEmoji) return;

        if (!settingsData.pinsEnabled) {
            const embed = new BediEmbed()
                              .setColor(colors.ERROR)
                              .setTitle('Pin Reply')
                              .setDescription('Sorry, `' + guild.name + '` does not have reaction pinning enabled');
            return user.send({embeds: [embed]});
        }


        if (!guild.me?.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)) {
            const embed = new BediEmbed()
                              .setTitle('Pin Reply')
                              .setColor(colors.ERROR)
                              .setDescription('BediBot does not have the required permissions: `MANAGE MESSAGES`');
            return message.reply({embeds: [embed]});
        }

        return messageReaction.message.pin();
    }
}