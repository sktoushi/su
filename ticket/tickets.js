// Ticket Management

// Function to generate a random hex color
function generateRandomHexColor() {
    let color = '#' + Math.floor(getSecureRandomNumber()*16777215).toString(16).padStart(6, '0');
    return color.toUpperCase();
}

function getValidTickets() {
    let tickets = [];
    cashRecords.forEach(record => {
        if (record.allocated) {
            record.tickets.forEach(ticket => {
                if (ticket.valid && !ticket.stashed) {
                    tickets.push(ticket);
                }
            });
        }
    });
    return tickets;
}

function getStashedTickets() {
    let tickets = [];
    cashRecords.forEach(record => {
        if (record.allocated) {
            record.tickets.forEach(ticket => {
                if (ticket.valid && ticket.stashed) {
                    tickets.push(ticket);
                }
            });
        }
    });
    return tickets;
}

// Function to get day of the week in Japanese characters
function getJapaneseDay(dayIndex) {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return days[dayIndex];
}

function showTickets(tickets, isStashed) {
    if (tickets.length === 0) {
        alert('No tickets to display.');
        return;
    }
    let currentIndex = 0;

    function renderTicket() {
        let ticket = tickets[currentIndex];
        let consumedPercent = ((ticket.consumed / ticket.amount) * 100).toFixed(2);
        let remaining = ticket.amount - ticket.consumed;
        let remainingPercent = (100 - consumedPercent).toFixed(2);
        let ticketDate = new Date(ticket.date);
        let dayOfWeek = ticketDate.getDay();
        let japaneseDay = getJapaneseDay(dayOfWeek);

        // Generate a unique hex background color if not already assigned
        if (!ticket.backgroundColor) {
            ticket.backgroundColor = generateRandomHexColor();
            saveCashRecords(); // Save the updated ticket with background color
        }

        let ticketHtml = `
        <div class="modal-dialog" role="document">
          <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Ticket for ${ticket.date} (${japaneseDay})</h5>
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
                    <p class="card-text">Consumed: ${ticket.consumed} (${consumedPercent}%)</p>
                    <p class="card-text">Remaining: ${remaining} (${remainingPercent}%)</p>
                    <div class="progress">
                      <div class="progress-bar bg-success" role="progressbar" style="width: ${remainingPercent}%"></div>
                      <div class="progress-bar bg-secondary" role="progressbar" style="width: ${consumedPercent}%"></div>
                    </div>
                    <span class="hex-code">${ticket.backgroundColor}</span>
                  </div>
                </div>
              </div>
              
              <div class="modal-footer">
                ${isStashed ? `
                <button class="btn btn-primary" id="unstashBtn">Unstash</button>
                ` : `
                <button class="btn btn-primary" id="redeemBtn">Redeem</button>
                <button class="btn btn-warning" id="stashBtn">Stash</button>
                `}
                <button class="btn btn-secondary" id="prevTicketBtn">Previous</button>
                <button class="btn btn-secondary" id="nextTicketBtn">Next</button>
              </div>
              
          </div>
        </div>
        `;
        $('#ticketModal').html(ticketHtml);
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
        $('#redeemBtn').on('click', function() {
            let amount = prompt('Enter amount to redeem:', remaining);
            amount = parseInt(amount);
            if (amount > 0 && amount <= remaining) {
                ticket.consumed += amount;
                saveCashRecords();
                renderTicket();
            } else {
                alert('Invalid amount.');
            }
        });
        $('#stashBtn').on('click', function() {
            ticket.stashed = true;
            saveCashRecords();
            $('#ticketModal').modal('hide');
            alert('Ticket stashed.');
        });
        $('#unstashBtn').on('click', function() {
            ticket.stashed = false;
            saveCashRecords();
            $('#ticketModal').modal('hide');
            alert('Ticket unstashed.');
        });
        $('#closeTicketModal').on('click', function() {
            $('#ticketModal').modal('hide');
        });
    }

    renderTicket();
}

// View Valid and Allocated Tickets
$('#viewTicketsBtn').on('click', function() {
    let tickets = getValidTickets();
    if (tickets.length === 0) {
        alert('No allocated tickets available.');
    } else {
        // Sort tickets by date
        tickets.sort((a, b) => new Date(a.date) - new Date(b.date));
        showTickets(tickets, false);
    }
});

// View Stashed Tickets
$('#viewStashedTicketsBtn').on('click', function() {
    let tickets = getStashedTickets();
    if (tickets.length === 0) {
        alert('No stashed tickets available.');
    } else {
        // Sort tickets by date
        tickets.sort((a, b) => new Date(a.date) - new Date(b.date));
        showTickets(tickets, true);
    }
});
