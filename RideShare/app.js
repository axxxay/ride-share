const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
app.use(express.json());
const server = http.createServer(app);
const io = socketIo(server);

// Data structure to store ride sharers and splitters
const rideSharers = new Map(); // Key: location string, Value: array of sharer details
const rideSplitters = new Map(); // Key: location string, Value: array of splitter details

// Set up Socket.IO events
io.on('connection', (socket) => {
    console.log('A user connected');

    // Handle location updates from ride sharers
    socket.on('updateLocation', (locationData) => {
        console.log('Location update received:', locationData);
        const { userId, location } = locationData;

        // Add or update the ride sharer's location in the data structure
        rideSharers.set(location, rideSharers.get(location) || []);
        rideSharers.get(location).push({ userId, socketId: socket.id });

        // Check if there are matching splitters for this location
        const matchingSplitters = rideSplitters.get(location);
        if (matchingSplitters) {
            // Notify the ride sharer about matching splitters
            socket.emit('matchingSplitters', matchingSplitters);
        }
    });

    // Handle location updates from ride splitters
    socket.on('updateSplitterLocation', (locationData) => {
        console.log('Splitter location update received:', locationData);
        const { userId, location } = locationData;

        // Add or update the ride splitter's location in the data structure
        rideSplitters.set(location, rideSplitters.get(location) || []);
        rideSplitters.get(location).push({ userId, socketId: socket.id });
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
        // Remove the user from ride sharers or splitters data structure upon disconnection
        rideSharers.forEach((sharers, location) => {
            rideSharers.set(location, sharers.filter((sharer) => sharer.socketId !== socket.id));
        });
        rideSplitters.forEach((splitters, location) => {
            rideSplitters.set(location, splitters.filter((splitter) => splitter.socketId !== socket.id));
        });
    });
});

// API endpoint for ride sharer location update
app.post('/api/updateLocation', (req, res) => {
    const { userId, currentLocation } = req.body;
    console.log('API Location update received:', userId, currentLocation);
    // Emit location update to the server
    io.emit('updateLocation', { userId, location: currentLocation });
    res.send('Location update received');
});

// API endpoint for ride splitter location update
app.post('/api/updateSplitterLocation', (req, res) => {
    const { userId, currentLocation } = req.body;
    console.log('API Splitter location update received:', userId, currentLocation);
    // Emit location update to the server
    io.emit('updateSplitterLocation', { userId, location: currentLocation });
    res.send('Splitter location update received');
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
