// Global variables
let currentTerm = null;
let subjectsData = {};
let todosData = {};
let holidaysData = {};
let currentWeekStart = null;

// Time slots for timetable (8:00 AM to 7:30 PM)
const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'
];

// Days of week in Thai
const daysOfWeek = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

// Initialize app
document.addEventListener('DOMContentLoaded', async function() {
    try {
        showLoading();
        await initializeApp();
        hideLoading();
        console.log('App initialized successfully');
    } catch (error) {
        console.error('Error initializing app:', error);
        hideLoading();
        showError('เกิดข้อผิดพลาดในการเริ่มต้นแอปพลิเคชัน');
    }
});

async function initializeApp() {
    console.log('Initializing app...');
    
    // Load current term
    currentTerm = window.localDB.getCurrentTerm();
    
    // Load terms and set up term selector
    await loadTerms();
    
    // If no current term, set to first available term
    if (!currentTerm) {
        const terms = await window.localDB.getTerms();
        const termIds = Object.keys(terms);
        if (termIds.length > 0) {
            currentTerm = termIds[0];
            window.localDB.setCurrentTerm(currentTerm);
        }
    }
    
    // Set current term in selector
    const termSelect = document.getElementById('termSelect');
    if (currentTerm) {
        termSelect.value = currentTerm;
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Set current date and week
    setCurrentDate();
    setCurrentWeek();
    
    // Load all data for current term
    await loadAllData();
    
    // Generate timetable
    generateTimetable();
    
    // Update other components
    updateTodoList();
    updateHolidayList();
    
    console.log('App initialized successfully');
}

function setupEventListeners() {
    // Term selector
    document.getElementById('termSelect').addEventListener('change', onTermChange);
    
    // Week navigation
    document.getElementById('prevWeek').addEventListener('click', () => navigateWeek(-1));
    document.getElementById('nextWeek').addEventListener('click', () => navigateWeek(1));
    
    // Form submissions
    document.getElementById('addTermForm').addEventListener('submit', handleAddTerm);
    document.getElementById('addSubjectForm').addEventListener('submit', handleAddSubject);
    document.getElementById('addTodoForm').addEventListener('submit', handleAddTodo);
    document.getElementById('addHolidayForm').addEventListener('submit', handleAddHoliday);
    
    // Modal close buttons
    document.querySelectorAll('.modal .close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            closeModal(modal.id);
        });
    });
    
    // Click outside modal to close
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
}

function showLoading() {
    const loadingDiv = document.getElementById('loading');
    if (loadingDiv) {
        loadingDiv.style.display = 'flex';
    }
}

function hideLoading() {
    const loadingDiv = document.getElementById('loading');
    if (loadingDiv) {
        loadingDiv.style.display = 'none';
    }
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #ff4444;
        color: white;
        padding: 20px;
        border-radius: 10px;
        z-index: 10000;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    errorDiv.innerHTML = `
        <strong>เกิดข้อผิดพลาด</strong><br>
        ${message}
        <button onclick="this.parentElement.remove()" style="background: white; color: #ff4444; border: none; padding: 5px 10px; border-radius: 3px; margin-left: 10px; cursor: pointer;">
            ปิด
        </button>
    `;
    document.body.appendChild(errorDiv);
}

function setCurrentDate() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('th-TH', options);
}

function setCurrentWeek() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek;
    currentWeekStart = new Date(now.setDate(diff));
    updateWeekDisplay();
}

function updateWeekDisplay() {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const startStr = currentWeekStart.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    const endStr = weekEnd.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    
    document.getElementById('weekRange').textContent = `${startStr} - ${endStr}`;
}

function navigateWeek(direction) {
    currentWeekStart.setDate(currentWeekStart.getDate() + (direction * 7));
    updateWeekDisplay();
    generateTimetable();
}

function getDateForDay(dayOfWeek) {
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + dayOfWeek);
    return date;
}

async function loadTerms() {
    try {
        const terms = await window.localDB.getTerms();
        const termSelect = document.getElementById('termSelect');
        
        // Clear existing options except the first one
        termSelect.innerHTML = '<option value="">เลือกเทอม</option>';
        
        // Add terms to selector
        Object.entries(terms).forEach(([termId, term]) => {
            const option = document.createElement('option');
            option.value = termId;
            option.textContent = term.name;
            termSelect.appendChild(option);
        });
        
        console.log('Terms loaded successfully');
    } catch (error) {
        console.error('Error loading terms:', error);
    }
}

async function loadAllData() {
    if (!currentTerm) return;
    
    try {
        // Load subjects
        subjectsData = await window.localDB.getSubjects(currentTerm);
        
        // Load todos
        todosData = await window.localDB.getTodos(currentTerm);
        
        // Load holidays
        holidaysData = await window.localDB.getHolidays(currentTerm);
        
        console.log('All data loaded successfully');
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

async function onTermChange() {
    const termSelect = document.getElementById('termSelect');
    const selectedTerm = termSelect.value;
    
    if (selectedTerm && selectedTerm !== currentTerm) {
        currentTerm = selectedTerm;
        window.localDB.setCurrentTerm(currentTerm);
        
        await loadAllData();
        generateTimetable();
        updateTodoList();
        updateHolidayList();
    }
}

function generateTimetable() {
    const tbody = document.querySelector('#timetable tbody');
    tbody.innerHTML = '';
    
    timeSlots.forEach(timeSlot => {
        const row = document.createElement('tr');
        
        // Time column
        const timeCell = document.createElement('td');
        timeCell.className = 'time-slot';
        timeCell.textContent = timeSlot;
        row.appendChild(timeCell);
        
        // Day columns
        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
            const cell = document.createElement('td');
            cell.className = 'timetable-cell';
            cell.dataset.day = dayIndex;
            cell.dataset.time = timeSlot;
            
            // Check if there's a subject for this time slot
            const subject = getSubjectForTimeSlot(dayIndex, timeSlot);
            if (subject) {
                cell.innerHTML = `
                    <div class="subject-block" onclick="showSubjectDetails('${subject.id}')">
                        <div class="subject-name">${subject.name}</div>
                        <div class="subject-location">${subject.location}</div>
                    </div>
                `;
                cell.classList.add('has-subject');
            } else {
                const date = getDateForDay(dayIndex);
                const isHoliday = checkIfHoliday(date);
                
                if (isHoliday) {
                    cell.classList.add('holiday');
                    cell.innerHTML = `<div class="holiday-indicator">วันหยุด</div>`;
                } else {
                    cell.addEventListener('click', () => onCellClick(cell));
                }
            }
            
            row.appendChild(cell);
        }
        
        tbody.appendChild(row);
    });
}

function getSubjectForTimeSlot(dayOfWeek, timeSlot) {
    return Object.values(subjectsData).find(subject => {
        if (subject.dayOfWeek !== dayOfWeek) return false;
        
        const startTime = subject.startTime;
        const endTime = subject.endTime;
        
        return timeSlot >= startTime && timeSlot < endTime;
    });
}

function checkIfHoliday(date) {
    const dateStr = date.toISOString().split('T')[0];
    return Object.values(holidaysData).some(holiday => holiday.date === dateStr);
}

function onCellClick(cell) {
    const day = parseInt(cell.dataset.day);
    const time = cell.dataset.time;
    
    if (confirm(`คุณต้องการเพิ่มรายวิชาสำหรับวัน${daysOfWeek[day]} เวลา ${time} หรือไม่?`)) {
        openModal('addSubjectModal');
        
        // Pre-fill form with selected day and time
        document.getElementById('dayOfWeek').value = day;
        document.getElementById('startTime').value = time;
    }
}

function showSubjectDetails(subjectId) {
    const subject = subjectsData[subjectId];
    if (!subject) return;
    
    const modal = document.getElementById('subjectDetailsModal');
    if (!modal) {
        // Create subject details modal
        const modalHTML = `
            <div id="subjectDetailsModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-book"></i> รายละเอียดรายวิชา</h2>
                        <span class="close">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div id="subjectDetailsContent"></div>
                        <div class="modal-actions">
                            <button class="btn btn-danger" onclick="deleteSubject('${subjectId}')">
                                <i class="fas fa-trash"></i> ลบรายวิชา
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add close event listeners
        const newModal = document.getElementById('subjectDetailsModal');
        newModal.querySelector('.close').addEventListener('click', () => closeModal('subjectDetailsModal'));
        newModal.addEventListener('click', (e) => {
            if (e.target === newModal) closeModal('subjectDetailsModal');
        });
    }
    
    // Fill subject details
    const content = document.getElementById('subjectDetailsContent');
    content.innerHTML = `
        <div class="subject-detail">
            <h3>${subject.name}</h3>
            <p><strong>รหัสวิชา:</strong> ${subject.code}</p>
            <p><strong>อาจารย์:</strong> ${subject.instructor}</p>
            <p><strong>วันเวลา:</strong> ${daysOfWeek[subject.dayOfWeek]} ${subject.startTime} - ${subject.endTime}</p>
            <p><strong>สถานที่:</strong> ${subject.location}</p>
            ${subject.onlineLink ? `<p><strong>ลิงก์ออนไลน์:</strong> <a href="${subject.onlineLink}" target="_blank">${subject.onlineLink}</a></p>` : ''}
            ${subject.notes ? `<p><strong>หมายเหตุ:</strong> ${subject.notes}</p>` : ''}
        </div>
    `;
    
    openModal('subjectDetailsModal');
}

function updateTodoList() {
    const container = document.getElementById('todoList');
    if (!container) return;
    
    const todos = Object.entries(todosData).sort((a, b) => {
        // Sort by date, then by priority
        const dateA = new Date(a[1].date);
        const dateB = new Date(b[1].date);
        if (dateA.getTime() !== dateB.getTime()) {
            return dateA - dateB;
        }
        
        const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
        return priorityOrder[b[1].priority] - priorityOrder[a[1].priority];
    });
    
    container.innerHTML = todos.map(([todoId, todo]) => `
        <div class="todo-item ${todo.completed ? 'completed' : ''}" data-priority="${todo.priority}">
            <div class="todo-content">
                <input type="checkbox" ${todo.completed ? 'checked' : ''} 
                       onchange="toggleTodo('${todoId}', this.checked)">
                <span class="todo-text">${todo.text}</span>
                <span class="todo-date">${new Date(todo.date).toLocaleDateString('th-TH')}</span>
                <span class="todo-priority">${getPriorityText(todo.priority)}</span>
            </div>
            <button class="delete-btn" onclick="deleteTodo('${todoId}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

function getPriorityText(priority) {
    const priorities = {
        'high': 'สูง',
        'medium': 'ปานกลาง',
        'low': 'ต่ำ'
    };
    return priorities[priority] || priority;
}

async function toggleTodo(todoId, completed) {
    try {
        await window.localDB.updateTodo(currentTerm, todoId, { completed });
        todosData[todoId].completed = completed;
        updateTodoList();
    } catch (error) {
        console.error('Error updating todo:', error);
    }
}

async function deleteTodo(todoId) {
    if (confirm('คุณต้องการลบรายการนี้หรือไม่?')) {
        try {
            await window.localDB.deleteTodo(currentTerm, todoId);
            delete todosData[todoId];
            updateTodoList();
        } catch (error) {
            console.error('Error deleting todo:', error);
        }
    }
}

function updateHolidayList() {
    const container = document.getElementById('holidayList');
    if (!container) return;
    
    const holidays = Object.entries(holidaysData).sort((a, b) => {
        return new Date(a[1].date) - new Date(b[1].date);
    });
    
    container.innerHTML = holidays.map(([holidayId, holiday]) => `
        <div class="holiday-item">
            <div class="holiday-content">
                <div class="holiday-name">${holiday.name}</div>
                <div class="holiday-date">${formatThaiDate(holiday.date)}</div>
                ${holiday.moveToSunday ? '<div class="holiday-note">ย้ายไปวันอาทิตย์</div>' : ''}
            </div>
            <button class="delete-btn" onclick="deleteHoliday('${holidayId}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

function formatThaiDate(dateString) {
    const date = new Date(dateString);
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    };
    return date.toLocaleDateString('th-TH', options);
}

async function deleteHoliday(holidayId) {
    if (confirm('คุณต้องการลบวันหยุดนี้หรือไม่?')) {
        try {
            await window.localDB.deleteHoliday(currentTerm, holidayId);
            delete holidaysData[holidayId];
            updateHolidayList();
            generateTimetable(); // Regenerate timetable
        } catch (error) {
            console.error('Error deleting holiday:', error);
        }
    }
}

// Modal functions
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Reset forms
    const modal = document.getElementById(modalId);
    const forms = modal.querySelectorAll('form');
    forms.forEach(form => form.reset());
}

// Form handlers
async function handleAddTerm(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const termData = {
        name: formData.get('termName'),
        startDate: formData.get('termStartDate'),
        endDate: formData.get('termEndDate'),
        createdAt: new Date().toISOString()
    };
    
    try {
        const termId = await window.localDB.addTerm(termData);
        closeModal('addTermModal');
        await loadTerms();
        
        // Select the new term
        document.getElementById('termSelect').value = termId;
        currentTerm = termId;
        window.localDB.setCurrentTerm(currentTerm);
        await loadAllData();
        generateTimetable();
        
        alert('เพิ่มเทอมเรียบร้อยแล้ว');
    } catch (error) {
        console.error('Error adding term:', error);
        alert('เกิดข้อผิดพลาดในการเพิ่มเทอม');
    }
}

async function handleAddSubject(e) {
    e.preventDefault();
    
    if (!currentTerm) {
        alert('กรุณาเลือกเทอมก่อน');
        return;
    }
    
    const formData = new FormData(e.target);
    const subjectData = {
        name: formData.get('subjectName'),
        code: formData.get('subjectCode'),
        instructor: formData.get('instructor'),
        dayOfWeek: parseInt(formData.get('dayOfWeek')),
        startTime: formData.get('startTime'),
        endTime: formData.get('endTime'),
        location: formData.get('location'),
        onlineLink: formData.get('onlineLink'),
        notes: formData.get('notes'),
        createdAt: new Date().toISOString()
    };
    
    try {
        const subjectId = await window.localDB.addSubject(currentTerm, subjectData);
        subjectsData[subjectId] = { ...subjectData, id: subjectId };
        
        closeModal('addSubjectModal');
        generateTimetable();
        alert('เพิ่มรายวิชาเรียบร้อยแล้ว');
    } catch (error) {
        console.error('Error adding subject:', error);
        alert('เกิดข้อผิดพลาดในการเพิ่มรายวิชา');
    }
}

async function handleAddTodo(e) {
    e.preventDefault();
    
    if (!currentTerm) {
        alert('กรุณาเลือกเทอมก่อน');
        return;
    }
    
    const formData = new FormData(e.target);
    const todoData = {
        text: formData.get('todoText'),
        date: formData.get('todoDate'),
        priority: formData.get('todoPriority'),
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    try {
        const todoId = await window.localDB.addTodo(currentTerm, todoData);
        todosData[todoId] = { ...todoData, id: todoId };
        
        closeModal('addTodoModal');
        updateTodoList();
        alert('เพิ่มรายการสำเร็จแล้ว');
    } catch (error) {
        console.error('Error adding todo:', error);
        alert('เกิดข้อผิดพลาดในการเพิ่มรายการ');
    }
}

async function handleAddHoliday(e) {
    e.preventDefault();
    
    if (!currentTerm) {
        alert('กรุณาเลือกเทอมก่อน');
        return;
    }
    
    const formData = new FormData(e.target);
    const holidayData = {
        name: formData.get('holidayName'),
        date: formData.get('holidayDate'),
        moveToSunday: formData.get('moveToSunday') === 'on',
        createdAt: new Date().toISOString()
    };
    
    try {
        const holidayId = await window.localDB.addHoliday(currentTerm, holidayData);
        holidaysData[holidayId] = { ...holidayData, id: holidayId };
        
        closeModal('addHolidayModal');
        updateHolidayList();
        generateTimetable(); // Regenerate timetable
        alert('เพิ่มวันหยุดเรียบร้อยแล้ว');
    } catch (error) {
        console.error('Error adding holiday:', error);
        alert('เกิดข้อผิดพลาดในการเพิ่มวันหยุด');
    }
}

async function deleteSubject(subjectId) {
    if (confirm('คุณต้องการลบรายวิชานี้หรือไม่?')) {
        try {
            await window.localDB.deleteSubject(currentTerm, subjectId);
            delete subjectsData[subjectId];
            generateTimetable();
            closeModal('subjectDetailsModal');
            alert('ลบรายวิชาเรียบร้อยแล้ว');
        } catch (error) {
            console.error('Error deleting subject:', error);
            alert('เกิดข้อผิดพลาดในการลบรายวิชา');
        }
    }
}