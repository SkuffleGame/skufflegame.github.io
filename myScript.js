//firebase setup
        // Import Firebase from CDN
        import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js';
        import { getDatabase, ref, onValue, set, update, remove } from 'https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js';
        import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-analytics.js";

      // Firebase configuration
      //this connects to your firebase project
        const firebaseConfig = {
            apiKey: "AIzaSyAXUdeglgszb0WflC5o8VuXBuO1V3OzHWQ",
            authDomain: "skuffletest.firebaseapp.com",
            databaseURL: "https://skuffletest-default-rtdb.europe-west1.firebasedatabase.app",
            projectId: "skuffletest",
            storageBucket: "skuffletest.firebasestorage.app",
            messagingSenderId: "656546117071",
            appId: "1:656546117071:web:25437409b3c2e155fa8eba",
            measurementId: "G-E5H5Q8STFE"
        };

        //initialise firebase with your config
        const app = initializeApp(firebaseConfig);
        const analytics = getAnalytics(app);//analytics setup
        const database = getDatabase(app);//realtime database setup
        const playersRef = ref(database, 'players');//reference to players node in database


        const increaseSound = new Audio('audio/increase.mp3');//preloads sound effects
        const decreaseSound = new Audio('audio/decrease.mp3');

        window.playIncreaseSound = function() {
        increaseSound.currentTime = 0; // Reset to start 
        increaseSound.play();
        }

        window.playDecreaseSound = function() {
        decreaseSound.currentTime = 0; // Reset to start
        decreaseSound.play();
        }
        //realtime listener for players data
        // Listen for changes
        // This fires whenever:
        // - A new player is added
        // - A player's health changes
        // - A player is removed
        // This is how everyone sees updates in real-time!
        onValue(playersRef, (snapshot) => {
            const data = snapshot.val();// snapshot.val() gets the current data at the 'players' location
            displayPlayers(data);// Update the display with the new data
        });
        //display players on the page
        function displayPlayers(players) { //get the container div where we'll show players
            const container = document.getElementById('players'); //clear existing content
            container.innerHTML = '';//if no players, exit

            if (!players) return;
            // Loop through each player in the database
            // 'id' is the unique key (timestamp when player was added)
            // 'players[id]' is the player object with name and health
            for (let id in players) {
                const player = players[id]; //create a new div for this player
                const playerDiv = document.createElement('div'); //apply the .player css styling
                playerDiv.className = 'player';
                
                //build the html for this player card
                //use template literals (backticks) to easily insert variables
                playerDiv.innerHTML = `
                    <div>${player.name}</div>
                    <div class="health-control">
                        <button onclick="changeHealth('${id}', -1); playDecreaseSound()">-</button>
                        <div class="health-value">${player.health}</div>
                        <button onclick="changeHealth('${id}', 1); playIncreaseSound()">+</button>
                    </div>
                `;

                // Add this player card to the container
                container.appendChild(playerDiv);
            }
        }

        window.changeHealth = function(playerId, change) {
            const playerRef = ref(database, 'players/' + playerId);
            
            onValue(playerRef, (snapshot) => {
                const player = snapshot.val();
                let newHealth = player.health + change;
                
                // Cap at 0 minimum and 20 maximum
                newHealth = Math.max(0, Math.min(20, newHealth));
                
                update(playerRef, { health: newHealth });
            }, { onlyOnce: true });
        };

        document.getElementById('add-player').addEventListener('click', () => {
            const nameInput = document.getElementById('player-name');
            const name = nameInput.value.trim();
            
            if (name) {
                //check how many players exist currently
                onValue(playersRef, (snapshot) => {
                    const players = snapshot.val();

                    //count number of players
                    //if players is null (no players), then playerCount is 0
                    //Otherwise, count how many exist
                    const playerCount = players ? Object.keys(players).length : 0;

                    //check if we've hit the limit of 6
                    if (playerCount >= 6) {
                        //show alert we've hit max, change this to a nicer ui message in future
                        alert('Maximum of 6 players has been reached! Please remove players before adding any more')
                        return; //stops it here and doesn't add the new player
                    }

                    //if we get here then we have less than 6 players
                    const newPlayerRef = ref(database, 'players/' + Date.now());
                    set(newPlayerRef, {
                        name: name,
                        health: 20
                    });
                nameInput.value = '';
            }, { onlyOnce: true}); //only checks once, don't keep listening for changes
            }
        });
        //clear all players function
        document.getElementById('clear-all').addEventListener('click', () => {
            //ask for confirmation before deleting everything
            if (confirm('Are you sure you want to clear all players? This cannot be undone and will permanently delete all player data.')) {
                remove(playersRef)
                .then(() => {
                    console.log('All players cleared successfully');
                })
                .catch((error) => {
                    console.error('Error clearing players:', error);
                });
            }
        });