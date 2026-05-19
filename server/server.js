import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import url from 'url';
import { startTwitterScraper } from './twitter.js';
import { startSolanaListener } from './solana.js';
import { agent } from './agent.js';
import { startWhaleWatcher } from './whale.js';
import { startDexscreenerListener } from './dex.js';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

let clients = [];

wss.on('connection', (ws, req) => {
    // Parse query params to authenticate passcode
    const parameters = url.parse(req.url, true).query;
    const passcode = parameters.passcode;
    const CREATOR_PASSCODE = process.env.CREATOR_PASSCODE || 'TheSunShine110123$$';

    if (passcode !== CREATOR_PASSCODE) {
        console.log('Unauthorized client connection attempt blocked.');
        ws.send(JSON.stringify({ type: 'AUTH_FAILED', message: 'Invalid creator passcode' }));
        ws.close();
        return;
    }

    console.log('Client connected and authenticated successfully');
    clients.push(ws);

    // Send initial log, portfolio and scanned token state
    agent.sendInitialState(ws);

    ws.on('message', (message) => {
        try {
            const parsed = JSON.parse(message);
            if (parsed.type === 'MANUAL_TRADE') {
                const { action, data } = parsed;
                agent.handleManualTrade(action, data);
            }
        } catch (e) {
            console.error('Error processing websocket message from client', e);
        }
    });

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
agent.setBroadcast(broadcast);

startTwitterScraper(broadcast);
startSolanaListener(broadcast);
startWhaleWatcher(broadcast);
startDexscreenerListener(broadcast);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
