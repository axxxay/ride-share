const express = require('express');
const http = require('http');
const cors = require('cors');
const socketIo = require('socket.io');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const server = http.createServer(app);
const io = socketIo(server, { 
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

const users = {};
const USER_TYPES = { SHARER: 'RideSharer', SPLITTER: 'Splitter' };

io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    socket.on('joinRide', (data) => {
        const { userType, source, destination, name } = data;
        users[socket.id] = { userType, source, destination, name, id: socket.id };
    
        const roomName = generateRoomName(source, destination);
        socket.join(roomName);
        updateRidersOnRoute(roomName);
    });

    socket.on('requestUpdate', ({ roomName, newUser }) => {
        updateRidersOnRoute(roomName);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (users[socket.id]) {
            const { source, destination } = users[socket.id];
            const roomName = generateRoomName(source, destination);
            delete users[socket.id];
            updateRidersOnRoute(roomName);
        }
    });
});

function updateRidersOnRoute(roomName) {
    const usersOnRoute = getUsersInRoute(roomName);
    const ridesharers = usersOnRoute.filter(user => user.userType === USER_TYPES.SHARER);
    const splitters = usersOnRoute.filter(user => user.userType === USER_TYPES.SPLITTER);

    for (const ridesharer of ridesharers) {
        const matchedSplitters = splitters.filter(splitter => 
            closeEnough(ridesharer.source, splitter.source) && 
            closeEnough(ridesharer.destination, splitter.destination)
        );
        io.to(ridesharer.id).emit('matchedRiders', { matchedUsers: matchedSplitters });
    }

    for (const splitter of splitters) {
        const matchedRidesharers = ridesharers.filter(ridesharer => 
            closeEnough(splitter.source, ridesharer.source) && 
            closeEnough(splitter.destination, ridesharer.destination)
        );
        io.to(splitter.id).emit('matchedRiders', { matchedUsers: matchedRidesharers });
    }
}

function getUsersInRoute(roomName) {
    const room = io.sockets.adapter.rooms.get(roomName);
    if (!room) return [];

    return Array.from(room).map(socketId => users[socketId]);
}

function closeEnough(loc1, loc2, tolerance = 5) { 
    const distance = calculateDistance(loc1, loc2);
    return distance <= tolerance; 
}

function calculateDistance(loc1, loc2) {
    const R = 6371; 
    const dLat = (loc2.lat - loc1.lat) * (Math.PI / 180);
    const dLon = (loc2.lon - loc1.lon) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(loc1.lat * (Math.PI / 180)) * Math.cos(loc2.lat * (Math.PI / 180)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; 
    return distance;
}

function generateRoomName(source, destination) {
    return `${source.lat.toFixed(2)}-${source.lon.toFixed(2)}-${destination.lat.toFixed(2)}-${destination.lon.toFixed(2)}`;
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
