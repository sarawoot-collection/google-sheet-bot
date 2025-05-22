const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

require('dotenv').config();

const appendToFile = async (filePath, textToAppend) => {
    fs.appendFile(filePath, textToAppend + '\n', (err) => {
        if (err) {
            console.error('Error appending to file:', err);
        } else {
            console.log('Text appended to file successfully.');
        }
    });
}

const writeFile = async (filePath, text) => {
    fs.writeFile(filePath, text + '\n', (err) => {
        if (err) {
            console.error('Error write to file:', err);
        } else {
            console.log('Text write to file successfully.');
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
        keyFile: 'key/key.json',
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    const spreadsheetId = `${process.env.SPREADSHEET_ID}`;
    const tabName = 'data';
    const range = `${tabName}!A2:E`;
    const pathFile = `${process.env.PATH_FILE}`;
    const lastTimeStampFile = `${process.env.FILE_LAST_TIMESTAMP}`;

    console.log('spreadsheetId', spreadsheetId);

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
    });

    const rows = response.data.values;

    const lastTimeStamp = await readFile(lastTimeStampFile);

    if (rows.length > 0) {

        console.log('Data from Google Sheet:');

        rows.forEach((row, index) => {

            if (index == (rows.length - 1)) {

                console.log(row);

                let datetime = row[0];
                let pm = row[1];
                let co2 = row[2];
                let temp = row[3];
                let rh = row[4];

                if (new Date(datetime) > new Date(lastTimeStamp)) {
                    console.log('add new record!');
                    let data = `${datetime}\t${pm}\t${co2}\t${temp}\t${rh}`;
    
                    appendToFile(`${pathFile}/dust.txt`, data);
                    writeFile(`last-timestamp.txt`, datetime);
                }
            }
        });

    } else {
        console.log('No data found.');
    }
}

getSheetData().catch(console.error);