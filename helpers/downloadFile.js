import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import process from 'process';
import { authenticate } from '@google-cloud/local-auth';
import { google } from 'googleapis';
import JSZip from 'jszip';

export default async function downloadFile(fileId, savePath) {
	const SCOPES = ['https://www.googleapis.com/auth/drive'];
	const TOKEN_PATH = path.join(process.cwd(), 'token.json');
	const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

	async function loadSavedCredentialsIfExist() {
		try {
			const content = await fsPromises.readFile(TOKEN_PATH);
			const credentials = JSON.parse(content);
			return google.auth.fromJSON(credentials);
		} catch (err) {
			return null;
		}
	}

	async function saveCredentials(client) {
		const content = await fsPromises
			.readFile(CREDENTIALS_PATH)
			.then((res) => res);
		const keys = JSON.parse(content);
		const key = keys.installed || keys.web;
		const payload = JSON.stringify({
			type: 'authorized_user',
			client_id: key.client_id,
			client_secret: key.client_secret,
			refresh_token: client.credentials.refresh_token,
		});
		await fsPromises.writeFile(TOKEN_PATH, payload).then((res) => res);
	}

	async function authorize() {
		let client = await loadSavedCredentialsIfExist();
		if (client) {
			return client;
		}
		client = await authenticate({
			scopes: SCOPES,
			keyfilePath: CREDENTIALS_PATH,
		});
		if (client.credentials) {
			await saveCredentials(client);
		}
		return client;
	}

	const auth = await authorize()
		.then((res) => res)
		.catch(console.error);
	const service = google.drive({ version: 'v3', auth });

	async function getFileData(fileId) {
		return await service.files
			.get({
				fileId: fileId,
				alt: 'json',
				fields: 'id, name, mimeType',
			})
			.then((res) => {
				return res.data;
			})
			.catch((err) => console.log('# GET FILE DATA REQUEST ERROR', err.status));
	}

	async function getFile(fileId, savePath) {
		const dest = fs.createWriteStream(savePath);

		return await service.files
			.get(
				{
					fileId: fileId,
					alt: 'media',
				},
				{ responseType: 'stream' }
			)
			.then((res) => {
				res.data
					.on('end', () => null)
					.on('error', (err) => console.log('Error downloading: ', err))
					.pipe(dest);
			})
			.catch((err) => console.log('# DOWNLOAD FILE REQUEST ERROR', err.code));
	}

	async function getFolderFiles(id) {
		return await service.files
			.list({
				q: `'${id}' in parents`,
				useDomainAdminAccess: true,
			})
			.then((res) => {
				return res.data.files;
			})
			.catch((err) => console.log('# GET FOLDER FILES REQUEST ERROR', err));
	}

	const isFolder = (e) => e === 'application/vnd.google-apps.folder';
	const cleanInput = (e) => e.replace(/[^\s\w]/g, '');

	const fileData = await getFileData(fileId);

	function createZip(folderName, tempPath, zipPath) {
		const zip = new JSZip();
		const folder = zip.folder(folderName);

		fs.readdirSync(tempPath).forEach((file) => {
			const filePath = path.join(tempPath + file);
			const fileData = fs.readFileSync(filePath);
			folder.file(file, fileData);
			fs.rmSync(filePath, { recursive: true, force: true });
		});

		zip
			.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
			.pipe(fs.createWriteStream(zipPath))
			.on('finish', () => null);
	}

	if (fileData) {
		const id = fileData.id;
		const name = cleanInput(fileData.name);
		const mimeType = fileData.mimeType;

		const zipPath = path.join(
			savePath + name + (isFolder(mimeType) ? '.zip' : '')
		);
		if (fs.existsSync(zipPath))
			return console.log('File already exists, skipping...');

		const tempPath = path.join(savePath + 'temp/');
		if (!fs.existsSync(tempPath)) fs.mkdirSync(tempPath);

		if (isFolder(mimeType)) {
			const files = await getFolderFiles(id);

			for (const file of files) {
				await getFile(file.id, path.join(tempPath + file.name));
			}

			createZip(name, tempPath, zipPath);
		} else {
			const fileSavePath = path.join(savePath + name);
			await getFile(fileId, fileSavePath);
		}
	}

	return;
}
