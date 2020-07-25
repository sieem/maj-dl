import * as fs from 'fs';
import * as ytdl from 'ytdl-core';

ytdl('http://www.youtube.com/watch?v=A02s8omM_hI')
    .pipe(fs.createWriteStream('video.flv'));