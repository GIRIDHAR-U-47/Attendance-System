import requests
import json
import traceback

# Default base URL assuming Django is running locally on port 8000
DJANGO_API_BASE = 'http://127.0.0.1:8000/api'

def init_csv_files():
    # Not used anymore, kept for backwards compatibility in app.py
    pass

def log_student_registration(roll_number, name, department, year, image_path):
    url = f"{DJANGO_API_BASE}/engine/create_user/"
    payload = {
        'roll_number': roll_number,
        'name': name,
        'department': department,
        'year': year,
        'image_path': image_path
    }
    try:
        response = requests.post(url, json=payload, timeout=5)
        res_data = response.json()
        if not res_data.get('success'):
            print(f"Error registering student to DB: {res_data.get('message')}")
    except Exception as e:
        print(f"Failed to reach Django backend: {str(e)}")

_last_session_records = []

def log_attendance(roll_number, name, subject_code):
    global _last_session_records
    url = f"{DJANGO_API_BASE}/engine/log_attendance/"
    payload = {
        'roll_number': roll_number,
        'subject_code': subject_code
    }
    try:
        response = requests.post(url, json=payload, timeout=5)
        res_data = response.json()
        
        if response.status_code == 200 and res_data.get('success'):
            _last_session_records = res_data.get('records', [])
            return True, "Success"
        else:
            return False, res_data.get('message', 'Unknown Error')
    except Exception as e:
        return False, f"Backend connection failed: {str(e)}"

def get_recent_logs(limit=10):
    url = f"{DJANGO_API_BASE}/attendance/"
    logs = []
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            # Django DRF returns list natively or paginated if configured.
            # Assuming it returns a list of all attendances
            data = sorted(data, key=lambda x: x.get('date', '') + x.get('id', 0).__str__(), reverse=True)
            for row in data[:limit]:
                # In Django it's just student ID, we need to handle it.
                # Since the home page is very basic, we just show generic logs
                student_id = row.get('student', 'Unknown')
                logs.append({
                    'timestamp': row.get('date', ''),
                    'student_id': student_id,
                    'name': f"Student ID: {student_id}",
                    'status': row.get('status', 'Present')
                })
    except Exception as e:
        print(f"Failed to fetch logs: {str(e)}")
    return logs

def get_session_records(subject_code):
    return _last_session_records
