/** Comments here are both for my own understanding and for anyone else who looks at the code later. I'm learning JavasScript as I do this so this code might not be the most efficient - Aaron */

// --- GOOGLE FIREBASE SETUP --- \\
        // Import Firebase SDK (Software Development Kit) modules directly from Google's CDN
        //This gives us functions to connect to our Firebase project and talk to the Realtime Database for the health tracker
        import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js';
        import { getDatabase, ref, onValue, set, update, remove } from 'https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js';
        import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-analytics.js";

      // Confirguration object for our specific Firebase project
      // These values come from the Firebase console and identity which project we want to connect to
        const firebaseConfig = {
            apiKey: "AIzaSyAXUdeglgszb0WflC5o8VuXBuO1V3OzHWQ", // This is a public api key, it's not a secret and is safe to include. Ignore Githubs warning about this.
            authDomain: "skuffletest.firebaseapp.com",
            databaseURL: "https://skuffletest-default-rtdb.europe-west1.firebasedatabase.app",
            projectId: "skuffletest",
            storageBucket: "skuffletest.firebasestorage.app",
            messagingSenderId: "656546117071",
            appId: "1:656546117071:web:25437409b3c2e155fa8eba",
            measurementId: "G-E5H5Q8STFE"
        };

        // Creates a Firebase app instance using the config from above
        // From this, we can get analytics and a connection to our Realtime Database
        const app = initializeApp(firebaseConfig);
        const analytics = getAnalytics(app);//analytics setup (optional)
        const database = getDatabase(app);// Main handle to interact with the Realtime Database

        // Create a reference to the "players" node in our database
        // All player data will be stored under this path: /players
        const playersRef = ref(database, 'players');

// --- SOUND EFFECTS SETUP --- \\

        // Preloads the audio effects for health increase and decrease so they can play instantly when triggered
        const increaseSound = new Audio('audio/increase.mp3');
        const decreaseSound = new Audio('audio/decrease.mp3');

        // Expose a function on window (browser window) to play the "increase health" sound effect
        // Reset currentTime to 0 so the sound starts from the beginning each time
        window.playIncreaseSound = function() {
            increaseSound.currentTime = 0; 
            increaseSound.play();
        };
        // Same as above but for the "decrease health" sound effect
        window.playDecreaseSound = function() {
        decreaseSound.currentTime = 0;
        decreaseSound.play();
        }

// --- HEALTH CHANGE LOGIC --- \\

        // Change a player's health by a certain amount (positive or negative)
        // playerId is the database key for that player
         window.changeHealth = function(playerId, change) {
            // Get a reference to the specific player in the database using their unique ID: /players/<playerId>
            const playerRef = ref(database, 'players/' + playerId);
            
            // Read the current player data once from the database
            onValue(playerRef, (snapshot) => {
                const player = snapshot.val();

                // Calculate the new health by adding the change
                let newHealth = player.health + change;
                
                // Constrain the health so it can't go below 0 or above 20
                newHealth = Math.max(0, Math.min(20, newHealth));
                
                // Write the updated health value back to the database
                update(playerRef, { health: newHealth });
            }, { onlyOnce: true }); // onlyOnce: true means this listener will run once and then stop
        };


// --- CHARACTER SELECTION STATE --- \\

        // This variable stores which character the user has currently picked in the dropdown
        // It is used when creating a new player
        let selectedCharacter = null;
        
        // Attach click event listeners to all links in the character dropdown
        // When a link is clicked, we remember the chosen character and update the button text
        document.querySelectorAll('.character-option').forEach(a => {
            a.addEventListener('click', (e) => {
                e.preventDefault(); // Stop the link from navigating anywhere since it's just a dropdown option

                // Read the character name from the element's data-character attribute
                const char = a.dataset.character;

                //Save the selected character in our variable
                selectedCharacter = char;

                // Update the button label so the user sees which character they've chosen
                document.getElementById('character-chosen').textContent = char;
            });
        });

// --- REAL-TIME DATABASE LISTENER --- \\
        // Listen for any change under /players in the database
        // This runs whenever players are added, updated (health/character), or removed
        onValue(playersRef, (snapshot) => {
            const data = snapshot.val();// snapshot.val() gets the current data at the 'players' location
            displayPlayers(data);// Update the display with the new data
        });

// --- RENDER PLAYERS ON THE PAGE --- \\
        // Display all the players on the page inside the #players container div
        function displayPlayers(players) {
            const container = document.getElementById('players');

            // Clear any previous player cards so we can re-render from scratch
            container.innerHTML = '';

            // If there are no players in the database yet, just stop here
            if (!players) return;

            // 1) Build a set of characters that are already in use
            // This will allow us to disbale those characters in the dropdown
            const takenCharacters = new Set();
            for (let id in players) {
                const p = players[id];
                if (p.character) takenCharacters.add(p.character);
            }
            
            // 2) Loop over each player and create a visual card for them
            // "id" is the unique Firebase key (timestap when the player was added)
            for (let id in players) {
                const player = players[id]; //create a new div for this player

                // Create a container element for this player's card
                const playerDiv = document.createElement('div');
                playerDiv.className = 'player'; // Use CSS class .player for styling
                
                // Build the inner html for this player card:
                // - Show player's name and their character (if they have one)
                // - Show buttons and current health value
                playerDiv.innerHTML = `
                    <div>${player.name} ${player.character ? '(' + player.character + ')' : ''}</div>
                    <div class="health-control">
                        <button onclick="changeHealth('${id}', -1); playDecreaseSound()">-</button>
                        <div class="health-value">${player.health}</div>
                        <button onclick="changeHealth('${id}', 1); playIncreaseSound()">+</button>
                    </div>
                `;

                // Add the finished card into the main players container
                container.appendChild(playerDiv);
            }


            // 3) Disable any characters in the dropdown that are already taken
            // Visually fade them and prevent clicking so two players cannot pick the same character
            document.querySelectorAll('.character-option').forEach(a => {
                const char = a.dataset.character;

                // If the character is in the takenCharacters set, disable it
                a.style.pointerEvents = takenCharacters.has(char) ? 'none' : 'auto'; // Stops clicks if taken
                a.style.opacity = takenCharacters.has(char) ? '0.4' : '1'; // Make taken options look faded
            });
        }


// --- ADDING NEW PLAYERS --- \\
        // When the "Add player" button is clicked, create a new player in the database
        document.getElementById('add-player').addEventListener('click', () => {
            const nameInput = document.getElementById('player-name');
            const name = nameInput.value.trim(); // Remove any extra spaces from start/end of name
            
            // Do not add is the name field is empty, and show an alert
            if (!name) {
                alert('Please enter a name.');
                return;
            }
            // Enforce that a character must be chosen before adding a player
            if (!selectedCharacter) {
                alert('Please select a character first.');
                return;
            }

                // Read the current list of players once so we can:
                // - check how many players exsist
                // - ensure the selected character is not already taken
                onValue(playersRef, (snapshot) => {
                    const players = snapshot.val();

                    // Count how many players we currently have
                    // If players is null, ther are 0 players; otherwise count the keys
                    const playerCount = players ? Object.keys(players).length : 0;

                    // Enforce a maximum of 6 players in total
                    if (playerCount >= 6) {
                        alert('Maximum of 6 players has been reached! Please remove players before adding any more')
                        return; // Stops it here and doesn't add the new player
                    }

                    // If there are existing players, ensure the chosen character is still free
                    if (players) {
                        for (let id in players) {
                            if (players[id].character === selectedCharacter) {
                                alert ('This character is already taken! Please select a different character.');
                            return; // Stop if someone has already picked the character
                            }
                        }   
                    }

                    // If we reach this point:
                        // - There are less than 6 players
                        // - The selected character is not taken
                        // Now we create a new player entry in the database

                    // Use Date.now() as a simple unique ID for the player node
                    const newPlayerRef = ref(database, 'players/' + Date.now());

                    // Save the new player object with name, starting health, and chosen character
                    set(newPlayerRef, {
                        name: name,
                        health: 20,
                        character: selectedCharacter
                    });

                    // Clear the name input and reset the character selection in the UI
                    nameInput.value = '';
                    selectedCharacter = null;
                    document.getElementById('character-chosen').textContent = 'Choose Character';
            }, { onlyOnce: true}); // We only need to check this data once, not a continuous listener
        });


// --- CLEAR ALL PLAYERS --- \\
        // When the "Clear All Players" is clicked, remove every player from the database
        document.getElementById('clear-all').addEventListener('click', () => {
            // Ask for confirmation before deleting everything
            if (confirm('Are you sure you want to clear all players? This cannot be undone and will permanently delete all player data.')) {
                remove(playersRef)
                .then(() => {
                    // Resets character selection state
                    selectedCharacter = null;
                    document.getElementById('character-chosen').textContent = 'Choose Character';

                    document.querySelectorAll('.character-option').forEach(a => {
                        a.style.pointerEvents = 'auto'; // Re-enables clicking
                        a.style.opacity = '1'; // Resets opacity
                    })
                    console.log('All players cleared successfully');
                })
                .catch((error) => {
                    console.error('Error clearing players:', error);
                });
            }
        });