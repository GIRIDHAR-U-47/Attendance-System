import os
import django
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import User

departments = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AI&DS', 'AIML']
years = [1, 2, 3, 4]

created_count = 0
for i in range(1, 51):
    roll_num = f"STU{1000+i}"
    username = f"dummy_student_{i}"
    dept = random.choice(departments)
    year = random.choice(years)
    
    if not User.objects.filter(roll_number=roll_num).exists() and not User.objects.filter(username=username).exists():
        user = User.objects.create_user(
            username=username,
            email=f"{username}@example.com",
            password="studentpass",
            roll_number=roll_num,
        )
        user.role = 'student'
        user.department = dept
        user.year_of_joining = year
        user.save()
        created_count += 1

print(f"Successfully created {created_count} dummy students.")
