#!/usr/bin/env python3
import os
import json
import re
from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.parse

class TimetableHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # Handle Firebase config endpoint
        if self.path == '/firebase-config.json':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            # Extract the actual project ID from the app ID format
            project_id = os.environ.get('VITE_FIREBASE_APP_ID', '')
            api_key = os.environ.get('VITE_FIREBASE_API_KEY', '')
            app_id = os.environ.get('VITE_FIREBASE_PROJECT_ID', '')
            
            config = {
                "apiKey": api_key,
                "authDomain": f"{project_id}.firebaseapp.com",
                "databaseURL": f"https://{project_id}-default-rtdb.firebaseio.com/",
                "projectId": project_id,
                "storageBucket": f"{project_id}.appspot.com",
                "messagingSenderId": "123456789",
                "appId": app_id
            }
            
            self.wfile.write(json.dumps(config).encode('utf-8'))
            return
        
        # Handle HTML files with environment variable injection
        if self.path == '/' or self.path == '/index.html':
            self.send_response(200)
            self.send_header('Content-type', 'text/html; charset=utf-8')
            self.end_headers()
            
            # Read the HTML file
            with open('index.html', 'r', encoding='utf-8') as f:
                html_content = f.read()
            
            # Replace environment variable placeholders
            html_content = html_content.replace('ENV_FIREBASE_PROJECT_ID', os.environ.get('VITE_FIREBASE_APP_ID', ''))
            html_content = html_content.replace('ENV_FIREBASE_API_KEY', os.environ.get('VITE_FIREBASE_API_KEY', ''))
            html_content = html_content.replace('ENV_FIREBASE_APP_ID', os.environ.get('VITE_FIREBASE_PROJECT_ID', ''))
            
            self.wfile.write(html_content.encode('utf-8'))
            return
        
        # Handle other files normally
        super().do_GET()

def run_server():
    port = int(os.environ.get('PORT', 5000))
    server = HTTPServer(('0.0.0.0', port), TimetableHandler)
    print(f"Server running on port {port}")
    print(f"Firebase Project ID: {os.environ.get('VITE_FIREBASE_PROJECT_ID', 'Not configured')}")
    server.serve_forever()

if __name__ == '__main__':
    run_server()