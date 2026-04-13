import pickle

data = pickle.load(open('data/students_embeddings.pkl', 'rb'))
print("=== Students Embeddings File ===")
print(f"Total students registered: {len(data)}")
print()
for roll, info in data.items():
    print(f"Roll Number: {roll}")
    print(f"  Name: {info.get('name', 'N/A')}")
    print(f"  Department: {info.get('department', 'N/A')}")
    poses = info.get('embeddings', {})
    print(f"  Poses stored: {list(poses.keys())}")
    for pose_name, vec in poses.items():
        print(f"    {pose_name}: numpy array shape={vec.shape}, first 5 values={vec[:5]}")
    print()
