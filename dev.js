import * as dotenv from 'dotenv';
dotenv.config();

import puppeteer from 'puppeteer';
import { browserLaunchOptions } from './config.js';

(async () => {
	const browser = await puppeteer.connect({
		browserURL: 'http://127.0.0.1:5555/',
		...browserLaunchOptions,
	});

	const page = await browser.pages().then((pages) => pages[0]);

	const pendingRecord = await page.evaluate(
		() => document.querySelector('#MainContent_bodyAuto tr.odd').innerText
	);

	console.log(page.url());
	console.log(typeof pendingRecord);
	console.log(pendingRecord);

	console.log(pendingRecord.includes('Pending'));
})();
