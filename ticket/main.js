$(document).ready(function() {
    // Function to initialize the app after data is loaded
    function initializeApp() {
        currentWeekStartDate = getWeekStartDate(new Date());
        renderCalendar();
        renderCashTable();
        renderGoalTable();
    }

    // Function to load state from ticket-state.json
    function loadStateFromJSON() {
        $.getJSON('ticket-state.json', function(data) {
            // Save data into localStorage
            if (data.config) {
                localStorage.setItem('config', JSON.stringify(data.config));
            }
            if (data.cashRecords) {
                localStorage.setItem('cashRecords', JSON.stringify(data.cashRecords));
            }
            if (data.goals) {
                localStorage.setItem('goals', JSON.stringify(data.goals));
            }
            // Now that data is loaded, initialize the app
            initializeApp();
        }).fail(function(jqxhr, textStatus, error) {
            console.error("Error loading state from ticket-state.json: ", textStatus, error);
            alert('Could not load initial state from ticket-state.json.');
        });
    }

    // Check if keys exist in localStorage
    if (!localStorage.getItem('config') || !localStorage.getItem('cashRecords') || !localStorage.getItem('goals')) {
        // Keys do not exist, load from ticket-state.json
        loadStateFromJSON();
    } else {
        // Local storage has data, proceed with initialization
        initializeApp();
    }

    // Import/Export State Event Handlers
    $('#exportStateBtn').on('click', function() {
        exportState();
    });

    $('#importStateBtn').on('click', function() {
        $('#importFileInput').click();
    });

    $('#importFileInput').on('change', function(event) {
        importState(event.target.files[0]);
    });

    // Reset State Event Handler
    $('#resetStateBtn').on('click', function() {
        let confirmReset = confirm('Are you sure you want to reset the application state? This action cannot be undone.');
        if (confirmReset) {
            resetState();
        }
    });
});

// Export State Function
function exportState() {
    // Get data from localStorage
    const config = localStorage.getItem('config');
    const cashRecords = localStorage.getItem('cashRecords');
    const goals = localStorage.getItem('goals');

    // Create JSON object
    const state = {
        config: config ? JSON.parse(config) : {},
        cashRecords: cashRecords ? JSON.parse(cashRecords) : [],
        goals: goals ? JSON.parse(goals) : []
    };

    // Convert JSON object to string
    const stateString = JSON.stringify(state, null, 2);

    // Create Blob from string
    const blob = new Blob([stateString], { type: 'application/json' });

    // Create URL from Blob
    const url = URL.createObjectURL(blob);

    // Create temporary link element
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ticket-state.json';
    document.body.appendChild(a);
    a.click();

    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Import State Function
function importState(file) {
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const stateString = event.target.result;
            const state = JSON.parse(stateString);

            // Validate state object
            if (state && typeof state === 'object') {
                // Validate individual components
                if (state.config && typeof state.config !== 'object') {
                    alert('Invalid config data in the state file.');
                    return;
                }
                if (state.cashRecords && !Array.isArray(state.cashRecords)) {
                    alert('Invalid cashRecords data in the state file.');
                    return;
                }
                if (state.goals && !Array.isArray(state.goals)) {
                    alert('Invalid goals data in the state file.');
                    return;
                }

                // Save data into localStorage
                if (state.config) {
                    localStorage.setItem('config', JSON.stringify(state.config));
                }
                if (state.cashRecords) {
                    localStorage.setItem('cashRecords', JSON.stringify(state.cashRecords));
                }
                if (state.goals) {
                    localStorage.setItem('goals', JSON.stringify(state.goals));
                }
                // Reload the page to apply changes
                location.reload();
            } else {
                alert('Invalid state file.');
            }
        } catch (e) {
            console.error(e);
            alert('Error parsing the state file.');
        }
    };
    reader.readAsText(file);
}

// Reset State Function
function resetState() {
    // Remove specific keys from localStorage
    localStorage.removeItem('config');
    localStorage.removeItem('cashRecords');
    localStorage.removeItem('goals');

    // Load data from 'ticket-state.json'
    loadStateFromJSON();
}
