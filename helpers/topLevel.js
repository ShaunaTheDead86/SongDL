import fs from 'fs';
import pg from 'pg';
import getGoogleAuth from './getGoogleAuth.js';
import { authenticate } from '@google-cloud/local-auth';
import { google } from 'googleapis';

// const sources = fs.existsSync('./sources.json')
// 	? JSON.parse(fs.readFileSync('./sources.json', 'utf-8'))
// 	: [
// 			'1kgPCEt990poTNQC5tM0x8ghKOLVgDIZt',
// 			'1NqgS3ZcgtJkawaptp49WKbXR4MIohoiU',
// 			'1aLXbFIFQto22MNa_hfkyeXCrAVbZsPj-',
// 			'1AvmWyROT4qECfvwwq8hXy5Bye2bDCB6J',
// 			'1vex6WDlj70XjUHTU1Y0yvKDx1060-71E',
// 			'1AL_ilZu_di83Kt1o6EfVDCp5qpLAIhfT',
// 			'1T9NnI2P00FAJpgEF7nW_OUARRwWdz_ic',
// 			'1daRhysvylcEAvR8iGsnV-Kxy1C19x3d8',
// 			'1NYj77jI1i77FQfpjdrgLEkMDNEnpPunL',
// 			'15zIFxkBDPUceLacBsLIZWvbOeM3HmdWw',
// 	  ];

// const songParams = [
// 	'name',
// 	'artist',
// 	'album',
// 	'genre',
// 	'charter',
// 	'md5',
// 	'tier_band',
// 	'tier_guitar',
// 	'tier_bass',
// 	'tier_rhythm',
// 	'tier_drums',
// 	'tier_vocals',
// 	'tier_keys',
// 	'tier_guitarghl',
// 	'tier_bassghl',
// 	'diff_guitar',
// 	'diff_bass',
// 	'diff_rhythm',
// 	'diff_drums',
// 	'diff_keys',
// 	'diff_guitarghl',
// 	'diff_bassghl',
// 	'hasForced',
// 	'hasOpen',
// 	'hasTap',
// 	'hasSections',
// 	'hasStarPower',
// 	'hasSoloSections',
// 	'hasStems',
// 	'hasVideo',
// 	'hasLyrics',
// ];

// const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf-8'));
// const getMissingSongs = (localSongs, dbSongs) => {
// 	const cleanInput = (e) =>
// 		e && typeof e === 'string' ? e.replace(/[\W\s]/g) : '';
// 	return dbSongs.filter((dbSong, i) => {
// 		console.log(`Song ${i} of ${dbSongs.length}`);
// 		return localSongs.some((localSong) => {
// 			const name = cleanInput(localSong.name);
// 			const artist = cleanInput(localSong.artist);
// 			// const charter = cleanInput(localSong.charter);
// 			const dbName = cleanInput(dbSong.name);
// 			const dbArtist = cleanInput(dbSong.artist);
// 			// const dbCharter = cleanInput(dbSong.charter);

// 			return name === dbName && artist === dbArtist;
// 		});
// 	});
// };

// const localSongPath = '/media/shauna/01D8C557A46097D0/Songs/';
// const localSongs = readJson('../local_song_data.json');
// const dbSongs = readJson('../song_data.json');
// // const missingSongs = getMissingSongs(localSongs, dbSongs);
// const missingSongsFile = readJson('../missing_song_data.json');
const auth = await getGoogleAuth();
const service = google.drive({ version: 'v3', auth });
const isFolder = (fileMimeType) =>
	fileMimeType === 'application/vnd.google-apps.folder';
const isShortcut = (fileMimeType) =>
	fileMimeType === 'application/vnd.google-apps.shortcut';
const isFile = (fileMimeType) =>
	!isFolder(fileMimeType) && !isShortcut(fileMimeType);

const readDriveFile = async (service, fileId) => {
	console.log('Reading file ', fileId);
	return await service.files
		.get({
			fileId: fileId,
			media: 'json',
			fields: 'id, mimeType, shortcutDetails',
		})
		.then((res) => res.data)
		.catch((err) => console.log(err));
};

const readDriveShortcut = async (service, fileId) => {
	console.log('Reading shortcut ', fileId);
	const shortcut = await readDriveFile(service, {
		fileId: fileId,
		media: 'json',
		fields: 'id, name, shortcutDetails',
	});
	const targetId = shortcut.shortcutDetails.targetId;
	const targetMimeType = shortcut.shortcutDetails.targetMimeType;

	if (isShortcut(targetMimeType)) return readDriveShortcut(service, targetId);
	return { id: shortcut.shortcutDetails.targetId };
};

const readDriveFolder = async (service, folderId) => {
	console.log(`Reading folder ${folderId}`);
	return await service.files
		.list({
			q: `'${folderId}' in parents`,
		})
		.then((res) => res.data.files)
		.catch((err) => console.log(err));
};

const getFileObj = (files) => {
	return {
		shortcuts: files.filter((e) => isShortcut(e.mimeType)),
		folders: files.filter((e) => isFolder(e.mimeType)),
		files: files.filter((e) => isFile(e.mimeType)),
	};
};

const processShortcuts = async (shortcuts) => {
	const folders = [];

	for (const shortcut of shortcuts) {
		const source = await readDriveFile(service, shortcut.id)
			.then((res) => res)
			.catch((err) => console.log(err));

		if (isFolder(source.shortcutDetails.targetMimeType)) {
			folders.push({
				id: source.shortcutDetails.targetId,
				mimeType: source.shortcutDetails.targetMimeType,
			});
		}
	}

	return folders;
};

const sources = [
	{
		id: '1kgPCEt990poTNQC5tM0x8ghKOLVgDIZt',
		mimeType: 'application/vnd.google-apps.folder',
	},
];

const getSubFolder = async (service, fileId) => {};

const getAllDriveFiles = async (sources) => {
	const files = [];

	for (const source of sources) {
		const obj = getFileObj(await readDriveFolder(service, source.id));

		if (obj.shortcuts.length > 0) {
			const folders = await processShortcuts(obj.shortcuts);
			files.push(...(await getAllDriveFiles(folders)));
		}

		if (obj.folders.length > 0) {
			files.push(...(await getAllDriveFiles(obj.folders)));
		}

		files.push(...obj.files);
	}

	console.log(files);
	return files;
};

const files = await getAllDriveFiles(sources);
fs.writeFileSync('../files.json', JSON.stringify(files));

// fs.writeFileSync('./sources.json', JSON.stringify(newSources));

// getAllDriveFiles(sources);

/*
	Get Data from sources
		- if song_data.json exists return song_data.json
		- else get data from API
	Populate Database
		- use song_data.json to populate local database
	Get Local Song Data
		- get song.ini text files from local song dir
		- convert song.ini files to array of json objects
		- update and write local_song_data.json
		- organize local files into letter folders based on artist name
	Get Missing Songs Data
		- compare song_data.json and local_song_data.json to determine missing songs
		- write to missing_song_data.json
	Download Missing Songs
		- iterate through missing_song_data.json
			- authorize with google and download song to local download path
				- if zipped, extract to download folder
			- move folder to local song path
	
*/

// const getLocalSongs = (localSongPath) => {
// 	const localSongs = readLocalJson('../local_song_data.json');
// 	const songs = getAllFiles(localSongPath, 'song.ini');

// 	if (deepEqualArr(songs, localSongs)) return songs;
// 	return localSongs;
// };

// const populateDatabase = (pgClient, dbName, data) => {
// 	createTable(pgClient, dbName);

// 	if (getDatabaseSize(data) < data.length) {
// 		for (const song of data) {
// 			console.log('# INSERTING SONG', song.id);
// 			const params = getParams(song);

// 			const alterColumns = cleanColumnsForAlter(params);
// 			addColumn(pgClient, dbName, alterColumns);

// 			const insertColumns = cleanColumnsForInsert(params);
// 			insertData(pgClient, dbName, insertColumns);
// 		}
// 	}

// 	closeDatabaseConnection(pgClient);
// 	console.log('Database created successfully');
// };
