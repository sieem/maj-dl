import { createWriteStream, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { get } from 'https';
import * as ytdl from 'ytdl-core';
import { write } from 'ffmetadata';
import * as moment from 'moment';
import { google } from 'googleapis';
import { config } from 'dotenv';

config();

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

    for (const {id: { videoId }, snippet: { thumbnails, title, publishedAt }} of items) {
        // try to take the biggest one and go down from there
        const thumbnailUrl = thumbnails.maxres?.url || thumbnails.high?.url || thumbnails.medium?.url || thumbnails.standard?.url || thumbnails.default?.url;

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

        const fileExtension = mimeTypeToDownload.includes('webm') ? 'opus' : 'mp4a';

        const tempAudioPath = `./tmp/${videoId}.${fileExtension}`;
        const tempThumbnailPath = `./tmp/${videoId}_thumb.jpg`;

        get(thumbnailUrl, res => res.pipe(createWriteStream(tempThumbnailPath)))
        const writeStream = createWriteStream(tempAudioPath);

        ytdl(`http://www.youtube.com/watch?v=${videoId}`, { quality: qualityToDownload})
            .pipe(writeStream);

        writeStream.on('finish', () => {
            const album = title.includes('CBS') ? 'Coffee Break Sessions' : title.includes('Guest Mix') ? 'Guest Mix' : 'On Vinyl';
            const tags = {
                title,
                album,
                year: Number.parseInt(moment(publishedAt).format('YYYY')),
                artist: 'My Analog Journal',
                // APIC: tempThumbnailPath,
            };

            write(tempAudioPath, tags, function (err) {
                if (err) console.error("Error writing metadata", err);
                else {
                    const finalAudioPath = `./done/${title.replace(/:/g, '-')}.${fileExtension}`;
                    writeFileSync(finalAudioPath, readFileSync(tempAudioPath));
                    unlinkSync(tempAudioPath);
                    unlinkSync(tempThumbnailPath);
                }
            });

            
        });
    }
})()
