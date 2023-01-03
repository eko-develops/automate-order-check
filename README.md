# automate-order-check

## Install & Setup

### Clone the repository

`git clone https://github.com/eko-develops/automate-order-check.git`

### Install packages

`npm install`

### Setup Enviroment Variables

This project uses `dotenv`. In the project root folder, create a file named `.env`.

Fill in the enviroment variables for:  
LOGIN_URL  
USER  
PASS

## How To Use

Add references into the `data/input.txt` file. Only 1 reference per line is handled. White spaces are trimmed and empty rows are filtered out.

Run `npm run start` to start the automation job.

The output of the job will be in `data/output.txt`. References will be labeled with `FOUND` or `NOT FOUND`.

## To Do

- Find a way to target first opened tab on browser launch instead of calling `browser.newPage()`

## Referencess

### Puppeteer

- [Docs](https://pptr.dev/)
- [Configuration](https://pptr.dev/guides/configuration/)
- [Query Selectors](https://pptr.dev/guides/query-selectors)
- [Evaluate Javascript](https://pptr.dev/guides/evaluate-javascript)
- [Debugging](https://pptr.dev/guides/debugging)
