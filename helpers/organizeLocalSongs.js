import fs, { readdir, readdirSync } from 'fs';
import path from 'path';
import mv from 'mv';

export default function organizeLocalSongs() {
	const localSongPath = '/media/shauna/01D8C557A46097D0/Songs/';
	const localSongs = fs.existsSync('./local_song_data.json')
		? JSON.parse(fs.readFileSync('./local_song_data.json', 'utf-8'))
		: [];

	const removeSpaces = (input) => {
		return Array.isArray(input)
			? input.map((e) => e.replace(/^\s+/g, '').replace(/\s+$/g, ''))
			: input.replace(/^\s+/g, '').replace(/\s+$/g, '').replace(/\ \ /g, `\ `);
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
		const cleanInput = (e) => removeSpaces(e.replace(/[^\w\s\(\)\!]/g, `\ `));
		const getFirstLetter = (e) =>
			typeof e === 'string' ? e.match(/\w/)[0].toUpperCase() : e;
		const checkSlash = (e) => (e === '' || e === ' ' ? '' : '/');

		dirs.forEach((dir, i) => {
			const songData = fs.existsSync(`${dir.path}song.ini`)
				? readFile(`${dir.path}song.ini`)
				: null;
			if (songData === null)
				return fs.readdirSync(dir.path).length === 0
					? fs.rmdirSync(dir.path)
					: console.log('Dir not empty');

			const songName = cleanInput(songData.name);
			const artistName = cleanInput(songData.artist).replace(/^the\ /gi, '');
			const artistLetter = getFirstLetter(artistName).toUpperCase();
			const newPath = `${localSongPath}${artistLetter}${checkSlash(
				artistLetter
			)}${artistName}${checkSlash(artistName)}${songName}${checkSlash(
				songName
			)}`;

			if (!fs.existsSync(newPath)) fs.mkdirSync(newPath, { recursive: true });

			fs.readdirSync(dir.path, 'utf-8').forEach((fileName) => {
				const originPath = `${dir.path}${fileName}`;
				const newFilePath = `${newPath}${fileName}`;

				if (newFilePath !== originPath) {
					console.log(
						`Moving file ${fileName} from ${dir.path} to ${newFilePath}`
					);
					mv(originPath, newFilePath, { mkdirp: true }, (err) => {
						directorylinux;
						if (err) console.log(err);
					});
				}
			});

			if (fs.readdirSync(dir.path).length === 0) fs.rmdirSync(dir.path);
		});
	};

	const checkBadSongs = () => {
		const badSongsPath = '/home/shauna/Clone Hero/badsongs.txt';
		const songsPath = `/media/shauna/01D8C557A46097D0/Songs/`;
		const badSongsText = fs.existsSync(badSongsPath)
			? fs.readFileSync(badSongsPath, 'utf-8')
			: '';

		const dirRegex = new RegExp('^' + songsPath + '.+', 'gm');
		const dirMatch = badSongsText.match(dirRegex);

		if (dirMatch !== null) {
			dirMatch.forEach((dir) => {
				if (fs.existsSync(dir)) fs.rmdirSync(dir, { force: true });
			});
		}

		const sixFretRegex = new RegExp(`^` + songsPath + `.+(?=[\(][\/])`, 'gm');
		const sixFretMatch = badSongsText.match(sixFretRegex);

		if (sixFretMatch !== null) {
			sixFretMatch.forEach((dir) => {
				const cleanDir = dir.replace(/^\ /, '').replace(/\ $/, '');

				if (fs.existsSync(cleanDir)) {
					fs.readdirSync(cleanDir, 'utf-8').forEach((file) => {
						fs.rmSync(cleanDir + '/' + file);
					});
					fs.rmdirSync(cleanDir, { force: true });
				}
			});
		}
	};

	const writeToFile = () => {
		const data = getSongs();
		const fileData = data.map((e) => e.file);

		if (data.length === localSongs.length) {
			const localStrs = localSongs.map((e) => JSON.stringify(e));
			const dataStrs = fileData.map((e) => JSON.stringify(e));
			if (dataStrs.every((songStr) => localStrs.includes(songStr))) {
				return console.log('ALL SONGS ALREADY EXIST LOCALLY');
			}
		}

		return fs.writeFileSync('./local_song_data.json', JSON.stringify(fileData));
	};

	moveDirs();
	checkBadSongs();
	writeToFile();
}

organizeLocalSongs();
