import {Precondition} from '@sapphire/framework';
import {Message, Permissions} from 'discord.js';

module.exports = class AdminPrecondition extends Precondition {
    public messageRun(message: Message) {
        if (message.guild && message.member!.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) return this.ok();
        return this.error({message: 'Only an admin is allowed to execute this command.'});
    }
}