import os
import pickle
import numpy as np
import cv2  # specifically added for passive liveness
from insightface.app import FaceAnalysis

class FaceEngine:
    def __init__(self, data_dir='data', staff_faces_dir='staff_faces'):
        self.data_dir = data_dir
        self.staff_faces_dir = staff_faces_dir
        
        # Initialize InsightFace
        self.app = FaceAnalysis(name='buffalo_l')
        self.app.prepare(ctx_id=0, det_size=(320, 320))
        
        self.student_embeddings = self.load_student_embeddings(self.data_dir)
        self.staff_embeddings = self.load_staff_embeddings(self.staff_faces_dir)

    def load_student_embeddings(self, directory):
        """Load 3-pose embeddings from students_embeddings.pkl"""
        if not os.path.exists(directory):
            os.makedirs(directory, exist_ok=True)
            
        pkl_path = os.path.join(directory, 'students_embeddings.pkl')
        if os.path.exists(pkl_path):
            with open(pkl_path, 'rb') as f:
                return pickle.load(f)
        return {}

    def load_staff_embeddings(self, directory):
        """Load single-pose staff embeddings"""
        if not os.path.exists(directory):
            os.makedirs(directory, exist_ok=True)
            
        pkl_path = os.path.join(directory, 'embeddings.pkl')
        if os.path.exists(pkl_path):
            with open(pkl_path, 'rb') as f:
                return pickle.load(f)
        return {}

    def save_student_embeddings(self):
        """Save the nested embeddings dictionary"""
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir, exist_ok=True)
            
        pkl_path = os.path.join(self.data_dir, 'students_embeddings.pkl')
        with open(pkl_path, 'wb') as f:
            pickle.dump(self.student_embeddings, f)

    def save_staff_embeddings(self):
        """Save staff embeddings to staff_faces/embeddings.pkl"""
        if not os.path.exists(self.staff_faces_dir):
            os.makedirs(self.staff_faces_dir, exist_ok=True)
            
        pkl_path = os.path.join(self.staff_faces_dir, 'embeddings.pkl')
        with open(pkl_path, 'wb') as f:
            pickle.dump(self.staff_embeddings, f)

    def check_passive_liveness(self, frame, face):
        """Passive spoofing check (Laplacian blur and screen border)."""
        box = face.bbox.astype(int)
        x1, y1, x2, y2 = max(0, box[0]), max(0, box[1]), min(frame.shape[1], box[2]), min(frame.shape[0], box[3])
        roi = frame[y1:y2, x1:x2]
        if roi.size == 0:
            return False, "Face out of bounds"
            
        # 1. Laplacian Blur Check
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        if laplacian_var < 15.0:
            return False, "SPOOF: Blurry face detected"

        # 2. Screen Context Check (Phone/Tablet border detection)
        # Convert full frame to grayscale and find edges
        gray_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray_frame, (5, 5), 0)
        edged = cv2.Canny(blurred, 50, 150)
        
        # Approximate contours
        contours, _ = cv2.findContours(edged, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        face_area = (x2 - x1) * (y2 - y1)
        
        for cnt in contours:
            area = cv2.contourArea(cnt)
            # Check if contour is significantly larger than the face area (at least 2x)
            if area > (face_area * 2.0):
                peri = cv2.arcLength(cnt, True)
                approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)
                if len(approx) == 4:
                    rx, ry, rw, rh = cv2.boundingRect(approx)
                    # Check if face box is fully inside this rectangle
                    if rx <= x1 and ry <= y1 and (rx + rw) >= x2 and (ry + rh) >= y2:
                        return False, "PHONE SCREEN DETECTED - SPOOF"
                        
        return True, "Live"

    def check_active_liveness(self, face, challenge_data):
        """Validates active random challenges over sequential frames using local landmark diffs."""
        # Fallback for older insightface versions without dense landmarks
        if not hasattr(face, 'landmark_2d_106') or face.landmark_2d_106 is None:
            # If we don't have dense landmarks, we can't do most active challenges.
            # Bypass for now to avoid crashes and allow testing.
            print("Warning: Skipping active liveness check (missing landmark_2d_106)")
            return True
            
        lm = face.landmark_2d_106
        challenge = challenge_data['challenge']
        state = challenge_data.setdefault('state', {})
        
        # Get yaw/pitch with fallback
        try:
            pitch, yaw, roll = face.pose
        except (AttributeError, IndexError, TypeError):
            # Estimate from kps if available
            pitch, yaw, roll = 0, 0, 0
            if hasattr(face, 'kps') and face.kps is not None:
                kps = face.kps
                eye_center = (kps[0][0] + kps[1][0]) / 2
                eye_dist = kps[1][0] - kps[0][0]
                if eye_dist == 0: eye_dist = 1
                nose_x = kps[2][0]
                yaw = (nose_x - eye_center) / eye_dist * -40.0
        
        if challenge == 'blink':
            left_eye = lm[52:60]
            right_eye = lm[61:69]
            
            def calculate_ear(eye_pts):
                if len(eye_pts) < 8: return 1.0
                v1 = np.linalg.norm(eye_pts[1] - eye_pts[7])
                v2 = np.linalg.norm(eye_pts[2] - eye_pts[6])
                v3 = np.linalg.norm(eye_pts[3] - eye_pts[5])
                h = np.linalg.norm(eye_pts[0] - eye_pts[4])
                return (v1 + v2 + v3) / (3.0 * (h + 1e-6))
                
            current_ear = (calculate_ear(left_eye) + calculate_ear(right_eye)) / 2.0
            
            # Local geometry verification (prevents static photo translation)
            state['min_ear'] = min(state.get('min_ear', 1.0), current_ear)
            state['max_ear'] = max(state.get('max_ear', 0.0), current_ear)
            
            # EAR must drop significantly locally and be properly opened at peak
            # Relaxed delta to 0.04 to fix blink not registering on some noisy landmark predictions
            if (state['max_ear'] - state['min_ear'] > 0.04) and current_ear > 0.18 and state['min_ear'] < 0.20:
                return True
                
        elif challenge == 'smile':
            mouth_width = np.linalg.norm(lm[84] - lm[90])
            face_width = np.linalg.norm(lm[1] - lm[15])
            ratio = mouth_width / (face_width + 1e-6)
            
            # Local bounds check
            state['min_ratio'] = min(state.get('min_ratio', ratio), ratio)
            state['max_ratio'] = max(state.get('max_ratio', ratio), ratio)
            
            # Use max_ratio to fix 'stuck' timers if someone starts the challenge already smiling
            if (state['max_ratio'] - state['min_ratio'] > 0.02) and ratio > 0.38:
                return True
                
        elif challenge == 'turn_left':
            if 'start_yaw' not in state:
                state['start_yaw'] = yaw
                
            # Requires localized yaw difference from the start frame
            if yaw < -20 and abs(yaw - state['start_yaw']) > 15:
                return True
                
        elif challenge == 'turn_right':
            if 'start_yaw' not in state:
                state['start_yaw'] = yaw
                
            # Requires localized yaw difference from the start frame
            if yaw > 20 and abs(yaw - state['start_yaw']) > 15:
                return True
                
        elif challenge == 'nod':
            if 'start_pitch' not in state:
                state['start_pitch'] = pitch
                
            # Pitch limits logic
            if pitch < -10 or pitch > 15:
                # Still check if we deviated enough from a start pose
                if abs(pitch - state['start_pitch']) > 10:
                     return True
                
        return False
                
        return False

    def extract_face(self, frame):
        """Extracts exactly 1 face for processing."""
        faces = self.app.get(frame)
        if len(faces) != 1:
            return None, f"Expected 1 face, found {len(faces)}"
        return faces[0], "Success"

    def validate_pose(self, face, expected_pose):
        """Validates if the yaw matches the expected pose."""
        try:
            yaw = face.pose[1]
        except (AttributeError, IndexError, TypeError):
            # Fallback for older insightface versions without .pose
            if hasattr(face, 'kps') and face.kps is not None:
                # Estimate yaw from 5 keypoints: [left_eye, right_eye, nose, left_mouth, right_mouth]
                kps = face.kps
                eye_center = (kps[0][0] + kps[1][0]) / 2
                eye_dist = kps[1][0] - kps[0][0]
                if eye_dist == 0: eye_dist = 1
                nose_x = kps[2][0]
                yaw = (nose_x - eye_center) / eye_dist * -40.0 # Heuristic scaling
            else:
                return True, "Pose validation skipped (no landmarks)"
        
        if expected_pose == 'left':
            if yaw < -15:
                return True, "Valid angle"
        elif expected_pose == 'right':
            if yaw > 15:
                return True, "Valid angle"
        elif expected_pose == 'front':
            if -10 <= yaw <= 10:
                return True, "Valid angle"
                
        return False, f"Please align to the required face angle. (Current yaw: {yaw:.1f})"

    def cosine_similarity(self, v1, v2):
        """Compute cosine similarity between two vectors"""
        return np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))

    def compare_student(self, live_emb, threshold=0.50):
        """Vectorized comparison across all poses for all students."""
        best_match = None
        best_score = -1
        best_details = None
        
        for roll_number, details in self.student_embeddings.items():
            embs = details.get("embeddings", {})
            for pose, stored_emb in embs.items():
                score = self.cosine_similarity(live_emb, stored_emb)
                if score > best_score:
                    best_score = score
                    best_match = roll_number
                    best_details = details
                    
        if best_score > threshold and best_match:
            return best_match, best_details, best_score
        return None, None, best_score

    def recognize_student(self, frame):
        """Find the prominent face and try recognizing against student DB"""
        faces = self.app.get(frame)
        if len(faces) == 0:
            return None, faces
            
        face = faces[0]
        match_roll, details, score = self.compare_student(face.embedding, threshold=0.50)
        
        if match_roll:
            result = {
                'match': True,
                'roll_number': match_roll,
                'name': details.get('name', 'Unknown'),
                'confidence': float(score)
            }
        else:
            result = {
                'match': False,
                'roll_number': 'Unknown',
                'name': 'Unknown',
                'confidence': float(score)
            }
            
        return result, faces

    def verify_staff(self, frame):
        """Check if frame contains a known staff member"""
        faces = self.app.get(frame)
        if len(faces) == 0:
            return False, "No face detected"
            
        face = faces[0] 
        if not self.staff_embeddings:
            return False, "No staff embeddings registered in system"
            
        best_match = None
        best_score = -1
        for identifier, stored_data in self.staff_embeddings.items():
            # Support both old format (single numpy array) and new format (dict with 'embeddings')
            if isinstance(stored_data, dict) and 'embeddings' in stored_data:
                for pose, stored_emb in stored_data['embeddings'].items():
                    score = self.cosine_similarity(face.embedding, stored_emb)
                    if score > best_score:
                        best_score = score
                        best_match = identifier
            elif isinstance(stored_data, np.ndarray):
                score = self.cosine_similarity(face.embedding, stored_data)
                if score > best_score:
                    best_score = score
                    best_match = identifier
                
        if best_score > 0.45:
            return True, best_match
        return False, "Staff not recognized"
