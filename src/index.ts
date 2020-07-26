import { createWriteStream, readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { get } from 'https';
import * as ytdl from 'ytdl-core';
import { write } from 'ffmetadata';
import * as moment from 'moment';
import { google } from 'googleapis';
import { config } from 'dotenv';

config();

// initialize the Youtube API library
const youtube = google.youtube('v3');
const minimumLength = 20 * 60;

(async () => {
    const { data: { items } } = await youtube.search.list({
        part: ['id', 'snippet'],
        key: process.env.YOUTUBE_KEY,
        channelId: process.env.CHANNEL_ID,
        order: 'date',
        maxResults: 30
    });

    for (const {id: { videoId }, snippet: { thumbnails, title, publishedAt }} of items) {
        if (!videoId) {
            continue;
        }
        // try to take the biggest one and go down from there
        const thumbnailUrl = thumbnails.maxres?.url || thumbnails.high?.url || thumbnails.medium?.url || thumbnails.standard?.url || thumbnails.default?.url;

        const { formats, videoDetails: { lengthSeconds } } = await ytdl.getInfo(videoId);
        if (Number.parseInt(lengthSeconds) < minimumLength) {
            continue;
        }

        const audioFormats = ytdl.filterFormats(formats, 'audioonly');
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
        const finalAudioPath = `./done/${title.replace(/[\/:*?"<>|]/g, '-')}.${fileExtension}`;

        if (existsSync(finalAudioPath)) {
            console.log(title, 'already exists, skipping...');
            continue;
        }

        console.log('Downloading:', title);

        const tempAudioPath = `./tmp/${videoId}.${fileExtension}`;
        const tempThumbnailPath = `./tmp/${videoId}_thumb.jpg`;

        get(thumbnailUrl, res => res.pipe(createWriteStream(tempThumbnailPath)));
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
                    writeFileSync(finalAudioPath, readFileSync(tempAudioPath));
                    unlinkSync(tempAudioPath);
                    unlinkSync(tempThumbnailPath);
                    console.log('Done with:', title)
                }
            });

            
        });
    }
})()
