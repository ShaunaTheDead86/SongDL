import fsPromises from 'fs/promises';
import downloadFile from './downloadFile.js';

export default async function fetchSongs() {
	const downloadsDir = '/media/shauna/01D8C557A46097D0/Downloads/';
	const missingSongs = await fsPromises
		.readFile('./missing_song_data.json', 'utf-8')
		.then((res) => JSON.parse(res))
		.catch((err) => console.log(err));

	const targetSongs = missingSongs.filter((song) => {
		const diff_drums =
			song.diff_drums && song.diff_drums !== null && song.diff_drums !== -1;
		const tier_drums =
			song.tier_drums && song.tier_drums !== null && song.tier_drums !== -1;
		return diff_drums || tier_drums;
	});

	let i = 0;
	for (const song of targetSongs) {
		const percentDone =
			Math.round((i / targetSongs.length) * 10000) / 100 + '% done!';
		const filesLeft = targetSongs.length - i + ' files left, and';

		const link = song.link;
		const linkRegex = /(?<=d\/)[\w\_\-]+/g;
		const linkRegex2 = /(?<=folders\/)[\w\_\-]+/g;
		const match = link.match(linkRegex);
		const fileId = Array.isArray(match) ? match[0] : link.match(linkRegex2)[0];

		if (!fileId && fileId.length !== 33)
			throw console.log('FILE ID', fileId, link, match);

		console.log('Downloading next song...', filesLeft, percentDone);
		await downloadFile(fileId, downloadsDir);
		i++;
	}
}

fetchSongs();
