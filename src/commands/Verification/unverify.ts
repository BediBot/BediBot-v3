import {PieceContext} from '@sapphire/framework';
import {Message} from 'discord.js';
import {BediEmbed} from '../../lib/BediEmbed';
import colors from '../../utils/colorUtil';
import {getSettings} from '../../database/models/SettingsModel';
import {removeVerifiedUser, userVerifiedInGuild} from '../../database/models/VerifiedUserModel';

const {Command} = require('@sapphire/framework');

module.exports = class UnverifyCommand extends Command {
  constructor(context: PieceContext) {
    super(context, {
      name: 'unverify',
      description: 'Unverifies you from the server.',
      preconditions: ['GuildOnly'],
    });
  }

  async run(message: Message) {
    const {guild, guildId, author} = message;
    const settingsData = await getSettings(guildId as string);

    if (!settingsData.verificationEnabled) {
      const embed = new BediEmbed()
          .setColor(colors.ERROR)
          .setTitle('Unverify Reply')
          .setDescription('Verification is not enabled on this server!');
      return message.channel.send({
        embeds: [embed],
      });
    }

    if (!(await userVerifiedInGuild(author.id, guildId as string))) {
      const embed = new BediEmbed()
          .setColor(colors.ERROR)
          .setTitle('Unverify Reply')
          .setDescription(`You are not verified on this server! Run ${settingsData.prefix}verify if necessary.`);
      return message.channel.send({
        embeds: [embed],
      });
    }

    await removeVerifiedUser(author.id, guildId as string);
    const embed = new BediEmbed()
        .setTitle('Unverify Reply')
        .setDescription('You have been unverified on `' + guild!.name + '`');
    return message.author.send({
      embeds: [embed],
    });
  }
};