const socket = io('http://localhost:5000');

let sourcePlace, destinationPlace;

function joinRide() {
    const userType = document.getElementById('userType').value;
    const name = document.getElementById('name').value;

    if (!sourcePlace || !destinationPlace) {
        alert("Please enter valid source and destination locations.");
        return;
    }

    const source = {
        lat: sourcePlace.geometry.location.lat(),
        lon: sourcePlace.geometry.location.lng()
    };
    const destination = {
        lat: destinationPlace.geometry.location.lat(),
        lon: destinationPlace.geometry.location.lng()
    };

    console.log({ userType, source, destination, name })

    socket.emit('joinRide', { userType, source, destination, name });
}

socket.on('userJoined', (data) => {
    const { roomName, userData } = data; // Extract roomName
    socket.emit('requestUpdate', { roomName, newUser: userData });
});

socket.on('matchedRiders', (data) => {
    const matchedRidersDiv = document.getElementById('matchedRiders');
    matchedRidersDiv.innerHTML = '';

    if (data.matchedUsers.length === 0) {
        matchedRidersDiv.innerHTML = '<p>No matches found.</p>';
        return;
    }

    const currentUserType = document.getElementById('userType').value;

    for (const otherUser of data.matchedUsers) { 
        const matchItem = document.createElement('div');
        matchItem.innerHTML = `
            <h3>${otherUser.userType}: ${otherUser.name}</h3> 
        `;
        matchedRidersDiv.appendChild(matchItem);
    }
});

window.initAutocomplete = initAutocomplete;
