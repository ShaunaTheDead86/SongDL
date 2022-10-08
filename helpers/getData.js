import fetch from 'node-fetch';
import fs from 'fs';
import pg from 'pg';

export default async function getData() {
	const Client = pg.Client;
	const pgClient = new Client({
		host: 'localhost',
		port: 5432,
		user: 'shauna',
		password: 'shauna',
		database: 'songs',
		ssl: false,
	});

	const fsPromises = fs.promises;
	const countPath = 'https://chorus.fightthe.pw/api/count';
	const songsPath = 'https://chorus.fightthe.pw/api/latest?from=';

	const songCount = await fetch(countPath).then((res) =>
		res.text().then((res) => Number(res))
	);

	await pgClient.connect();
	const dbSongs = await pgClient
		.query(`SELECT * FROM songs;`)
		.then((res) => res.rows)
		.catch((err) => console.log(err));
	await pgClient.end();

	const songs = await fsPromises
		.readFile('../song_data.json', {
			encoding: 'utf-8',
		})
		.then((res) =>
			JSON.parse(res)
				.map((e) => JSON.parse(e))
				.sort((a, b) => a.id - b.id)
		);

	const sourcesIdentical =
		dbSongs.some((dbSong) => songs.some((song) => dbSong.id === song.id)) &&
		songs.some((dbSong) => dbSongs.some((song) => dbSong.id === song.id));

	if (sourcesIdentical) console.log('Database and file contain identical data');

	// function to clean inputs before writing to file
	const cleanInput = (e) => e.replace(/\'/, '');

	try {
		let insertedCount = 0;
		let from = 0;

		while (from <= songCount) {
			await fetch(songsPath + from).then(async (res) => {
				from + 20 <= songCount ? (from += 20) : (from += songCount - from + 1);
				console.log('INSERTED, FROM: ', insertedCount, from);
				await res.json().then((res) => {
					res.songs.forEach((song) => {
						if (!songs.some((e) => song.id === e.id)) {
							songs.push(JSON.parse(cleanInput(JSON.stringify(song))));
							insertedCount++;
						}
					});
				});
			});
		}

		if (insertedCount > 0) {
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
