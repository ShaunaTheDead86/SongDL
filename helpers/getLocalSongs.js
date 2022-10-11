import fs from 'fs';
import fsPromises from 'fs/promises';

export default async function getLocalSongs() {
	const localSongPath = '/media/shauna/01D8C557A46097D0/Songs/';
	const localSongs = fs.existsSync('./local_song_data.json')
		? await fsPromises
				.readFile('./local_song_data.json', 'utf-8')
				.then((res) => JSON.parse(res))
		: [];

	const readFile = async (path) => {
		return await fsPromises
			.readFile(path, 'utf-8')
			.then((res) => res)
			.catch((err) => console.log(err));
	};

	const readDir = async (path) => {
		const promises = await fsPromises
			.readdir(path, { withFileTypes: true })
			.then((res) => {
				return res.map((file) => {
					const filePath = path + file.name;
					const dirPath = filePath + '/';

					if (file.isDirectory()) return readDir(dirPath);
					if (file.name === 'song.ini') return readFile(filePath);
				});
			})
			.catch((err) => console.log(err));

		return Promise.all(promises)
			.then((res) => {
				return res.filter((e) => e);
			})
			.catch((err) => console.log(err));
	};

	const localSongExists = (song) => {
		if (localSongs.length === 0) return false;

		const exists = localSongs.some((localSong) =>
			Object.keys(localSong).every((key) => localSong[key] === song[key])
		);

		return exists;
	};

	const flattenArray = (arr) => {
		const flatArr = [];

		arr.forEach((e) =>
			Array.isArray(e) ? flatArr.push(...flattenArray(e)) : flatArr.push(e)
		);

		return flatArr;
	};

	const getSongs = async () => {
		const files = flattenArray(await readDir(localSongPath));
		return files.map((song) => {
			const keyRegex = /.+(?=\s\=\s)/g;
			const valueRegex = /(?<=\s\=\s).+/g;
			const keys = song.match(keyRegex);
			const values = song.match(valueRegex);
			const songObj = {};

			keys.forEach((key, i) => {
				songObj[key] = values[i] ? values[i] : '';
			});

			const exists = localSongExists(songObj);
			if (exists) return;

			return songObj;
		});
	};

	const writeToFile = async () => {
		const data = (await getSongs()).filter((e) => e !== null);

		if (data.length === localSongs.length)
			return console.log('ALL SONGS ALREADY EXIST LOCALLY');

		return await fsPromises
			.writeFile('./local_song_data.json', JSON.stringify(data))
			.then((res) => console.log('NEW SONGS WRITTEN TO LOCAL FILE'))
			.catch((err) => console.log(err));
	};

	await writeToFile();
}

getLocalSongs();
