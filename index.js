import * as dotenv from 'dotenv';
dotenv.config();

import puppeteer from 'puppeteer';
import { browserLaunchOptions } from './config.js';
import { data, writeToFile } from './readData.js';

(async () => {
	const browser = await puppeteer.launch(browserLaunchOptions);

	const page = await browser.newPage();

	await page.goto(process.env.LOGIN_URL);

	// handle username input
	await page.waitForSelector('input#Account');
	await page.type('#Account', process.env.USER, { delay: 20 });

	// handle password input
	await page.waitForSelector('input[name="Password"]');
	await page.type('input[name="Password"]', process.env.PASS, {
		delay: 20,
	});

	await page.click("button[type='submit']");

	// click on transactions report
	await page.waitForSelector("a[href='TransactionReport.aspx']");
	await page.click("a[href='TransactionReport.aspx']");

	// wait for initial table to populate
	await page.waitForSelector('#tableStatusTotals', { visible: true });

	// date obj lets us create date strings
	const date = {
		currentDate: new Date(),
		toString(date = new Date()) {
			const month = date.getMonth() + 1;
			const day = date.getDate();
			const year = date.getFullYear();
			return `${month}/${day}/${year}`;
		},
		getPastDateToString(int) {
			let pastDate = new Date(this.currentDate);
			pastDate.setMonth(pastDate.getMonth() - int);
			return this.toString(pastDate);
		},
	};

	// wait for start date
	await page.waitForSelector('#MainContent_Date1');

	// set the start date as past date
	await page.$eval(
		'#MainContent_Date1',
		(element, value) => (element.value = value),
		date.getPastDateToString(3)
	);

	// wait for end date
	await page.waitForSelector('#MainContent_Date2');

	// set the end date as current date
	await page.$eval(
		'#MainContent_Date2',
		(element, value) => (element.value = value),
		date.toString()
	);

	// wait for selects
	await page.waitForSelector('#MainContent_input_type'); // transaction type select
	await page.waitForSelector('#inputStatusSelect'); // status select

	// choosing selections
	await page.select('#MainContent_input_type', 'D');
	await page.select('#inputStatusSelect', '1');

	await page.click('#Button1');

	//wait for the response. page does not update yet when the response is resolved, but we should check anyways
	const response = await page.waitForResponse(
		(response) =>
			response.url().includes(process.env.RESPONSE_URL) &&
			response.status() === 200
	);

	// waiting for the page to load approved in status table
	await page.waitForFunction(
		'document.querySelector("#tableStatusTotals tbody tr td").innerText = "Approved"'
	);

	// we need to make sure there is at least 1 row showing before we start searching
	const row = await page.waitForSelector(
		'#MainContent_bodyAuto tr.odd[role="row"]',
		{
			visible: true,
		}
	);

	if (!row) throw new Error('Could not find a record');

	// get the first record that is showing
	const record = await page.evaluate(
		() => document.querySelector('#MainContent_bodyAuto tr.odd').innerText
	);

	const isRecordPending = async (pendingRecord) => {
		if (
			!pendingRecord.toLowerCase().includes('pending') ||
			pendingRecord.toLowerCase().includes('approved')
		)
			return;
		// wait 2 seconds before getting the updated record. in this time, the record may resolve.
		delay(2000);

		const updatedRecord = await page.evaluate(
			() => document.querySelector('#MainContent_bodyAuto tr.odd').innerText
		);

		await isRecordPending(updatedRecord);
	};

	await isRecordPending(record);

	// make sure the search box is visible
	await page.waitForSelector('#transactions-table_filter', { visible: true });

	// data: string[]
	for (const reference of data) {
		//clear the search box on every search
		await page.$eval(
			'#transactions-table_filter input.form-control',
			(element) => (element.value = '')
		);

		// type search box value
		await page.type('#transactions-table_filter input.form-control', reference);

		// check the table body for the empty element
		const emptyRecordElement = await page.$('td.dataTables_empty');

		// if we dont find the emptyRecordElement, that means there is a record
		if (emptyRecordElement === null) {
			// there is a record
			writeToFile(`${reference} - FOUND`);
		} else {
			// there is no record
			writeToFile(`${reference} - NOT FOUND`);
		}
	}

	await browser.close();
})();

function delay(time) {
	return new Promise(function (resolve) {
		setTimeout(resolve, time);
	});
}
