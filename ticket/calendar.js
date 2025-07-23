// Weekly Calendar View
let currentWeekStartDate = getWeekStartDate(new Date());

function getWeekStartDate(date) {
    let day = date.getDay() || 7;
    let startDate = new Date(date);
    if (day !== 1) {
        startDate.setDate(startDate.getDate() - (day - 1));
    }
    startDate.setHours(0, 0, 0, 0);
    return startDate;
}

// Array of card emojis representing the deck of cards
const cardEmojis = [
    '🂱', '🂲', '🂳', '🂴', // Hearts
    '🂵', '🂶', '🂷', '🂸',
    '🂹', '🂺', '🂻', '🂼',
    '🂽', '🂾', '🂿', '🃀',
    
    '🃁', '🃂', '🃃', '🃄', // Diamonds
    '🃅', '🃆', '🃇', '🃈',
    '🃉', '🃊', '🃋', '🃌',
    '🃍', '🃎', '🃏', '🃐',
    
    '🃑', '🃒', '🃓', '🃔', // Clubs
    '🃕', '🃖', '🃗', '🃘',
    '🃙', '🃚', '🃛', '🃜',
    '🃝', '🃞', '🃟', '🃠',
    
    '🃡', '🃢', '🃣', '🃤', // Spades
    '🃥', '🃦', '🃧', '🃨',
    '🃩', '🃪', '🃫', '🃬',
    '🃭', '🃮', '🃯', '🃰'
];

// Function to get the week number of the date
function getWeekNumber(date) {
    const startDate = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date - startDate) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + startDate.getDay() + 1) / 7);
}

// Function to generate week name with card emojis and division result
function generateWeekName(date) {
    let weekNumber = getWeekNumber(date);
    let yearDigits = date.getFullYear().toString().slice(-2);
    
    // Use the card emojis as week names
    let weekName = cardEmojis[weekNumber % cardEmojis.length];

    // Calculate the division result and format it to three decimals
    let divisionResult = (weekNumber / 52).toFixed(3);

    return `${yearDigits}W${weekNumber}-${weekName}-${divisionResult}`;
}

function renderCalendar() {
    let weekStart = new Date(currentWeekStartDate);
    let calendarHtml = '<table class="table table-bordered week-table"><tr>';
    for (let i = 0; i < 7; i++) {
        let date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);

        // Use local date components to create dateString
        let year = date.getFullYear();
        let month = String(date.getMonth() + 1).padStart(2, '0');
        let day = String(date.getDate()).padStart(2, '0');
        let dateString = `${year}-${month}-${day}`;

        let tickets = getValidTickets().filter(ticket => ticket.date === dateString);

        // Determine the day of the week
        let dayOfWeek = date.getDay();

        // Initialize a class for background and text colors based on the day of the week
        let dayClass = 'day-cell';
        if (dayOfWeek === 0) {
            // Sunday (red background)
            dayClass += ' bg-danger text-white';
        } else if (dayOfWeek === 6) {
            // Saturday (gray background)
            dayClass += ' bg-secondary text-white';
        } else if (tickets.length > 0) {
            // Default for days with tickets (green background)
            dayClass += ' bg-success text-white';
        }

        // Generate the content for the cell
        let cellContent = `<div class="cell-content">${date.getMonth() + 1}/${date.getDate()}<br>`;

        if (tickets.length > 0) {
            cellContent += '<ul class="list-unstyled mb-0">';
            tickets.forEach(ticket => {
                cellContent += `<li><small>${ticket.serial}</small></li>`;
            });
            cellContent += '</ul>';
        } else {
            cellContent += '<small>No Ticket</small>';
        }

        cellContent += '</div>';

        // Append the cell to the calendar HTML
        calendarHtml += `<td class="${dayClass}">${cellContent}</td>`;
    }

    calendarHtml += '</tr></table>';
    $('#calendarContainer').html(calendarHtml);
    let weekInfo = generateWeekName(currentWeekStartDate);
    $('#calendarContainer').prepend(`<h5>Week: ${weekInfo}</h5>`);
}

$('#prevWeekBtn').on('click', function() {
    currentWeekStartDate.setDate(currentWeekStartDate.getDate() - 7);
    renderCalendar();
});

$('#nextWeekBtn').on('click', function() {
    currentWeekStartDate.setDate(currentWeekStartDate.getDate() + 7);
    renderCalendar();
});

// Load calendar on startup
renderCalendar();
