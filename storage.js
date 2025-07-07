// Local Storage Database Implementation
class LocalDatabase {
    constructor() {
        this.storagePrefix = 'timetable_';
        this.initialize();
    }

    initialize() {
        // Initialize default data if not exists
        if (!this.getItem('initialized')) {
            this.initializeDefaultData();
            this.setItem('initialized', true);
        }
    }

    initializeDefaultData() {
        // Default term
        const defaultTerm = {
            id: 'term_2568_1',
            name: 'เทอม 1/2568',
            startDate: '2024-08-01',
            endDate: '2024-12-15',
            createdAt: new Date().toISOString()
        };

        // Default subjects
        const defaultSubjects = {
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

        // Default todos
        const today = new Date().toISOString().split('T')[0];
        const defaultTodos = {
            'todo1': {
                text: 'ทำการบ้านแคลคูลัส บทที่ 5',
                date: today,
                priority: 'high',
                completed: false,
                createdAt: new Date().toISOString()
            },
            'todo2': {
                text: 'อ่านหนังสือฟิสิกส์ บทที่ 3',
                date: today,
                priority: 'medium',
                completed: false,
                createdAt: new Date().toISOString()
            }
        };

        // Default holidays
        const defaultHolidays = {
            'holiday1': {
                name: 'วันหยุดกลางภาค',
                date: '2024-10-15',
                moveToSunday: true,
                createdAt: new Date().toISOString()
            }
        };

        // Save default data
        this.setItem('terms', { [defaultTerm.id]: defaultTerm });
        this.setItem('subjects', { [defaultTerm.id]: defaultSubjects });
        this.setItem('todos', { [defaultTerm.id]: defaultTodos });
        this.setItem('holidays', { [defaultTerm.id]: defaultHolidays });
        this.setItem('currentTerm', defaultTerm.id);
    }

    // Core storage methods
    setItem(key, value) {
        try {
            localStorage.setItem(this.storagePrefix + key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    }

    getItem(key) {
        try {
            const item = localStorage.getItem(this.storagePrefix + key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return null;
        }
    }

    removeItem(key) {
        try {
            localStorage.removeItem(this.storagePrefix + key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    }

    // Term methods
    async getTerms() {
        return this.getItem('terms') || {};
    }

    async addTerm(termData) {
        const terms = await this.getTerms();
        const termId = 'term_' + Date.now();
        terms[termId] = { ...termData, id: termId };
        this.setItem('terms', terms);
        return termId;
    }

    async deleteTerm(termId) {
        const terms = await this.getTerms();
        delete terms[termId];
        this.setItem('terms', terms);
        
        // Also delete related data
        this.removeItem(`subjects_${termId}`);
        this.removeItem(`todos_${termId}`);
        this.removeItem(`holidays_${termId}`);
        return true;
    }

    // Subject methods
    async getSubjects(termId) {
        const allSubjects = this.getItem('subjects') || {};
        return allSubjects[termId] || {};
    }

    async addSubject(termId, subjectData) {
        const allSubjects = this.getItem('subjects') || {};
        if (!allSubjects[termId]) {
            allSubjects[termId] = {};
        }
        const subjectId = 'subject_' + Date.now();
        allSubjects[termId][subjectId] = { ...subjectData, id: subjectId };
        this.setItem('subjects', allSubjects);
        return subjectId;
    }

    async deleteSubject(termId, subjectId) {
        const allSubjects = this.getItem('subjects') || {};
        if (allSubjects[termId]) {
            delete allSubjects[termId][subjectId];
            this.setItem('subjects', allSubjects);
        }
        return true;
    }

    // Todo methods
    async getTodos(termId) {
        const allTodos = this.getItem('todos') || {};
        return allTodos[termId] || {};
    }

    async addTodo(termId, todoData) {
        const allTodos = this.getItem('todos') || {};
        if (!allTodos[termId]) {
            allTodos[termId] = {};
        }
        const todoId = 'todo_' + Date.now();
        allTodos[termId][todoId] = { ...todoData, id: todoId };
        this.setItem('todos', allTodos);
        return todoId;
    }

    async updateTodo(termId, todoId, updates) {
        const allTodos = this.getItem('todos') || {};
        if (allTodos[termId] && allTodos[termId][todoId]) {
            allTodos[termId][todoId] = { ...allTodos[termId][todoId], ...updates };
            this.setItem('todos', allTodos);
        }
        return true;
    }

    async deleteTodo(termId, todoId) {
        const allTodos = this.getItem('todos') || {};
        if (allTodos[termId]) {
            delete allTodos[termId][todoId];
            this.setItem('todos', allTodos);
        }
        return true;
    }

    // Holiday methods
    async getHolidays(termId) {
        const allHolidays = this.getItem('holidays') || {};
        return allHolidays[termId] || {};
    }

    async addHoliday(termId, holidayData) {
        const allHolidays = this.getItem('holidays') || {};
        if (!allHolidays[termId]) {
            allHolidays[termId] = {};
        }
        const holidayId = 'holiday_' + Date.now();
        allHolidays[termId][holidayId] = { ...holidayData, id: holidayId };
        this.setItem('holidays', allHolidays);
        return holidayId;
    }

    async deleteHoliday(termId, holidayId) {
        const allHolidays = this.getItem('holidays') || {};
        if (allHolidays[termId]) {
            delete allHolidays[termId][holidayId];
            this.setItem('holidays', allHolidays);
        }
        return true;
    }

    // Current term methods
    getCurrentTerm() {
        return this.getItem('currentTerm');
    }

    setCurrentTerm(termId) {
        this.setItem('currentTerm', termId);
    }

    // Export/Import methods for backup
    exportData() {
        const data = {
            terms: this.getItem('terms'),
            subjects: this.getItem('subjects'),
            todos: this.getItem('todos'),
            holidays: this.getItem('holidays'),
            currentTerm: this.getItem('currentTerm'),
            exportDate: new Date().toISOString()
        };
        return JSON.stringify(data, null, 2);
    }

    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            this.setItem('terms', data.terms || {});
            this.setItem('subjects', data.subjects || {});
            this.setItem('todos', data.todos || {});
            this.setItem('holidays', data.holidays || {});
            if (data.currentTerm) {
                this.setItem('currentTerm', data.currentTerm);
            }
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }

    // Clear all data
    clearAll() {
        const keys = Object.keys(localStorage).filter(key => key.startsWith(this.storagePrefix));
        keys.forEach(key => localStorage.removeItem(key));
        this.initialize();
    }
}

// Initialize global database instance
window.localDB = new LocalDatabase();