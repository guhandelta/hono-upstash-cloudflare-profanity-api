import csv from "csv-parser";
import fs from "fs";
import { Index } from "@upstash/vector"

const index = new Index({
    url: process.env.VECTOR_DB_URL,
    token: process.env.VECTOR_DB_TOKEN
})

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
            // Slicing a chunk of data from the CSV file
            .on('end', () => {
                resolve(rows);
            })
            .on('error', (error) => {
                reject(error); // The CSV file data would be available in the rows[]]
            });
    })
}

const STEP = 30; //Batch the request of the data from the CSV file in chunks of 30 entities, instead of making a requiest for each entity
// Pushing the data into the database || seed() function is convention of feeding the data into the database
const seed = async () => {
    const data = await parseCSV('./training_data.csv');

    for(let i = 0; i < data.length; i+=STEP){
        const chunk = data.slice(i, i + STEP);

        // Formatting the data as per howteh vector DB expects it to be
        // batchIndex is something that is accessible in the map function
        const formatted = chunk.map((row, batchIndex) => ({
            data: row.text,
            id: i + batchIndex,
            // The metadata is completely optional, but it helps see very transparently in the Vector DB, why the text is being flagged
            metadata: {
                text: row.text
            }
        }));

        await index.upsert(formatted);
        
    }
}

seed();