// Goals Management
let goals = [];

// Load goals from localStorage
function loadGoals() {
    const savedGoals = localStorage.getItem('goals');
    if (savedGoals) {
        goals = JSON.parse(savedGoals);
    }
    renderGoalTable();
}

// Save goals to localStorage
function saveGoals() {
    localStorage.setItem('goals', JSON.stringify(goals));
}

// Render the goals table
function renderGoalTable() {
    let tbody = $('#goalTable tbody');
    tbody.empty();
    let goalsToShow = goals.slice(-10).reverse();
    goalsToShow.forEach((goal, index) => {
        let allocatedPercent = ((goal.currentAmount / goal.goalAmount) * 100).toFixed(2);
        let remainingAmount = goal.goalAmount - goal.currentAmount;
        let remainingPercent = (100 - allocatedPercent).toFixed(2);
        let row = `<tr ${goal.purchased ? 'class="text-muted"' : ''}>
            <td>
                ${goal.purchased ? '<s>' + goal.name + '</s>' : goal.name}<br>
                ${goal.imageUrl ? `<img src="${goal.imageUrl}" alt="${goal.name}" class="goal-image">` : ''}
            </td>
            <td>
                <div class="progress">
                  <div class="progress-bar" role="progressbar" style="width: ${allocatedPercent}%">
                    ${allocatedPercent}% 
                  </div>
                </div>
                <div class="goal-details">
                    <p>Allocated: ${goal.currentAmount} (${allocatedPercent}%)</p>
                    <p>Remaining: ${remainingAmount} (${remainingPercent}%)</p>
                </div>
            </td>
            <td>
                ${goal.purchased ? '' : `
                <div class="btn-group" role="group">
                  <button class="btn btn-primary btn-sm allocateStashedIndividualBtn" data-index="${goals.length - index - 1}">Allocate Tickets Individually</button>
                  <button class="btn btn-primary btn-sm allocateStashedBulkBtn" data-index="${goals.length - index - 1}">Allocate Tickets (Bulk)</button>
                  <button class="btn btn-info btn-sm browseTicketsBtn" data-index="${goals.length - index - 1}">Browse Tickets</button>
                  <button class="btn btn-success btn-sm purchasedBtn" data-index="${goals.length - index - 1}">Mark as Purchased</button>
                  <button class="btn btn-danger btn-sm unallocateGoalBtn" data-index="${goals.length - index - 1}">Unallocate</button>
                </div>
                `}
            </td>
        </tr>`;
        tbody.append(row);
    });
}

// Add Goal
$('#goalForm').on('submit', function(e) {
    e.preventDefault();
    let name = $('#goalName').val();
    let amount = parseInt($('#goalAmount').val());
    let imageUrl = $('#goalImageUrl').val();
    if (amount > 0 && name.trim() !== '') {
        let goal = {
            name: name,
            goalAmount: amount,
            currentAmount: 0,
            purchased: false,
            imageUrl: imageUrl, // new field
            allocatedTickets: [] // initialize allocatedTickets array
        };
        goals.push(goal);
        saveGoals();
        renderGoalTable();
        $('#goalModal').modal('hide');
        $('#goalForm')[0].reset();
    } else {
        alert('Invalid goal data.');
    }
});

// Allocate Stashed Tickets (Bulk)
$(document).on('click', '.allocateStashedBulkBtn', function() {
    let index = $(this).data('index');
    let goal = goals[index];
    let stashedTickets = getStashedTickets();
    if (stashedTickets.length === 0) {
        alert('No stashed tickets to allocate.');
        return;
    }
    stashedTickets.forEach(ticket => {
        if (ticket.valid && !ticket.consumed) {
            goal.currentAmount += ticket.amount;
            ticket.valid = false; // Mark as redeemed
            ticket.stashed = false;
            goal.allocatedTickets.push(ticket); // Add ticket to goal's allocatedTickets
        }
    });
    saveGoals();
    saveCashRecords();
    renderGoalTable();
    alert('Allocated all stashed tickets to the goal.');
});

// Allocate Stashed Tickets (Individual)
$(document).on('click', '.allocateStashedIndividualBtn', function() {
    let index = $(this).data('index');
    let goal = goals[index];
    let stashedTickets = getStashedTickets();
    if (stashedTickets.length === 0) {
        alert('No stashed tickets to allocate.');
        return;
    }
    stashedTickets.sort((a, b) => new Date(a.date) - new Date(b.date));
    showAllocateTicketsModal(goal, stashedTickets);
});

// Function to show allocate tickets modal with updated ticket styling
function showAllocateTicketsModal(goal, tickets) {
    let currentIndex = 0;

    function renderTicket() {
        let ticket = tickets[currentIndex];
        let ticketDate = new Date(ticket.date);
        let dayOfWeek = ticketDate.getDay();
        let japaneseDay = getJapaneseDay(dayOfWeek);

        // Generate a unique hex background color if not already assigned
        if (!ticket.backgroundColor) {
            ticket.backgroundColor = generateRandomHexColor();
            saveCashRecords(); // Save the updated ticket with background color
        }

        let modalHtml = `
        <div class="modal-dialog" role="document">
          <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Allocate Ticket to Goal: ${goal.name}</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close" id="closeTicketModal">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              
              <div class="modal-body">
                <div class="card text-center suica-card" style="background-color: ${ticket.backgroundColor}; position: relative;">
                  <div class="card-header">
                    <strong>Suica IC Card</strong>
                  </div>
                  <div class="card-body">
                    <h5 class="card-title">Amount: ${ticket.amount}</h5>
                    <p class="card-text">Serial: ${ticket.serial}</p>
                    <p class="card-text">Date: ${ticket.date} (${japaneseDay})</p>
                    <span class="hex-code">${ticket.backgroundColor}</span>
                  </div>
                </div>
              </div>
              
              <div class="modal-footer">
                <button class="btn btn-primary" id="allocateTicketBtn">Allocate Ticket</button>
                <button class="btn btn-secondary" id="prevTicketBtn">Previous</button>
                <button class="btn btn-secondary" id="nextTicketBtn">Next</button>
              </div>
              
          </div>
        </div>
        `;
        $('#ticketModal').html(modalHtml);
        $('#ticketModal').modal('show');

        // Button handlers
        $('#prevTicketBtn').on('click', function() {
            if (currentIndex > 0) {
                currentIndex--;
                renderTicket();
            } else {
                alert('This is the first ticket.');
            }
        });
        $('#nextTicketBtn').on('click', function() {
            if (currentIndex < tickets.length -1) {
                currentIndex++;
                renderTicket();
            } else {
                alert('This is the last ticket.');
            }
        });
        $('#allocateTicketBtn').on('click', function() {
            if (ticket.valid && !ticket.consumed) {
                goal.currentAmount += ticket.amount;
                ticket.valid = false; // Mark as redeemed
                ticket.stashed = false;
                goal.allocatedTickets.push(ticket); // Add ticket to goal's allocatedTickets
                saveGoals();
                saveCashRecords();
                renderGoalTable();
                alert('Ticket allocated to the goal.');
                tickets.splice(currentIndex, 1); // Remove ticket from list
                if (tickets.length === 0) {
                    $('#ticketModal').modal('hide');
                    alert('No more stashed tickets.');
                } else {
                    if (currentIndex >= tickets.length) {
                        currentIndex = tickets.length - 1;
                    }
                    renderTicket();
                }
            } else {
                alert('Ticket is not valid.');
            }
        });
        $('#closeTicketModal').on('click', function() {
            $('#ticketModal').modal('hide');
        });
    }
    renderTicket();
}

// Browse Tickets Allocated to Goal
$(document).on('click', '.browseTicketsBtn', function() {
    let index = $(this).data('index');
    let goal = goals[index];
    if (goal.allocatedTickets && goal.allocatedTickets.length > 0) {
        showGoalTicketsModal(goal);
    } else {
        alert('No tickets allocated to this goal.');
    }
});

// Function to show the modal for browsing tickets allocated to a goal
function showGoalTicketsModal(goal) {
    let tickets = goal.allocatedTickets;
    let currentIndex = 0;

    function renderTicket() {
        let ticket = tickets[currentIndex];
        let ticketDate = new Date(ticket.date);
        let dayOfWeek = ticketDate.getDay();
        let japaneseDay = getJapaneseDay(dayOfWeek);

        let modalHtml = `
        <div class="modal-dialog" role="document">
          <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Ticket Allocated to Goal: ${goal.name}</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close" id="closeTicketModal">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              
              <div class="modal-body">
                <div class="card text-center suica-card" style="background-color: ${ticket.backgroundColor}; position: relative;">
                  <div class="card-header">
                    <strong>Suica IC Card</strong>
                  </div>
                  <div class="card-body">
                    <h5 class="card-title">Amount: ${ticket.amount}</h5>
                    <p class="card-text">Serial: ${ticket.serial}</p>
                    <p class="card-text">Date: ${ticket.date} (${japaneseDay})</p>
                    <span class="hex-code">${ticket.backgroundColor}</span>
                  </div>
                </div>
              </div>
              
              <div class="modal-footer">
                <button class="btn btn-secondary" id="prevTicketBtn">Previous</button>
                <button class="btn btn-secondary" id="nextTicketBtn">Next</button>
              </div>
              
          </div>
        </div>
        `;
        $('#ticketModal').html(modalHtml);
        $('#ticketModal').modal('show');

        // Button handlers
        $('#prevTicketBtn').on('click', function() {
            if (currentIndex > 0) {
                currentIndex--;
                renderTicket();
            } else {
                alert('This is the first ticket.');
            }
        });
        $('#nextTicketBtn').on('click', function() {
            if (currentIndex < tickets.length -1) {
                currentIndex++;
                renderTicket();
            } else {
                alert('This is the last ticket.');
            }
        });
        $('#closeTicketModal').on('click', function() {
            $('#ticketModal').modal('hide');
        });
    }
    renderTicket();
}

// Function to generate a random hex color (same as in tickets.js)
function generateRandomHexColor() {
    let color = '#' + Math.floor(getSecureRandomNumber()*16777215).toString(16).padStart(6, '0');
    return color.toUpperCase();
}

// Function to get day of the week in Japanese characters (same as in tickets.js)
function getJapaneseDay(dayIndex) {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return days[dayIndex];
}

// Unallocate Goal
$(document).on('click', '.unallocateGoalBtn', function() {
    let index = $(this).data('index');
    let goal = goals[index];
    let confirmUnallocate = confirm('Are you sure you want to unallocate this goal? This will return the amount back to the cash account.');
    if (confirmUnallocate) {
        // Return amount back to cash account
        let cashRecord = {
            date: new Date().toLocaleString('en-PH'),
            amount: goal.currentAmount,
            allocated: false,
            tickets: []
        };
        cashRecords.push(cashRecord);
        goal.currentAmount = 0;
        // Return allocated tickets back to stashed tickets
        goal.allocatedTickets.forEach(ticket => {
            ticket.valid = true;
            ticket.stashed = true;
        });
        goal.allocatedTickets = [];
        saveGoals();
        saveCashRecords();
        renderGoalTable();
        renderCashTable();
        alert('Goal unallocated, and amount and tickets returned to cash account.');
    }
});

// Mark Goal as Purchased
$(document).on('click', '.purchasedBtn', function() {
    let index = $(this).data('index');
    let goal = goals[index];
    goal.purchased = true;
    saveGoals();
    renderGoalTable();
});

// Load goals on startup
loadGoals();
