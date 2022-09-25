import type {Events, MessageCommandSuccessPayload} from '@sapphire/framework';
import { Listener, UserError } from '@sapphire/framework';
import {capFirstLetter} from "../../../utils/stringsUtil";
import {BediEmbed} from "../../../lib/BediEmbed";
import colors from "../../../utils/colorUtil";

module.exports = class CommandSuccessListener extends Listener<typeof Events.MessageCommandSuccess> {
    public async run({ message, command }: MessageCommandSuccessPayload) {
        const commandName = capFirstLetter(command.name);

        const embed = new BediEmbed().setTitle(commandName + ' Reply').setColor(colors.PRIMARY).setDescription('Hey, we noticed you used a message command! Consider using slash commands instead. Message commands will be removed on (DATE TBD).');
        return message.author.send({embeds: [embed]});
    }
}