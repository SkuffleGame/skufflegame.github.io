/** Comments here are both for my own understanding and for anyone else who looks at the code later.
 * I'm learning JavasScript as I do this so this code might not be the most efficient - Aaron */

// --- GOOGLE FIREBASE SETUP --- \\
// Import Firebase SDK (Software Development Kit) modules directly from Google's CDN
//This gives us functions to connect to our Firebase project and talk to the Realtime Database for the health tracker
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  set,
  update,
  remove,
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";
//Import the anonymous authentication functions we need
import {
  getAuth,
  signInAnonymously,
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

// Confirguration object for our specific Firebase project
// These values come from the Firebase console and identity which project we want to connect to
const firebaseConfig = {
  apiKey: "AIzaSyAXUdeglgszb0WflC5o8VuXBuO1V3OzHWQ", // This is a public api key, it's not a secret and is safe to include. Ignore Githubs warning about this.
  authDomain: "skuffletest.firebaseapp.com",
  databaseURL:
    "https://skuffletest-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "skuffletest",
  storageBucket: "skuffletest.firebasestorage.app",
  messagingSenderId: "656546117071",
  appId: "1:656546117071:web:25437409b3c2e155fa8eba",
  measurementId: "G-E5H5Q8STFE",
};
// Const are variables that we can't reassign
// Creates a Firebase app instance using the config from above
// From this, we can get analytics and a connection to our Realtime Database
const app = initializeApp(firebaseConfig);
const database = getDatabase(app); // Main handle to interact with the Realtime Database

// Create a reference to the "players" node in our database
// All player data will be stored under this path: /players
const playersRef = ref(database, "players");

//Get a handle to Firebase Authentication so we can sign in anonymously
const auth = getAuth(app);
//This variable will hold the current user's unique ID once they're signed in
//It starts as null because sign-in hasn't happened yet when the page first loads
let currentUID = null;

// --- ANONYMOUS SIGN-IN --- \\
// signInAnonymously returns a Promise - meaning it goes off and does its work and calls the .then() function when it's done, without freezing the page
signInAnonymously(auth)
  .then((userCredential) => {
    // Sign-in succeeded - userCredential contains info about this "ghost account"
    // We pull out just the uid (unique ID) and store it in our currentUID variable
    currentUID = userCredential.user.uid;
    console.log("Signed in anonymously, UID:", currentUID); // Useful for debugging

    // Re-check the players once after sign-in
    // This matters because the database listener may have loaded before currentUID was ready
    onValue(
      playersRef,
      (snapshot) => {
      const data = snapshot.val();
      displayPlayers(data);
    },
    { onlyOnce: true },
    );
  })
  .catch((error) => {
    // Something went wrong - log it so you can see it in the browser console
    console.error("Anonymous sign-in failed:", error);
  });

// --- SOUND EFFECTS SETUP --- \\

// Preloads the audio effects for health increase and decrease so they can play instantly when triggered
const increaseSound = new Audio("audio/increase.mp3");
const decreaseSound = new Audio("audio/decrease.mp3");

// Expose a function on window (browser window) to play the "increase health" sound effect
// Reset currentTime to 0 so the sound starts from the beginning each time
window.playIncreaseSound = function () {
  increaseSound.currentTime = 0;
  increaseSound.play();
};
// Same as above but for the "decrease health" sound effect
window.playDecreaseSound = function () {
  decreaseSound.currentTime = 0;
  decreaseSound.play();
};

// --- HEALTH CHANGE LOGIC --- \\

// Change a player's health by a certain amount (positive or negative), can be rehashed for the special abilites later on
// playerId is the database key for that player
window.changeHealth = function (playerId, change) {
  // Get a reference to the specific player in the database using their unique ID: /players/<playerId>
  const playerRef = ref(database, "players/" + playerId);

  // Read the current player data once from the database
  onValue(
    playerRef,
    (snapshot) => {
      const player = snapshot.val();

      if (!player) return;

      // Calculate the new health by adding the change
      let newHealth = player.health + change;

      // Constrain the health so it can't go below 0 or above 20
      newHealth = Math.max(0, Math.min(20, newHealth));

      // Write the updated health value back to the database
      update(playerRef, { health: newHealth });
    },
    { onlyOnce: true },
  ); // onlyOnce: true means this listener will run once and then stop
};

// --- SPECIAL ABILITY BANK --- \\
const characterData = {
  // This stores the special ability info for each character to be called upon later
  Cowboy: {
    specialName: "Bullets",
    specialType: "number",
    specialValue: 6, // Change to match the number of players in game
    specialMin: 0,
    specialMax: 6,
  },
  "Were-Lobster": {
    specialName: "Tide",
    specialType: "toggle",
    specialValue: "Low Tide", // Starting tide
    toggleOptions: ["Low Tide", "High Tide"], // Swap between the two tides
  },
  "Goe Bling": {
    specialName: "Steal",
    specialType: "number",
    specialValue: 0,
    specialMin: 0,
    specialMax: 10, // Arbitrary max for steals
  },
  "Salary Man": {
    specialName: "Money",
    specialType: "number",
    specialValue: 4,
    specialMin: 0,
    specialMax: 100, // Arbitrary max for money
  },
  Alien: {
    specialName: "Dodge",
    specialType: "number",
    specialValue: 3,
    specialMin: 0,
    specialMax: 3, //  max for dodges
  },
  Margritte: {
    // Doesn't have special ability so everthing is null
    specialName: null,
    specialType: null,
    specialValue: null,
    specialMin: null,
    specialMax: null,
  },
};
// --- CHARACTER IMAGE BANK --- \\
// change file paths once we have artwork
const characterImages = {
  Cowboy: "img/cowboy.png",
  "Were-Lobster": "img/lobster.png",
  "Goe Bling": "img/goe.png",
  "Salary Man": "img/sal.png",
  Alien: "img/alien.png",
  Margritte: "img/margritte.png",
};

// --- SPECIAL ABILITY LOGIC --- \\

// Change a player's special value by a certain amount (positive or negative)
// playerId is the database key for that player
window.changeSpecial = function (playerId, change) {
  // Get a reference to the specific player in the database using their unique ID: /players/<playerId>
  const playerRef = ref(database, "players/" + playerId);

  // Read the current player data once from the database
  onValue(
    playerRef,
    (snapshot) => {
      const player = snapshot.val();

      if (!player) return;

      if (player.specialType === "number") {
        let newSpecial = player.specialValue + change;

        newSpecial = Math.max(
          player.specialMin,
          Math.min(player.specialMax, newSpecial),
        ); //constrains the special values for each unique character

        update(playerRef, { specialValue: newSpecial });
      }
    },
    { onlyOnce: true },
  ); // onlyOnce: true means this listener will run once and then stop
};

window.toggleSpecial = function (playerId) {
  // Get a reference to the specific player in the database using their unique ID: /players/<playerId>
  const playerRef = ref(database, "players/" + playerId);

  // Read the current player data once from the database
  onValue(
    playerRef,
    (snapshot) => {
      const player = snapshot.val();

      if (!player) return;

      if (player.specialType === "toggle" && player.toggleOptions) {
        const currentIndex = player.toggleOptions.indexOf(player.specialValue); // set the currentIndex to what the current value is, so for the Were-Lobster it starts with Low Tide

        const nextIndex = (currentIndex + 1) % player.toggleOptions.length; // Moves along the index in the array to the next value, being high tide. Loops back after that.

        const newSpecialValue = player.toggleOptions[nextIndex];

        update(playerRef, { specialValue: newSpecialValue });
      }
    },
    { onlyOnce: true },
  ); // onlyOnce: true means this listener will run once and then stop
};

// --- REMOVE SINGLE PLAYER --- \\
// Allows user to remove their character
window.removePlayer = function (playerId) {
  if (
    confirm(
      "Are you sure you want to remove your player? This cannot be undone.",
    )
  ) {
    const playerRef = ref(database, "players/" + playerId);

    remove(playerRef)
    .then(() => {
      console.log("Player removed successfully");
    })
    .catch((error) => {
      console.error("Error removing player:", error);
    });
  }
};

// --- CHARACTER SELECTION STATE --- \\

// This variable stores which character the user has currently picked in the dropdown
// It is used when creating a new player
let selectedCharacter = null;

// Attach click event listeners to all links in the character dropdown
// When a link is clicked, we remember the chosen character and update the button text
document.querySelectorAll(".character-option").forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault(); // Stop the link from navigating anywhere since it's just a dropdown option

    // Read the character name from the element's data-character attribute, and assign it to the char variable (constant)
    const char = a.dataset.character;

    //Save the selected character in our selectedCharacter variable
    selectedCharacter = char;

    // Update the button label so the user sees which character they've chosen
    document.getElementById("character-chosen").textContent = char;
  });
});

// --- REAL-TIME DATABASE LISTENER --- \\
// Listen for any change under /players in the database
// This runs whenever players are added, updated (health/character), or removed
onValue(playersRef, (snapshot) => {
  const data = snapshot.val(); // snapshot.val() gets the current data at the 'players' location
  displayPlayers(data); // Update the display with the new data
});


// --- RENDER PLAYERS ON THE PAGE --- \\
// This function decides how the tracker page should look based on who owns which character
// The current user's character becomes the hero card
// Everyone else appears in the smaller grid
function displayPlayers(players) {
  const setupPanel = document.getElementById("setup-panel");
  const gameArea = document.getElementById("game-area");
  const heroPanel = document.getElementById("hero-panel");
  const playersGrid = document.getElementById("players-grid");

  // Clear the hero and grid each time before rebuilding them
  // This avoids duplicate cards appearing whenever Firebase updates
  heroPanel.innerHTML = "";
  playersGrid.innerHTML = "";

  //If there are no players yet, show the setup panel and hide the game area
  if (!players) {
    setupPanel.classList.remove("hidden");
    gameArea.classList.add("hidden");
    updateCharacterDropdown(players);
    return;
  }

  // This will store the current users player, if we find one
  let myPlayer = null;
  let myPlayerId = null;

  //Loop through all players and check if any of them belong to the current browser/user
  for (let id in players) {
    const player = players[id];

    if (player.ownerUID === currentUID) {
      myPlayer = player;
      myPlayerId = id;
      break;
    }
  }

  // If this browser/user has not made a player yet;
  // show the setup panel and hide the game area
  if (!myPlayer) {
    setupPanel.classList.remove("hidden");
    gameArea.classList.add("hidden");
    updateCharacterDropdown(players);
    return;
  }

  // If this browser/user does have player
  // hide the setup panel andn show the game area
  setupPanel.classList.add("hidden");
  gameArea.classList.remove("hidden");

  //Render the current user's character as the big hero
  renderHeroPlayer(myPlayerId, myPlayer);

  // Render all other players as small cards in the grid
  for (let id in players) {
    //Skip the current user's own player because it is already shown as the hero
    if (id === myPlayerId) continue;

    const player = players[id];
    renderOtherPlayer(id, player);
  }
  // Update dropdown options so already-taken characters are faded/disbaled
  updateCharacterDropdown(players);
}
     
// --- RENDER CURRENT USER'S HERO ID --- \\
// This creates the large hero card for the player owned by the browser/user
function renderHeroPlayer(playerId, player) {
  const heroPanel = document.getElementById("hero-panel");

  // Get characters image
  const imagePath = characterImages[player.character] || "img/default.png"; // Fallback to default image if character not found

  // Build special ability controls
  let specialHTML = "";

  if (player.specialName && player.specialType) {
    if (player.specialType === "number") {
      specialHTML = `
      <div class="hero-control">
        <strong>${player.specialName}:</strong>
        <button onclick="changeSpecial('${playerId}', -1)">-</button>
        <span class="hero-value">${player.specialValue}</span>
        <button onclick="changeSpecial('${playerId}', 1)">+</button>
        </div>
        `;
    } else if (player.specialType === "toggle") {
      specialHTML = `
      <div class="hero-control">
        <strong>${player.specialName}:</strong>
        <button class="toggle-button" onclick="toggleSpecial('${playerId}')">
        ${player.specialValue}</button></div>
      `;
    }
  }

// Create the full hero card
heroPanel.innerHTML = `
<div class="hero-card">
<img src="${imagePath}" alt="${player.character}">

<div class="hero-info">
<h2>${player.character}</h2>
<p>${player.name}</p>

<div class="hero-control">
<strong>Health:</strong>

<button onclick="changeHealth('${playerId}', -1); playDecreaseSound()">-</button>
<span class="hero-value">${player.health}</span>
<button onclick="changeHealth('${playerId}', 1); playIncreaseSound()">+</button>
</div>

${specialHTML}

<button class="remove-player-button" onclick="removePlayer('${playerId}')">
Remove Player
</button>
</div>
</div>
`;
}

// --- RENDER OTHER PLAYERS --- \\
// This creates smaller cards for everyone who is not the current user
function renderOtherPlayer(playerId, player) {
  const playersGrid = document.getElementById("players-grid");

  const playerCard = document.createElement("div");
  playerCard.className = "other-player-card";

  let specialText = "";

  if (player.specialName && player.specialValue !== null) {
    specialText = `<p>${player.specialName}: ${player.specialValue}</p>`;
  }

  playerCard.innerHTML = `
  <h3>${player.name}</h3>
  <p>${player.character}</p>
  <p>Health: ${player.health}</p>
  ${specialText}
  `;
  playersGrid.appendChild(playerCard);
}

// --- UPDATE CHARACTER DROPDOWN --- \\
// This fades/disables characters in the dropdown that are already taken by existing players
function updateCharacterDropdown(players) {
  const takenCharacters = new Set();

  if (players) {
    for (let id in players) {
      const player = players[id];

      if (player.character) {
        takenCharacters.add(player.character);
      }
    }
  }
  document.querySelectorAll(".character-option").forEach((a) => {
    const char = a.dataset.character;

    if (takenCharacters.has(char)) {
      a.style.pointerEvents = "none";
      a.style.opacity = "0.4";
    } else {
      a.style.pointerEvents = "auto";
      a.style.opacity = "1";
    }
  });
}

// --- ADDING NEW PLAYERS --- \\
// When the "Add player" button is clicked, create a new player in the database
document.getElementById("add-player").addEventListener("click", () => {
  const nameInput = document.getElementById("player-name");
  const name = nameInput.value.trim(); // Remove any extra spaces from start/end of name

  // Do not add is the name field is empty, and show an alert
  if (!name) {
    alert("Please enter a name.");
    return;
  }
  // Enforce that a character must be chosen before adding a player
  if (!selectedCharacter) {
    alert("Please select a character first.");
    return;
  }
  // Wait till UID is assigned
  if (!currentUID) {
    alert("Still signing in, please wait a moment and try again.");
    return;
  }

  // Read the current list of players once so we can:
  // - check how many players exist
  // - ensure the selected character is not already taken
  onValue(
    playersRef,
    (snapshot) => {
      const players = snapshot.val();

      // Count how many players we currently have
      // If players is null, there are 0 players; otherwise count the keys
      const playerCount = players ? Object.keys(players).length : 0;

      // Enforce a maximum of 6 players in total
      if (playerCount >= 6) {
        alert(
          "Maximum of 6 players has been reached! Please remove players before adding any more",
        );
        return; // Stops it here and doesn't add the new player
      }

      // If there are existing players, ensure the chosen character is still free
      if (players) {
        for (let id in players) {
          if (players[id].character === selectedCharacter) {
            alert(
              "This character is already taken! Please select a different character.",
            );
            return; // Stop if someone has already picked the character
          }
        }
      }

      // If we reach this point:
      // - There are less than 6 players
      // - The selected character is not taken
      // Now we create a new player entry in the database

      // Use Date.now() as a simple unique ID for the player node
      const newPlayerRef = ref(database, "players/" + Date.now());

      // Lookup the special data for chosen Character
      const specialData = characterData[selectedCharacter];

      // Build the player data object to save in the realtime database
      const newPlayerData = {
        name: name,
        health: 20,
        character: selectedCharacter,
        specialName: specialData.specialName,
        specialType: specialData.specialType,
        specialValue: specialData.specialValue,
        //store who created this player
        ownerUID: currentUID,
      };

      // Add type-specific data for the different abilites
      if (specialData.specialType === "number") {
        newPlayerData.specialMin = specialData.specialMin;
        newPlayerData.specialMax = specialData.specialMax;
      } else if (specialData.specialType === "toggle") {
        newPlayerData.toggleOptions = specialData.toggleOptions;
      }

      // Save the new player object with player data
      set(newPlayerRef, newPlayerData);

      // Clear the name input and reset the character selection in the UI
      nameInput.value = "";
      selectedCharacter = null;
      document.getElementById("character-chosen").textContent =
        "Choose Character";
    },
    { onlyOnce: true },
  ); // We only need to check this data once, not a continuous listener
});

// --- CLEAR ALL PLAYERS --- \\
// When the "Clear All Players" is clicked, remove every player from the database
document.getElementById("clear-all").addEventListener("click", () => {
  // Ask for confirmation before deleting everything
  if (
    confirm(
      "Are you sure you want to clear all players? This cannot be undone and will permanently delete all player data.",
    )
  ) {
    remove(playersRef)
      .then(() => {
        // Resets character selection state
        selectedCharacter = null;
        document.getElementById("character-chosen").textContent =
          "Choose Character";

        document.querySelectorAll(".character-option").forEach((a) => {
          a.style.pointerEvents = "auto"; // Re-enables clicking
          a.style.opacity = "1"; // Resets opacity
        });
        console.log("All players cleared successfully");
      })
      .catch((error) => {
        console.error("Error clearing players:", error);
      });
  }
});
