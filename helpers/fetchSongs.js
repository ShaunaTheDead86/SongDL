import fs from 'fs';
import path from 'path';
import fsPromises from 'fs/promises';
import downloadFile from './downloadFile.js';

export default async function fetchSongs() {
	const downloadsDir = '/media/shauna/01D8C557A46097D0/Downloads/';
	const missingSongs = await fsPromises
		.readFile('./missing_song_data.json', 'utf-8')
		.then((res) => JSON.parse(res))
		.catch((err) => console.log(err));

	const targetSongs_temp = missingSongs.filter((song) => {
		const diff_drums =
			song.diff_drums && song.diff_drums !== null && song.diff_drums !== -1;
		const tier_drums =
			song.tier_drums && song.tier_drums !== null && song.tier_drums !== -1;
		return diff_drums || tier_drums;
	});

	const targetSongs = targetSongs_temp.slice(4361, targetSongs_temp.length - 1);

	let i = 0;
	for (const song of targetSongs) {
		const percentDone = Math.round((i / targetSongs.length) * 10000) / 100;

		const link = song.link;
		const linkRegex = /(?<=d\/)[\w\_\-]+/g;
		const linkRegex2 = /(?<=folders\/)[\w\_\-]+/g;
		const match = link.match(linkRegex);
		const fileId = Array.isArray(match) ? match[0] : link.match(linkRegex2)[0];

		if (!fileId && fileId.length !== 33)
			throw console.log('FILE ID', fileId, link, match);

		console.log(
			`Downloading song ${i} of ${targetSongs.length}... With ${
				targetSongs.length - i
			} songs left, or ${percentDone}% done!`
		);
		await downloadFile(fileId, downloadsDir);
		i++;
	}
}

// fetchSongs();

// (() => {
// 	const targetDir = '/media/shauna/01D8C557A46097D0/Downloads/';
// 	const matchRar = (e) => e.match(/.+(?=(rar)$)/g);
// 	const matchZip = (e) => e.match(/.+(?=(zip)$)/g);
// 	const match7z = (e) => e.match(/.+(?=(7z)$)/g);
// 	const cleanInput = (e) => e.replace(/[^A-Za-z\-\ ]/g, '');
// 	const cleanWhiteSpace = (e) => {
// 		while (e[0] === ' ') {
// 			e = e.replace(/^\s+/, '');
// 		}
// 		while (e[e.length - 1] === ' ') {
// 			e = e.replace(/\s$/, '');
// 		}
// 		return e.replace(/(\s\s)+/g, ' ');
// 	};

// 	const dir = fs.readdirSync(targetDir, { withFileTypes: true });
// 	const split = [];

// 	dir.forEach((file) => {
// 		const name = file.name.split('.');
// 		name[0] = cleanWhiteSpace(cleanInput(name[0]));

// 		if (name.length === 1) {
// 			const rarMatch = matchRar(name[0]);
// 			const zipMatch = matchZip(name[0]);
// 			const sevzMatch = match7z(name[0]);

// 			if (rarMatch !== null)
// 				return split.push(cleanWhiteSpace(rarMatch[0]) + '.rar');
// 			if (sevzMatch !== null)
// 				return split.push(cleanWhiteSpace(sevzMatch[0]) + '.7z');
// 			if (zipMatch !== null)
// 				return split.push(cleanWhiteSpace(zipMatch[0]) + '.zip');
// 			return split.push(cleanWhiteSpace(name[0]) + '.zip');
// 		}

// 		return split.push(cleanWhiteSpace(name.join('.')));
// 	});

// 	dir.forEach((file, i) => {
// 		const filePath = path.join(targetDir + file.name);
// 		const newName = path.join(targetDir + split[i]);

// 		if (newName !== null && filePath !== null && filePath !== newName) {
// 			console.log('# RENAME', filePath, newName);
// 			fs.rename(filePath, newName, (err) => {
// 				console.log('# ERR', err);
// 			});
// 		}
// 	});
// })();
