import os
import csv
from datetime import datetime
import glob

STUDENTS_CSV = 'students.csv'
ATTENDANCE_DIR = 'attendance'

def init_csv_files():
    if not os.path.exists(STUDENTS_CSV):
        with open(STUDENTS_CSV, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['roll_number', 'name', 'department', 'year', 'image_path'])
            
    if not os.path.exists(ATTENDANCE_DIR):
        os.makedirs(ATTENDANCE_DIR)

def log_student_registration(roll_number, name, department, year, image_path):
    with open(STUDENTS_CSV, 'a', newline='') as f:
        writer = csv.writer(f)
        writer.writerow([roll_number, name, department, year, image_path])

def log_attendance(roll_number, name, subject_code):
    date_str = datetime.now().strftime("%Y-%m-%d")
    time_str = datetime.now().strftime("%H:%M:%S")
    
    session_csv = os.path.join(ATTENDANCE_DIR, f"{subject_code}_{date_str}.csv")
    
    # Init session CSV if not exist
    if not os.path.exists(session_csv):
        with open(session_csv, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['roll_number', 'name', 'time', 'subject_code', 'status'])
            
    # Check for duplicates in session CSV
    try:
        with open(session_csv, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['roll_number'] == roll_number:
                    return False, "Attendance already marked for today."
    except Exception as e:
        pass
        
    # Append to session CSV
    with open(session_csv, 'a', newline='') as f:
        writer = csv.writer(f)
        writer.writerow([roll_number, name, time_str, subject_code, 'Present'])
        
    return True, "Success"
    
def get_recent_logs(limit=10):
    logs = []
    # Find the most recently modified CSV in attendance directory
    csv_files = glob.glob(os.path.join(ATTENDANCE_DIR, "*.csv"))
    # Exclude latest.csv if it still exists from earlier versions
    csv_files = [f for f in csv_files if not f.endswith('latest.csv') and not f.endswith('students.csv')]
    
    if not csv_files:
        return []
        
    # Sort files by modification time, descending, and pick the latest one
    latest_file = max(csv_files, key=os.path.getmtime)
    
    # Extract date from filename (e.g., ECE11223_2026-04-03.csv -> 2026-04-03)
    basename = os.path.basename(latest_file).replace('.csv', '')
    parts = basename.split('_')
    date_part = parts[-1] if len(parts) > 1 else ""
    
    try:
        with open(latest_file, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                timestamp = f"{date_part} {row.get('time', '')}".strip()
                logs.append({
                    'timestamp': timestamp,
                    'student_id': row.get('roll_number', ''),
                    'name': row.get('name', ''),
                    'status': 'VERIFIED'
                })
    except Exception as e:
        pass
            
    # Return last N logs in reverse order (newest first)
    return logs[-limit:][::-1]

def get_session_records(subject_code):
    date_str = datetime.now().strftime("%Y-%m-%d")
    session_csv = os.path.join(ATTENDANCE_DIR, f"{subject_code}_{date_str}.csv")
    records = []
    if os.path.exists(session_csv):
        with open(session_csv, 'r') as f:
            reader = csv.DictReader(f)
            records = list(reader)
    return records[::-1]
