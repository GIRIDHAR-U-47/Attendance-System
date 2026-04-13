import os
import django
from datetime import date, timedelta

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import User, Attendance

def populate():
    u = User.objects.get(username='Giri')
    Attendance.objects.filter(student=u).delete() # Reset
    
    subjects = [
        ('Natural Language Processing [AI23632] Lecture', 5, 1),
        ('Natural Language Processing [AI23632] Practical', 3, 0),
        ('Generative AI [AD23633] Lecture', 4, 1),
        ('Generative AI [AD23633] Practical', 2, 0),
        ('Secure Systems Engineering [AI23611] Lecture', 6, 2),
        ('Predictive and Prescriptive Analytics [AI23631] Lecture', 4, 0),
    ]
    
    for subj, p, a in subjects:
        # Create Present records
        for i in range(p):
            Attendance.objects.create(
                student=u,
                subject=subj,
                status='Present',
                date=date.today() - timedelta(days=i)
            )
        # Create Absent records
        for j in range(a):
            Attendance.objects.create(
                student=u,
                subject=subj,
                status='Absent',
                date=date.today() - timedelta(days=j+p+1)
            )

    print(f"✅ Successfully populated {Attendance.objects.filter(student=u).count()} records for student Giri.")

if __name__ == '__main__':
    populate()
