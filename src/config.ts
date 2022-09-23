import {LogLevel} from '@sapphire/framework';
import {ClientOptions} from 'discord.js';

import {fetchPrefix} from './utils/discordUtil';

export const DEFAULT_PREFIX = '$';
export const MAX_QUOTE_LENGTH = 1000;

export const CLIENT_OPTIONS: ClientOptions = {
    intents: [
        'GUILDS', 'GUILD_MEMBERS', 'GUILD_BANS', 'GUILD_EMOJIS_AND_STICKERS', 'GUILD_VOICE_STATES', 'GUILD_MESSAGES',
        'GUILD_MESSAGE_REACTIONS', 'DIRECT_MESSAGES', 'DIRECT_MESSAGE_REACTIONS'
    ],
    defaultPrefix: DEFAULT_PREFIX,
    caseInsensitiveCommands: true,
    caseInsensitivePrefixes: true,
    // presence: getRandomStatus(),
    logger: {
        level: LogLevel.Debug,
    },
    partials: ['CHANNEL', 'MESSAGE', 'REACTION'],
    loadMessageCommandListeners: true,
    fetchPrefix: fetchPrefix,
};
