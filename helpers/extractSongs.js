import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { isPromise } from 'util/types';

export default async function exportSongs() {
	const downloadsDir = '/media/shauna/01D8C557A46097D0/Downloads/';
	const songsDir = '/media/shauna/01D8C557A46097D0/Songs/SongDL/';

	if (!fs.existsSync(songsDir)) fs.mkdirSync(songsDir);

	const files = fs.readdirSync(downloadsDir, { withFileTypes: true });
	const cleanInput = (e) =>
		e
			.replace(/^[\W]+/g, '')
			.replace(/\.\w+$/g, '')
			.replace(/\./g, '');
	const matchZip = (e) => e.match(/.+.zip/);

	const zips = files.filter((file) =>
		matchZip(file.name) !== null ? true : false
	);

	if (!fs.existsSync(songsDir)) fs.mkdirSync(songsDir, { recursive: true });

	let i = 950;
	for (const file of zips.slice(950, zips.length)) {
		console.log(
			`Extracting file ${i} of ${zips.length}... ${
				Math.round((i / zips.length) * 10000) / 100
			}% done.`
		);

		const sourcePath = path.join(downloadsDir + file.name);
		const read = fs.readFileSync(sourcePath);
		const jszip = new JSZip();

		const data = await jszip
			.loadAsync(read)
			.then((res) =>
				res.files
					? Object.keys(res.files)
							.filter((key) => !res.files[key].dir)
							.map((key) => res.files[key])
					: []
			)
			.catch((err) => console.log(err));

		// if (!Array.isArray(data)) throw console.log(data);
		for (const file of data ? data : []) {
			const pathRegex = /.+(?=\/[\.]?\w+[\.]?\w+)/g;
			const filePath = path.join(songsDir + file.name);
			const dirPath = filePath.match(pathRegex)
				? filePath.match(pathRegex)[0].replace(/\ $/g, '') + '/'
				: undefined;
			// const dirName = file.name.match(/.+(?=\/.+\..+)/) + '/'[0];
			const fileName = file.name.match(/(?<=\/).+\..+/);

			if (!file.dir) {
				if (dirPath && !fs.existsSync(dirPath)) {
					console.log('# DIR PATH', dirPath);
					fs.mkdirSync(dirPath);
				}

				const fileData = (await file._data.compressedContent)
					? file._data.compressedContent
					: '';

				console.log(fileName);
				const newFilePath = dirPath
					? path.join(dirPath + fileName[0])
					: filePath;
				console.log('# FILE PATH', newFilePath);
				if (!fs.existsSync(newFilePath))
					fs.writeFileSync(newFilePath, fileData);
				else console.log('File exists, skipping...');
			}
		}
		i++;
	}
}

exportSongs();
