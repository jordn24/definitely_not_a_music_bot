const { Client, Intents, MessageEmbed } = require('discord.js');
const { prefix } = require('./config.json');
const { token } = require('./tokens.json');
const ytdl = require('ytdl-core');
const yts = require("yt-search");


const client = new Client();

const queue = new Map();

client.on('message', async message => {

    const serverQueue = queue.get(message.guild.id);

    if (message.content.toLowerCase().includes(prefix + 'play ')){
        execute(message, serverQueue)
    }

    if (message.content.toLowerCase().includes(prefix + 'stop ')){
        execute(message, serverQueue)
    }

});

async function execute(message, serverQueue) {
    const args = message.content.split(" ");

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel){
      return message.channel.send(
        "You need to be in a voice channel to play music!"
      );
    }
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send(
        "I need permissions to join and speak in your voice channel!"
    );
    }

    var songInfo;
    // Get song info
    if (ytdl.validateURL(args[1])) {
        songInfo = await ytdl.getInfo(args[1]);
    } else {
        const videos = await yts(args.slice(1).join(" "))
        songInfo = await ytdl.getInfo(videos['all'][0].url);
    }

    const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url
    }

    if (!serverQueue){
        // Creating the contract for our queue
        const queueContruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            playing: true,
        };
        // Setting the queue using our contract
        queue.set(message.guild.id, queueContruct);
        // Pushing the song to our songs array
        queueContruct.songs.push(song);
        
        try {
            // Here we try to join the voicechat and save our connection into our object.
            const connection = await voiceChannel.join()
            queueContruct.connection = connection;
            // Calling the play function to start a song
            play(message.guild, queueContruct.songs[0]);
        } catch (err) {
            // Printing the error message if the bot fails to join the voicechat
            console.log(err);
            queue.delete(message.guild.id);
            return message.channel.send(err);
        }
    } else {
        serverQueue.songs.push(song);
        console.log(serverQueue.songs);
        return message.channel.send(`${song.title} has been added to the queue`);
    }


}

function play(guild, song) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
      serverQueue.voiceChannel.leave();
      queue.delete(guild.id);
      return;
    }
    const dispatcher = serverQueue.connection
        .play(ytdl(song.url))
        .on("finish", () => {
            serverQueue.songs.shift();
            play(guild, serverQueue.songs[0]);
        })
        .on("error", error => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send(`Now playing: **${song.title}**`);
  }

client.login(token)
