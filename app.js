// ===== Application State =====
const app = {
    currentUser: null,
    vehicles: [],
    drivers: [],
    shifts: [],
    assignments: [],
    notifications: [],
    selectedDate: new Date(),
    settings: {
        companyName: 'Fleet Logistics Co.',
        maxShiftHours: 8,
        alertThreshold: 5000
    }
};

// Shared SVG snippets for generated markup
const ICONS = {
    inbox: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.6" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"/></svg>',
    chevronLeft: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>',
    chevronRight: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>',
    close: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>'
};

// Initialize app on page load
document.addEventListener('DOMContentLoaded', () => {
    loadDataFromStorage();
    initializeDefaultData();
    ensureDriversLoaded();
    updateDashboard();
});

// Close any open modal with the Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
    }
});

// ===== AUTHENTICATION =====
function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;

    if (!username) {
        alert('Please enter a username');
        return;
    }

    if (password !== 'demo123') {
        alert('Invalid password. Use "demo123"');
        return;
    }

    app.currentUser = {
        username: username,
        role: role,
        loginTime: new Date()
    };

    // Show admin menu if user is admin
    const adminMenu = document.getElementById('adminMenu');
    adminMenu.style.display = role === 'admin' ? 'block' : 'none';

    // Update topbar: greeting, date and user chip
    const hour = new Date().getHours();
    const partOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    document.getElementById('greeting').textContent = `Good ${partOfDay}, ${username}`;
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    document.getElementById('userInfo').textContent = username;
    document.getElementById('userRole').textContent = role.charAt(0).toUpperCase() + role.slice(1);
    document.getElementById('userAvatar').textContent = username.charAt(0).toUpperCase();

    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('appScreen').classList.add('active');

    saveDataToStorage();
    ensureDriversLoaded();
    updateDashboard();
    populateSelects();
    addNotification(`Welcome ${username}!`, 'success');
}

function logout() {
    app.currentUser = null;
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('appScreen').classList.remove('active');
    document.getElementById('username').value = 'dispatcher';
    document.getElementById('password').value = 'demo123';
    document.getElementById('role').value = 'dispatcher';
}

// ===== NAVIGATION & SECTIONS =====
function showSection(sectionId, el) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Remove active class from nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Show selected section
    document.getElementById(sectionId).classList.add('active');

    // Add active class to clicked nav item
    const navItem = el || (window.event && window.event.target.closest
        ? window.event.target.closest('.nav-item')
        : null);
    if (navItem) navItem.classList.add('active');

    // Update content based on section
    if (sectionId === 'scheduling') {
        updateScheduleCalendar();
    } else if (sectionId === 'vehicles') {
        renderVehicles(document.getElementById('vehicleSearch').value);
    } else if (sectionId === 'assignments') {
        renderAssignments(document.getElementById('assignmentFilter').value);
    } else if (sectionId === 'reports') {
        generateCharts();
    }
}

// ===== MODALS =====
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('active');

    // Ensure drivers and vehicles are loaded before populating
    ensureDriversLoaded();
    ensureVehiclesLoaded();

    // Populate selects in modals
    if (modalId === 'shiftModal') {
        populateDriverSelect('shiftDriver');
        populateVehicleSelect('shiftVehicle');
    } else if (modalId === 'assignmentModal') {
        populateDriverSelect('assignmentDriver');
        populateVehicleSelect('assignmentVehicle');
    }

    // Focus the first field for faster keyboard entry
    const firstField = modal.querySelector('select, input, textarea');
    if (firstField) firstField.focus();
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function showNotifications() {
    showModal('notificationsModal');
    renderNotifications();
}

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
});

// ===== SHARED RENDER HELPERS =====
function emptyState(message) {
    return `<div class="empty-state">
        <div class="empty-icon">${ICONS.inbox}</div>
        <p>${message}</p>
    </div>`;
}

function statusBadge(status) {
    return `<span class="status-badge ${status}"><span class="dot"></span>${status.replace('-', ' ')}</span>`;
}

function formatShiftTime(shift) {
    const opts = { hour: '2-digit', minute: '2-digit' };
    return `${new Date(shift.startTime).toLocaleTimeString([], opts)} – ${new Date(shift.endTime).toLocaleTimeString([], opts)}`;
}

// ===== VEHICLES =====
function addVehicle() {
    const plate = document.getElementById('vehiclePlate').value;
    const model = document.getElementById('vehicleModel').value;
    const year = document.getElementById('vehicleYear').value;
    const mileage = document.getElementById('vehicleMileage').value;
    const status = document.getElementById('vehicleStatus').value;

    if (!plate || !model || !year || !mileage) {
        alert('Please fill all vehicle fields');
        return;
    }

    const vehicle = {
        id: Date.now(),
        plate: plate,
        model: model,
        year: year,
        mileage: parseInt(mileage),
        status: status,
        lastService: new Date().toISOString(),
        addedDate: new Date().toISOString()
    };

    app.vehicles.push(vehicle);
    saveDataToStorage();
    renderVehicles();
    closeModal('vehicleModal');
    clearModalForms();
    addNotification(`Vehicle ${plate} added successfully`, 'success');
    updateDashboard();
}

function renderVehicles(filter = '') {
    const grid = document.getElementById('vehiclesGrid');
    let vehicles = app.vehicles;

    if (filter) {
        vehicles = vehicles.filter(v =>
            v.plate.toLowerCase().includes(filter.toLowerCase()) ||
            v.model.toLowerCase().includes(filter.toLowerCase())
        );
    }

    if (vehicles.length === 0) {
        grid.innerHTML = `<div class="grid-empty">${emptyState(filter ? 'No vehicles match your search' : 'No vehicles found')}</div>`;
        return;
    }

    grid.innerHTML = vehicles.map(vehicle => `
        <div class="vehicle-card">
            <div class="vehicle-card-header">
                <span class="vehicle-plate">${vehicle.plate}</span>
                ${statusBadge(vehicle.status)}
            </div>
            <div class="vehicle-model">${vehicle.model} · ${vehicle.year}</div>
            <div class="vehicle-meta">
                <div class="meta-item">
                    <span class="meta-label">Mileage</span>
                    <span class="meta-value">${vehicle.mileage.toLocaleString()} km</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Last Service</span>
                    <span class="meta-value">${new Date(vehicle.lastService).toLocaleDateString()}</span>
                </div>
            </div>
            <div class="card-actions">
                <button class="btn btn-ghost btn-sm" onclick="editVehicle(${vehicle.id})">Edit</button>
                <button class="btn btn-ghost-danger btn-sm" onclick="deleteVehicle(${vehicle.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

function filterVehicles() {
    const filter = document.getElementById('vehicleSearch').value;
    renderVehicles(filter);
}

function deleteVehicle(id) {
    if (confirm('Are you sure you want to delete this vehicle?')) {
        app.vehicles = app.vehicles.filter(v => v.id !== id);
        saveDataToStorage();
        renderVehicles();
        updateDashboard();
        addNotification('Vehicle deleted', 'alert');
    }
}

function editVehicle(id) {
    const vehicle = app.vehicles.find(v => v.id === id);
    if (vehicle) {
        document.getElementById('vehiclePlate').value = vehicle.plate;
        document.getElementById('vehicleModel').value = vehicle.model;
        document.getElementById('vehicleYear').value = vehicle.year;
        document.getElementById('vehicleMileage').value = vehicle.mileage;
        document.getElementById('vehicleStatus').value = vehicle.status;

        // Modify the button to update instead
        const form = document.querySelector('#vehicleModal .modal-buttons');
        const primaryBtn = form.querySelector('.btn-primary');
        primaryBtn.textContent = 'Update Vehicle';
        primaryBtn.onclick = () => updateVehicle(id);

        showModal('vehicleModal');
    }
}

function updateVehicle(id) {
    const vehicle = app.vehicles.find(v => v.id === id);
    if (vehicle) {
        vehicle.plate = document.getElementById('vehiclePlate').value;
        vehicle.model = document.getElementById('vehicleModel').value;
        vehicle.year = document.getElementById('vehicleYear').value;
        vehicle.mileage = parseInt(document.getElementById('vehicleMileage').value);
        vehicle.status = document.getElementById('vehicleStatus').value;

        saveDataToStorage();
        renderVehicles();
        updateDashboard();
        closeModal('vehicleModal');
        clearModalForms();

        // Reset button
        const form = document.querySelector('#vehicleModal .modal-buttons');
        const primaryBtn = form.querySelector('.btn-primary');
        primaryBtn.textContent = 'Add Vehicle';
        primaryBtn.onclick = () => addVehicle();

        addNotification('Vehicle updated', 'success');
    }
}

// ===== DRIVERS =====
function ensureDriversLoaded() {
    if (app.drivers.length === 0) {
        initializeDefaultData();
    }
}

function populateDriverSelect(selectId) {
    const select = document.getElementById(selectId);
    ensureDriversLoaded();
    if (app.drivers.length === 0) {
        select.innerHTML = '<option value="">No drivers available</option>';
        return;
    }
    select.innerHTML = app.drivers.map(driver =>
        `<option value="${driver.id}">${driver.name}</option>`
    ).join('');
}

// ===== SHIFTS =====
function createShift() {
    const driverId = document.getElementById('shiftDriver').value;
    const vehicleId = document.getElementById('shiftVehicle').value;
    const startTime = document.getElementById('shiftStart').value;
    const endTime = document.getElementById('shiftEnd').value;
    const notes = document.getElementById('shiftNotes').value;

    if (!driverId || !vehicleId || !startTime || !endTime) {
        alert('Please fill all required shift fields');
        return;
    }

    const driver = app.drivers.find(d => d.id == parseInt(driverId));
    const vehicle = app.vehicles.find(v => v.id == parseInt(vehicleId));

    if (!driver) {
        alert('Selected driver not found. Please refresh and try again.');
        return;
    }
    if (!vehicle) {
        alert('Selected vehicle not found. Please refresh and try again.');
        return;
    }

    const shift = {
        id: Date.now(),
        driverId: driverId,
        driverName: driver.name,
        vehicleId: vehicleId,
        vehiclePlate: vehicle.plate,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        notes: notes,
        status: 'scheduled',
        createdDate: new Date().toISOString()
    };

    app.shifts.push(shift);
    saveDataToStorage();
    closeModal('shiftModal');
    clearModalForms();

    // Set the selected date to match the shift start date
    const shiftDate = new Date(startTime);
    app.selectedDate = shiftDate;

    updateScheduleCalendar();
    updateDashboard();
    addNotification(`Shift created for ${driver.name}`, 'success');
}

function updateScheduleCalendar() {
    // Render calendar grid with current selected date's month
    renderCalendarGrid(app.selectedDate);

    // Label for the side panel
    const label = document.getElementById('selectedDateLabel');
    if (label) {
        label.textContent = app.selectedDate.toLocaleDateString(undefined, {
            weekday: 'short', month: 'short', day: 'numeric'
        });
    }

    // Render shifts for selected date
    const shiftsList = document.getElementById('shiftsList');
    const dayShifts = app.shifts.filter(s => {
        const shiftDate = new Date(s.startTime);
        return shiftDate.toDateString() === app.selectedDate.toDateString();
    });

    if (dayShifts.length === 0) {
        shiftsList.innerHTML = emptyState('No shifts scheduled for this date');
        return;
    }

    shiftsList.innerHTML = dayShifts.map(shift => {
        let actions = '';
        if (shift.status === 'scheduled') {
            actions = `
                <button class="btn btn-secondary btn-sm" onclick="updateShiftStatus(${shift.id}, 'active')">Start</button>
                <button class="btn btn-success btn-sm" onclick="updateShiftStatus(${shift.id}, 'completed')">Complete</button>`;
        } else if (shift.status === 'active') {
            actions = `<button class="btn btn-success btn-sm" onclick="updateShiftStatus(${shift.id}, 'completed')">Complete</button>`;
        } else {
            actions = statusBadge(shift.status);
        }

        return `
        <div class="shift-item ${shift.status}">
            <div class="shift-info">
                <h4>${shift.driverName}</h4>
                <p>${shift.vehiclePlate} · ${formatShiftTime(shift)}</p>
                ${shift.notes ? `<p class="shift-notes">${shift.notes}</p>` : ''}
            </div>
            <div class="shift-actions">${actions}</div>
        </div>`;
    }).join('');
}

function renderCalendarGrid(displayDate) {
    const grid = document.getElementById('calendarGrid');
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();

    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    // Get shifts by date for this month
    const shiftsMap = {};
    app.shifts.forEach(shift => {
        const shiftDate = new Date(shift.startTime);
        const dateKey = `${shiftDate.getFullYear()}-${shiftDate.getMonth()}-${shiftDate.getDate()}`;
        if (!shiftsMap[dateKey]) {
            shiftsMap[dateKey] = [];
        }
        shiftsMap[dateKey].push(shift);
    });

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    let html = `
        <div class="cal-header">
            <h3>${monthNames[month]} ${year}</h3>
            <div class="cal-nav">
                <button class="icon-btn" onclick="previousMonth()" aria-label="Previous month">${ICONS.chevronLeft}</button>
                <button class="icon-btn" onclick="nextMonth()" aria-label="Next month">${ICONS.chevronRight}</button>
            </div>
        </div>
        <div class="cal-weekdays">
            ${dayNames.map(d => `<span>${d}</span>`).join('')}
        </div>
        <div class="cal-days">`;

    // Empty cells before first day
    for (let i = 0; i < startingDayOfWeek; i++) {
        html += '<div class="cal-day empty"></div>';
    }

    // Days of month
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${month}-${day}`;
        const dayShifts = shiftsMap[dateKey] || [];
        const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
        const isSelected = day === app.selectedDate.getDate() && month === app.selectedDate.getMonth() && year === app.selectedDate.getFullYear();

        // Shift status pill
        let pill = '';
        if (dayShifts.length > 0) {
            const completedShifts = dayShifts.filter(s => s.status === 'completed').length;
            const totalShifts = dayShifts.length;

            if (completedShifts === totalShifts) {
                pill = `<span class="shift-pill done">${totalShifts} completed</span>`;
            } else if (completedShifts > 0) {
                pill = `<span class="shift-pill">${totalShifts - completedShifts} active</span>`;
            } else {
                pill = `<span class="shift-pill">${totalShifts} shift${totalShifts > 1 ? 's' : ''}</span>`;
            }
        }

        const classes = ['cal-day'];
        if (isToday) classes.push('today');
        if (isSelected) classes.push('selected');

        html += `
            <div class="${classes.join(' ')}" onclick="selectCalendarDate('${year}', '${month}', '${day}')">
                <span class="day-num">${day}</span>
                ${pill}
            </div>`;
    }

    html += '</div>';
    grid.innerHTML = html;
}

function selectCalendarDate(year, month, day) {
    app.selectedDate = new Date(year, month, day);
    updateScheduleCalendar();
}

function previousMonth() {
    app.selectedDate = new Date(app.selectedDate.getFullYear(), app.selectedDate.getMonth() - 1, 1);
    updateScheduleCalendar();
}

function nextMonth() {
    app.selectedDate = new Date(app.selectedDate.getFullYear(), app.selectedDate.getMonth() + 1, 1);
    updateScheduleCalendar();
}

function updateShiftStatus(shiftId, status) {
    const shift = app.shifts.find(s => s.id === shiftId);
    if (shift) {
        shift.status = status;
        saveDataToStorage();
        updateScheduleCalendar();
        updateDashboard();
        addNotification(`Shift status updated to ${status}`, 'success');
    }
}

// ===== ASSIGNMENTS =====
function createAssignment() {
    const driverId = document.getElementById('assignmentDriver').value;
    const taskType = document.getElementById('assignmentType').value;
    const vehicleId = document.getElementById('assignmentVehicle').value;
    const description = document.getElementById('assignmentDescription').value;
    const dueDate = document.getElementById('assignmentDueDate').value;
    const priority = document.getElementById('assignmentPriority').value;

    if (!driverId || !vehicleId || !dueDate || !description) {
        alert('Please fill all required assignment fields');
        return;
    }

    const driver = app.drivers.find(d => d.id == driverId);
    const vehicle = app.vehicles.find(v => v.id == vehicleId);

    const assignment = {
        id: Date.now(),
        driverId: driverId,
        driverName: driver.name,
        vehicleId: vehicleId,
        vehiclePlate: vehicle.plate,
        taskType: taskType,
        description: description,
        dueDate: new Date(dueDate),
        priority: priority,
        status: 'pending',
        createdDate: new Date().toISOString()
    };

    app.assignments.push(assignment);
    saveDataToStorage();
    renderAssignments();
    closeModal('assignmentModal');
    clearModalForms();
    updateDashboard();
    addNotification(`Assignment created for ${driver.name}`, 'success');
}

function renderAssignments(filter = 'all') {
    const list = document.getElementById('assignmentsList');
    let assignments = app.assignments;

    if (filter !== 'all') {
        assignments = assignments.filter(a => a.status === filter);
    }

    if (assignments.length === 0) {
        list.innerHTML = emptyState(filter === 'all'
            ? 'No assignments yet — create one to get started'
            : `No ${filter} assignments`);
        return;
    }

    list.innerHTML = assignments.map(assignment => {
        const actions = [];
        if (assignment.status === 'pending') {
            actions.push(`<button class="btn btn-primary btn-sm" onclick="updateAssignmentStatus(${assignment.id}, 'active')">Start</button>`);
        }
        if (assignment.status === 'pending' || assignment.status === 'active') {
            actions.push(`<button class="btn btn-success btn-sm" onclick="updateAssignmentStatus(${assignment.id}, 'completed')">Complete</button>`);
        }
        actions.push(`<button class="btn btn-ghost-danger btn-sm" onclick="deleteAssignment(${assignment.id})">Delete</button>`);

        return `
        <div class="assignment-card priority-border-${assignment.priority}">
            <div class="assignment-header">
                <div>
                    <h3>${assignment.taskType}</h3>
                    <span class="assignment-sub">${assignment.vehiclePlate}</span>
                </div>
                <span class="priority-badge ${assignment.priority}">${assignment.priority}</span>
            </div>
            <p class="assignment-desc">${assignment.description}</p>
            <div class="assignment-meta">
                <span><strong>Driver:</strong> ${assignment.driverName}</span>
                <span><strong>Due:</strong> ${new Date(assignment.dueDate).toLocaleDateString()}</span>
            </div>
            <div class="assignment-footer">
                ${statusBadge(assignment.status)}
                <div class="assignment-actions">${actions.join('')}</div>
            </div>
        </div>`;
    }).join('');
}

function updateAssignmentStatus(assignmentId, status) {
    const assignment = app.assignments.find(a => a.id === assignmentId);
    if (assignment) {
        assignment.status = status;
        saveDataToStorage();
        renderAssignments(document.getElementById('assignmentFilter').value);
        updateDashboard();
        addNotification(`Assignment status updated to ${status}`, 'success');
    }
}

function deleteAssignment(assignmentId) {
    if (confirm('Delete this assignment?')) {
        app.assignments = app.assignments.filter(a => a.id !== assignmentId);
        saveDataToStorage();
        renderAssignments(document.getElementById('assignmentFilter').value);
        updateDashboard();
        addNotification('Assignment deleted', 'alert');
    }
}

function filterAssignments() {
    const filter = document.getElementById('assignmentFilter').value;
    renderAssignments(filter);
}

// ===== NOTIFICATIONS =====
function addNotification(message, type = 'info') {
    const notification = {
        id: Date.now(),
        message: message,
        type: type,
        timestamp: new Date()
    };

    app.notifications.unshift(notification);

    // Keep only last 50 notifications
    if (app.notifications.length > 50) {
        app.notifications = app.notifications.slice(0, 50);
    }

    updateNotificationBadge();
    saveDataToStorage();
}

function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    const unreadCount = app.notifications.length;
    badge.textContent = unreadCount > 0 ? unreadCount : '';
}

function renderNotifications() {
    const list = document.getElementById('notificationsList');

    if (app.notifications.length === 0) {
        list.innerHTML = emptyState('No notifications');
        return;
    }

    list.innerHTML = app.notifications.map((notif, index) => `
        <div class="notification-item">
            <span class="notif-dot ${notif.type}"></span>
            <div class="notification-content">
                <p>${notif.message}</p>
                <span class="notification-time">${formatTime(notif.timestamp)}</span>
            </div>
            <button class="icon-btn sm" onclick="removeNotification(${index})" aria-label="Dismiss notification" title="Dismiss">${ICONS.close}</button>
        </div>
    `).join('');
}

function removeNotification(index) {
    app.notifications.splice(index, 1);
    renderNotifications();
    updateNotificationBadge();
    saveDataToStorage();
}

// ===== DASHBOARD =====
function updateDashboard() {
    // Count statistics
    const activeDrivers = app.drivers.filter(d => {
        const hasShift = app.shifts.some(s => s.driverId === d.id && s.status === 'active');
        return hasShift;
    }).length;

    const scheduledShifts = app.shifts.filter(s => s.status === 'scheduled').length;
    const availableVehicles = app.vehicles.filter(v => v.status === 'available').length;
    const pendingAlerts = app.assignments.filter(a => a.status === 'pending').length;

    document.getElementById('activeDriversCount').textContent = activeDrivers;
    document.getElementById('scheduledShiftsCount').textContent = scheduledShifts;
    document.getElementById('availableVehiclesCount').textContent = availableVehicles;
    document.getElementById('pendingAlertsCount').textContent = pendingAlerts;

    // Fleet Status
    renderFleetStatus();

    // Today's Shifts
    renderTodayShifts();
}

function renderFleetStatus() {
    const status = document.getElementById('fleetStatus');

    if (app.vehicles.length === 0) {
        status.innerHTML = emptyState('No vehicles in the system');
        return;
    }

    status.innerHTML = app.vehicles.map(vehicle => `
        <div class="vehicle-status ${vehicle.status}">
            <div class="vs-info">
                <strong>${vehicle.plate}</strong>
                <span>${vehicle.model} · ${vehicle.mileage.toLocaleString()} km</span>
            </div>
            ${statusBadge(vehicle.status)}
        </div>
    `).join('');
}

function renderTodayShifts() {
    const container = document.getElementById('todayShifts');
    const today = new Date();
    const todayShifts = app.shifts.filter(s => {
        const shiftDate = new Date(s.startTime);
        return shiftDate.toDateString() === today.toDateString();
    });

    if (todayShifts.length === 0) {
        container.innerHTML = emptyState('No shifts scheduled for today');
        return;
    }

    container.innerHTML = todayShifts.map(shift => `
        <div class="shift-item ${shift.status}">
            <div class="shift-info">
                <h4>${shift.driverName}</h4>
                <p>${shift.vehiclePlate} · ${formatShiftTime(shift)}</p>
            </div>
            ${statusBadge(shift.status)}
        </div>
    `).join('');
}

// ===== REPORTS & ANALYTICS =====
function generateCharts() {
    generateUtilizationChart();
    generateUsageChart();
    generateCompletionChart();
}

function metricRow(label, value, total, colorClass) {
    const pct = total > 0 ? Math.round(value / total * 100) : 0;
    return `
        <div class="metric">
            <div class="metric-row"><span>${label}</span><span>${value} · ${pct}%</span></div>
            <div class="progress"><span class="fill ${colorClass}" style="width:${pct}%"></span></div>
        </div>`;
}

function generateUtilizationChart() {
    const total = app.shifts.length;
    const completed = app.shifts.filter(s => s.status === 'completed').length;
    const active = app.shifts.filter(s => s.status === 'active').length;
    const scheduled = app.shifts.filter(s => s.status === 'scheduled').length;

    document.getElementById('utilizationChart').innerHTML = `
        <div class="chart-total"><span>Total Shifts</span><strong>${total}</strong></div>
        ${metricRow('Completed', completed, total, 'success')}
        ${metricRow('Active', active, total, 'info')}
        ${metricRow('Scheduled', scheduled, total, 'primary')}
    `;
}

function generateUsageChart() {
    const total = app.vehicles.length;
    const available = app.vehicles.filter(v => v.status === 'available').length;
    const inUse = app.vehicles.filter(v => v.status === 'in-use').length;
    const maintenance = app.vehicles.filter(v => v.status === 'maintenance').length;

    document.getElementById('usageChart').innerHTML = `
        <div class="chart-total"><span>Total Vehicles</span><strong>${total}</strong></div>
        ${metricRow('Available', available, total, 'success')}
        ${metricRow('In Use', inUse, total, 'info')}
        ${metricRow('Maintenance', maintenance, total, 'warning')}
    `;
}

function generateCompletionChart() {
    const total = app.assignments.length;
    const completed = app.assignments.filter(a => a.status === 'completed').length;
    const active = app.assignments.filter(a => a.status === 'active').length;
    const pending = app.assignments.filter(a => a.status === 'pending').length;

    document.getElementById('completionChart').innerHTML = `
        <div class="chart-total"><span>Total Assignments</span><strong>${total}</strong></div>
        ${metricRow('Completed', completed, total, 'success')}
        ${metricRow('Active', active, total, 'info')}
        ${metricRow('Pending', pending, total, 'warning')}
    `;
}

function generateReport() {
    const startDate = new Date(document.getElementById('reportStartDate').value);
    const endDate = new Date(document.getElementById('reportEndDate').value);
    // Include the whole end day, not just midnight
    endDate.setHours(23, 59, 59, 999);

    if (!document.getElementById('reportStartDate').value || !document.getElementById('reportEndDate').value) {
        alert('Please select both start and end dates');
        return;
    }

    let report = '';

    // Shifts Report
    const shiftsInRange = app.shifts.filter(s => {
        const shiftDate = new Date(s.startTime);
        return shiftDate >= startDate && shiftDate <= endDate;
    });

    report += '<h4 class="report-section-title">Shifts</h4>';
    if (shiftsInRange.length === 0) {
        report += '<p class="text-muted" style="padding: 8px 0; font-size: 13px;">No shifts in this range</p>';
    }
    shiftsInRange.forEach(shift => {
        report += `<div class="report-row">
            <span>${shift.driverName} · ${shift.vehiclePlate}</span>
            <span>${new Date(shift.startTime).toLocaleDateString()}</span>
            <span>${shift.status}</span>
        </div>`;
    });

    // Assignments Report
    const assignmentsInRange = app.assignments.filter(a => {
        const assignDate = new Date(a.dueDate);
        return assignDate >= startDate && assignDate <= endDate;
    });

    report += '<h4 class="report-section-title">Assignments</h4>';
    if (assignmentsInRange.length === 0) {
        report += '<p class="text-muted" style="padding: 8px 0; font-size: 13px;">No assignments in this range</p>';
    }
    assignmentsInRange.forEach(assign => {
        report += `<div class="report-row">
            <span>${assign.driverName} · ${assign.vehiclePlate}</span>
            <span style="text-transform: capitalize;">${assign.taskType}</span>
            <span>${assign.status}</span>
        </div>`;
    });

    document.getElementById('detailedReport').innerHTML = report;
}

// ===== SETTINGS =====
function saveSettings() {
    const companyName = document.getElementById('companyName').value;
    const maxShiftHours = document.getElementById('maxShiftHours').value;
    const alertThreshold = document.getElementById('alertThreshold').value;

    if (!companyName || !maxShiftHours || !alertThreshold) {
        alert('Please fill all settings');
        return;
    }

    app.settings.companyName = companyName;
    app.settings.maxShiftHours = parseInt(maxShiftHours);
    app.settings.alertThreshold = parseInt(alertThreshold);

    saveDataToStorage();
    addNotification('Settings saved', 'success');
}

function exportData() {
    const data = {
        vehicles: app.vehicles,
        drivers: app.drivers,
        shifts: app.shifts,
        assignments: app.assignments,
        settings: app.settings,
        exportDate: new Date().toISOString()
    };

    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cartracker-export-${Date.now()}.json`;
    link.click();

    addNotification('Data exported successfully', 'success');
}

function clearData() {
    if (confirm('Are you sure? This will delete all data permanently!')) {
        app.vehicles = [];
        app.drivers = [];
        app.shifts = [];
        app.assignments = [];
        app.notifications = [];
        localStorage.clear();
        initializeDefaultData();
        updateDashboard();
        addNotification('All data cleared', 'alert');
    }
}

// ===== HELPER FUNCTIONS =====
function ensureVehiclesLoaded() {
    if (app.vehicles.length === 0) {
        initializeDefaultData();
    }
}

function populateVehicleSelect(selectId) {
    const select = document.getElementById(selectId);
    ensureVehiclesLoaded();
    if (app.vehicles.length === 0) {
        select.innerHTML = '<option value="">No vehicles available</option>';
        return;
    }
    select.innerHTML = app.vehicles.map(vehicle =>
        `<option value="${vehicle.id}">${vehicle.plate} - ${vehicle.model}</option>`
    ).join('');
}

function populateSelects() {
    populateDriverSelect('shiftDriver');
    populateVehicleSelect('shiftVehicle');
    populateDriverSelect('assignmentDriver');
    populateVehicleSelect('assignmentVehicle');
}

function clearModalForms() {
    document.querySelectorAll('.modal-content input[type="text"]').forEach(el => el.value = '');
    document.querySelectorAll('.modal-content input[type="number"]').forEach(el => el.value = '');
    document.querySelectorAll('.modal-content input[type="date"]').forEach(el => el.value = '');
    document.querySelectorAll('.modal-content input[type="datetime-local"]').forEach(el => el.value = '');
    document.querySelectorAll('.modal-content textarea').forEach(el => el.value = '');
}

function formatTime(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
}

// ===== DATA PERSISTENCE =====
function saveDataToStorage() {
    const data = {
        vehicles: app.vehicles,
        drivers: app.drivers,
        shifts: app.shifts,
        assignments: app.assignments,
        notifications: app.notifications,
        settings: app.settings
    };
    localStorage.setItem('carTrackerData', JSON.stringify(data));
}

function loadDataFromStorage() {
    const stored = localStorage.getItem('carTrackerData');
    if (stored) {
        const data = JSON.parse(stored);
        app.vehicles = data.vehicles || [];
        app.drivers = data.drivers || [];
        app.shifts = data.shifts || [];
        app.assignments = data.assignments || [];
        app.notifications = data.notifications || [];
        app.settings = data.settings || app.settings;
    }
}

function initializeDefaultData() {
    // Add default drivers if none exist
    if (app.drivers.length === 0) {
        app.drivers = [
            { id: 1, name: 'John Smith', phone: '555-0101', email: 'john@company.com' },
            { id: 2, name: 'Sarah Johnson', phone: '555-0102', email: 'sarah@company.com' },
            { id: 3, name: 'Mike Davis', phone: '555-0103', email: 'mike@company.com' },
            { id: 4, name: 'Emily Williams', phone: '555-0104', email: 'emily@company.com' },
            { id: 5, name: 'Robert Brown', phone: '555-0105', email: 'robert@company.com' }
        ];
        saveDataToStorage();
    }

    // Add sample vehicle if none exist
    if (app.vehicles.length === 0) {
        app.vehicles = [
            { id: 1, plate: 'ABC-001', model: 'Toyota Corolla', year: 2023, mileage: 5000, status: 'available', lastService: new Date().toISOString(), addedDate: new Date().toISOString() },
            { id: 2, plate: 'XYZ-002', model: 'Honda Civic', year: 2022, mileage: 12000, status: 'in-use', lastService: new Date().toISOString(), addedDate: new Date().toISOString() },
            { id: 3, plate: 'DEF-003', model: 'Ford Transit', year: 2021, mileage: 25000, status: 'available', lastService: new Date().toISOString(), addedDate: new Date().toISOString() }
        ];
        saveDataToStorage();
    }

    updateNotificationBadge();
}
