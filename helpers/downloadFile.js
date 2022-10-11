import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';

export default async function downloadFile(fileId) {
	const auth = new GoogleAuth({
		scopes: 'https://www.googleapis.com/auth/drive',
	});
	const service = google.drive({ version: 'v3', auth });

	try {
		const file = await service.files.get({
			fileId: fileId,
			alt: 'media',
		});
		console.log(file.status);
		return file.status;
	} catch (err) {
		throw err;
	}
}
