import {Precondition} from '@sapphire/framework';
import {CommandInteraction, ContextMenuInteraction, Message} from 'discord.js';

module.exports = class GuildPrecondition extends Precondition {
    public messageRun(message: Message) {
        if (message.guild) return this.ok();
        return this.error({message: 'This command can only be used in guilds.'});
    }

    public chatInputRun(interaction: CommandInteraction) {
        if (interaction.guild) return this.ok();
        return this.error({message: 'This command can only be used in guilds.'});
    }

    public contextMenuRun(interaction: ContextMenuInteraction) {
        if (interaction.guild) return this.ok();
        return this.error({message: 'This command can only be used in guilds.'});
    }
}