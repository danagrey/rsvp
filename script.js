// Game variables
let pouring = false;
let fillLevel = 0;
const perfectMin = 80; // Perfect pour minimum percentage
const perfectMax = 90; // Perfect pour maximum percentage
const fillSpeed = 1.5; // How fast the cup fills (percentage points per 100ms)
let animationFrameId = null;

// DOM elements
const teaFill = document.getElementById('teaFill');
const pourButton = document.getElementById('pourButton');
const nameForm = document.getElementById('nameForm');
const thankYou = document.getElementById('thankYou');
const guestNameInput = document.getElementById('guestName');
const submitNameBtn = document.getElementById('submitName');
const confirmedName = document.getElementById('confirmedName');
const pourSound = document.getElementById('pourSound');
const successSound = document.getElementById('successSound');
const failSound = document.getElementById('failSound');
const completionSound = document.getElementById('completionSound');
const teapotSvg = document.querySelector('.teapot-svg');
let pourStream = null;

// Initialize sounds object
const sounds = {
    pour: null,
    success: null,
    fail: null,
    completion: null
};

// Function to initialize all sounds
function initSounds() {
    // Try to initialize each sound
    const soundIds = ['pourSound', 'successSound', 'failSound', 'completionSound'];
    const soundKeys = ['pour', 'success', 'fail', 'completion'];
    
    for (let i = 0; i < soundIds.length; i++) {
        const soundElement = document.getElementById(soundIds[i]);
        if (soundElement) {
            sounds[soundKeys[i]] = soundElement;
            console.log(`Sound ${soundKeys[i]} initialized successfully`);
        } else {
            console.warn(`Sound ${soundKeys[i]} not found in the DOM`);
        }
    }
    
    // Create sounds programmatically as a fallback
    if (!sounds.pour) {
        sounds.pour = new Audio('src/sounds/pour.mp3');
        console.log('Created pour sound programmatically');
    }
    
    // User interaction is required for sounds to work in many browsers
    document.addEventListener('click', function() {
        // Try to play and immediately pause a sound to "unlock" audio
        try {
            const unlockSound = sounds.pour || new Audio('src/sounds/pour.mp3');
            unlockSound.volume = 0.01;
            unlockSound.play().then(() => {
                unlockSound.pause();
                unlockSound.currentTime = 0;
                console.log('Audio unlocked successfully');
            }).catch(err => {
                console.warn('Could not unlock audio:', err);
            });
        } catch (e) {
            console.error('Error trying to unlock audio:', e);
        }
    }, { once: true }); // Only run once
}

// Pour mechanics - start pouring when button is pressed
pourButton.addEventListener('mousedown', startPouring);
pourButton.addEventListener('touchstart', startPouring);

// Stop pouring when button is released
document.addEventListener('mouseup', stopPouring);
document.addEventListener('touchend', stopPouring);

// Prevent scrolling during gameplay on mobile
pourButton.addEventListener('touchstart', function(e) {
    e.preventDefault(); // Prevent default touch behavior like scrolling
});

// Prevent long-press context menu
pourButton.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});

// Fix for mobile: ensure touch events end properly
document.addEventListener('touchcancel', stopPouring);

// Start pouring function
function startPouring(e) {
    // Prevent default behavior for touch events
    if (e.type === 'touchstart') {
        e.preventDefault();
    }
    
    pouring = true;
    
    // Add pouring class to teapot for tilting animation
    document.querySelector('.teapot-img').classList.add('pouring');
    
    // Create the pour stream
    createPourStream();
    
    // Play pouring sound
    playSound('pour');
    
    pourTea();
}

// Pour tea animation function
function pourTea() {
    if (!pouring) return;
    
    fillLevel += fillSpeed;
    
    // Calculate the new path for the tea fill based on fillLevel
    // Adjusted for the new teacup shape
    const yPos = 100 - fillLevel * 0.5; // Scale the fill level appropriately
    teaFill.setAttribute('d', `M65,100 C65,115 135,115 135,100 L135,${yPos} C135,${yPos+15} 65,${yPos+15} 65,${yPos} Z`);
    
    updateTeaColor();
    
    // Check if cup is overflowing
    if (fillLevel >= 100) {
        stopPouring();
        showFailMessage("Oh dear! A tad too generous with the pour.");
        return;
    }
    
    animationFrameId = requestAnimationFrame(pourTea);
}

// Stop pouring and check result
function stopPouring() {
    if (!pouring) return;
    
    pouring = false;
    cancelAnimationFrame(animationFrameId);
    
    // Remove pouring class from teapot
    document.querySelector('.teapot-img').classList.remove('pouring');
    
    // Remove the pour stream
    if (pourStream) {
        pourStream.remove();
        pourStream = null;
    }
    
    // Stop pouring sound
    stopSound('pour');
    
    // Check if the pour was perfect
    if (fillLevel >= perfectMin && fillLevel <= perfectMax) {
        handlePerfectPour();
    } else if (fillLevel < perfectMin) {
        showFailMessage("Too little tea! A proper cup needs a bit more to truly warm the soul.");
    } else if (fillLevel > perfectMax && fillLevel < 100) {
        // Add message for tea that's too full but not overflowing
        showFailMessage("Oh dear! A tad too generous with the pour.");
    }
    // The overflow case (fillLevel >= 100) is already handled in the pourTea function
}

// Handle failure
function showFailMessage(message) {
    // Play fail sound
    playSound('fail');
    
    // Create and style a message element
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message fail-message';
    messageDiv.textContent = message;
    
    // Insert into the pouring container instead of before the pour button
    const pouringContainer = document.querySelector('.pouring-container');
    pouringContainer.appendChild(messageDiv);
    
    // Hide the message after 3 seconds
    setTimeout(() => {
        messageDiv.remove();
        resetGame();
    }, 3000);
}

// Handle success
function handlePerfectPour() {
    // Play success sound
    playSound('success');
    
    // Create success message
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message success-message';
    messageDiv.textContent = 'Perfect Pour!';
    
    // Insert into the pouring container instead of before the pour button
    const pouringContainer = document.querySelector('.pouring-container');
    pouringContainer.appendChild(messageDiv);
    
    // Add some sparkle/confetti effect (simplified version)
    addSparkleEffect();
    
    // Show the form after a short delay
    setTimeout(() => {
        messageDiv.remove();
        pourButton.style.display = 'none';
        nameForm.style.display = 'block';
    }, 2000);
}

// Reset the game
function resetGame() {
    fillLevel = 0;
    teaFill.setAttribute('d', 'M65,100 C65,115 135,115 135,100 L135,100 C135,115 65,115 65,100 Z');
    
    // Hide the pour stream if it exists
    if (pourStream) {
        pourStream.remove();
        pourStream = null;
    }
}

// Name submission
submitNameBtn.addEventListener('click', function() {
    const name = guestNameInput.value.trim();
    
    if (name === '') {
        alert('Please enter your name.');
        return;
    }
    
    // Submit to Google Sheet
    submitToGoogleSheet(name);
});

// Submit to Google Sheet
function submitToGoogleSheet(name) {
    // Play completion sound
    playSound('completion');
    
    // Google Form URL with your actual form ID
    const googleFormUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSdD9z7yc_n5zQ21kRqs2cwscLFkN466VCfL9OMJqGakphLyng/formResponse';
    
    // Your actual form field name extracted from the URL
    const formData = new FormData();
    formData.append('entry.1546008089', name);
    
    // Submit the form using the no-cors mode (prevents CORS issues)
    fetch(googleFormUrl, {
        method: 'POST',
        mode: 'no-cors',
        body: formData
    })
    .then(() => {
        console.log('Form submitted successfully');
    })
    .catch(error => {
        console.error('Error submitting form:', error);
        // Even if there's an error, we'll still show success to the user
        // since Google Forms sometimes returns errors even when submission works
    });
    
    // Show the thank you message regardless of submission status
    confirmedName.textContent = name;
    nameForm.style.display = 'none';
    thankYou.style.display = 'block';
}

// Update the tea color based on fill level for visual interest
function updateTeaColor() {
    // Tea gets darker as the cup fills
    const baseColor = [179, 90, 66]; // RGB for light tea
    const darkColor = [139, 69, 19]; // RGB for dark tea
    
    // Calculate color based on fill level
    const r = Math.floor(baseColor[0] - ((baseColor[0] - darkColor[0]) * fillLevel / 100));
    const g = Math.floor(baseColor[1] - ((baseColor[1] - darkColor[1]) * fillLevel / 100));
    const b = Math.floor(baseColor[2] - ((baseColor[2] - darkColor[2]) * fillLevel / 100));
    
    teaFill.style.fill = `rgb(${r}, ${g}, ${b})`;
}

// Add a simple sparkle effect
function addSparkleEffect() {
    for (let i = 0; i < 20; i++) {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle';
        
        // Random position around the cup
        const teacupRect = document.querySelector('.teacup-svg').getBoundingClientRect();
        const containerRect = document.querySelector('.game-container').getBoundingClientRect();
        
        const top = Math.random() * 150 + (teacupRect.top - containerRect.top) - 50;
        const left = Math.random() * 250 + (teacupRect.left - containerRect.left) - 50;
        
        sparkle.style.top = `${top}px`;
        sparkle.style.left = `${left}px`;
        
        // Random delay and duration
        sparkle.style.animationDelay = `${Math.random() * 0.5}s`;
        sparkle.style.animationDuration = `${0.5 + Math.random() * 0.5}s`;
        
        document.querySelector('.game-container').appendChild(sparkle);
        
        // Remove after animation
        setTimeout(() => {
            sparkle.remove();
        }, 2000);
    }
}

// Updated playSound function
function playSound(soundKey) {
    const sound = sounds[soundKey];
    try {
        if (sound && sound.play) {
            // For pour sound, we want to restart if it's already playing
            sound.currentTime = 0;
            
            // Play the sound with volume control
            sound.volume = 0.5; // Adjust as needed
            
            sound.play().catch(err => {
                console.log(`Sound ${soundKey} playback failed:`, err);
            });
        } else {
            console.warn(`Sound ${soundKey} not available`);
        }
    } catch (error) {
        console.error(`Error playing ${soundKey} sound:`, error);
    }
}

// Updated stopSound function
function stopSound(soundKey) {
    const sound = sounds[soundKey];
    try {
        if (sound && sound.pause) {
            sound.pause();
            sound.currentTime = 0;
        }
    } catch (error) {
        console.error(`Error stopping ${soundKey} sound:`, error);
    }
}

// Update pour stream function to match the new teapot position
function createPourStream() {
    // If a stream already exists, remove it
    if (pourStream) {
        pourStream.remove();
    }
    
    // Create the pour stream path
    pourStream = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pourStream.setAttribute('class', 'pour-stream');
    
    // Get positions for teapot and cup
    const teapotRect = document.querySelector('.teapot-img').getBoundingClientRect();
    const teacupRect = document.querySelector('.teacup-svg').getBoundingClientRect();
    
    // Adjust spout position for left-tipping teapot in new position
    const spoutX = teapotRect.left + teapotRect.width * 0.2;
    const spoutY = teapotRect.top + teapotRect.height * 0.7;
    
    // Cup opening is at the top of the cup
    const cupX = teacupRect.left + (teapotRect.width / 2);
    const cupY = teacupRect.top + 50;
    
    // Calculate the midpoint of the curve, slightly adjusted for gravity
    const midX = (spoutX + cupX) / 2;
    const midY = spoutY + (cupY - spoutY) * 0.6; // Make the arc higher in the middle
    
    // Create a curved path for the pour stream - more gravity-influenced
    const pathData = `M${spoutX},${spoutY} Q${midX},${midY} ${cupX},${cupY}`;
    
    pourStream.setAttribute('d', pathData);
    
    // Add the stream to the document
    document.body.appendChild(pourStream);
}

// Update the DOMContentLoaded event handler for the SVG perfect pour indicator
document.addEventListener('DOMContentLoaded', function() {
    // Calculate perfect range position and height for the SVG indicator
    const minY = 100 - perfectMax * 0.5; // Convert percentage to SVG coordinate
    const maxY = 100 - perfectMin * 0.5; // Convert percentage to SVG coordinate
    
    // Update the indicator lines positions
    const indicatorLines = document.querySelectorAll('.indicator-line');
    indicatorLines[0].setAttribute('y1', maxY);
    indicatorLines[0].setAttribute('y2', maxY);
    indicatorLines[1].setAttribute('y1', minY);
    indicatorLines[1].setAttribute('y2', minY);
    
    // Update the indicator bar
    const indicatorBar = document.querySelector('.indicator-bar');
    indicatorBar.setAttribute('y', minY);
    indicatorBar.setAttribute('height', maxY - minY);
    
    // Initialize sounds
    initSounds();
    
    console.log("Game initialized with updated SVG graphics");
}); 