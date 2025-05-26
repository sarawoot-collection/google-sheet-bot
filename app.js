const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '.env') });

// require('dotenv').config();

const log = (...text) => {
	let now = new Date();
	let serverTime = now.toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' }).replace('T', ' ');
	let milliseconds = now.getMilliseconds().toString().padStart(3, '0');
	console.log(`${serverTime}.${milliseconds} [INFO] :`, ...text);
};

const logerr = (...text) => {
	let now = new Date();
	let serverTime = now.toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' }).replace('T', ' ');
	let milliseconds = now.getMilliseconds().toString().padStart(3, '0');
	console.error(`${serverTime}.${milliseconds} [ERROR] :`, ...text);
};

const appendToFile = async (filePath, textToAppend) => {
    fs.appendFile(filePath, textToAppend + '\n', (err) => {
        if (err) {
            logerr('Error appending to file:', err);
        } else {
            log('Text appended to file successfully.');
        }
    });
}

const writeFile = async (filePath, text) => {
    fs.writeFile(filePath, text + '\n', (err) => {
        if (err) {
            logerr('Error write to file:', err);
        } else {
            log(`Write (${text}) to file successfully.`);
        }
    });
}

const readFile = async (filePath) => {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });

    const iterator = rl[Symbol.asyncIterator]();
    const { value } = await iterator.next();

    rl.close();

    return value;
}

const getSheetData = async () => {
    const auth = new google.auth.GoogleAuth({
        keyFile: `${__dirname}/key/key.json`,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    const spreadsheetId = `${process.env.SPREADSHEET_ID}`;
    const tabName = 'data';
    const range = `${tabName}!A2:E`;
    const pathFile = `${process.env.PATH_FILE}`;
    const lastTimeStampFile = `${__dirname}/${process.env.FILE_LAST_TIMESTAMP}`;

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
    });

    const rows = response.data.values;

    const lastTimeStamp = await readFile(lastTimeStampFile);

    if (rows.length > 0) {

        log('Found data from Google Sheet.');

        rows.forEach((row, index) => {

            if (index == (rows.length - 1)) {

                log(`Last row: ${row}`);

                let datetime = row[0];
                let pm = row[1];
                let co2 = row[2];
                let temp = row[3];
                let rh = row[4];

                if (new Date(datetime) > new Date(lastTimeStamp)) {
                    log('Add new record!');
                    let data = `${datetime}\t${pm}\t${co2}\t${temp}\t${rh}`;
    
                    appendToFile(`${pathFile}/dust.txt`, data);
                    writeFile(`${__dirname}/last-timestamp.txt`, datetime);
                }
            }
        });

    } else {
        log('No data found.');
    }
}

try {
	log('start process...');
	getSheetData();
	log('end process...');

} catch (err) {
	logerr(err)
};
