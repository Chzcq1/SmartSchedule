// Firebase Configuration
// This will be populated by the server with actual environment variables
let firebaseConfig = {
    apiKey: "",
    authDomain: "",
    databaseURL: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "123456789",
    appId: ""
};

// Initialize Firebase when config is ready
async function initFirebase() {
    try {
        // Fetch config from server
        const response = await fetch('/firebase-config.json');
        if (response.ok) {
            firebaseConfig = await response.json();
        } else {
            // Fallback: try to get from meta tags or use placeholder
            const projectId = document.querySelector('meta[name="firebase-project-id"]')?.content || 'your-project-id';
            const apiKey = document.querySelector('meta[name="firebase-api-key"]')?.content || 'your-api-key';
            const appId = document.querySelector('meta[name="firebase-app-id"]')?.content || 'your-app-id';
            
            firebaseConfig = {
                apiKey: apiKey,
                authDomain: `${projectId}.firebaseapp.com`,
                databaseURL: `https://${projectId}-default-rtdb.firebaseio.com/`,
                projectId: projectId,
                storageBucket: `${projectId}.appspot.com`,
                messagingSenderId: "123456789",
                appId: appId
            };
        }
        
        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        window.firebaseDB = firebase.database();
        console.log('Firebase initialized successfully with config:', firebaseConfig);
        
        // Test Firebase connection
        window.firebaseDB.ref('.info/connected').on('value', function(snapshot) {
            if (snapshot.val() === true) {
                console.log('Firebase connected successfully');
            } else {
                console.log('Firebase not connected');
            }
        });
        
        // Dispatch custom event to indicate Firebase is ready
        window.dispatchEvent(new CustomEvent('firebaseReady'));
        
    } catch (error) {
        console.error('Error initializing Firebase:', error);
    }
}

// Initialize Firebase when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFirebase);
} else {
    initFirebase();
}

// Get Firebase database reference
const database = firebase.database();

// Export for use in other files
window.firebaseDB = database;
