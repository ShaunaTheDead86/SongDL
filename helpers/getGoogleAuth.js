import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import { authenticate } from '@google-cloud/local-auth';
import { google } from 'googleapis';

export default async function getGoogleAuth() {
	// If modifying these scopes, delete token.json.
	const SCOPES = ['https://www.googleapis.com/auth/drive'];
	// The file token.json stores the user's access and refresh tokens, and is
	// created automatically when the authorization flow completes for the first
	// time.
	const TOKEN_PATH = path.join(process.cwd(), './token.json');
	const CREDENTIALS_PATH = path.join(process.cwd(), './credentials.json');

	async function loadSavedCredentialsIfExist() {
		try {
			const content = await fs.readFile(TOKEN_PATH);
			const credentials = JSON.parse(content);
			return google.auth.fromJSON(credentials);
		} catch (err) {
			return null;
		}
	}

	async function saveCredentials(client) {
		const content = await fs.readFile(CREDENTIALS_PATH);
		const keys = JSON.parse(content);
		const key = keys.installed || keys.web;
		const payload = JSON.stringify({
			type: 'authorized_user',
			client_id: key.client_id,
			client_secret: key.client_secret,
			refresh_token: client.credentials.refresh_token,
		});
		await fs.writeFile(TOKEN_PATH, payload);
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

	return await authorize()
		.then((res) => res)
		.catch(console.error);
}
