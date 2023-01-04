import {EndBehaviorType, VoiceReceiver} from '@discordjs/voice';
import {User} from 'discord.js';
import {pipeline} from 'node:stream';
import {readFileSync} from "fs";
import {Readable} from "stream";
import {Reader} from "wav";
import {spawn} from "child_process";
import {opus} from "prism-media";

const vosk = require('vosk');

vosk.setLogLevel(-1)

console.log('Loading model...')
const model = new vosk.Model('./models/vosk-model-small-ru-0.22');
const badWords = new Set<string>(readFileSync('bad_words.txt').toString().split('\r\n'))
console.log('Loaded!')

function getDisplayName(userId: string, user?: User) {
    return user ? `${user.username}_${user.discriminator}` : userId;
}

export const fucks = new Map();

function countFucks(converted: Readable, user?: User) {
    console.log(`⚡ Processing ${user?.username}`)

    const wfReader = new Reader();
    const wfReadable = new Readable().wrap(wfReader);

    wfReader.on('format', async ({audioFormat, sampleRate, channels}) => {
        if (audioFormat != 1 || channels != 1) {
            console.error("❌ Audio file must be WAV format mono PCM.");
            console.error(`${audioFormat} ${channels}`)
            return
        }

        const rec = new vosk.Recognizer({model: model, sampleRate: sampleRate});

        rec.setMaxAlternatives(12);
        rec.setWords(true);

        for await (const data of wfReadable) {
            rec.acceptWaveform(data);
        }
        const res = rec.finalResult(rec).alternatives.map((item: { text: any; }) => item.text)
        if (!res) {
            console.log('✅ Done!')
            return
        }
        console.log(res)


        const possibleWords = new Set<string>()
        for (const data of res) {
            for (const word of data.split(' ')) {
                if (word != '') {
                    possibleWords.add(word.replace('ё', 'е'))
                }
            }
        }

        for (const word of possibleWords) {
            if (word !== '' && badWords.has(word)) {
                console.warn(`${user?.username}: ${word}`)
                if (fucks.has(user?.id)) {
                    fucks.set(user?.id, fucks.get(user?.id) + 1)
                } else {
                    fucks.set(user?.id, 1)
                }
            }
        }

        console.log('✅ Done!')
    });

    converted.pipe(wfReader).on('finish',
        function (err) {
            if (err) {
                console.error(err);
            }
        });
}

let recording: string[] = []

export function createListeningStream(receiver: VoiceReceiver, userId: string, user?: User) {
    if (recording.includes(userId)) {
        return
    }

    recording.push(userId)
    const opusStream = receiver.subscribe(userId, {
        end: {
            behavior: EndBehaviorType.AfterSilence,
            duration: 500,
        },
    });

    const oggStream = new opus.OggLogicalBitstream({
        opusHead: new opus.OpusHead({
            channelCount: 2,
            sampleRate: 48000,
        }),
        pageSizeControl: {
            maxPackets: 10,
        },
        crc: false
    });
    const ffmpegConverter = spawn('ffmpeg', `-loglevel quiet -c:a libopus -i - -ac 1 -vn -f wav -flags +bitexact -`.split(' '), {
        detached: true,
        stdio: ['pipe', 'pipe', 'pipe'],
    })
    const out = ffmpegConverter.stdin

    ffmpegConverter.stderr.on('data', (data) => {
        console.error(`ffmpeg stderr: ${data}`);
    })
    oggStream.on('end', () => {
        setTimeout(() => {
            ffmpegConverter.kill()
        }, 1000)
    })

    console.log(`🎤 Started recording ${user?.username}`);

    pipeline(opusStream, oggStream, out, (err) => {
        recording = recording.filter(x => x != userId)

        if (err) {
            console.warn(`❌ Error recording file ${err.message} ${err}`);
            console.log(ffmpegConverter.exitCode)
            console.log(ffmpegConverter.stderr.read())
        } else {
            console.log(`🎤 Stopped recording ${user?.username}`);
            countFucks(ffmpegConverter.stdout!, user)
        }
    });
}
