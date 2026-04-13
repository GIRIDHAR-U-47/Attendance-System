import os
import cv2
from flask import Flask, render_template, Response, request, jsonify
from utils.face_engine import FaceEngine
from utils import db_logger as csv_logger
from flask_cors import CORS
import time
import random

app = Flask(__name__)
CORS(app)

# Initialize Face Engine and CSV
face_engine = FaceEngine(data_dir='data', staff_faces_dir='staff_faces')
csv_logger.init_csv_files()

# Global state for camera and attendance session
camera = None
active_session = {
    'is_active': False,
    'subject_code': None,
    'latest_detection': None,
    'frame_count': 0
}

active_challenge = {
    'roll_number': None,
    'challenge': None,
    'start_time': 0,
    'verified': False,
    'state': {},
    'retries': 0,
    'spoof_detected': False,
    'spoof_reason': ""
}
CHALLENGES = ['blink', 'smile', 'turn_left', 'turn_right', 'nod']

# Temporary store for 3-pose embeddings
pending_registrations = {}

def get_camera():
    global camera
    if camera is None:
        camera = cv2.VideoCapture(0)
    return camera

def release_camera():
    global camera
    if camera is not None:
        camera.release()
        camera = None

def generate_frames(mode='register', target_pose='left'):
    cam = get_camera()
    while True:
        success, frame = cam.read()
        if not success:
            break
        else:
            display_frame = frame.copy()
            
            if mode == 'register':
                # Overlay dense landmarks and turn guidance
                faces = face_engine.app.get(frame)
                for face in faces:
                    # 1. Dense Landmarks Overlay
                    if hasattr(face, 'landmark_2d_106') and face.landmark_2d_106 is not None:
                        for pt in face.landmark_2d_106:
                            cv2.circle(display_frame, (int(pt[0]), int(pt[1])), 1, (0, 255, 255), -1)
                    elif hasattr(face, 'kps') and face.kps is not None: # fallback
                        for kp in face.kps:
                            cv2.circle(display_frame, (int(kp[0]), int(kp[1])), 2, (0, 255, 255), -1)
                            
                    # 2. Real-time Yaw text guidance
                    try:
                        yaw = face.pose[1]
                    except (AttributeError, IndexError, TypeError):
                        if hasattr(face, 'kps') and face.kps is not None:
                            kps = face.kps
                            eye_center = (kps[0][0] + kps[1][0]) / 2
                            eye_dist = kps[1][0] - kps[0][0]
                            if eye_dist == 0: eye_dist = 1
                            nose_x = kps[2][0]
                            yaw = (nose_x - eye_center) / eye_dist * -40.0
                        else:
                            yaw = 0
                    
                    is_valid = False
                    if target_pose == 'left':
                        is_valid = yaw < -15
                        msg_1 = f"Current yaw: {yaw:.1f} deg"
                        if is_valid:
                            msg_2 = "Correct LEFT angle \u2713" 
                        else:
                            msg_2 = f"Please turn {abs(-15 - yaw):.0f} deg more LEFT"
                        msg_3 = "Target: < -15"
                    elif target_pose == 'front':
                        is_valid = -10 <= yaw <= 10
                        msg_1 = f"Current yaw: {yaw:.1f} deg"
                        msg_2 = "Good FRONT alignment \u2713" if is_valid else "Align FRONT"
                        msg_3 = "Target: -10 to +10"
                    else: # right
                        is_valid = yaw > 15
                        msg_1 = f"Current yaw: {yaw:.1f} deg"
                        if is_valid:
                            msg_2 = "Correct RIGHT angle \u2713"
                        else:
                            msg_2 = f"Please turn {abs(15 - yaw):.0f} deg more RIGHT"
                        msg_3 = "Target: > +15"
                    
                    color = (0, 255, 0) if is_valid else (0, 0, 255)
                    
                    cv2.putText(display_frame, msg_1, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
                    cv2.putText(display_frame, msg_2, (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
                    cv2.putText(display_frame, msg_3, (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)

                    # 3. Horizontal alignment meter
                    h, w = display_frame.shape[:2]
                    meter_y = h - 30
                    cv2.line(display_frame, (50, meter_y), (w - 50, meter_y), (200, 200, 200), 2)
                    
                    meter_w = w - 100
                    def yaw_to_x(y_val):
                        y_clamped = max(-45, min(45, y_val))
                        norm = (y_clamped + 45) / 90.0
                        return int(50 + norm * meter_w)
                    
                    for label, y_tick in [('-30', -30), ('-15', -15), ('0', 0), ('+15', 15), ('+30', 30)]:
                        tick_x = yaw_to_x(y_tick)
                        cv2.circle(display_frame, (tick_x, meter_y), 4, (255, 255, 255), -1)
                        cv2.putText(display_frame, label, (tick_x - 15, meter_y + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
                    
                    curr_x = yaw_to_x(yaw)
                    cv2.circle(display_frame, (curr_x, meter_y), 8, color, -1)
                    
                    break # Optional: only draw for the first face detected
                            
            elif mode == 'attendance_live' and active_session['is_active']:
                # Detect and draw bounding boxes
                result, faces = face_engine.recognize_student(frame)
                
                # Update global state for polling
                active_session['latest_detection'] = result
                
                if len(faces) == 0:
                    active_session['missing_count'] = active_session.get('missing_count', 0) + 1
                    if active_session['missing_count'] > 15:
                        active_challenge.update({'verified': False, 'roll_number': None, 'state': {}, 'spoof_detected': False, 'spoof_reason': ""})
                else:
                    active_session['missing_count'] = 0
                
                # Draw boxes
                for face in faces:
                    box = face.bbox.astype(int)
                    # Draw subtle rectangle
                    cv2.rectangle(display_frame, (box[0], box[1]), (box[2], box[3]), (255, 255, 255), 2)
                    
                    if result and result['match']:
                        label = f"{result['roll_number']} | Conf: {result['confidence']:.2f}"
                        roll = result['roll_number']
                        
                        # ANTI-SPOOFING STATE MACHINE
                        active_session['frame_count'] = active_session.get('frame_count', 0) + 1
                        
                        if active_challenge.get('spoof_detected'):
                            # Wait until face leaves or changes
                            if active_challenge.get('roll_number') != roll:
                                active_challenge.update({'roll_number': roll, 'challenge': random.choice(CHALLENGES), 'start_time': time.time(), 'verified': False, 'state': {}, 'retries': 0, 'spoof_detected': False, 'spoof_reason': ""})
                            else:
                                cv2.putText(display_frame, "SPOOF DETECTED", (box[0], box[1] - 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                                cv2.putText(display_frame, active_challenge.get('spoof_reason', ''), (box[0], box[1] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
                        else:
                            # Passive check every 10 frames
                            if active_session['frame_count'] % 10 == 0:
                                passive_pass, passive_msg = face_engine.check_passive_liveness(frame, face)
                                if not passive_pass:
                                    active_challenge['spoof_detected'] = True
                                    active_challenge['spoof_reason'] = passive_msg
                            
                            if not active_challenge.get('spoof_detected'):
                                current_time = time.time()
                                if active_challenge.get('roll_number') != roll:
                                    active_challenge.update({'roll_number': roll, 'challenge': random.choice(CHALLENGES), 'start_time': current_time, 'verified': False, 'state': {}, 'retries': 0, 'spoof_detected': False, 'spoof_reason': ""})
                                
                                if not active_challenge['verified']:
                                    if current_time - active_challenge['start_time'] > 5:
                                        if active_challenge['retries'] < 2:
                                            active_challenge['retries'] += 1
                                            active_challenge['challenge'] = random.choice(CHALLENGES)
                                            active_challenge['start_time'] = current_time
                                            active_challenge['state'] = {}
                                        else:
                                            active_challenge['spoof_detected'] = True
                                            active_challenge['spoof_reason'] = "Challenge Failed (Timeout)"
                                    else:
                                        passed = face_engine.check_active_liveness(face, active_challenge)
                                        if passed:
                                            active_challenge['verified'] = True
                                            
                                # Draw challenge status
                                if active_challenge['verified']:
                                    cv2.putText(display_frame, "LIVE FACE VERIFIED \u2713", (box[0], box[1] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                                else:
                                    remaining = max(0, 5 - int(current_time - active_challenge['start_time']))
                                    cv2.putText(display_frame, f"CHALLENGE: {active_challenge['challenge'].upper().replace('_', ' ')} ({remaining}s)", (box[0], box[1] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 165, 255), 2)
                                    
                    else:
                        label = "Unknown"
                        # Do NOT wipe active_challenge state here. A temporary dip in frame confidence 
                        # should not reset the 5-second challenge timer.
                    cv2.putText(display_frame, label, (box[0], box[3] + 20),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                                
                # Piggyback verified status onto the detection payload 
                if active_session['latest_detection']:
                    active_session['latest_detection']['liveness_verified'] = active_challenge.get('verified', False)
                    active_session['latest_detection']['spoof_detected'] = active_challenge.get('spoof_detected', False)
                    active_session['latest_detection']['spoof_reason'] = active_challenge.get('spoof_reason', "")

            # Encode frame
            ret, buffer = cv2.imencode('.jpg', display_frame)
            frame_bytes = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

@app.route('/ping')
def ping():
    return jsonify({'status': 'alive', 'time': time.time()})

@app.route('/')
def home():
    logs = csv_logger.get_recent_logs(5)
    return render_template('home.html', logs=logs)

@app.route('/register')
def register():
    return render_template('register.html')

@app.route('/attendance')
def attendance():
    # If starting fresh, reset session
    active_session['is_active'] = False
    active_session['subject_code'] = None
    active_session['latest_detection'] = None
    return render_template('attendance.html')

@app.route('/video_feed')
def video_feed():
    mode = request.args.get('mode', 'register')
    target_pose = request.args.get('pose', 'left')
    return Response(generate_frames(mode, target_pose),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/capture_face', methods=['POST'])
def capture_face():
    data = request.json
    roll_number = data.get('roll_number')
    student_name = data.get('student_name')
    pose = data.get('pose') # 'left', 'front', 'right'
    
    if not roll_number or not student_name or not pose:
        return jsonify({'success': False, 'message': 'Missing Roll, Name, or Pose'})
        
    image_b64 = data.get('image')
    if not image_b64:
        return jsonify({'success': False, 'message': 'Image required for capture'})
        
    try:
        import base64
        import numpy as np
        
        if ',' in image_b64:
            image_b64 = image_b64.split(',')[1]
            
        image_b64 += "=" * ((4 - len(image_b64) % 4) % 4)
            
        img_data = base64.b64decode(image_b64)
        nparr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return jsonify({'success': False, 'message': 'Failed to decode student image'})
    except Exception as e:
        return jsonify({'success': False, 'message': 'Invalid image format: ' + str(e)})
        
    face, msg = face_engine.extract_face(frame)
    if not face:
        return jsonify({'success': False, 'message': msg})
        
    is_valid, angle_msg = face_engine.validate_pose(face, pose)
    if not is_valid:
        return jsonify({'success': False, 'message': angle_msg})
        
    # Valid pose! Save the image
    folder_path = os.path.join('known_faces', f"{roll_number}_{student_name}")
    os.makedirs(folder_path, exist_ok=True)
    img_path = os.path.join(folder_path, f"{pose}.jpg")
    cv2.imwrite(img_path, frame)
    
    if roll_number not in pending_registrations:
        pending_registrations[roll_number] = {}
        
    pending_registrations[roll_number][pose] = face.embedding
    
    return jsonify({'success': True, 'message': f'{pose.upper()} Captured', 'image_path': img_path})

@app.route('/api/register_student', methods=['POST'])
def register_student():
    data = request.json
    roll_number = data.get('roll_number')
    student_name = data.get('student_name')
    department = data.get('department')
    year = data.get('year')
    
    if roll_number not in pending_registrations or len(pending_registrations[roll_number]) < 3:
        return jsonify({'success': False, 'message': 'Not all 3 poses captured'})
        
    try:
        # Save to face engine
        face_engine.student_embeddings[roll_number] = {
            "name": student_name,
            "department": department,
            "year": year,
            "embeddings": pending_registrations[roll_number]
        }
        face_engine.save_student_embeddings()
        
        # Clean up memory
        del pending_registrations[roll_number]
        
        # Log registration (CSV)
        folder_path = os.path.join('known_faces', f"{roll_number}_{student_name}")
        csv_logger.log_student_registration(roll_number, student_name, department, year, folder_path)
        
        return jsonify({'success': True, 'message': 'Registration complete'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/verify_staff', methods=['POST'])
def verify_staff():
    data = request.json
    subject_code = data.get('subject_code')
    if not subject_code:
        return jsonify({'success': False, 'message': 'Subject code required'})
        
    image_b64 = data.get('image')
    if not image_b64:
        return jsonify({'success': False, 'message': 'Image required'})
        
    try:
        import base64
        import numpy as np
        
        # Remove prefix if present (data:image/jpeg;base64,)
        if ',' in image_b64:
            image_b64 = image_b64.split(',')[1]
            
        # Safely pad the base64 string
        image_b64 += "=" * ((4 - len(image_b64) % 4) % 4)
            
        img_data = base64.b64decode(image_b64)
        nparr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return jsonify({'success': False, 'message': 'Failed to decode image'})
            
        is_verified, msg = face_engine.verify_staff(frame)
        if is_verified:
            active_session['is_active'] = True
            active_session['subject_code'] = subject_code
            return jsonify({'success': True, 'message': 'Staff Verified'})
        else:
            return jsonify({'success': False, 'message': msg})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/latest_detection', methods=['GET'])
def latest_detection():
    if not active_session['is_active']:
        return jsonify({'success': False, 'message': 'No active session'})
    return jsonify({'success': True, 'data': active_session['latest_detection']})

@app.route('/api/mark_attendance', methods=['POST'])
def mark_attendance():
    if not active_session['is_active']:
        return jsonify({'success': False, 'message': 'No active session'})
        
    detection = active_session.get('latest_detection')
    if not detection or not detection.get('match'):
        return jsonify({'success': False, 'message': 'No known student in frame'})
        
    if detection.get('spoof_detected'):
        return jsonify({'success': False, 'message': 'Spoofing detected: Attendance blocked'})

    if not detection.get('liveness_verified'):
        return jsonify({'success': False, 'message': 'Spoofing detected: Liveness challenge not completed'})
        
    roll_number = detection['roll_number']
    name = detection['name']
    subj = active_session['subject_code']
    
    success, msg = csv_logger.log_attendance(roll_number, name, subj)
    if success:
        records = csv_logger.get_session_records(subj)
        return jsonify({'success': True, 'message': 'Attendance Marked', 'records': records})
    else:
        return jsonify({'success': False, 'message': msg})

@app.route('/api/scan_face_mobile', methods=['POST'])
def scan_face_mobile():
    data = request.json
    subject_code = data.get('subject_code')
    image_b64 = data.get('image')

    if not subject_code or not image_b64:
        return jsonify({'success': False, 'message': 'Subject code and image required'})

    try:
        import base64
        import numpy as np

        if ',' in image_b64:
            image_b64 = image_b64.split(',')[1]

        image_b64 += "=" * ((4 - len(image_b64) % 4) % 4)

        img_data = base64.b64decode(image_b64)
        nparr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            return jsonify({'success': False, 'message': 'Failed to decode image'})

        result, faces = face_engine.recognize_student(frame)

        if not result or not result.get('match'):
            return jsonify({'success': False, 'message': 'No registered student matched.', 'confidence': result.get('confidence', 0) if result else 0})

        roll_number = result['roll_number']
        name = result['name']

        success, msg = csv_logger.log_attendance(roll_number, name, subject_code)
        
        if success:
            records = csv_logger.get_session_records(subject_code)
            return jsonify({'success': True, 'message': 'Attendance Marked', 'student': {'roll_number': roll_number, 'name': name}, 'records': records})
        else:
            return jsonify({'success': False, 'message': msg})

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# Temporary store for 3-pose staff embeddings
pending_staff_registrations = {}

@app.route('/api/capture_staff_face', methods=['POST'])
def capture_staff_face():
    data = request.json
    faculty_id = data.get('roll_number')
    faculty_name = data.get('student_name')
    pose = data.get('pose')
    
    if not faculty_id or not faculty_name or not pose:
        return jsonify({'success': False, 'message': 'Missing Faculty ID, Name, or Pose'})
        
    image_b64 = data.get('image')
    if not image_b64:
        return jsonify({'success': False, 'message': 'Image required for capture'})
        
    try:
        import base64
        import numpy as np
        
        if ',' in image_b64:
            image_b64 = image_b64.split(',')[1]
            
        image_b64 += "=" * ((4 - len(image_b64) % 4) % 4)
            
        img_data = base64.b64decode(image_b64)
        nparr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return jsonify({'success': False, 'message': 'Failed to decode faculty image'})
    except Exception as e:
        return jsonify({'success': False, 'message': 'Invalid image format: ' + str(e)})
        
    face, msg = face_engine.extract_face(frame)
    if not face:
        return jsonify({'success': False, 'message': msg})
        
    is_valid, angle_msg = face_engine.validate_pose(face, pose)
    if not is_valid:
        return jsonify({'success': False, 'message': angle_msg})
        
    # Valid pose! Save image to known_staff folder
    folder_path = os.path.join('known_staff', f"{faculty_id}_{faculty_name}")
    os.makedirs(folder_path, exist_ok=True)
    img_path = os.path.join(folder_path, f"{pose}.jpg")
    cv2.imwrite(img_path, frame)
    
    if faculty_id not in pending_staff_registrations:
        pending_staff_registrations[faculty_id] = {}
        
    pending_staff_registrations[faculty_id][pose] = face.embedding
    
    return jsonify({'success': True, 'message': f'{pose.upper()} Captured', 'image_path': img_path})

@app.route('/api/register_staff', methods=['POST'])
def register_staff():
    data = request.json
    faculty_id = data.get('roll_number')
    faculty_name = data.get('student_name')
    department = data.get('department')
    
    if faculty_id not in pending_staff_registrations or len(pending_staff_registrations[faculty_id]) < 3:
        return jsonify({'success': False, 'message': 'Not all 3 poses captured'})
        
    try:
        # Save to face engine's staff embeddings
        face_engine.staff_embeddings[faculty_id] = {
            "name": faculty_name,
            "department": department,
            "embeddings": pending_staff_registrations[faculty_id]
        }
        face_engine.save_staff_embeddings()
        
        # Clean up memory
        del pending_staff_registrations[faculty_id]
        
        return jsonify({'success': True, 'message': 'Faculty face registration complete'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

if __name__ == '__main__':
    # host='0.0.0.0' allows external devices (like the mobile app) to connect
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True, use_reloader=False)
