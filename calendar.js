// Calendar and Date Utilities
class CalendarManager {
    constructor() {
        this.currentWeekStart = null;
        this.daysOfWeek = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
        this.monthNames = [
            'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
            'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
        ];
    }

    // Get current date and week
    getCurrentDate() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        return now.toLocaleDateString('th-TH', options);
    }

    setCurrentWeek() {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek;
        this.currentWeekStart = new Date(now.setDate(diff));
        return this.currentWeekStart;
    }

    getWeekRange() {
        if (!this.currentWeekStart) {
            this.setCurrentWeek();
        }
        
        const weekEnd = new Date(this.currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        const startStr = this.currentWeekStart.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
        const endStr = weekEnd.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
        
        return `${startStr} - ${endStr}`;
    }

    navigateWeek(direction) {
        if (!this.currentWeekStart) {
            this.setCurrentWeek();
        }
        
        this.currentWeekStart.setDate(this.currentWeekStart.getDate() + (direction * 7));
        return this.getWeekRange();
    }

    getDateForDay(dayOfWeek) {
        if (!this.currentWeekStart) {
            this.setCurrentWeek();
        }
        
        const date = new Date(this.currentWeekStart);
        date.setDate(date.getDate() + dayOfWeek);
        return date;
    }

    // Check if a date falls within a subject's schedule period
    isDateInSubjectPeriod(date, subjectStartDate, subjectEndDate) {
        const checkDate = new Date(date);
        const startDate = new Date(subjectStartDate);
        const endDate = new Date(subjectEndDate);
        
        return checkDate >= startDate && checkDate <= endDate;
    }

    // Generate all occurrence dates for a subject within its period
    generateSubjectOccurrences(subject) {
        const occurrences = [];
        const startDate = new Date(subject.startDate);
        const endDate = new Date(subject.endDate);
        const dayOfWeek = subject.dayOfWeek;
        
        // Find the first occurrence of the target day of week
        let currentDate = new Date(startDate);
        while (currentDate.getDay() !== dayOfWeek) {
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // Generate all occurrences
        while (currentDate <= endDate) {
            occurrences.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 7); // Next week
        }
        
        return occurrences;
    }

    // Format date for display
    formatThaiDate(date) {
        if (typeof date === 'string') {
            date = new Date(date);
        }
        
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            weekday: 'long'
        };
        return date.toLocaleDateString('th-TH', options);
    }

    // Check if a date is a holiday
    isHoliday(date, holidays) {
        const dateStr = this.formatDateString(date);
        return Object.values(holidays).some(holiday => holiday.date === dateStr);
    }

    // Get holiday for a specific date
    getHolidayForDate(date, holidays) {
        const dateStr = this.formatDateString(date);
        return Object.values(holidays).find(holiday => holiday.date === dateStr);
    }

    // Format date as YYYY-MM-DD string
    formatDateString(date) {
        if (typeof date === 'string') {
            return date;
        }
        return date.toISOString().split('T')[0];
    }

    // Parse time string to minutes
    timeToMinutes(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    // Convert minutes back to time string
    minutesToTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    // Check if a time slot overlaps with a subject
    isTimeSlotInSubject(timeSlot, subject) {
        const slotTime = this.timeToMinutes(timeSlot);
        const startTime = this.timeToMinutes(subject.startTime);
        const endTime = this.timeToMinutes(subject.endTime);
        
        return slotTime >= startTime && slotTime < endTime;
    }

    // Get academic year from date
    getAcademicYear(date = new Date()) {
        const year = date.getFullYear();
        const month = date.getMonth();
        
        // Academic year starts in August (month 7)
        if (month >= 7) {
            return year + 543 + 1; // Thai Buddhist year + 1 for next academic year
        } else {
            return year + 543; // Current academic year
        }
    }

    // Get semester from date
    getSemester(date = new Date()) {
        const month = date.getMonth() + 1; // 1-12
        
        if (month >= 8 && month <= 12) {
            return 1; // First semester
        } else if (month >= 1 && month <= 5) {
            return 2; // Second semester
        } else {
            return 3; // Summer semester
        }
    }

    // Generate default term name based on current date
    generateTermName(date = new Date()) {
        const academicYear = this.getAcademicYear(date);
        const semester = this.getSemester(date);
        return `เทอม ${semester}/${academicYear}`;
    }

    // Calculate days between two dates
    daysBetween(date1, date2) {
        const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
        const firstDate = new Date(date1);
        const secondDate = new Date(date2);
        
        return Math.round(Math.abs((firstDate - secondDate) / oneDay));
    }

    // Check if a date is today
    isToday(date) {
        const today = new Date();
        const checkDate = new Date(date);
        
        return today.toDateString() === checkDate.toDateString();
    }

    // Check if a date is in the current week
    isInCurrentWeek(date) {
        if (!this.currentWeekStart) {
            this.setCurrentWeek();
        }
        
        const checkDate = new Date(date);
        const weekEnd = new Date(this.currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        return checkDate >= this.currentWeekStart && checkDate <= weekEnd;
    }

    // Get relative date string (today, tomorrow, etc.)
    getRelativeDateString(date) {
        const today = new Date();
        const checkDate = new Date(date);
        const diffDays = Math.floor((checkDate - today) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'วันนี้';
        if (diffDays === 1) return 'พรุ่งนี้';
        if (diffDays === -1) return 'เมื่อวาน';
        if (diffDays > 1 && diffDays <= 7) return `อีก ${diffDays} วัน`;
        if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} วันที่แล้ว`;
        
        return this.formatThaiDate(checkDate);
    }
}

// Export for use in other scripts
window.CalendarManager = CalendarManager;