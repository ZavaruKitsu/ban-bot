import './logging'
import Discord, {Snowflake, TextChannel} from 'discord.js';
import {entersState, joinVoiceChannel, VoiceConnectionStatus} from "@discordjs/voice";
import {createListeningStream, fucks} from "./createListeningStream";


console.log('Starting...')

const token = ''
const client = new Discord.Client({intents: ['GuildVoiceStates', 'GuildMembers', 'GuildMessages', 'Guilds', 'MessageContent']});

client.on('ready', () => console.log(`${client.user?.username} is ready to work!`));
client.on('error', (data => {
    console.error(data)
}));

client.on('messageCreate', async (args) => {
    if (args.content === 'count') {
        const textChannelId = '722105306011926619' as Snowflake
        // @ts-ignore
        const textChannel: TextChannel = await client.channels.fetch(textChannelId)
        for await (const val of fucks) {
            const user = client.users.cache.get(val[0]) ?? await client.users.fetch(val[0])
            console.warn(`${user.username} ${val[1]}`)
            await textChannel.send(`${user.username}: ${val[1]}`)
        }
        return
    }
    if (args.content !== 'go') return

    const guildId = '484025467134017568' as Snowflake
    const channel = '754667708947234817' as Snowflake

    const guild = await client.guilds.fetch(guildId)

    const connection = joinVoiceChannel({
        channelId: channel,
        guildId: guildId,
        selfDeaf: false,
        selfMute: true,
        adapterCreator: guild.voiceAdapterCreator,
    });
    await entersState(connection, VoiceConnectionStatus.Ready, 20e3);
    const receiver = connection.receiver;

    receiver.speaking.on('start', (userId) => {
        createListeningStream(receiver, userId, client.users.cache.get(userId));
    });
})

void client.login(token)
