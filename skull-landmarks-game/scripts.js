const landmarks = document.querySelectorAll('.draggable');
const dropZones = document.querySelectorAll('.drop-zone');

// Create audio elements
const clickSound = new Audio('click.mp3');
const correctSound = new Audio('correct.mp3');
const wrongSound = new Audio('wrong.mp3');
const cheerSound = new Audio('crowd-cheer.mp3'); // Assuming you have this file

// Keep volume at 1/3 of original
correctSound.volume = 0.33;
wrongSound.volume = 0.33;
cheerSound.volume = 0.5; // Set cheer volume to be slightly louder

// Play wrong sound for very short duration (100ms)
function playWrongSound() {
    wrongSound.currentTime = 0;
    wrongSound.play();
    
    setTimeout(() => {
        wrongSound.pause();
        wrongSound.currentTime = 0;
    }, 100);
}

// Play correct sound for exactly 1775ms
function playCorrectSound() {
    correctSound.currentTime = 0;
    correctSound.play();
    
    setTimeout(() => {
        correctSound.pause();
        correctSound.currentTime = 0;
    }, 1775); // Exactly 1775ms as requested
}

// Play cheering sound for celebration
function playCheerSound() {
    cheerSound.currentTime = 0;
    cheerSound.play();
}

// Confetti animation function
function createConfetti() {
    // Play cheering sound as confetti falls
    playCheerSound();
    
    const confettiContainer = document.createElement('div');
    confettiContainer.style.position = 'fixed';
    confettiContainer.style.top = '0';
    confettiContainer.style.left = '0';
    confettiContainer.style.width = '100%';
    confettiContainer.style.height = '100%';
    confettiContainer.style.pointerEvents = 'none';
    confettiContainer.style.zIndex = '9999';
    document.body.appendChild(confettiContainer);
    
    // Create 150 confetti pieces
    for (let i = 0; i < 150; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            
            // Random confetti properties
            const size = Math.random() * 10 + 5;
            const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', 
                           '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4CAF50',
                           '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            // Position randomly across the screen width
            const leftPos = Math.random() * 100;
            
            // Style the confetti piece
            confetti.style.position = 'absolute';
            confetti.style.width = `${size}px`;
            confetti.style.height = `${size}px`;
            confetti.style.backgroundColor = color;
            confetti.style.left = `${leftPos}%`;
            confetti.style.top = '-20px';
            confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
            confetti.style.opacity = Math.random() + 0.5;
            
            // Add to container
            confettiContainer.appendChild(confetti);
            
            // Animate falling with some horizontal movement
            const fallDuration = Math.random() * 3 + 2;
            const horizMovement = (Math.random() - 0.5) * 15;
            
            confetti.animate([
                { transform: 'translateY(0) rotate(0deg)', offset: 0 },
                { transform: `translateX(${horizMovement}vw) translateY(50vh) rotate(${Math.random() * 360}deg)`, offset: 0.5 },
                { transform: `translateX(${horizMovement * 2}vw) translateY(100vh) rotate(${Math.random() * 720}deg)`, offset: 1 }
            ], {
                duration: fallDuration * 1000,
                easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)'
            });
            
            // Remove confetti after animation
            setTimeout(() => {
                confetti.remove();
            }, fallDuration * 1000);
            
        }, Math.random() * 1500); // Stagger confetti creation
    }
    
    // Remove container after all animations complete
    setTimeout(() => {
        confettiContainer.remove();
    }, 6000);
}

// Check if all zones are filled correctly
function checkAllZonesFilled() {
    const totalZones = dropZones.length;
    let filledZones = 0;
    
    dropZones.forEach(zone => {
        if (zone.style.border === "2px solid green") {
            filledZones++;
        }
    });
    
    return filledZones === totalZones;
}

// Add event listeners to each landmark
landmarks.forEach(landmark => {
    landmark.addEventListener('click', () => {
        // Play click sound when a landmark is clicked/selected
        clickSound.currentTime = 0;
        clickSound.play();
    });

    landmark.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData("landmark", e.target.dataset.landmark);
        e.dataTransfer.setData("elementId", e.target.id);
        
        // Play click sound when starting to drag
        clickSound.currentTime = 0;
        clickSound.play();
    });
});

// Set up the drop zones
dropZones.forEach(zone => {
    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add("drag-over");
    });

    zone.addEventListener('dragleave', () => {
        zone.classList.remove("drag-over");
    });

    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove("drag-over");

        const draggedLandmark = e.dataTransfer.getData("landmark");
        const correctZone = zone.dataset.landmark;

        if (draggedLandmark === correctZone) {
            // Find the dragged element to remove it
            const draggedElements = document.querySelectorAll(`.draggable[data-landmark="${draggedLandmark}"]`);
            if (draggedElements.length > 0) {
                // Remove the element from the landmarks container
                draggedElements[0].remove();
            }
            
            // Update the drop zone
            zone.innerHTML = `<span>${draggedLandmark}</span>`;
            zone.style.border = "2px solid green";
            
            // Play correct sound for precisely 1775ms
            playCorrectSound();
            
            // Check if all zones are filled correctly
            if (checkAllZonesFilled()) {
                setTimeout(() => {
                    createConfetti();
                }, 200); // Small delay before celebration
            }
        } else {
            // Play wrong sound with very short duration
            playWrongSound();
        }
    });
});