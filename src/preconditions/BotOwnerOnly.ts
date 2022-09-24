import {Precondition} from '@sapphire/framework';
import {Message} from 'discord.js';

module.exports = class BotOwnerPrecondition extends Precondition {
    public messageRun(message: Message) {
        const BOT_OWNERS = process.env.BOT_OWNERS!.split(',');
        return BOT_OWNERS.includes(message.author.id) ? this.ok() : this.error({context: {silent: true}});
    }
}