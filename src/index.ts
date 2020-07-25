import * as fs from 'fs';
import * as ytdl from 'ytdl-core';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
dotenv.config();


// initialize the Youtube API library
const youtube = google.youtube('v3');

(async () => {
    const { data: { items } } = await youtube.search.list({
        part: ['id', 'snippet'],
        key: process.env.YOUTUBE_KEY,
        channelId: process.env.CHANNEL_ID,
        order: 'date',
        maxResults: 1
    });

    for (const {id: { videoId }, snippet: { thumbnails }} of items) {
        // try to take the biggest one and go down from there
        const thumbnailUrl = thumbnails.maxres?.url || thumbnails.high?.url || thumbnails.medium?.url || thumbnails.standard?.url || thumbnails.default?.url;

        console.log(thumbnailUrl);

        const info = await ytdl.getInfo(videoId);
        const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
        let highestBitrate = 0;
        let qualityToDownload = 0;
        let mimeTypeToDownload = '';
        for (const {audioBitrate, itag, mimeType} of audioFormats) {
            if (audioBitrate > highestBitrate) {
                highestBitrate = audioBitrate;
                qualityToDownload = itag;
                mimeTypeToDownload = mimeType;
            }
        }

        const tempFilename = `tmp/audio.${mimeTypeToDownload.includes('webm') ? 'opus' : 'mp4a'}`;


        ytdl(`http://www.youtube.com/watch?v=${videoId}`, { quality: qualityToDownload})
            .pipe(fs.createWriteStream(tempFilename));
    }
})()
