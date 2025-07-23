// Configuration Management
let config = {
    ticketUnit: 500
};

function loadConfig() {
    const savedConfig = localStorage.getItem('config');
    if (savedConfig) {
        config = JSON.parse(savedConfig);
    } else {
        saveConfig();
    }
    $('#ticketUnit').val(config.ticketUnit);
}

function saveConfig() {
    localStorage.setItem('config', JSON.stringify(config));
}

$('#configForm').on('submit', function(e) {
    e.preventDefault();
    let ticketUnit = parseInt($('#ticketUnit').val());
    if (ticketUnit > 0) {
        config.ticketUnit = ticketUnit;
        saveConfig();
        alert('Configuration saved!');
    } else {
        alert('Ticket Unit must be greater than zero.');
    }
});

// Load config on startup
loadConfig();
