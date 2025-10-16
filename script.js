class TeamStatusTracker {
    constructor() {
        this.currentWeek = this.getCurrentWeekNumber();
        this.currentYear = new Date().getFullYear();
        this.teamMembers = [];
        this.statusData = {};
        this.database = null; // Initialize database property
        
        this.init();
    }

    init() {
        this.loadFromLocalStorage();
        this.setupEventListeners();
        this.updateWeekDisplay();
        this.renderTeamGrid();
        
        // Initialize Firebase if available
        if (typeof firebase !== 'undefined') {
            this.initFirebase();
        }
    }

    getCurrentWeekNumber() {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const diff = now - start;
        const oneWeek = 1000 * 60 * 60 * 24 * 7;
        return Math.ceil(diff / oneWeek);
    }

    getWeekDates(year, week) {
        const jan1 = new Date(year, 0, 1);
        const days = (week - 1) * 7;
        const weekStart = new Date(jan1.getTime() + days * 24 * 60 * 60 * 1000);
        
        // Adjust to Monday
        const dayOfWeek = weekStart.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(weekStart.getTime() + mondayOffset * 24 * 60 * 60 * 1000);
        
        const weekDates = [];
        for (let i = 0; i < 5; i++) {
            const date = new Date(monday.getTime() + i * 24 * 60 * 60 * 1000);
            weekDates.push(date);
        }
        
        return weekDates;
    }

    setupEventListeners() {
        // Week navigation
        document.getElementById('prev-week').addEventListener('click', () => {
            this.currentWeek--;
            if (this.currentWeek < 1) {
                this.currentWeek = 52;
                this.currentYear--;
            }
            this.updateWeekDisplay();
            this.renderTeamGrid();
        });

        document.getElementById('next-week').addEventListener('click', () => {
            this.currentWeek++;
            if (this.currentWeek > 52) {
                this.currentWeek = 1;
                this.currentYear++;
            }
            this.updateWeekDisplay();
            this.renderTeamGrid();
        });

        // Add member modal
        const modal = document.getElementById('add-member-modal');
        const addBtn = document.getElementById('add-member');
        const closeBtn = document.querySelector('.close');
        const confirmBtn = document.getElementById('confirm-add');

        addBtn.addEventListener('click', () => {
            modal.style.display = 'block';
        });

        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        confirmBtn.addEventListener('click', () => {
            const name = document.getElementById('member-name').value.trim();
            if (name) {
                this.addTeamMember(name);
                document.getElementById('member-name').value = '';
                modal.style.display = 'none';
            }
        });

        // Save and load data buttons (only show if no Firebase)
        const saveBtn = document.getElementById('save-data');
        const loadBtn = document.getElementById('load-data');
        
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveToLocalStorage();
                alert('Data saved successfully!');
            });
        }

        if (loadBtn) {
            loadBtn.addEventListener('click', () => {
                this.loadFromLocalStorage();
                this.renderTeamGrid();
                alert('Data loaded successfully!');
            });
        }
    }

    updateWeekDisplay() {
        const weekDates = this.getWeekDates(this.currentYear, this.currentWeek);
        const startDate = weekDates[0].toLocaleDateString();
        const endDate = weekDates[4].toLocaleDateString();
        
        document.getElementById('current-week').textContent = 
            `Week ${this.currentWeek}, ${this.currentYear} (${startDate} - ${endDate})`;
    }

    addTeamMember(name) {
        if (!this.teamMembers.includes(name)) {
            this.teamMembers.push(name);
            this.saveData(); // Use unified save method
            this.renderTeamGrid();
        }
    }

    removeTeamMember(name) {
        const index = this.teamMembers.indexOf(name);
        if (index > -1) {
            this.teamMembers.splice(index, 1);
            // Remove all status data for this member
            Object.keys(this.statusData).forEach(key => {
                if (key.startsWith(name + '_')) {
                    delete this.statusData[key];
                }
            });
            this.saveData(); // Use unified save method
            this.renderTeamGrid();
        }
    }

    getStatusKey(memberName, year, week, day) {
        return `${memberName}_${year}_${week}_${day}`;
    }

    setMemberStatus(memberName, year, week, day, status) {
        const key = this.getStatusKey(memberName, year, week, day);
        this.statusData[key] = status;
    }

    getMemberStatus(memberName, year, week, day) {
        const key = this.getStatusKey(memberName, year, week, day);
        return this.statusData[key] || 'office';
    }

    renderTeamGrid() {
        const grid = document.getElementById('team-grid');
        const weekDates = this.getWeekDates(this.currentYear, this.currentWeek);
        
        grid.innerHTML = '';

        // Create header
        const header = document.createElement('div');
        header.className = 'day-header';
        
        const nameHeader = document.createElement('div');
        nameHeader.textContent = 'Team Member';
        header.appendChild(nameHeader);

        weekDates.forEach(date => {
            const dayHeader = document.createElement('div');
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            const dayDate = date.getDate();
            dayHeader.innerHTML = `${dayName}<br>${dayDate}`;
            header.appendChild(dayHeader);
        });

        grid.appendChild(header);

        // Create team member rows
        this.teamMembers.forEach(member => {
            const memberRow = document.createElement('div');
            memberRow.className = 'team-member';

            // Member name cell
            const nameCell = document.createElement('div');
            nameCell.className = 'member-name';
            nameCell.innerHTML = `
                ${member}
                <button class="delete-member" onclick="tracker.removeTeamMember('${member}')">×</button>
            `;
            memberRow.appendChild(nameCell);

            // Day cells
            weekDates.forEach((date, dayIndex) => {
                const dayCell = document.createElement('div');
                dayCell.className = 'day-cell';

                const statusCircle = document.createElement('div');
                statusCircle.className = 'status-circle';
                
                const currentStatus = this.getMemberStatus(member, this.currentYear, this.currentWeek, dayIndex);
                statusCircle.classList.add(currentStatus);

                statusCircle.addEventListener('click', () => {
                    this.cycleStatus(statusCircle, member, this.currentYear, this.currentWeek, dayIndex);
                });

                dayCell.appendChild(statusCircle);
                memberRow.appendChild(dayCell);
            });

            grid.appendChild(memberRow);
        });
    }

    initFirebase() {
        try {
            // Replace with your Firebase config
            const firebaseConfig = {
                apiKey: "your-api-key",
                authDomain: "your-project.firebaseapp.com",
                databaseURL: "https://your-project-default-rtdb.firebaseio.com/",
                projectId: "your-project-id",
                storageBucket: "your-project.appspot.com",
                messagingSenderId: "123456789",
                appId: "your-app-id"
            };
            
            firebase.initializeApp(firebaseConfig);
            this.database = firebase.database();
            
            // Listen for real-time updates
            this.database.ref('teamData').on('value', (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    this.teamMembers = data.teamMembers || [];
                    this.statusData = data.statusData || {};
                    this.renderTeamGrid();
                }
            });

            console.log('Firebase initialized successfully');
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            this.database = null;
        }
    }

    cycleStatus(element, memberName, year, week, day) {
        const statuses = ['office', 'wfh', 'leave'];
        const currentStatus = this.getMemberStatus(memberName, year, week, day);
        const currentIndex = statuses.indexOf(currentStatus);
        const nextIndex = (currentIndex + 1) % statuses.length;
        const nextStatus = statuses[nextIndex];

        element.className = 'status-circle ' + nextStatus;
        this.setMemberStatus(memberName, year, week, day, nextStatus);
        
        // Auto-save
        this.saveData();
    }

    // Unified save method - tries Firebase first, falls back to localStorage
    saveData() {
        if (this.database) {
            this.saveToFirebase();
        } else {
            this.saveToLocalStorage();
        }
    }

    saveToFirebase() {
        if (!this.database) {
            this.saveToLocalStorage();
            return;
        }

        const data = {
            teamMembers: this.teamMembers,
            statusData: this.statusData,
            lastUpdated: new Date().toISOString()
        };
        
        this.database.ref('teamData').set(data)
            .then(() => {
                console.log('Data saved to Firebase successfully!');
            })
            .catch((error) => {
                console.error('Error saving to Firebase:', error);
                // Fallback to localStorage
                this.saveToLocalStorage();
            });
    }

    saveToLocalStorage() {
        const data = {
            teamMembers: this.teamMembers,
            statusData: this.statusData,
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('teamStatusData', JSON.stringify(data));
        console.log('Data saved to localStorage');
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('teamStatusData');
        if (saved) {
            const data = JSON.parse(saved);
            this.teamMembers = data.teamMembers || [];
            this.statusData = data.statusData || {};
            console.log('Data loaded from localStorage');
        }
    }
}

// Initialize the application
const tracker = new TeamStatusTracker();
