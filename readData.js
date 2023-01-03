import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const inputPath = path.join(__dirname, '/data', 'input.txt');
const outputPath = path.join(__dirname, '/data', 'output.txt');

const getData = () => {
	const result = fs.readFileSync(inputPath, { encoding: 'utf8' });
	const parsedResult = result
		.split('\r\n')
		.filter((result) => result.length > 0)
		.map((result) => result.trim());

	return parsedResult;
};

export const data = getData();

export const writeToFile = (data) => {
	fs.appendFileSync(outputPath, data + '\n');
};
