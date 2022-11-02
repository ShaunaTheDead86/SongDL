import fs from 'fs';
import { isObj } from './genericHelpers.js';

export default function readDataFromFile() {
	// FUNCTIONS FOR READING DATA FROM FILES
	const getSongs = () =>
		JSON.parse(
			fs
				.readFileSync('./song_data.json', { encoding: 'utf-8' })
				.map((e) => JSON.parse(e))
				.sort((a, b) => a.id - b.id)
		);

	const cleanColumnsForAlter = (params) =>
		params.map((e) => [cleanInput(e[0]), getDataType(e[1])]);

	const cleanColumnsForInsert = (params) =>
		params.map((e) => [cleanInput(e[0]), e[1]]);

	const getSongParams = (obj, topObj) => {
		const params = [];

		for (const key in obj) {
			isObj(obj[key]) && Object.keys(obj[key]).length > 0
				? params.push([key, getParams(obj[key])])
				: isObj(obj[key]) && Object.keys(obj[key]).length === 0
				? params.push([key, null])
				: params.push([key, obj[key]]);
		}

		return params;
	};

	const paramsToTop = (params, parentName) => {
		return params.map((param, i) => {
			param[0] = addParentName(param[0], parentName);

			if (isParam(param)) {
				return param;
			}

			if (param[1].length > 1) {
				return paramsToTop(param[1], param[0]);
			}

			return paramsToTop(param[1], param[0])[0];
		});
	};

	const flattenParams = (params) => {
		while (params.some((e) => e.every((f) => isArr(f)))) {
			params.forEach((e, i) => {
				if (e.every((f) => isArr(f))) {
					params.splice(i, 1);
					e.forEach((f) => {
						params.splice(i, 0, f);
					});
				}
			});
		}

		return params;
	};

	const getParams = (song) => {
		const songParams = getSongParams(song);
		const topParams = paramsToTop(songParams);
		const flatParams = flattenParams(topParams).map((param) => {
			return param.map((e) => {
				return typeof e === 'function' ? null : e;
			});
		});
		flatParams[0][0] = 'song_id';

		return flatParams;
	};

	const readLocalJson = (path) =>
		fs.existsSync(path)
			? JSON.parse(fs.readFileSync(path), 'utf-8')
			: console.log(`Error reading Json at ${path}`);

	const convertSongIniToObject = (filePath) => {
		const song = fs.readFileSync(filePath);
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
	};

	const filterDuplicateSongs = (songs) => {
		const goodSong = (e) =>
			e &&
			e !== null &&
			e.artist &&
			e.name &&
			e.artist !== null &&
			e.name !== null;
		const songStrs = songs.map((e) => JSON.stringify(e));

		return songs.filter((song) => {
			if (!goodSong(song) || songStrs.includes(JSON.stringify(song)))
				return false;
			return true;
		});
	};

	const getAllFiles = (path, fileName) => {
		return filterDuplicateSongs([
			...fs
				.readdirSync(path, { withFileTypes: true })
				.map((file) => {
					if (file.isDirectory()) return getAllFiles(path + file.name + '/');
					if (fileName && file.name === 'song.ini')
						return convertSongIniToObject(path + fileName);
					return;
				})
				.filter((e) => e && e !== null),
		]);
	};

	const writeToFile = (data, path, backup) =>
		backup && data.length === backup.length
			? console.log('ALL SONGS ALREADY EXIST LOCALLY')
			: fs.writeFileSync(path, data);

	return {
		getSongs,
		cleanColumnsForAlter,
		cleanColumnsForInsert,
		getParams,
		readLocalJson,
		writeToFile,
		getAllFiles,
	};
}
