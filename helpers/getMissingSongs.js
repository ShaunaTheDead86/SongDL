import fs from 'fs';
import fsPromises from 'fs/promises';

export default async function getMissingSongs() {
	const localSongs = fs.existsSync('./local_song_data.json')
		? await fsPromises
				.readFile('./local_song_data.json', 'utf-8')
				.then((res) => JSON.parse(res))
		: [];
	const dbSongs = fs.existsSync('./song_data.json')
		? await fsPromises
				.readFile('./song_data.json', 'utf-8')
				.then((res) =>
					res === '' ? [] : JSON.parse(res).map((e) => JSON.parse(e))
				)
		: [];
	const missingSongs = fs.existsSync('./missing_song_data.json')
		? await fsPromises
				.readFile('./missing_song_data.json', 'utf-8')
				.then((res) => (res === '' ? [] : JSON.parse(res)))
		: [];

	const missingSongsCheck = dbSongs.filter((dbSong, i) => {
		const matches = localSongs.filter(
			(localSong) =>
				localSong.name === dbSong.name &&
				localSong.artist === dbSong.artist &&
				localSong.charter &&
				localSong.charter !== null &&
				dbSong.charter &&
				dbSong.charter !== null &&
				localSong.charter === dbSong.charter
		);

		if (matches.length >= 1) return false;

		return true;
	});

	if (missingSongs.length === missingSongsCheck.length)
		return console.log('ALL MISSING SONGS ACCOUNTED FOR');

	await fsPromises
		.writeFile('./missing_song_data.json', JSON.stringify(missingSongsCheck))
		.then((res) => console.log('MISSING SONGS WRITTEN TO LOCAL FILE'))
		.catch((err) => console.log(err));
}
