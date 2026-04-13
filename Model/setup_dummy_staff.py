import cv2
import pickle
import os
from insightface.app import FaceAnalysis

print("Initializing InsightFace...")
app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
app.prepare(ctx_id=0, det_size=(320, 320))

print("Opening webcam... Press SPACE to capture your face as Staff.")
cam = cv2.VideoCapture(0)

while True:
    ret, frame = cam.read()
    if not ret:
        print("Camera error")
        break
        
    cv2.imshow("Staff Setup - Press SPACE to capture", frame)
    key = cv2.waitKey(1)
    
    if key == 32: # Space
        faces = app.get(frame)
        if len(faces) == 1:
            os.makedirs('staff_faces', exist_ok=True)
            emb_dict = {'staff_01_dummy': faces[0].embedding}
            with open(os.path.join('staff_faces', 'embeddings.pkl'), 'wb') as f:
                pickle.dump(emb_dict, f)
            print("Successfully saved staff embedding.")
            
            # Save visual
            cv2.imwrite(os.path.join('staff_faces', 'staff_01.jpg'), frame)
            break
        else:
            print(f"Expected 1 face, found {len(faces)}. Try again.")
            
    elif key == 27: # Esc
        break
        
cam.release()
cv2.destroyAllWindows()
print("Done.")
