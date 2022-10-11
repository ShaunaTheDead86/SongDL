import fetch from 'node-fetch';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';

export default async function fetchSongs() {
	const downloadsDir = '/media/shauna/01D8C557A46097D0/Downloads/';
	const missingSongs = fs.existsSync('./missing_song_data.json')
		? await fsPromises
				.readFile('./missing_song_data.json', 'utf-8')
				.then((res) => (res === '' ? [] : JSON.parse(res)))
		: [];

	let i = 0;
	for (const song of missingSongs.slice(0, 1)) {
		console.log('Downloading files: ', (i / missingSongs.length) * 100);

		await fetch(song.directLinks.archive)
			.then((res) => {
				console.log(res);
				// const fileName = `${downloadsDir}${song.artist} - ${song.name}.7z`;
				// if (fs.existsSync(fileName)) {
				// 	console.log('File already exists, skipping: ', fileName);
				// } else {
				// 	console.log('Downloading file: ', fileName);
				// 	const file = fs.createWriteStream(fileName);
				// 	res.body.pipe(file);
				// 	res.body.on('end', () => console.log('File written ', fileName));
				// 	file.on('error', () => console.log('Error writing file'));
				// }
			})
			.catch((err) => console.log(err));
		i++;
	}
}

fetchSongs();
