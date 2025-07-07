// Global Variables
let currentTerm = null;
let currentWeekStart = null;
let timetableData = {};
let subjectsData = {};
let todosData = {};
let holidaysData = {};

// Thai day names
const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

// Time slots for timetable (24-hour format)
const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'
];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    
    // Wait for Firebase to be ready
    if (window.firebaseDB) {
        initializeApp();
    } else {
        window.addEventListener('firebaseReady', function() {
            initializeApp();
        });
    }
});

async function initializeApp() {
    try {
        showLoading();
        console.log('Initializing app...');
        
        // Check if Firebase is available
        if (!window.firebaseDB) {
            console.error('Firebase database not available');
            showFirebaseError();
            return;
        }
        
        // Test Firebase connection with timeout
        try {
            const connectionPromise = window.firebaseDB.ref('test').once('value');
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Firebase connection timeout')), 5000)
            );
            
            await Promise.race([connectionPromise, timeoutPromise]);
            console.log('Firebase connection test passed');
        } catch (error) {
            console.error('Firebase connection failed:', error);
            // Continue with offline mode instead of showing error
            console.log('Continuing in offline mode...');
            initOfflineMode();
            return;
        }
        
        await loadTerms();
        setCurrentDate();
        setCurrentWeek();
        await loadAllData();
        generateTimetable();
        updateTodoList();
        updateHolidayList();
        
        console.log('App initialized successfully');
    } catch (error) {
        console.error('Error initializing app:', error);
        if (error.message.includes('permission') || error.message.includes('Firebase')) {
            showFirebaseError();
        } else {
            alert('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message);
        }
    } finally {
        hideLoading();
    }
}

function initOfflineMode() {
    console.log('Initializing offline mode...');
    
    // Show offline mode notification
    const offlineDiv = document.createElement('div');
    offlineDiv.id = 'offlineNotice';
    offlineDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #ffa500;
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        z-index: 10000;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    offlineDiv.innerHTML = `
        <strong>โหมดออฟไลน์</strong> - กำลังใช้งานแบบทดสอบ
        <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; margin-left: 10px; cursor: pointer; font-size: 16px;">×</button>
    `;
    document.body.appendChild(offlineDiv);
    
    // Initialize with sample data
    initSampleData();
    setCurrentDate();
    setCurrentWeek();
    generateTimetable();
    updateTodoList();
    updateHolidayList();
    
    console.log('Offline mode initialized successfully');
}

function initSampleData() {
    // Sample term data
    const sampleTermId = 'term_2568_1';
    currentTerm = sampleTermId;
    
    // Set term selector
    const termSelect = document.getElementById('termSelect');
    termSelect.innerHTML = `
        <option value="">เลือกเทอม</option>
        <option value="${sampleTermId}" selected>เทอม 1/2568 (ตัวอย่าง)</option>
    `;
    
    // Sample subjects data (based on your university schedule)
    subjectsData = {
        'math_calculus': {
            name: 'แคลคูลัส 2',
            code: 'MATH201',
            instructor: 'อ.สมชาย',
            dayOfWeek: 3, // Wednesday
            startTime: '13:00',
            endTime: '15:00',
            location: 'ห้อง 301',
            onlineLink: '',
            notes: 'ต้องเตรียมเครื่องคิดเลข'
        },
        'physics_lab': {
            name: 'ปฏิบัติการฟิสิกส์',
            code: 'PHYS105',
            instructor: 'อ.สมหญิง',
            dayOfWeek: 5, // Friday
            startTime: '09:00',
            endTime: '12:00',
            location: 'ห้องปฏิบัติการ A',
            onlineLink: '',
            notes: 'ใส่เสื้อกาวน์ขาว'
        },
        'computer_sci': {
            name: 'วิทยาศาสตร์คอมพิวเตอร์',
            code: 'CS101',
            instructor: 'อ.เทคโน',
            dayOfWeek: 2, // Tuesday
            startTime: '10:00',
            endTime: '12:00',
            location: 'ห้องคอมพิวเตอร์ 1',
            onlineLink: 'https://meet.google.com/abc-defg-hij',
            notes: 'เตรียมแล็ปท็อป'
        }
    };
    
    // Sample todos
    const today = new Date().toISOString().split('T')[0];
    todosData = {
        'todo1': {
            text: 'ทำการบ้านแคลคูลัส บทที่ 5',
            date: today,
            priority: 'high',
            completed: false
        },
        'todo2': {
            text: 'อ่านหนังสือฟิสิกส์ บทที่ 3',
            date: today,
            priority: 'medium',
            completed: false
        }
    };
    
    // Sample holidays
    holidaysData = {
        'holiday1': {
            name: 'วันหยุดกลางภาค',
            date: '2024-10-15',
            moveToSunday: true
        }
    };
}

function showFirebaseError() {
    hideLoading();
    const errorDiv = document.createElement('div');
    errorDiv.id = 'firebaseError';
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #ff4444;
        color: white;
        padding: 20px;
        border-radius: 10px;
        max-width: 600px;
        z-index: 10000;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    errorDiv.innerHTML = `
        <h3>🔥 ต้องเปิดใช้งาน Firebase Realtime Database</h3>
        <p>กรุณาไปที่ Firebase Console และเปิดใช้งาน Realtime Database:</p>
        <ol style="text-align: left; margin: 10px 0;">
            <li>เข้าไปที่ <strong>Firebase Console</strong></li>
            <li>เลือก <strong>Realtime Database</strong> จากเมนูซ้าย</li>
            <li>คลิก <strong>Create Database</strong></li>
            <li>เลือก <strong>Start in test mode</strong> สำหรับการทดสอบ</li>
        </ol>
        <button onclick="location.reload()" style="background: white; color: #ff4444; border: none; padding: 10px 20px; border-radius: 5px; margin-top: 10px; cursor: pointer;">
            โหลดใหม่
        </button>
        <button onclick="this.parentElement.remove(); initOfflineMode();" style="background: #ff6666; color: white; border: none; padding: 10px 20px; border-radius: 5px; margin: 10px 5px; cursor: pointer;">
            ใช้งานแบบออฟไลน์
        </button>
    `;
    document.body.appendChild(errorDiv);
}

function setupEventListeners() {
    // Term selection
    document.getElementById('termSelect').addEventListener('change', onTermChange);
    
    // Header buttons
    document.getElementById('addTermBtn').addEventListener('click', () => openModal('addTermModal'));
    document.getElementById('addSubjectBtn').addEventListener('click', () => openModal('addSubjectModal'));
    
    // Week navigation
    document.getElementById('prevWeek').addEventListener('click', () => navigateWeek(-1));
    document.getElementById('nextWeek').addEventListener('click', () => navigateWeek(1));
    
    // Todo section
    document.getElementById('addTodoBtn').addEventListener('click', () => openModal('addTodoModal'));
    
    // Holiday section
    document.getElementById('addHolidayBtn').addEventListener('click', () => openModal('addHolidayModal'));
    
    // Form submissions
    document.getElementById('addTermForm').addEventListener('submit', handleAddTerm);
    document.getElementById('addSubjectForm').addEventListener('submit', handleAddSubject);
    document.getElementById('addTodoForm').addEventListener('submit', handleAddTodo);
    document.getElementById('addHolidayForm').addEventListener('submit', handleAddHoliday);
    
    // Modal close events
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this.id);
            }
        });
    });
}

// Loading functions
function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

// Date and time functions
function setCurrentDate() {
    const now = new Date();
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    };
    const thaiDate = now.toLocaleDateString('th-TH', options);
    document.getElementById('currentDate').textContent = thaiDate;
}

function setCurrentWeek() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Get Monday
    currentWeekStart = new Date(now.setDate(diff));
    updateWeekDisplay();
}

function updateWeekDisplay() {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const options = { month: 'short', day: 'numeric' };
    const startStr = currentWeekStart.toLocaleDateString('th-TH', options);
    const endStr = weekEnd.toLocaleDateString('th-TH', options);
    
    document.getElementById('weekRange').textContent = `${startStr} - ${endStr}`;
}

function navigateWeek(direction) {
    currentWeekStart.setDate(currentWeekStart.getDate() + (direction * 7));
    updateWeekDisplay();
    generateTimetable();
}

function getDateForDay(dayOfWeek) {
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    return date;
}

// Firebase functions
async function loadTerms() {
    try {
        const snapshot = await firebaseDB.ref('terms').once('value');
        const terms = snapshot.val() || {};
        
        const termSelect = document.getElementById('termSelect');
        termSelect.innerHTML = '<option value="">เลือกเทอม</option>';
        
        Object.keys(terms).forEach(termId => {
            const term = terms[termId];
            const option = document.createElement('option');
            option.value = termId;
            option.textContent = term.name;
            termSelect.appendChild(option);
        });
        
        // Select first term if available
        if (Object.keys(terms).length > 0) {
            const firstTermId = Object.keys(terms)[0];
            termSelect.value = firstTermId;
            currentTerm = firstTermId;
        }
        
        console.log('Terms loaded successfully:', Object.keys(terms).length, 'terms found');
    } catch (error) {
        console.error('Error loading terms:', error);
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูลเทอม: ' + error.message);
    }
}

async function loadAllData() {
    if (!currentTerm) return;
    
    try {
        // Load subjects
        const subjectsSnapshot = await firebaseDB.ref(`subjects/${currentTerm}`).once('value');
        subjectsData = subjectsSnapshot.val() || {};
        
        // Load todos
        const todosSnapshot = await firebaseDB.ref(`todos/${currentTerm}`).once('value');
        todosData = todosSnapshot.val() || {};
        
        // Load holidays
        const holidaysSnapshot = await firebaseDB.ref(`holidays/${currentTerm}`).once('value');
        holidaysData = holidaysSnapshot.val() || {};
        
        console.log('Data loaded successfully');
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

async function onTermChange() {
    const termSelect = document.getElementById('termSelect');
    currentTerm = termSelect.value;
    
    if (currentTerm) {
        showLoading();
        await loadAllData();
        generateTimetable();
        updateTodoList();
        updateHolidayList();
        hideLoading();
    } else {
        // Clear displays
        document.getElementById('timetableBody').innerHTML = '';
        updateTodoList();
        updateHolidayList();
    }
}

// Timetable generation
function generateTimetable() {
    const tbody = document.getElementById('timetableBody');
    tbody.innerHTML = '';
    
    // Create time slots
    timeSlots.forEach(time => {
        const row = document.createElement('tr');
        
        // Time column
        const timeCell = document.createElement('td');
        timeCell.className = 'time-column';
        timeCell.textContent = time;
        row.appendChild(timeCell);
        
        // Day columns (Monday to Sunday)
        for (let day = 1; day <= 7; day++) {
            const dayCell = document.createElement('td');
            dayCell.dataset.day = day === 7 ? 0 : day; // Sunday = 0
            dayCell.dataset.time = time;
            dayCell.addEventListener('click', () => onCellClick(dayCell));
            
            // Check if there's a subject for this time slot
            const subject = getSubjectForTimeSlot(day === 7 ? 0 : day, time);
            if (subject) {
                dayCell.innerHTML = `
                    <div class="subject-cell">
                        <div class="subject-name">${subject.name}</div>
                        <div class="subject-location">${subject.location || ''}</div>
                    </div>
                `;
                dayCell.dataset.subjectId = subject.id;
            }
            
            row.appendChild(dayCell);
        }
        
        tbody.appendChild(row);
    });
}

function getSubjectForTimeSlot(dayOfWeek, timeSlot) {
    const currentDate = getDateForDay(dayOfWeek);
    const isHoliday = checkIfHoliday(currentDate);
    
    for (const subjectId in subjectsData) {
        const subject = subjectsData[subjectId];
        
        // Check if subject matches day and time
        if (parseInt(subject.dayOfWeek) === dayOfWeek && 
            timeSlot >= subject.startTime && 
            timeSlot < subject.endTime) {
            
            // If it's a holiday and moveToSunday is enabled
            if (isHoliday && isHoliday.moveToSunday && dayOfWeek === 0) {
                return { ...subject, id: subjectId };
            } else if (!isHoliday) {
                return { ...subject, id: subjectId };
            }
        }
    }
    
    return null;
}

function checkIfHoliday(date) {
    const dateString = date.toISOString().split('T')[0];
    
    for (const holidayId in holidaysData) {
        const holiday = holidaysData[holidayId];
        if (holiday.date === dateString) {
            return holiday;
        }
    }
    
    return null;
}

function onCellClick(cell) {
    const subjectId = cell.dataset.subjectId;
    
    if (subjectId) {
        showSubjectDetails(subjectId);
    } else {
        // Open add subject modal with pre-filled data
        const day = cell.dataset.day;
        const time = cell.dataset.time;
        
        document.getElementById('dayOfWeek').value = day;
        document.getElementById('startTime').value = time;
        
        // Set end time (1 hour later)
        const endTime = new Date(`2000-01-01T${time}:00`);
        endTime.setHours(endTime.getHours() + 1);
        document.getElementById('endTime').value = endTime.toTimeString().substr(0, 5);
        
        openModal('addSubjectModal');
    }
}

function showSubjectDetails(subjectId) {
    const subject = subjectsData[subjectId];
    if (!subject) return;
    
    document.getElementById('subjectDetailsTitle').textContent = subject.name;
    
    const content = document.getElementById('subjectDetailsContent');
    content.innerHTML = `
        <div class="detail-item">
            <div class="detail-label">รหัสวิชา:</div>
            <div class="detail-value">${subject.code || 'ไม่ระบุ'}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">อาจารย์ผู้สอน:</div>
            <div class="detail-value">${subject.instructor || 'ไม่ระบุ'}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">วันเวลา:</div>
            <div class="detail-value">${thaiDays[subject.dayOfWeek]} ${subject.startTime}-${subject.endTime}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">สถานที่:</div>
            <div class="detail-value">${subject.location || 'ไม่ระบุ'}</div>
        </div>
        ${subject.onlineLink ? `
        <div class="detail-item">
            <div class="detail-label">ลิงก์เรียนออนไลน์:</div>
            <div class="detail-value"><a href="${subject.onlineLink}" target="_blank">${subject.onlineLink}</a></div>
        </div>
        ` : ''}
        ${subject.notes ? `
        <div class="detail-item">
            <div class="detail-label">หมายเหตุ:</div>
            <div class="detail-value">${subject.notes}</div>
        </div>
        ` : ''}
    `;
    
    // Set up delete button
    document.getElementById('deleteSubjectBtn').onclick = () => deleteSubject(subjectId);
    
    openModal('subjectDetailsModal');
}

// Todo functions
function updateTodoList() {
    const todoList = document.getElementById('todoList');
    const today = new Date().toISOString().split('T')[0];
    
    // Filter todos for today
    const todayTodos = Object.entries(todosData).filter(([id, todo]) => todo.date === today);
    
    if (todayTodos.length === 0) {
        todoList.innerHTML = `
            <div class="no-todos">
                <i class="fas fa-check-circle"></i>
                <p>ไม่มีสิ่งที่ต้องทำในวันนี้</p>
            </div>
        `;
        return;
    }
    
    todoList.innerHTML = todayTodos.map(([id, todo]) => `
        <div class="todo-item priority-${todo.priority} ${todo.completed ? 'completed' : ''}">
            <input type="checkbox" ${todo.completed ? 'checked' : ''} 
                   onchange="toggleTodo('${id}', this.checked)">
            <div class="todo-content">
                <div class="todo-text">${todo.text}</div>
                <div class="todo-meta">ความสำคัญ: ${getPriorityText(todo.priority)}</div>
            </div>
            <div class="todo-actions">
                <button class="btn-danger" onclick="deleteTodo('${id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function getPriorityText(priority) {
    const priorities = {
        low: 'ต่ำ',
        medium: 'กลาง',
        high: 'สูง'
    };
    return priorities[priority] || 'กลาง';
}

async function toggleTodo(todoId, completed) {
    try {
        await firebaseDB.ref(`todos/${currentTerm}/${todoId}/completed`).set(completed);
        todosData[todoId].completed = completed;
        updateTodoList();
    } catch (error) {
        console.error('Error updating todo:', error);
        alert('เกิดข้อผิดพลาดในการอัปเดตรายการ');
    }
}

async function deleteTodo(todoId) {
    if (confirm('คุณต้องการลบรายการนี้หรือไม่?')) {
        try {
            await firebaseDB.ref(`todos/${currentTerm}/${todoId}`).remove();
            delete todosData[todoId];
            updateTodoList();
        } catch (error) {
            console.error('Error deleting todo:', error);
            alert('เกิดข้อผิดพลาดในการลบรายการ');
        }
    }
}

// Holiday functions
function updateHolidayList() {
    const holidayList = document.getElementById('holidayList');
    const holidays = Object.entries(holidaysData);
    
    if (holidays.length === 0) {
        holidayList.innerHTML = `
            <div class="no-holidays">
                <i class="fas fa-calendar-check"></i>
                <p>ไม่มีวันหยุดที่กำหนด</p>
            </div>
        `;
        return;
    }
    
    holidayList.innerHTML = holidays.map(([id, holiday]) => `
        <div class="holiday-item">
            <div class="holiday-info">
                <div class="holiday-name">${holiday.name}</div>
                <div class="holiday-date">${formatThaiDate(holiday.date)}</div>
                ${holiday.moveToSunday ? '<div class="text-muted">เลื่อนคาบเรียนไปวันอาทิตย์</div>' : ''}
            </div>
            <div class="holiday-actions">
                <button class="btn-danger" onclick="deleteHoliday('${id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
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
            await firebaseDB.ref(`holidays/${currentTerm}/${holidayId}`).remove();
            delete holidaysData[holidayId];
            updateHolidayList();
            generateTimetable(); // Regenerate timetable
        } catch (error) {
            console.error('Error deleting holiday:', error);
            alert('เกิดข้อผิดพลาดในการลบวันหยุด');
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

// Utility function to check if Firebase is available
function isFirebaseAvailable() {
    return window.firebaseDB && typeof window.firebaseDB.ref === 'function';
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
        if (isFirebaseAvailable()) {
            const termRef = await firebaseDB.ref('terms').push(termData);
            closeModal('addTermModal');
            await loadTerms();
            
            // Select the new term
            document.getElementById('termSelect').value = termRef.key;
            currentTerm = termRef.key;
            await loadAllData();
            generateTimetable();
        } else {
            // Offline mode
            const termId = 'term_' + Date.now();
            const termSelect = document.getElementById('termSelect');
            const option = document.createElement('option');
            option.value = termId;
            option.textContent = termData.name;
            termSelect.appendChild(option);
            termSelect.value = termId;
            currentTerm = termId;
            closeModal('addTermModal');
        }
        
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
        if (isFirebaseAvailable()) {
            await firebaseDB.ref(`subjects/${currentTerm}`).push(subjectData);
            await loadAllData();
        } else {
            // Offline mode - add to local data
            const subjectId = 'subject_' + Date.now();
            subjectsData[subjectId] = subjectData;
        }
        
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
        await firebaseDB.ref(`todos/${currentTerm}`).push(todoData);
        closeModal('addTodoModal');
        await loadAllData();
        updateTodoList();
        
        alert('เพิ่มรายการเรียบร้อยแล้ว');
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
        await firebaseDB.ref(`holidays/${currentTerm}`).push(holidayData);
        closeModal('addHolidayModal');
        await loadAllData();
        updateHolidayList();
        generateTimetable();
        
        alert('เพิ่มวันหยุดเรียบร้อยแล้ว');
    } catch (error) {
        console.error('Error adding holiday:', error);
        alert('เกิดข้อผิดพลาดในการเพิ่มวันหยุด');
    }
}

async function deleteSubject(subjectId) {
    if (confirm('คุณต้องการลบรายวิชานี้หรือไม่?')) {
        try {
            await firebaseDB.ref(`subjects/${currentTerm}/${subjectId}`).remove();
            delete subjectsData[subjectId];
            closeModal('subjectDetailsModal');
            generateTimetable();
            
            alert('ลบรายวิชาเรียบร้อยแล้ว');
        } catch (error) {
            console.error('Error deleting subject:', error);
            alert('เกิดข้อผิดพลาดในการลบรายวิชา');
        }
    }
}

// Set default todo date to today
document.addEventListener('DOMContentLoaded', function() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('todoDate').value = today;
});
