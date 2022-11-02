import fsPromises from 'fs/promises';
import pg from 'pg';

export default async function populateDatabase(data) {
	const pgClient = new pg.Client({
		host: 'localhost',
		port: 5432,
		user: 'shauna',
		password: 'shauna',
		database: 'songs',
		ssl: false,
	});

	await pgClient.connect();

	const songs = await fsPromises
		.readFile('./song_data.json', {
			encoding: 'utf-8',
		})
		.then((res) =>
			JSON.parse(res)
				.map((e) => JSON.parse(e))
				.sort((a, b) => a.id - b.id)
		);

	const isObj = (e) => typeof e === 'object' && e !== null;
	const isArr = (e) => Array.isArray(e);
	const cleanInput = (e) =>
		typeof e === 'string' && e.replace(/[^A-Za-z0-9]/g, '_');

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

	const addParentName = (str, parentName) => {
		return parentName ? `${parentName}_${str}` : str;
	};

	const isParam = (arr) => isArr(arr) && arr.every((e) => !isArr(e));

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
		const flatParams = flattenParams(topParams);

		return flatParams;
	};

	const getDataType = (param) => {
		if (typeof param === 'string') return 'TEXT';
		if (typeof param === 'number') return 'INTEGER';
		if (typeof param === 'boolean') return 'BOOLEAN';
		return 'TEXT';
	};

	const dropTable = (table) => {
		const query = `DROP TABLE IF EXISTS ${table} CASCADE;`;

		return pgClient.query(query);
	};

	const createTable = (table) => {
		const query = `CREATE TABLE IF NOT EXISTS ${table}(id SERIAL PRIMARY KEY);`;

		return pgClient.query(query);
	};

	const addColumn = async (table, columns) => {
		const addColumn = columns.map((e) => {
			return ` ADD COLUMN IF NOT EXISTS ${e[0]} ${e[1]}`;
		});

		const query = `ALTER TABLE IF EXISTS ${table} ${addColumn};`;

		try {
			pgClient
				.query(query)
				.then((res) => res)
				.catch((err) => {
					throw `Error: ${(err, columns)}`;
				});
		} catch (err) {
			throw `Error: ${(err, columns)}`;
		}
	};

	const insertData = async (table, columns) => {
		const names = columns.map((e, i) => `${e[0]}`);
		const values = columns.map((e, i) => {
			if (typeof e[1] === 'string') return `'${e[1]}'`;
			return ` ${e[1]}`;
		});

		const query = `INSERT INTO ${table}(${names}) VALUES(${values}) ON CONFLICT (id) DO NOTHING;`;

		try {
			await pgClient
				.query(query)
				.then((res) => res)
				.catch((err) => {
					throw `Error: ${(err, names, values)}`;
				});
		} catch (err) {
			throw `Error: ${(err, names, values)}`;
		}
	};

	await createTable('songs')
		.then((res) => res)
		.catch((err) => console.log(err));

	const dbSongLength = await pgClient
		.query(`SELECT COUNT(id) FROM songs;`)
		.then((res) => res.rowCount)
		.catch((err) => console.log(err));

	if (dbSongLength < songs.length) {
		for (const song of songs) {
			console.log('# INSERTING SONG', song.id);
			const params = getParams(song).map((param) => {
				return param.map((e) => {
					return typeof e === 'function' ? null : e;
				});
			});
			params[0][0] = 'song_id';

			const table = 'songs';
			const alterColumns = params.map((e) => [
				cleanInput(e[0]),
				getDataType(e[1]),
			]);
			const insertColumns = params.map((e) => [cleanInput(e[0]), e[1]]);

			await addColumn(table, alterColumns);
			await insertData(table, insertColumns);
		}
	}

	await pgClient.end();

	console.log('Database created successfully');
}
