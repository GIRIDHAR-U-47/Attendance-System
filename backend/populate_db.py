import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import User, CampusZone

# Create Admin User
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'adminpassword123', roll_number='ADMIN001', role='admin')
    print("Superuser created: admin / adminpassword123")

# Create Student User
if not User.objects.filter(username='student1').exists():
    user = User.objects.create_user('student1', 'student1@example.com', 'studentpass', roll_number='STUDENT001')
    user.role = 'student'
    user.save()
    print("Student created: student1 / studentpass")

# Create Campus Zone
polygon_coords = [
    {"lng": 79.4507393, "lat": 10.9942148},
    {"lng": 79.4526062, "lat": 10.9906128},
    {"lng": 79.4568762, "lat": 10.9927613},
    {"lng": 79.4559106, "lat": 10.9955628},
    {"lng": 79.4507393, "lat": 10.9942148}
]

zone, created = CampusZone.objects.get_or_create(name="Main Campus")
zone.polygon_coordinates = polygon_coords
zone.save()
print("Campus Zone populated with provided polygon coordinates.")
