import fsPromises from 'fs/promises';

export default async function getLocalSongs() {
	const localSongPath = '/media/shauna/01D8C557A46097D0/Songs_Test/';
	const localSongs = await fsPromises
		.readFile('./local_song_data.json', {
			encoding: 'utf-8',
		})
		.then((res) => (res === '' ? [] : JSON.parse(res)));

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

	const localSongExists = async (song) => {
		if (localSongs.length === 0) return false;

		const exists = localSongs.every((localSong) => {
			console.log('# 1 LOCAL SONG: ', localSong, song);
			return Object.keys(localSong).every((key) => {
				console.log('# 2 LOCAL SONG: ', localSong[key], song[key]);
				return localSong[key] !== song[key];
			});
		});

		console.log('# BEFORE RETURN', song, localSongs, exists);
		return exists;
	};

	const getSongs = async (files) => {
		const files = await readDir(localSongPath);
		return files.flat(3).map((song) => {
			const keyRegex = /.+(?=\s\=\s)/g;
			const valueRegex = /(?<=\s\=\s).+/g;
			const keys = song.match(keyRegex);
			const values = song.match(valueRegex);
			const songObj = {};

			keys.forEach((key, i) => {
				songObj[key] = values[i] ? values[i] : '';
			});

			if (localSongs.length > 0) {
				console.log('# SONG OBJ', songObj);
				const exists = localSongExists(songObj);
				console.log('# EXISTS?', exists);
			}

			console.log('RETURN SONG OBJ', songObj);
			return songObj;
		});
	};

	const writeToFile = async () => {
		const data = await getSongs();

		if (data.filter((e) => e).length === 0) return;

		return await fsPromises
			.writeFile('./local_song_data.json', data)
			.then((res) => console.log('FILES WRITTEN'))
			.catch((err) => console.log(err));
	};

	await writeToFile();

	return;
}

getLocalSongs();
