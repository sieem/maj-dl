import { readFileSync, writeFileSync, existsSync } from 'fs';

export default class TrackService {
    songFilePath: string = './songs.json';
    constructor() {
        if (!existsSync(this.songFilePath)) {
            this.generateSongFile();
        }
    }

    public generateSongFile(): void {
        writeFileSync(this.songFilePath, '[]', 'utf-8');
    }

    public getTrackNumber(album): number {
        const songFile = JSON.parse(readFileSync(this.songFilePath, 'utf-8'));
        const tracksInAlbum = songFile
            .filter(song => song.album === album)
            .reduce((acc, cur) => [...acc, cur.track], []);

        if (tracksInAlbum.length === 0) {
            return 1;
        }

        return Math.max(...tracksInAlbum) + 1;
    }

    public writeTrack(newTrack): void {
        const songFile = JSON.parse(readFileSync(this.songFilePath, 'utf-8'));
        songFile.push(newTrack);
        writeFileSync(this.songFilePath, JSON.stringify(songFile), 'utf-8');
    }
}