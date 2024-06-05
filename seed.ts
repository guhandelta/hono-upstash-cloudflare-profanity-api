import csv from "csv-parser";
import fs from "fs";

interface Row{
    text: string
}

async function parseCSV(filepath: string): Promise<Row[]> {
    return new Promise((resolve, reject) => {
        const rows: Row[] = [];

        fs.createReadStream(filepath) // Read file in Chunks using createReadStream*()
            /*Creating a Pipeline to chain multiple operations on the stream of data in a linear, readable fashion, to eliminates the need for nested callbacks and complex control flow structures.
            csv() - takes in a stream*/
            .pipe(csv({ separator: ',' })) // separator is , as a CSV file is read here

            // As data is available, the row values is available in the callback function
            .on('data', (row) => {
                rows.push(row); // Convert a CSV file to JS/TS Array
            })
            .on('end', () => {
                resolve(rows);
            })
            .on('error', (error) => {
                reject(error); // The CSV file data would be available in the rows[]]
            });
    })
}