import { Index } from "@upstash/vector";
import { Hono } from "hono";
import { env } from "hono/adapter";
import { cors } from "hono/cors";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

const semanticSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 25,
    chunkOverlap: 12,
    separators: [ " "], 
});

type Environmnet = {
    VECTOR_DB_URL: string,
    VECTOR_DB_TOKEN: string,
};

const app = new Hono();

app.use(cors());

const WHITELIST = [ "swear" ];

app.post("/api", async (c) => {
    if (c.req.header('Content-Type') !== 'application/json') {
        return c.json({ error: "JSON Body expected" },{status : 406});
    }

    try {
        const { VECTOR_DB_URL, VECTOR_DB_TOKEN } = env<Environmnet>(c);
        const index = new Index({
            url: VECTOR_DB_URL,
            token: VECTOR_DB_TOKEN,
            // Cloudflare doesn't support cache header, so it's disabled
            cache: false
        });

        const body = await c.req.json();
        let { message } = body as { message: string };
        
        if(!message){
            return c.json({ error: "Message argument is required" },{status : 400});
        }

        if(message.length > 1000){
            return c.json({ error: "Message is too long, it can atmost be 1000 characters" },{ status : 413 });
        }

        // Get the user input, break the longer text into chunks, so it will be easier to process. Sometimes, the longer the text, the meaning of the text can vary in cases like if the semantic of the input text is a bit different, the flagging might not be accurate.
        message = message
                    .split(/\s/)
                    .filter(word => !WHITELIST.includes(word.toLowerCase()))
                    .join(' ');

        const [ semanticChunks, wordChunks ] = await Promise.all([
            // Check a larger chunk of text to check to see if it matches any larger parts of the Vector DB
            splitTextIntoSemantics(message),
            // Check every word if any of the word is in the whitelist
            splitTextIntoWords(message)
        ]);

        // Catch all the profanities in a Set
        const flaggedFor = new Set<{ score: number, text: string }>();

        // Check if semanticChunks & wordChunks have any profanities
        const vectorRes = await Promise.all([
            ...wordChunks.map(async (wordChunk) => {
                // Destructure as many vectors as mentioned in the topK
                const [ vector ] = await index.query({
                    /* topK => How many vectors do we need to retrieve from the vector DB
                    Get the closest match, giving the topK as 5, will give 1 closest match and 4 other words that aren't very considerable */
                    topK: 1,
                    data: wordChunk,
                    // 
                    includeMetadata: true
                });

                // If the score is greater than 0.95, then it's a profanity, so push it to the flaggedFor Set
                if(vector && vector.score > 0.95){
                    flaggedFor.add({ 
                        score: vector.score, 
                        text: vector.metadata!.text as string
                    });
                }

                return { score: 0 };
            }),
            ...semanticChunks.map(async (semanticChunk) => {
                // Destructure as many vectors as mentioned in the topK
                const [ vector ] = await index.query({
                    /* topK => How many vectors do we need to retrieve from the vector DB
                    Get the closest match, giving the topK as 5, will give 1 closest match and 4 other words that aren't very considerable */
                    topK: 1,
                    data: semanticChunk,
                    // 
                    includeMetadata: true
                });
    
                /* The score here is reduced to 0.88, as the though the chunk may contain teh work, but it may not be a profanity 
                    It f*cking sucks or It is f*king awesome don't have the same meaning as f*cking.
                */
                if(vector && vector.score > 0.88){
                    flaggedFor.add({ 
                        score: vector.score, 
                        text: vector.metadata!.text as string
                    });
                }
    
                return { score: 0 };
            })
        ]);

        if(flaggedFor.size > 0){
            // Checking words flagged by vectorRes and gets the more profane word
            const sorted = Array.from(flaggedFor).sort((a, b) => a.score > b.score ? -1 : 1)[0];
            
            return c.json({ 
                isProfanity: true,
                score: sorted.score,
                flaggedFor: sorted.text
            });
        }else{
            // Where no profanity is found, get the most profane chunk
            const mostProfaneChunk = vectorRes.sort((a, b) => a.score > b.score ? -1 : 1)[0];
            
            return c.json({ 
                isProfanity: false,
                score: mostProfaneChunk.score
            });
        }

    } catch (error) {
        console.log(error);
        
        return c.json({ error: "Internal Server Error" },{status : 500});
    }
});

function splitTextIntoWords(text: string) {
    return text.split(/\s/); // \s is a regular expression that matches any whitespace character
}

async function splitTextIntoSemantics(text: string) {
    // If the text input is just one word, it is handled by splitTextIntoWords and it's not worth splitting it into semantics
    if(text.split(/\s/).length === 1) return [];

    const documents = await semanticSplitter.createDocuments([text]);
    const chunks = documents.map(chunk => chunk.pageContent); // pageContent is the actual chunk data

    return chunks;
}

export default app;