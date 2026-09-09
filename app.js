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

// Initialize app on page load
document.addEventListener('DOMContentLoaded', () => {
    loadDataFromStorage();
    initializeDefaultData();
    ensureDriversLoaded();
    updateDashboard();
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

    // Update UI
    document.getElementById('userInfo').textContent = `${role.toUpperCase()} - ${username}`;
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
function showSection(sectionId) {
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
    event.target.classList.add('active');

    // Update content based on section
    if (sectionId === 'scheduling') {
        updateScheduleCalendar();
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

    grid.innerHTML = vehicles.map(vehicle => `
        <div class="vehicle-card">
            <h3>${vehicle.plate}</h3>
            <div class="vehicle-info">
                <span>Model:</span>
                <span>${vehicle.model} (${vehicle.year})</span>
            </div>
            <div class="vehicle-info">
                <span>Mileage:</span>
                <span>${vehicle.mileage.toLocaleString()} km</span>
            </div>
            <div class="vehicle-info">
                <span>Status:</span>
                <span>${vehicle.status}</span>
            </div>
            <span class="status-badge ${vehicle.status}">${vehicle.status}</span>
            <div style="margin-top: 10px; display: flex; gap: 5px;">
                <button class="btn btn-secondary" style="flex: 1; font-size: 12px;" onclick="editVehicle(${vehicle.id})">Edit</button>
                <button class="btn btn-danger" style="flex: 1; font-size: 12px;" onclick="deleteVehicle(${vehicle.id})">Delete</button>
            </div>
        </div>
    `).join('');

    if (vehicles.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--secondary-color);">No vehicles found</p>';
    }
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
        const oldBtn = form.querySelector('button:first-child');
        oldBtn.textContent = 'Update Vehicle';
        oldBtn.onclick = () => updateVehicle(id);
        
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
        const btn = form.querySelector('button:first-child');
        btn.textContent = 'Add Vehicle';
        btn.onclick = () => addVehicle();
        
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

    // Render shifts for selected date
    const shiftsList = document.getElementById('shiftsList');
    const dayShifts = app.shifts.filter(s => {
        let shiftDate;
        if (typeof s.startTime === 'string') {
            shiftDate = new Date(s.startTime);
        } else {
            shiftDate = new Date(s.startTime);
        }
        return shiftDate.toDateString() === app.selectedDate.toDateString();
    });

    if (dayShifts.length === 0) {
        shiftsList.innerHTML = '<p style="color: var(--secondary-color); text-align: center;">No shifts scheduled for this date</p>';
    } else {
        shiftsList.innerHTML = dayShifts.map(shift => `
            <div class="shift-item ${shift.status}">
                <div class="shift-info">
                    <h4>${shift.driverName}</h4>
                    <p>${shift.vehiclePlate} - ${new Date(shift.startTime).toLocaleTimeString()} to ${new Date(shift.endTime).toLocaleTimeString()}</p>
                    <p>${shift.notes}</p>
                </div>
                <div style="display: flex; gap: 5px; flex-direction: column;">
                    <button class="btn btn-secondary" style="font-size: 11px; padding: 5px;" onclick="updateShiftStatus(${shift.id}, 'active')">Start</button>
                    <button class="btn btn-success" style="font-size: 11px; padding: 5px;" onclick="updateShiftStatus(${shift.id}, 'completed')">Complete</button>
                </div>
            </div>
        `).join('');
    }
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
    
    // Month and year header
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    let html = `<div style="padding: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <button class="btn btn-secondary" style="padding: 8px 12px; font-size: 12px;" onclick="previousMonth()">← Prev</button>
            <h3 style="text-align: center; margin: 0; flex: 1;">${monthNames[month]} ${year}</h3>
            <button class="btn btn-secondary" style="padding: 8px 12px; font-size: 12px;" onclick="nextMonth()">Next →</button>
        </div>
        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px;">`;
    
    // Day headers
    dayNames.forEach(day => {
        html += `<div style="text-align: center; font-weight: 600; padding: 10px; background: var(--primary-color); color: white; border-radius: 4px;">${day}</div>`;
    });
    
    // Empty cells before first day
    for (let i = 0; i < startingDayOfWeek; i++) {
        html += '<div style="padding: 10px; background: #f0f0f0; border-radius: 4px;"></div>';
    }
    
    // Days of month
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${month}-${day}`;
        const dayShifts = shiftsMap[dateKey] || [];
        const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
        const cellDate = new Date(year, month, day);
        const cellDateStr = cellDate.toISOString().split('T')[0];
        const isSelected = day === app.selectedDate.getDate() && month === app.selectedDate.getMonth() && year === app.selectedDate.getFullYear();
        
        // Determine shift status color
        let shiftBadgeColor = '';
        let shiftBadgeLabel = '';
        if (dayShifts.length > 0) {
            const completedShifts = dayShifts.filter(s => s.status === 'completed').length;
            const totalShifts = dayShifts.length;
            
            if (completedShifts === totalShifts) {
                // All completed - green
                shiftBadgeColor = '#4caf50';
                shiftBadgeLabel = `${totalShifts} completed`;
            } else if (completedShifts > 0) {
                // Mixed - blue (shows ongoing)
                const ongoingShifts = totalShifts - completedShifts;
                shiftBadgeColor = '#2196f3';
                shiftBadgeLabel = `${ongoingShifts} active`;
            } else {
                // All ongoing/scheduled - blue
                shiftBadgeColor = '#2196f3';
                shiftBadgeLabel = `${totalShifts} shift${totalShifts > 1 ? 's' : ''}`;
            }
        }
        
        const bgColor = isSelected ? '#ffeb3b' : isToday ? '#e3f2fd' : dayShifts.length > 0 ? '#f1f8e9' : 'white';
        const borderColor = isSelected ? '#fbc02d' : isToday ? 'var(--primary-color)' : dayShifts.length > 0 ? 'var(--success-color)' : 'var(--border-color)';
        const fontWeight = isSelected ? 'bold' : 'normal';
        
        html += `<div style="
            padding: 10px; 
            border: 2px solid ${borderColor};
            border-radius: 4px; 
            background: ${bgColor}; 
            cursor: pointer;
            min-height: 60px;
            display: flex;
            flex-direction: column;
            transition: all 0.2s;
            font-weight: ${fontWeight};
        " onclick="selectCalendarDate('${year}', '${month}', '${day}')" 
           onmouseover="this.style.boxShadow='0 4px 8px rgba(0,0,0,0.2)'" 
           onmouseout="this.style.boxShadow='none'">
            <strong style="font-size: 14px; color: var(--dark-text);">${day}</strong>
            <div style="font-size: 11px; color: var(--secondary-color); margin-top: 5px;">
                ${shiftBadgeColor ? `<span style="background: ${shiftBadgeColor}; color: white; padding: 2px 6px; border-radius: 3px;">${shiftBadgeLabel}</span>` : ''}
            </div>
        </div>`;
    }
    
    html += '</div></div>';
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
        list.innerHTML = '<p style="text-align: center; color: var(--secondary-color);">No assignments</p>';
        return;
    }

    list.innerHTML = assignments.map(assignment => `
        <div class="assignment-card">
            <div class="assignment-header">
                <h3>${assignment.taskType} - ${assignment.vehiclePlate}</h3>
                <span class="priority-${assignment.priority}">${assignment.priority.toUpperCase()}</span>
            </div>
            <div class="assignment-details">
                <p><strong>Assigned to:</strong> ${assignment.driverName}</p>
                <p><strong>Description:</strong> ${assignment.description}</p>
                <p><strong>Due Date:</strong> ${new Date(assignment.dueDate).toLocaleDateString()}</p>
                <p><strong>Status:</strong> <span style="text-transform: capitalize;">${assignment.status}</span></p>
            </div>
            <div class="assignment-actions">
                <button class="btn btn-primary" onclick="updateAssignmentStatus(${assignment.id}, 'active')">Start</button>
                <button class="btn btn-success" onclick="updateAssignmentStatus(${assignment.id}, 'completed')">Complete</button>
                <button class="btn btn-danger" onclick="deleteAssignment(${assignment.id})">Delete</button>
            </div>
        </div>
    `).join('');
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
        list.innerHTML = '<p style="text-align: center; color: var(--secondary-color); padding: 20px;">No notifications</p>';
        return;
    }

    list.innerHTML = app.notifications.map((notif, index) => `
        <div class="notification-item ${notif.type}">
            <div class="notification-content">
                <h4>${notif.type.toUpperCase()}</h4>
                <p>${notif.message}</p>
            </div>
            <div style="display: flex; gap: 10px; align-items: flex-start;">
                <span class="notification-time">${formatTime(notif.timestamp)}</span>
                <button class="notification-close" onclick="removeNotification(${index})" title="Close">×</button>
            </div>
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
    status.innerHTML = app.vehicles.map(vehicle => `
        <div class="vehicle-status ${vehicle.status}">
            <div>
                <strong>${vehicle.plate}</strong> - ${vehicle.model}
                <br><small style="color: var(--secondary-color);">${vehicle.mileage.toLocaleString()} km</small>
            </div>
            <span class="status-badge ${vehicle.status}">${vehicle.status}</span>
        </div>
    `).join('');

    if (app.vehicles.length === 0) {
        status.innerHTML = '<p style="color: var(--secondary-color); text-align: center;">No vehicles in the system</p>';
    }
}

function renderTodayShifts() {
    const container = document.getElementById('todayShifts');
    const today = new Date();
    const todayShifts = app.shifts.filter(s => {
        const shiftDate = new Date(s.startTime);
        return shiftDate.toDateString() === today.toDateString();
    });

    container.innerHTML = todayShifts.map(shift => `
        <div class="shift-item ${shift.status}">
            <div class="shift-info">
                <h4>${shift.driverName}</h4>
                <p>${shift.vehiclePlate} - ${new Date(shift.startTime).toLocaleTimeString()} to ${new Date(shift.endTime).toLocaleTimeString()}</p>
            </div>
            <span class="status-badge ${shift.status}">${shift.status}</span>
        </div>
    `).join('');

    if (todayShifts.length === 0) {
        container.innerHTML = '<p style="color: var(--secondary-color); text-align: center;">No shifts scheduled for today</p>';
    }
}

// ===== REPORTS & ANALYTICS =====
function generateCharts() {
    generateUtilizationChart();
    generateUsageChart();
    generateCompletionChart();
}

function generateUtilizationChart() {
    const total = app.shifts.length;
    const completed = app.shifts.filter(s => s.status === 'completed').length;
    const active = app.shifts.filter(s => s.status === 'active').length;
    const scheduled = app.shifts.filter(s => s.status === 'scheduled').length;

    const chart = document.getElementById('utilizationChart');
    chart.innerHTML = `
        <div style="width: 100%; text-align: left;">
            <p><strong>Total Shifts:</strong> ${total}</p>
            <div style="margin: 10px 0; background-color: #e8f5e9; padding: 8px; border-radius: 4px;">
                <strong>Completed:</strong> ${completed} (${total > 0 ? Math.round(completed/total*100) : 0}%)
            </div>
            <div style="margin: 10px 0; background-color: #e3f2fd; padding: 8px; border-radius: 4px;">
                <strong>Active:</strong> ${active}
            </div>
            <div style="margin: 10px 0; background-color: #fff3e0; padding: 8px; border-radius: 4px;">
                <strong>Scheduled:</strong> ${scheduled}
            </div>
        </div>
    `;
}

function generateUsageChart() {
    const total = app.vehicles.length;
    const available = app.vehicles.filter(v => v.status === 'available').length;
    const inUse = app.vehicles.filter(v => v.status === 'in-use').length;
    const maintenance = app.vehicles.filter(v => v.status === 'maintenance').length;

    const chart = document.getElementById('usageChart');
    chart.innerHTML = `
        <div style="width: 100%; text-align: left;">
            <p><strong>Total Vehicles:</strong> ${total}</p>
            <div style="margin: 10px 0; background-color: #e8f5e9; padding: 8px; border-radius: 4px;">
                <strong>Available:</strong> ${available} (${total > 0 ? Math.round(available/total*100) : 0}%)
            </div>
            <div style="margin: 10px 0; background-color: #e3f2fd; padding: 8px; border-radius: 4px;">
                <strong>In Use:</strong> ${inUse}
            </div>
            <div style="margin: 10px 0; background-color: #ffe0b2; padding: 8px; border-radius: 4px;">
                <strong>Maintenance:</strong> ${maintenance}
            </div>
        </div>
    `;
}

function generateCompletionChart() {
    const total = app.assignments.length;
    const completed = app.assignments.filter(a => a.status === 'completed').length;
    const active = app.assignments.filter(a => a.status === 'active').length;
    const pending = app.assignments.filter(a => a.status === 'pending').length;

    const chart = document.getElementById('completionChart');
    chart.innerHTML = `
        <div style="width: 100%; text-align: left;">
            <p><strong>Total Assignments:</strong> ${total}</p>
            <div style="margin: 10px 0; background-color: #e8f5e9; padding: 8px; border-radius: 4px;">
                <strong>Completed:</strong> ${completed} (${total > 0 ? Math.round(completed/total*100) : 0}%)
            </div>
            <div style="margin: 10px 0; background-color: #e3f2fd; padding: 8px; border-radius: 4px;">
                <strong>Active:</strong> ${active}
            </div>
            <div style="margin: 10px 0; background-color: #fff3e0; padding: 8px; border-radius: 4px;">
                <strong>Pending:</strong> ${pending}
            </div>
        </div>
    `;
}

function generateReport() {
    const startDate = new Date(document.getElementById('reportStartDate').value);
    const endDate = new Date(document.getElementById('reportEndDate').value);

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

    report += '<h4>Shifts Report</h4>';
    shiftsInRange.forEach(shift => {
        report += `<div class="report-row">
            <span>${shift.driverName} - ${shift.vehiclePlate}</span>
            <span>${new Date(shift.startTime).toLocaleDateString()}</span>
            <span>${shift.status}</span>
        </div>`;
    });

    // Assignments Report
    const assignmentsInRange = app.assignments.filter(a => {
        const assignDate = new Date(a.dueDate);
        return assignDate >= startDate && assignDate <= endDate;
    });

    report += '<h4 style="margin-top: 20px;">Assignments Report</h4>';
    assignmentsInRange.forEach(assign => {
        report += `<div class="report-row">
            <span>${assign.driverName} - ${assign.vehiclePlate}</span>
            <span>${assign.taskType}</span>
            <span>${assign.status}</span>
        </div>`;
    });

    document.getElementById('detailedReport').innerHTML = report || '<p style="text-align: center; color: var(--secondary-color);">No data in selected range</p>';
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
