import fs from 'fs';
import downloadFile from './downloadFile.js';

export default async function fetchSongs() {
	const downloadsDir = '/media/shauna/01D8C557A46097D0/Downloads/';
	const matchStr = (e, str) =>
		Array.isArray(e) ? e.filter((f) => f.match(str)) : e.match(str);
	const missingSongs = JSON.parse(
		fs.readFileSync('./missing_song_data.json', 'utf-8')
	).filter((song) => {
		const match = matchStr(Object.keys(song), /drum/g);
		const matchValue = match.some((e) => song[e] && song[e] >= 0);
		return match && matchValue;
	});

	let i = 0;
	for (const song of missingSongs) {
		const percentDone = Math.round((i / missingSongs.length) * 10000) / 100;
		const link = song.link;
		const linkRegex = /(?<=d\/)[\w\_\-]+/g;
		const linkRegex2 = /(?<=folders\/)[\w\_\-]+/g;
		const match = link.match(linkRegex);
		const fileId = Array.isArray(match) ? match[0] : link.match(linkRegex2)[0];

		if (!fileId && fileId.length !== 33)
			throw console.log('FILE ID', fileId, link, match);

		console.log(
			`Downloading song ${i} of ${missingSongs.length}... With ${
				missingSongs.length - i
			} songs left, or ${percentDone}% done!`
		);
		if (fileId && downloadsDir) {
			await downloadFile(fileId, downloadsDir);
		}
		i++;
	}
}

fetchSongs();
