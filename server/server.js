import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { startTwitterScraper } from './twitter.js';
import { startSolanaListener } from './solana.js';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

let clients = [];

wss.on('connection', (ws) => {
    console.log('Client connected');
    clients.push(ws);

    ws.on('close', () => {
        clients = clients.filter(client => client !== ws);
    });
});

const broadcast = (data) => {
    clients.forEach(client => {
        if (client.readyState === 1) { // 1 = OPEN
            client.send(JSON.stringify(data));
        }
    });
};

console.log("Starting backend services...");
startTwitterScraper(broadcast);
startSolanaListener(broadcast);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
