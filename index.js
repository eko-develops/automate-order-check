import * as dotenv from 'dotenv';
dotenv.config();

import puppeteer from 'puppeteer';
import { browserLaunchOptions } from './config.js';
import { data, writeToFile } from './readData.js';

(async () => {
	const browser = await puppeteer.launch(browserLaunchOptions);

	const page = await browser.newPage();

	await page.goto(process.env.LOGIN_URL);

	/**
	 * Handling authentication
	 */
	await authenticate(page);

	/**
	 * Authenticated
	 */
	await waitForSelectorAndClick(page, "a[href='TransactionReport.aspx']");

	await waitForVisibleSelector(page, '#tableStatusTotals');

	/**
	 * Handling form
	 */
	await fillDateFields(page);

	/**
	 * Handling selects in form
	 */
	await chooseSelects(page);

	/**
	 * Submit form
	 */
	await submitForm(page);

	/**
	 * We need to wait for response to ensure we have the correct data populated
	 */
	await waitForResponse(page, process.env.RESPONSE_URL);

	// waiting for the page to load approved in status table
	await page.waitForFunction(
		'document.querySelector("#tableStatusTotals tbody tr td").innerText = "Approved"'
	);

	/**
	 * Make sure at least 1 row is visible
	 */
	await waitForVisibleSelector(
		page,
		"#MainContent_bodyAuto tr.odd[role='row']"
	);

	/**
	 * Get the first record showing
	 */
	const record = await page.evaluate(
		() => document.querySelector('#MainContent_bodyAuto tr.odd').innerText
	);

	/**
	 * Recursively check if record is pending. This is because once a response is received, there is still some time before the data is populated on the table.
	 */
	await isRecordPending(page, record);

	/**
	 * Wait for the search box to show before trying to type
	 */
	await waitForVisibleSelector(page, '#transactions-table_filter');

	/**
	 * Test each line within input.txt in the search box
	 */
	await typeData(page);

	await browser.close();
})();

const DateBuilder = {
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

function delay(time) {
	return new Promise(function (resolve) {
		setTimeout(resolve, time);
	});
}

async function authenticate(page) {
	try {
		// handle username input
		await page.waitForSelector('input#Account');
		await page.type('#Account', process.env.USER, { delay: 20 });

		// handle password input
		await page.waitForSelector('input[name="Password"]');
		await page.type('input[name="Password"]', process.env.PASS, {
			delay: 20,
		});

		await page.click("button[type='submit']");
	} catch (e) {
		console.log('Error authenticating: ', e.message);
	}
}

async function isRecordPending(page, pendingRecord) {
	try {
		if (pendingRecord === undefined) {
			await delay(5000); // wait some time before re-calling function

			const updatedRecord = await page.evaluate(
				() => document.querySelector('#MainContent_bodyAuto tr.odd').innerText
			);
			await isRecordPending(page, updatedRecord);

			return;
		}

		if (
			!pendingRecord.toLowerCase().includes('pending') ||
			pendingRecord.toLowerCase().includes('approved')
		)
			return;

		await delay(5000); // wait some time before re-calling function

		const updatedRecord = await page.evaluate(
			() => document.querySelector('#MainContent_bodyAuto tr.odd').innerText
		);

		await isRecordPending(page, updatedRecord);
	} catch (e) {
		console.log('Error checking if record is pending (recursive): ', e.message);
	}
}

async function waitForSelectorAndClick(page, selector) {
	try {
		await page.waitForSelector(selector);
		await page.click(selector);
	} catch (e) {
		console.log('Error waiting for selector and clicking: ', e.message);
	}
}

async function waitForVisibleSelector(page, selector) {
	try {
		await page.waitForSelector(selector, { visible: true });
	} catch (e) {
		console.log('Error waiting for visible selector: ', e.message);
	}
}

async function waitForSelectorAddData(page, selector, data) {
	try {
		await page.waitForSelector(selector);
		// set the start date as past date
		await page.$eval(
			selector,
			(element, value) => (element.value = value),
			data
		);
	} catch (e) {
		console.log('Wait for selector and add data error: ', e.message);
	}
}

async function fillDateFields(page) {
	try {
		// start date
		await waitForSelectorAddData(
			page,
			'#MainContent_Date1',
			DateBuilder.getPastDateToString(3)
		);

		// end date
		await waitForSelectorAddData(
			page,
			'#MainContent_Date2',
			DateBuilder.toString()
		);
	} catch (e) {
		console.log('Error filling date fields: ', e.message);
	}
}

async function select(page, selector, option) {
	try {
		await page.waitForSelector(selector);

		await page.select(selector, option);
	} catch (e) {
		console.log('Error selecting select: ', e.message);
	}
}

async function chooseSelects(page) {
	try {
		await select(page, '#MainContent_input_type', 'D');
		await select(page, '#inputStatusSelect', '1');
	} catch (e) {
		console.log('Error choosing a select: ', e.message);
	}
}

async function submitForm(page) {
	try {
		await page.click('#Button1');
	} catch (e) {
		console.log('Error submitting form: ', e.message);
	}
}

async function waitForResponse(page, URL) {
	try {
		await page.waitForResponse(
			(response) => response.url().includes(URL) && response.status() === 200
		);
	} catch (e) {
		console.log('Error waiting for response: ', e.message);
	}
}

async function typeData(page) {
	try {
		// data: string[]
		for (const reference of data) {
			//clear the search box on every search
			await page.$eval(
				'#transactions-table_filter input.form-control',
				(element) => (element.value = '')
			);

			// type search box value
			await page.type(
				'#transactions-table_filter input.form-control',
				reference
			);

			await delay(100);

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
	} catch (e) {
		console.log('Error typing data into search field: ', e.message);
	}
}
