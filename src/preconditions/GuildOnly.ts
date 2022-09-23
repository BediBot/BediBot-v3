import {Precondition} from '@sapphire/framework';
import {Message} from 'discord.js';

module.exports = class GuildPrecondition extends Precondition {
    public messageRun(message: Message) {
        if (message.guild) return this.ok();
        return this.error({message: 'This command can only be used in guilds.'});
    }
}