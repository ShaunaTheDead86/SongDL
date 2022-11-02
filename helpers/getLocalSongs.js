import fs from 'fs';

export default function getLocalSongs() {
	const localSongPath = '/media/shauna/01D8C557A46097D0/Songs/';
	const localSongs = fs.existsSync('./local_song_data.json')
		? JSON.parse(fs.readFileSync('./local_song_data.json', 'utf-8'))
		: [];

	const readFile = (path) => {
		return fs.readFileSync(path, 'utf-8');
	};

	const readDir = (path) => {
		return fs
			.readdirSync(path, { withFileTypes: true })
			.map((file) => {
				const filePath = path + file.name;
				const dirPath = filePath + '/';

				if (file.isDirectory()) return readDir(dirPath);
				if (file.name === 'song.ini') return readFile(filePath);
			})
			.filter((e) => e);
	};

	const flattenArray = (arr) => {
		const flatArr = [];

		arr.forEach((e) =>
			Array.isArray(e) ? flatArr.push(...flattenArray(e)) : flatArr.push(e)
		);

		return flatArr;
	};

	const getSongs = () => {
		const songs = flattenArray(readDir(localSongPath)).map((song) => {
			const keyRegex = /.+(?=\s\=\s)/g;
			const valueRegex = /(?<=\s\=\s).+/g;
			const keys = song.match(keyRegex);
			const values = song.match(valueRegex);
			const songObj = {};

			if (!Array.isArray(keys) || !Array.isArray(values)) return;
			keys.forEach((key, i) => {
				songObj[key] = values[i] ? values[i] : '';
			});

			return songObj;
		});

		if (songs.length === localSongs.length) return songs;

		const filter = [];
		const goodSong = (e) =>
			e &&
			e !== null &&
			e.artist &&
			e.name &&
			e.artist !== null &&
			e.name !== null;

		return songs.filter((song) => {
			if (!goodSong(song)) return false;

			const songString = JSON.stringify(song);

			if (filter.length > 0 && filter.includes(songString)) return false;

			filter.push(songString);
			return true;
		});
	};

	const writeToFile = () => {
		const data = getSongs();

		if (data.length === localSongs.length)
			return console.log('ALL SONGS ALREADY EXIST LOCALLY');

		console.log(data.length, localSongs.length);
		return fs.writeFileSync('./local_song_data.json', JSON.stringify(data));
	};

	writeToFile();
}

getLocalSongs();
