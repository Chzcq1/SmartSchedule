// Enhanced Timetable Application with Firebase + Local Storage Support
class TimetableApp {
    constructor() {
        // Core data
        this.currentTerm = null;
        this.subjectsData = {};
        this.todosData = {};
        this.holidaysData = {};
        this.makeupClassesData = {};
        
        // Utilities
        this.calendar = new CalendarManager();
        this.database = null;
        this.isFirebaseConnected = false;
        
        // Time slots (8:00 AM to 7:30 PM)
        this.timeSlots = [
            '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
            '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
            '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'
        ];
        
        this.daysOfWeek = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    }

    async initialize() {
        try {
            this.showLoading();
            
            // Initialize database (Firebase + Local Storage)
            await this.initializeDatabase();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load current term
            this.currentTerm = await this.getCurrentTerm();
            
            // Load terms and set up term selector
            await this.loadTerms();
            
            // If no current term, create default or use first available
            if (!this.currentTerm) {
                await this.createDefaultTerm();
            }
            
            // Set current term in selector
            const termSelect = document.getElementById('termSelect');
            if (this.currentTerm && termSelect) {
                termSelect.value = this.currentTerm;
            }
            
            // Set current date and week
            this.setCurrentDate();
            this.calendar.setCurrentWeek();
            this.updateWeekDisplay();
            
            // Load all data for current term
            await this.loadAllData();
            
            // Initialize UI
            this.generateTimetable();
            this.updateTodoList();
            this.updateHolidayList();
            this.initializeTheme();
            
            this.hideLoading();
            console.log('App initialized successfully');
            
        } catch (error) {
            console.error('Error initializing app:', error);
            this.hideLoading();
            this.showError('เกิดข้อผิดพลาดในการเริ่มต้นแอปพลิเคชัน: ' + error.message);
        }
    }

    async initializeDatabase() {
        try {
            // Try Firebase first
            if (window.firebaseDB) {
                const testRef = window.firebaseDB.ref('test');
                await Promise.race([
                    testRef.once('value'),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Firebase timeout')), 5000)
                    )
                ]);
                
                this.database = window.firebaseDB;
                this.isFirebaseConnected = true;
                console.log('Using Firebase Realtime Database');
                
                // Show Firebase status
                this.showConnectionStatus('Firebase เชื่อมต่อสำเร็จ', 'success');
                
            } else {
                throw new Error('Firebase not available');
            }
        } catch (error) {
            console.log('Firebase connection failed, using local storage:', error.message);
            this.database = window.localDB;
            this.isFirebaseConnected = false;
            
            // Show local storage status
            this.showConnectionStatus('ใช้งานแบบออฟไลน์ (Local Storage)', 'warning');
        }
    }

    showConnectionStatus(message, type) {
        const statusDiv = document.createElement('div');
        statusDiv.className = `fixed top-20 right-4 z-30 px-4 py-2 rounded-lg text-sm font-medium ${
            type === 'success' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`;
        statusDiv.textContent = message;
        
        document.body.appendChild(statusDiv);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (statusDiv.parentNode) {
                statusDiv.parentNode.removeChild(statusDiv);
            }
        }, 5000);
    }

    setupEventListeners() {
        // Term selector
        const termSelect = document.getElementById('termSelect');
        if (termSelect) {
            termSelect.addEventListener('change', () => this.onTermChange());
        }
        
        // Navigation buttons
        document.getElementById('prevWeek')?.addEventListener('click', () => this.navigateWeek(-1));
        document.getElementById('nextWeek')?.addEventListener('click', () => this.navigateWeek(1));
        
        // Modal buttons (updated modal names)
        document.getElementById('addTermBtn')?.addEventListener('click', () => this.openTermModal());
        document.getElementById('addSubjectBtn')?.addEventListener('click', () => this.openSubjectModal());
        document.getElementById('addTodoBtn')?.addEventListener('click', () => this.openTodoModal());
        document.getElementById('addHolidayBtn')?.addEventListener('click', () => this.openHolidayModal());
        
        // Theme selectors (both desktop and mobile)
        const themeSelector = document.getElementById('themeSelector');
        const mobileThemeSelector = document.getElementById('mobileThemeSelector');
        
        if (themeSelector) {
            themeSelector.addEventListener('change', (e) => {
                this.changeTheme(e.target.value);
                if (mobileThemeSelector) mobileThemeSelector.value = e.target.value;
            });
        }
        
        if (mobileThemeSelector) {
            mobileThemeSelector.addEventListener('change', (e) => {
                this.changeTheme(e.target.value);
                if (themeSelector) themeSelector.value = e.target.value;
            });
        }
        
        // Term management buttons
        document.getElementById('editTermBtn')?.addEventListener('click', () => this.editCurrentTerm());
        document.getElementById('deleteTermBtn')?.addEventListener('click', () => this.deleteCurrentTerm());
        
        // Form submissions (updated modal IDs)
        document.getElementById('termForm')?.addEventListener('submit', (e) => this.handleTermForm(e));
        document.getElementById('subjectForm')?.addEventListener('submit', (e) => this.handleSubjectForm(e));
        document.getElementById('todoForm')?.addEventListener('submit', (e) => this.handleTodoForm(e));
        document.getElementById('holidayForm')?.addEventListener('submit', (e) => this.handleHolidayForm(e));
        
        // Modal close functionality
        document.querySelectorAll('.modal').forEach(modal => {
            // Close button
            const closeBtn = modal.querySelector('.close') || modal.querySelector('[onclick*="closeModal"]');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.closeModal(modal.id));
            }
            
            // Click outside to close
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
    }

    // Database operations
    async getCurrentTerm() {
        if (this.isFirebaseConnected) {
            try {
                const snapshot = await this.database.ref('currentTerm').once('value');
                return snapshot.val();
            } catch (error) {
                console.error('Error getting current term from Firebase:', error);
                return window.localDB.getCurrentTerm();
            }
        } else {
            return this.database.getCurrentTerm();
        }
    }

    async setCurrentTerm(termId) {
        this.currentTerm = termId;
        
        if (this.isFirebaseConnected) {
            try {
                await this.database.ref('currentTerm').set(termId);
            } catch (error) {
                console.error('Error setting current term in Firebase:', error);
            }
        }
        
        // Always save to local storage as backup
        window.localDB.setCurrentTerm(termId);
    }

    async createDefaultTerm() {
        const defaultTermName = this.calendar.generateTermName();
        const now = new Date();
        const termData = {
            name: defaultTermName,
            startDate: now.toISOString().split('T')[0],
            endDate: new Date(now.getTime() + (120 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0], // 120 days later
            createdAt: new Date().toISOString()
        };
        
        try {
            let termId;
            if (this.isFirebaseConnected) {
                const termRef = await this.database.ref('terms').push(termData);
                termId = termRef.key;
            } else {
                termId = await this.database.addTerm(termData);
            }
            
            await this.setCurrentTerm(termId);
            console.log('Created default term:', termId);
            
        } catch (error) {
            console.error('Error creating default term:', error);
        }
    }

    async loadTerms() {
        try {
            let terms;
            if (this.isFirebaseConnected) {
                const snapshot = await this.database.ref('terms').once('value');
                terms = snapshot.val() || {};
            } else {
                terms = await this.database.getTerms();
            }
            
            const termSelect = document.getElementById('termSelect');
            if (termSelect) {
                termSelect.innerHTML = '<option value="">เลือกเทอม</option>';
                
                Object.entries(terms).forEach(([termId, term]) => {
                    const option = document.createElement('option');
                    option.value = termId;
                    option.textContent = term.name;
                    termSelect.appendChild(option);
                });
            }
            
            console.log('Terms loaded successfully');
        } catch (error) {
            console.error('Error loading terms:', error);
        }
    }

    async loadAllData() {
        if (!this.currentTerm) return;
        
        try {
            if (this.isFirebaseConnected) {
                // Load from Firebase
                const [subjectsSnap, todosSnap, holidaysSnap] = await Promise.all([
                    this.database.ref(`subjects/${this.currentTerm}`).once('value'),
                    this.database.ref(`todos/${this.currentTerm}`).once('value'),
                    this.database.ref(`holidays/${this.currentTerm}`).once('value')
                ]);
                
                this.subjectsData = subjectsSnap.val() || {};
                this.todosData = todosSnap.val() || {};
                this.holidaysData = holidaysSnap.val() || {};
            } else {
                // Load from local storage
                this.subjectsData = await this.database.getSubjects(this.currentTerm);
                this.todosData = await this.database.getTodos(this.currentTerm);
                this.holidaysData = await this.database.getHolidays(this.currentTerm);
            }
            
            console.log('All data loaded successfully');
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    // UI Methods
    showLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.remove('hidden');
        }
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.add('hidden');
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg z-50 shadow-lg';
        errorDiv.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-exclamation-triangle mr-2"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        document.body.appendChild(errorDiv);
        
        // Auto remove after 10 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 10000);
    }

    setCurrentDate() {
        const currentDateEl = document.getElementById('currentDate');
        if (currentDateEl) {
            currentDateEl.textContent = this.calendar.getCurrentDate();
        }
    }

    updateWeekDisplay() {
        const weekRangeEl = document.getElementById('weekRange');
        if (weekRangeEl) {
            weekRangeEl.textContent = this.calendar.getWeekRange();
        }
    }

    navigateWeek(direction) {
        this.calendar.navigateWeek(direction);
        this.updateWeekDisplay();
        this.generateTimetable();
    }

    async onTermChange() {
        const termSelect = document.getElementById('termSelect');
        const selectedTerm = termSelect?.value;
        
        if (selectedTerm && selectedTerm !== this.currentTerm) {
            await this.setCurrentTerm(selectedTerm);
            await this.loadAllData();
            this.generateTimetable();
            this.updateTodoList();
            this.updateHolidayList();
        }
    }

    // Timetable Generation
    generateTimetable() {
        const tbody = document.getElementById('timetableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        this.timeSlots.forEach(timeSlot => {
            const row = document.createElement('tr');
            row.className = 'border-b border-gray-200';
            
            // Time column
            const timeCell = document.createElement('td');
            timeCell.className = 'time-slot px-4 py-3 text-sm font-medium text-center';
            timeCell.textContent = timeSlot;
            row.appendChild(timeCell);
            
            // Day columns
            for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                const cell = document.createElement('td');
                cell.className = 'timetable-cell px-2 py-2 text-center relative';
                cell.dataset.day = dayIndex;
                cell.dataset.time = timeSlot;
                
                const currentDate = this.calendar.getDateForDay(dayIndex);
                
                // Check for regular subjects
                const subject = this.getSubjectForTimeSlot(dayIndex, timeSlot, currentDate);
                
                // Check for holidays
                const holiday = this.calendar.getHolidayForDate(currentDate, this.holidaysData);
                
                // Check for makeup classes
                const makeupClass = this.getMakeupClassForTimeSlot(dayIndex, timeSlot, currentDate);
                
                if (makeupClass) {
                    cell.innerHTML = this.createMakeupClassBlock(makeupClass);
                    cell.classList.add('makeup');
                } else if (subject && !holiday) {
                    cell.innerHTML = this.createSubjectBlock(subject);
                    cell.classList.add('has-subject');
                } else if (holiday) {
                    cell.innerHTML = `<div class="holiday-indicator">${holiday.name}</div>`;
                    cell.classList.add('holiday');
                } else {
                    cell.addEventListener('click', () => this.onCellClick(cell, currentDate));
                }
                
                // Highlight today
                if (this.calendar.isToday(currentDate)) {
                    cell.classList.add('bg-blue-50', 'border-blue-200');
                }
                
                row.appendChild(cell);
            }
            
            tbody.appendChild(row);
        });
    }

    getSubjectForTimeSlot(dayOfWeek, timeSlot, date) {
        return Object.values(this.subjectsData).find(subject => {
            if (subject.dayOfWeek !== dayOfWeek) return false;
            
            // Check if the date is within the subject period
            if (!this.calendar.isDateInSubjectPeriod(date, subject.startDate, subject.endDate)) {
                return false;
            }
            
            // Check if time slot is within subject time range
            return this.calendar.isTimeSlotInSubject(timeSlot, subject);
        });
    }

    getMakeupClassForTimeSlot(dayOfWeek, timeSlot, date) {
        // Check for makeup classes on this date/time
        return Object.values(this.holidaysData).find(holiday => {
            if (!holiday.hasMakeup || !holiday.makeupDate) return false;
            
            const makeupDate = new Date(holiday.makeupDate);
            if (makeupDate.toDateString() !== date.toDateString()) return false;
            if (makeupDate.getDay() !== dayOfWeek) return false;
            
            if (holiday.makeupStartTime && holiday.makeupEndTime) {
                return this.calendar.isTimeSlotInSubject(timeSlot, {
                    startTime: holiday.makeupStartTime,
                    endTime: holiday.makeupEndTime
                });
            }
            
            return false;
        });
    }

    createSubjectBlock(subject) {
        const subjectId = subject.id || Object.keys(this.subjectsData).find(id => this.subjectsData[id] === subject);
        return `
            <div class="subject-block group relative cursor-pointer" onclick="window.app.showSubjectDetails('${subjectId}')">
                <div class="subject-name text-xs font-medium">${subject.name}</div>
                <div class="subject-location text-xs text-gray-600">${subject.location}</div>
                <div class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="edit-subject-btn p-1 bg-white rounded shadow-sm text-gray-400 hover:text-blue-500 transition-colors" 
                            onclick="event.stopPropagation(); window.app.openSubjectModal('${subjectId}')" title="แก้ไข">
                        <i class="fas fa-edit text-xs"></i>
                    </button>
                </div>
            </div>
        `;
    }

    createMakeupClassBlock(holiday) {
        return `
            <div class="makeup-indicator">
                <div>ชดเชย: ${holiday.name}</div>
                <div class="text-xs">${holiday.makeupLocation || 'ตามปกติ'}</div>
            </div>
        `;
    }

    onCellClick(cell, date) {
        const day = parseInt(cell.dataset.day);
        const time = cell.dataset.time;
        
        if (confirm(`เพิ่มรายวิชาสำหรับวัน${this.daysOfWeek[day]} เวลา ${time} หรือไม่?`)) {
            this.openModal('addSubjectModal');
            
            // Pre-fill form
            const form = document.getElementById('addSubjectForm');
            if (form) {
                form.dayOfWeek.value = day;
                form.startTime.value = time;
                form.startDate.value = this.calendar.formatDateString(date);
            }
        }
    }

    // Modal Management
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = 'auto';
            
            // Reset forms
            const forms = modal.querySelectorAll('form');
            forms.forEach(form => form.reset());
        }
    }

    // Specific Modal Handlers
    openTermModal(termId = null) {
        const modal = document.getElementById('termModal');
        const title = document.getElementById('termModalTitle');
        const form = document.getElementById('termForm');
        
        if (termId) {
            // Edit mode
            title.textContent = 'แก้ไขเทอม';
            const terms = this.isFirebaseConnected ? {} : this.database.getTerms();
            const termData = this.isFirebaseConnected ? null : terms[termId];
            
            if (termData) {
                form.termId.value = termId;
                form.termName.value = termData.name;
                form.termStartDate.value = termData.startDate;
                form.termEndDate.value = termData.endDate;
            }
        } else {
            // Add mode
            title.textContent = 'เพิ่มเทอมใหม่';
            form.reset();
        }
        
        this.openModal('termModal');
    }

    openSubjectModal(subjectId = null) {
        const modal = document.getElementById('subjectModal');
        const title = document.getElementById('subjectModalTitle');
        const form = document.getElementById('subjectForm');
        
        if (subjectId) {
            // Edit mode
            title.textContent = 'แก้ไขรายวิชา';
            const subject = this.subjectsData[subjectId];
            
            if (subject) {
                form.subjectId.value = subjectId;
                form.subjectName.value = subject.name;
                form.subjectCode.value = subject.code;
                form.instructor.value = subject.instructor;
                form.dayOfWeek.value = subject.dayOfWeek;
                form.startTime.value = subject.startTime;
                form.endTime.value = subject.endTime;
                form.startDate.value = subject.startDate;
                form.endDate.value = subject.endDate;
                form.location.value = subject.location;
                form.onlineLink.value = subject.onlineLink || '';
                form.notes.value = subject.notes || '';
            }
        } else {
            // Add mode
            title.textContent = 'เพิ่มรายวิชา';
            form.reset();
        }
        
        this.openModal('subjectModal');
    }

    openTodoModal(todoId = null) {
        const modal = document.getElementById('todoModal');
        const title = document.getElementById('todoModalTitle');
        const form = document.getElementById('todoForm');
        
        if (todoId) {
            // Edit mode
            title.textContent = 'แก้ไขสิ่งที่ต้องทำ';
            const todo = this.todosData[todoId];
            
            if (todo) {
                form.todoId.value = todoId;
                form.todoText.value = todo.text;
                form.todoDate.value = todo.date;
                form.todoPriority.value = todo.priority;
            }
        } else {
            // Add mode
            title.textContent = 'เพิ่มสิ่งที่ต้องทำ';
            form.reset();
        }
        
        this.openModal('todoModal');
    }

    openHolidayModal(holidayId = null) {
        const modal = document.getElementById('holidayModal');
        const title = document.getElementById('holidayModalTitle');
        const form = document.getElementById('holidayForm');
        const makeupFields = document.getElementById('makeupFields');
        
        if (holidayId) {
            // Edit mode
            title.textContent = 'แก้ไขวันหยุด';
            const holiday = this.holidaysData[holidayId];
            
            if (holiday) {
                form.holidayId.value = holidayId;
                form.holidayName.value = holiday.name;
                form.holidayDate.value = holiday.date;
                form.hasMakeup.checked = holiday.hasMakeup;
                
                if (holiday.hasMakeup) {
                    makeupFields.classList.remove('hidden');
                    form.makeupDate.value = holiday.makeupDate || '';
                    form.makeupStartTime.value = holiday.makeupStartTime || '';
                    form.makeupEndTime.value = holiday.makeupEndTime || '';
                    form.makeupLocation.value = holiday.makeupLocation || '';
                }
            }
        } else {
            // Add mode
            title.textContent = 'เพิ่มวันหยุด';
            form.reset();
            makeupFields.classList.add('hidden');
        }
        
        this.openModal('holidayModal');
    }

    // Term Management Methods
    async editCurrentTerm() {
        if (!this.currentTerm) {
            this.showError('กรุณาเลือกเทอมก่อน');
            return;
        }
        this.openTermModal(this.currentTerm);
    }

    async deleteCurrentTerm() {
        if (!this.currentTerm) {
            this.showError('กรุณาเลือกเทอมก่อน');
            return;
        }

        const termSelect = document.getElementById('termSelect');
        const termName = termSelect.options[termSelect.selectedIndex]?.text;

        if (!confirm(`คุณต้องการลบเทอม "${termName}" หรือไม่?\n\nการลบเทอมจะลบข้อมูลทั้งหมดในเทอมนี้ รวมถึงรายวิชา วันหยุด และสิ่งที่ต้องทำ`)) {
            return;
        }

        try {
            if (this.isFirebaseConnected) {
                await this.database.ref(`terms/${this.currentTerm}`).remove();
                await this.database.ref(`subjects/${this.currentTerm}`).remove();
                await this.database.ref(`todos/${this.currentTerm}`).remove();
                await this.database.ref(`holidays/${this.currentTerm}`).remove();
            } else {
                await this.database.deleteTerm(this.currentTerm);
            }

            // Reset current term
            this.currentTerm = null;
            await this.setCurrentTerm(null);

            // Reload terms and reset UI
            await this.loadTerms();
            this.subjectsData = {};
            this.todosData = {};
            this.holidaysData = {};
            this.generateTimetable();
            this.updateTodoList();
            this.updateHolidayList();

            this.showSuccess('ลบเทอมเรียบร้อยแล้ว');
        } catch (error) {
            console.error('Error deleting term:', error);
            this.showError('เกิดข้อผิดพลาดในการลบเทอม');
        }
    }

    // Form Handlers
    async handleTermForm(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const termId = formData.get('termId');
        const termData = {
            name: formData.get('termName'),
            startDate: formData.get('termStartDate'),
            endDate: formData.get('termEndDate'),
            updatedAt: new Date().toISOString()
        };
        
        if (!termId) {
            termData.createdAt = new Date().toISOString();
        }
        
        try {
            let resultTermId;
            if (termId) {
                // Update existing term
                if (this.isFirebaseConnected) {
                    await this.database.ref(`terms/${termId}`).update(termData);
                } else {
                    await this.database.updateTerm(termId, termData);
                }
                resultTermId = termId;
                this.showSuccess('แก้ไขเทอมเรียบร้อยแล้ว');
            } else {
                // Add new term
                if (this.isFirebaseConnected) {
                    const termRef = await this.database.ref('terms').push(termData);
                    resultTermId = termRef.key;
                } else {
                    resultTermId = await this.database.addTerm(termData);
                }
                this.showSuccess('เพิ่มเทอมเรียบร้อยแล้ว');
            }
            
            this.closeModal('termModal');
            await this.loadTerms();
            
            // Select the term
            const termSelect = document.getElementById('termSelect');
            if (termSelect) {
                termSelect.value = resultTermId;
                await this.setCurrentTerm(resultTermId);
                await this.loadAllData();
                this.generateTimetable();
                this.updateTodoList();
                this.updateHolidayList();
            }
            
        } catch (error) {
            console.error('Error handling term:', error);
            this.showError('เกิดข้อผิดพลาดในการจัดการเทอม');
        }
    }

    async handleSubjectForm(e) {
        e.preventDefault();
        
        if (!this.currentTerm) {
            this.showError('กรุณาเลือกเทอมก่อน');
            return;
        }
        
        const formData = new FormData(e.target);
        const subjectId = formData.get('subjectId');
        const subjectData = {
            name: formData.get('subjectName'),
            code: formData.get('subjectCode'),
            instructor: formData.get('instructor'),
            dayOfWeek: parseInt(formData.get('dayOfWeek')),
            startTime: formData.get('startTime'),
            endTime: formData.get('endTime'),
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate'),
            location: formData.get('location'),
            onlineLink: formData.get('onlineLink'),
            notes: formData.get('notes'),
            updatedAt: new Date().toISOString()
        };
        
        if (!subjectId) {
            subjectData.createdAt = new Date().toISOString();
        }
        
        try {
            if (subjectId) {
                // Update existing subject
                if (this.isFirebaseConnected) {
                    await this.database.ref(`subjects/${this.currentTerm}/${subjectId}`).update(subjectData);
                } else {
                    await this.database.updateSubject(this.currentTerm, subjectId, subjectData);
                    this.subjectsData[subjectId] = { ...subjectData, id: subjectId };
                }
                this.showSuccess('แก้ไขรายวิชาเรียบร้อยแล้ว');
            } else {
                // Add new subject
                if (this.isFirebaseConnected) {
                    await this.database.ref(`subjects/${this.currentTerm}`).push(subjectData);
                } else {
                    const newSubjectId = await this.database.addSubject(this.currentTerm, subjectData);
                    this.subjectsData[newSubjectId] = { ...subjectData, id: newSubjectId };
                }
                this.showSuccess('เพิ่มรายวิชาเรียบร้อยแล้ว');
            }
            
            await this.loadAllData();
            this.closeModal('subjectModal');
            this.generateTimetable();
        } catch (error) {
            console.error('Error handling subject:', error);
            this.showError('เกิดข้อผิดพลาดในการจัดการรายวิชา');
        }
    }

    async handleTodoForm(e) {
        e.preventDefault();
        
        if (!this.currentTerm) {
            this.showError('กรุณาเลือกเทอมก่อน');
            return;
        }
        
        const formData = new FormData(e.target);
        const todoId = formData.get('todoId');
        const todoData = {
            text: formData.get('todoText'),
            date: formData.get('todoDate'),
            priority: formData.get('todoPriority'),
            updatedAt: new Date().toISOString()
        };
        
        if (!todoId) {
            todoData.completed = false;
            todoData.createdAt = new Date().toISOString();
        } else {
            // Preserve completed status for existing todos
            todoData.completed = this.todosData[todoId]?.completed || false;
        }
        
        try {
            if (todoId) {
                // Update existing todo
                if (this.isFirebaseConnected) {
                    await this.database.ref(`todos/${this.currentTerm}/${todoId}`).update(todoData);
                } else {
                    await this.database.updateTodo(this.currentTerm, todoId, todoData);
                    this.todosData[todoId] = { ...todoData, id: todoId };
                }
                this.showSuccess('แก้ไขรายการเรียบร้อยแล้ว');
            } else {
                // Add new todo
                if (this.isFirebaseConnected) {
                    await this.database.ref(`todos/${this.currentTerm}`).push(todoData);
                } else {
                    const newTodoId = await this.database.addTodo(this.currentTerm, todoData);
                    this.todosData[newTodoId] = { ...todoData, id: newTodoId };
                }
                this.showSuccess('เพิ่มรายการเรียบร้อยแล้ว');
            }
            
            await this.loadAllData();
            this.closeModal('todoModal');
            this.updateTodoList();
        } catch (error) {
            console.error('Error handling todo:', error);
            this.showError('เกิดข้อผิดพลาดในการจัดการรายการ');
        }
    }

    async handleHolidayForm(e) {
        e.preventDefault();
        
        if (!this.currentTerm) {
            this.showError('กรุณาเลือกเทอมก่อน');
            return;
        }
        
        const formData = new FormData(e.target);
        const holidayId = formData.get('holidayId');
        const holidayData = {
            name: formData.get('holidayName'),
            date: formData.get('holidayDate'),
            hasMakeup: formData.get('hasMakeup') === 'on',
            makeupDate: formData.get('makeupDate') || null,
            makeupStartTime: formData.get('makeupStartTime') || null,
            makeupEndTime: formData.get('makeupEndTime') || null,
            makeupLocation: formData.get('makeupLocation') || null,
            updatedAt: new Date().toISOString()
        };
        
        if (!holidayId) {
            holidayData.createdAt = new Date().toISOString();
        }
        
        try {
            if (holidayId) {
                // Update existing holiday
                if (this.isFirebaseConnected) {
                    await this.database.ref(`holidays/${this.currentTerm}/${holidayId}`).update(holidayData);
                } else {
                    await this.database.updateHoliday(this.currentTerm, holidayId, holidayData);
                    this.holidaysData[holidayId] = { ...holidayData, id: holidayId };
                }
                this.showSuccess('แก้ไขวันหยุดเรียบร้อยแล้ว');
            } else {
                // Add new holiday
                if (this.isFirebaseConnected) {
                    await this.database.ref(`holidays/${this.currentTerm}`).push(holidayData);
                } else {
                    const newHolidayId = await this.database.addHoliday(this.currentTerm, holidayData);
                    this.holidaysData[newHolidayId] = { ...holidayData, id: newHolidayId };
                }
                this.showSuccess('เพิ่มวันหยุดเรียบร้อยแล้ว');
            }
            
            await this.loadAllData();
            this.closeModal('holidayModal');
            this.updateHolidayList();
            this.generateTimetable();
        } catch (error) {
            console.error('Error handling holiday:', error);
            this.showError('เกิดข้อผิดพลาดในการจัดการวันหยุด');
        }
    }

    // Update UI Lists
    updateTodoList() {
        const container = document.getElementById('todoList');
        if (!container) return;
        
        const todos = Object.entries(this.todosData).sort((a, b) => {
            const dateA = new Date(a[1].date);
            const dateB = new Date(b[1].date);
            if (dateA.getTime() !== dateB.getTime()) {
                return dateA - dateB;
            }
            
            const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
            return priorityOrder[b[1].priority] - priorityOrder[a[1].priority];
        });
        
        if (todos.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-4">ไม่มีรายการ</p>';
            return;
        }
        
        container.innerHTML = todos.map(([todoId, todo]) => `
            <div class="todo-item ${todo.completed ? 'completed' : ''}" data-priority="${todo.priority}">
                <div class="todo-content flex items-center">
                    <input type="checkbox" ${todo.completed ? 'checked' : ''} 
                           onchange="window.app.toggleTodo('${todoId}', this.checked)"
                           class="mr-3">
                    <div class="flex-1">
                        <div class="todo-text font-medium">${todo.text}</div>
                        <div class="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                            <span class="todo-date">${this.calendar.getRelativeDateString(todo.date)}</span>
                            <span class="todo-priority" data-priority="${todo.priority}">${this.getPriorityText(todo.priority)}</span>
                        </div>
                    </div>
                    <div class="flex items-center space-x-1 ml-2">
                        <button class="edit-btn p-1 text-gray-400 hover:text-blue-500 transition-colors" 
                                onclick="window.app.openTodoModal('${todoId}')" title="แก้ไข">
                            <i class="fas fa-edit text-sm"></i>
                        </button>
                        <button class="delete-btn p-1 text-gray-400 hover:text-red-500 transition-colors" 
                                onclick="window.app.deleteTodo('${todoId}')" title="ลบ">
                            <i class="fas fa-trash text-sm"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateHolidayList() {
        const container = document.getElementById('holidayList');
        if (!container) return;
        
        const holidays = Object.entries(this.holidaysData).sort((a, b) => {
            return new Date(a[1].date) - new Date(b[1].date);
        });
        
        if (holidays.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-4">ไม่มีวันหยุด</p>';
            return;
        }
        
        container.innerHTML = holidays.map(([holidayId, holiday]) => `
            <div class="holiday-item">
                <div class="holiday-content flex items-start justify-between">
                    <div class="flex-1">
                        <div class="holiday-name font-medium text-gray-900">${holiday.name}</div>
                        <div class="holiday-date text-sm text-gray-500 mt-1">${this.calendar.formatThaiDate(holiday.date)}</div>
                        ${holiday.hasMakeup ? `
                            <div class="makeup-class mt-2 p-2 bg-orange-50 rounded-lg">
                                <div class="makeup-title text-xs font-medium text-orange-800 mb-1">การชดเชย:</div>
                                <div class="makeup-details text-xs text-orange-700">
                                    วันที่: ${this.calendar.formatThaiDate(holiday.makeupDate)}<br>
                                    เวลา: ${holiday.makeupStartTime} - ${holiday.makeupEndTime}<br>
                                    สถานที่: ${holiday.makeupLocation || 'ตามปกติ'}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    <div class="flex items-center space-x-1 ml-2">
                        <button class="edit-btn p-1 text-gray-400 hover:text-blue-500 transition-colors" 
                                onclick="window.app.openHolidayModal('${holidayId}')" title="แก้ไข">
                            <i class="fas fa-edit text-sm"></i>
                        </button>
                        <button class="delete-btn p-1 text-gray-400 hover:text-red-500 transition-colors" 
                                onclick="window.app.deleteHoliday('${holidayId}')" title="ลบ">
                            <i class="fas fa-trash text-sm"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Utility methods
    getPriorityText(priority) {
        const priorities = {
            'high': 'สูง',
            'medium': 'ปานกลาง',
            'low': 'ต่ำ'
        };
        return priorities[priority] || priority;
    }

    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg z-50 shadow-lg';
        successDiv.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-check-circle mr-2"></i>
                <span>${message}</span>
            </div>
        `;
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
    }

    // Theme management
    initializeTheme() {
        const savedTheme = localStorage.getItem('timetable_theme') || 'default';
        this.changeTheme(savedTheme);
        
        const themeSelector = document.getElementById('themeSelector');
        if (themeSelector) {
            themeSelector.value = savedTheme;
        }
    }

    changeTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('timetable_theme', theme);
    }

    // Delete operations
    async toggleTodo(todoId, completed) {
        try {
            if (this.isFirebaseConnected) {
                await this.database.ref(`todos/${this.currentTerm}/${todoId}/completed`).set(completed);
            } else {
                await this.database.updateTodo(this.currentTerm, todoId, { completed });
            }
            
            this.todosData[todoId].completed = completed;
            this.updateTodoList();
        } catch (error) {
            console.error('Error updating todo:', error);
        }
    }

    async deleteTodo(todoId) {
        if (!confirm('คุณต้องการลบรายการนี้หรือไม่?')) return;
        
        try {
            if (this.isFirebaseConnected) {
                await this.database.ref(`todos/${this.currentTerm}/${todoId}`).remove();
            } else {
                await this.database.deleteTodo(this.currentTerm, todoId);
            }
            
            delete this.todosData[todoId];
            this.updateTodoList();
            this.showSuccess('ลบรายการเรียบร้อยแล้ว');
        } catch (error) {
            console.error('Error deleting todo:', error);
            this.showError('เกิดข้อผิดพลาดในการลบรายการ');
        }
    }

    async deleteHoliday(holidayId) {
        if (!confirm('คุณต้องการลบวันหยุดนี้หรือไม่?')) return;
        
        try {
            if (this.isFirebaseConnected) {
                await this.database.ref(`holidays/${this.currentTerm}/${holidayId}`).remove();
            } else {
                await this.database.deleteHoliday(this.currentTerm, holidayId);
            }
            
            delete this.holidaysData[holidayId];
            this.updateHolidayList();
            this.generateTimetable();
            this.showSuccess('ลบวันหยุดเรียบร้อยแล้ว');
        } catch (error) {
            console.error('Error deleting holiday:', error);
            this.showError('เกิดข้อผิดพลาดในการลบวันหยุด');
        }
    }

    showSubjectDetails(subjectId) {
        const subject = this.subjectsData[subjectId];
        if (!subject) return;
        
        // Create or update subject details modal
        let modal = document.getElementById('subjectDetailsModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'subjectDetailsModal';
            modal.className = 'fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-50 hidden';
            modal.innerHTML = `
                <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
                    <div class="p-6 border-b border-gray-200">
                        <h3 class="text-lg font-medium text-gray-900">รายละเอียดรายวิชา</h3>
                    </div>
                    <div class="p-6">
                        <div id="subjectDetailsContent"></div>
                        <div class="flex justify-end space-x-3 mt-6">
                            <button onclick="window.app.closeModal('subjectDetailsModal')" class="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                                ปิด
                            </button>
                            <button onclick="window.app.deleteSubject('${subjectId}')" class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors">
                                <i class="fas fa-trash mr-2"></i>ลบรายวิชา
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        // Fill subject details
        const content = document.getElementById('subjectDetailsContent');
        content.innerHTML = `
            <div class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">ชื่อวิชา</label>
                        <p class="mt-1 text-lg font-semibold">${subject.name}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">รหัสวิชา</label>
                        <p class="mt-1">${subject.code}</p>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">อาจารย์ผู้สอน</label>
                    <p class="mt-1">${subject.instructor}</p>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">วัน</label>
                        <p class="mt-1">${this.daysOfWeek[subject.dayOfWeek]}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">เวลา</label>
                        <p class="mt-1">${subject.startTime} - ${subject.endTime}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">สถานที่</label>
                        <p class="mt-1">${subject.location}</p>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">วันที่เริ่มเรียน</label>
                        <p class="mt-1">${this.calendar.formatThaiDate(subject.startDate)}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">วันที่สิ้นสุด</label>
                        <p class="mt-1">${this.calendar.formatThaiDate(subject.endDate)}</p>
                    </div>
                </div>
                ${subject.onlineLink ? `
                    <div>
                        <label class="block text-sm font-medium text-gray-700">ลิงก์ออนไลน์</label>
                        <p class="mt-1"><a href="${subject.onlineLink}" target="_blank" class="text-blue-500 hover:text-blue-700">${subject.onlineLink}</a></p>
                    </div>
                ` : ''}
                ${subject.notes ? `
                    <div>
                        <label class="block text-sm font-medium text-gray-700">หมายเหตุ</label>
                        <p class="mt-1">${subject.notes}</p>
                    </div>
                ` : ''}
            </div>
        `;
        
        this.openModal('subjectDetailsModal');
    }

    async deleteSubject(subjectId) {
        if (!confirm('คุณต้องการลบรายวิชานี้หรือไม่?')) return;
        
        try {
            if (this.isFirebaseConnected) {
                await this.database.ref(`subjects/${this.currentTerm}/${subjectId}`).remove();
            } else {
                await this.database.deleteSubject(this.currentTerm, subjectId);
            }
            
            delete this.subjectsData[subjectId];
            this.generateTimetable();
            this.closeModal('subjectDetailsModal');
            this.showSuccess('ลบรายวิชาเรียบร้อยแล้ว');
        } catch (error) {
            console.error('Error deleting subject:', error);
            this.showError('เกิดข้อผิดพลาดในการลบรายวิชา');
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    try {
        window.app = new TimetableApp();
        await window.app.initialize();
    } catch (error) {
        console.error('Failed to initialize app:', error);
    }
});

// Global functions for onclick handlers
window.openModal = (modalId) => window.app?.openModal(modalId);
window.closeModal = (modalId) => window.app?.closeModal(modalId);