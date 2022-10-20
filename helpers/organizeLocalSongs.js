import fs, { readdir, readdirSync } from 'fs';
import path from 'path';

export default function organizeLocalSongs() {
	const localSongPath = '/media/shauna/01D8C557A46097D0/Songs/';
	const localSongs = fs.existsSync('./local_song_data.json')
		? JSON.parse(fs.readFileSync('./local_song_data.json', 'utf-8'))
		: [];

	const removeSpaces = (arr) => {
		return arr.map((e) => e.replace(/^\s+/g, '').replace(/\s+$/g, ''));
	};

	const readFile = (path) => {
		const song = fs.readFileSync(path, 'utf-8');
		const keyRegex = /.+(?=\=)/g;
		const valueRegex = /(?<=\=).+/g;
		const keys = removeSpaces(song.match(keyRegex));
		const values = removeSpaces(song.match(valueRegex));
		const songObj = {};

		if (!Array.isArray(keys) || !Array.isArray(values)) return;
		keys.forEach((key, i) => {
			songObj[key] = values[i] ? values[i] : '';
		});

		if (
			!songObj ||
			!songObj.artist ||
			!songObj.name ||
			songObj.artist === null ||
			songObj.name === null ||
			songObj.artist === '' ||
			songObj.name === ''
		)
			return null;

		return songObj;
	};

	const flattenArray = (arr) => {
		const flatArr = [];

		arr.forEach((e) =>
			Array.isArray(e) ? flatArr.push(...flattenArray(e)) : flatArr.push(e)
		);

		return flatArr;
	};

	const getSongData = (dirPath) => {
		return fs
			.readdirSync(dirPath, { withFileTypes: true })
			.map((file) => {
				const filePath = path.join(dirPath + file.name);
				const newPath = path.join(filePath + '/');

				if (file.isDirectory()) return [...getSongData(newPath)];
				if (file.name === 'song.ini')
					return { file: readFile(filePath), path: path };
				return null;
			})
			.filter((e) => e && e !== null);
	};

	const getDirPaths = (dirPath) => {
		return fs
			.readdirSync(dirPath, { withFileTypes: true })
			.filter((e) => e.isDirectory())
			.map((dir) => {
				const newPath = path.join(dirPath + dir.name + '/');
				const subDir = getDirPaths(newPath);
				return subDir.length > 0
					? [...subDir]
					: { path: newPath, name: dir.name };
			});
	};

	const getSongs = () => {
		const badSongs = [];
		const songs = flattenArray(getSongData(localSongPath)).filter((song) => {
			if (song && song !== null && song.file && song.file !== null) return true;
			badSongs.push(song);
			return false;
		});

		badSongs.forEach((song) => {
			fs.rmdirSync(song.path, { recursive: true, force: true });
		});

		if (songs.length !== localSongs.length) {
			const toKeep = [];
			const toRemove = [];

			songs.forEach((song) => {
				const songStr = JSON.stringify(song.file);
				if (!toKeep.includes(songStr)) return toKeep.push(songStr);
				return toRemove.push(song);
			});

			toRemove.forEach((e) => {
				if (!e.path) throw e;
				fs.readdirSync(e.path).forEach((file) =>
					fs.rmSync(path.join(e.path + file))
				);
				fs.rmdirSync(e.path);
			});
		}

		return songs;
	};

	const moveDirs = () => {
		const dirs = flattenArray(getDirPaths(localSongPath));
		const cleanDir = (e) => e.replace(/[^\w\s\/]/g, '');
		const cleanInput = (e) =>
			e
				.replace(/^\s+/g, '')
				.replace(/\s+$/g, '')
				.replace(/[^\w\s]/g, '')
				.replace(/\s\s/g, ' ');

		dirs.forEach((dir, i) => {
			console.log(`Moving dirs: ${i} of ${dirs.length}`);
			const songData = fs.existsSync(`${dir.path}song.ini`)
				? readFile(`${dir.path}song.ini`)
				: null;
			if (songData === null) return;

			const songName = cleanInput(songData.name);
			const artistName = cleanInput(songData.artist);

			if (songName === ' ') throw songData;

			const newPath = cleanDir(
				`${localSongPath}${artistName[0].toUpperCase()}/${artistName}/${songName}/`
			);

			if (!fs.existsSync(newPath)) fs.mkdirSync(newPath, { recursive: true });

			fs.readdirSync(dir.path, 'utf-8').forEach((fileName) => {
				const filePath = `${newPath}${fileName}`;

				if (fs.existsSync(filePath)) {
					fs.writeFileSync(filePath, fs.readFileSync(filePath));
					fs.rmSync(filePath);
				}
			});
			if (fs.existsSync(dir.path) && fs.readdirSync(dir.path).length === 0)
				fs.rmdirSync(dir.path, { recursive: true });
		});
	};

	moveDirs();

	const writeToFile = () => {
		const data = getSongs();

		if (data.length === localSongs.length) {
			const localStrs = localSongs.map((e) => JSON.stringify(e));
			if (data.every((song) => localStrs.includes(JSON.stringify(song.file)))) {
				return console.log('ALL SONGS ALREADY EXIST LOCALLY');
			}
		}
		// return fs.writeFileSync('./local_song_data.json', JSON.stringify(data));
	};

	// writeToFile();
}

organizeLocalSongs();
