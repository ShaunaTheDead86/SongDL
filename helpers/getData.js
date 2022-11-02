import fetch from 'node-fetch';
import fs from 'fs';
import pg from 'pg';

export default async function getData(pgClient, localSongs, dbSongs) {
	const countPath = 'https://chorus.fightthe.pw/api/count';
	const songsPath = 'https://chorus.fightthe.pw/api/latest?from=';

	const songCount = await fetch(countPath).then((res) =>
		res.text().then((res) => Number(res))
	);

	const readSongData = () =>
		JSON.parse(
			fs
				.readFileSync('./song_data.json', {
					encoding: 'utf-8',
				})
				.map((e) => JSON.parse(e))
				.sort((a, b) => a.id - b.id)
		);

	const songs = fs.existsSync('./song_data.json') ? readSongData() : [];

	const deepEqual = (a, b) => {
		if (!Array.isArray(a) && !Array.isArray(b)) return false;

		return (
			a.every((aEle, i) =>
				Array.isArray(aEle) ? deepEqualArr(aEle, b[i]) : aEle === b[i]
			) &&
			b.every((bEle, i) =>
				Array.isArray(bEle) ? deepEqualArr(bEle, a[i]) : bEle === a[i]
			)
		);
	};

	if (deepEqual(localSongs, dbSongs))
		return console.log('Database and file contain identical data');

	try {
		const songs = [];
		let from = 0;

		while (from <= 20) {
			// while (from <= songCount) {
			songs.push(
				fetch(songsPath + from).then(async (res) => {
					if (from + 20 <= songCount) from += 20;
					else from += songCount - from + 1;
					return [...res];
					// .then((res) => {
					// res.songs.forEach((song) => {
					// 		songs.push(JSON.parse(cleanInput(JSON.stringify(song))));
					// 		insertedCount++;
					// 	}
					// });
					// });
				})
			);
		}

		throw console.log(songs[0]);

		if (songs.length > 0) {
			await fsPromises
				.writeFile(
					'./song_data.json',
					JSON.stringify(
						songs.sort((a, b) => a.id - b.id).map((e) => JSON.stringify(e))
					)
				)
				.then((res) => console.log('FILES WRITTEN'));
		}
	} catch (err) {
		console.log(err);
	}

	return songs;
}

getData()