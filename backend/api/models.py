from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    ROLE_CHOICES = (
        ('student', 'Student'),
        ('faculty', 'Faculty'),
        ('admin', 'Admin'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    rfid_tag = models.CharField(max_length=100, blank=True, null=True)
    device_id = models.CharField(max_length=255, blank=True, null=True)
    
    # Newly added fields merged from face recognition database
    roll_number = models.CharField(max_length=50, primary_key=True)
    department = models.CharField(max_length=100, blank=True, null=True)
    year_of_joining = models.IntegerField(blank=True, null=True)
    image_path = models.CharField(max_length=500, blank=True, null=True)

class Student(User):
    class Meta:
        proxy = True
        verbose_name = 'Student'
        verbose_name_plural = 'Students'

class Faculty(User):
    class Meta:
        proxy = True
        verbose_name = 'Faculty'
        verbose_name_plural = 'Faculties'

class CampusZone(models.Model):
    name = models.CharField(max_length=100)
    polygon_coordinates = models.JSONField(default=list)

    def __str__(self):
        return self.name

class LocationRecord(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role': 'student'})
    latitude = models.FloatField()
    longitude = models.FloatField()
    timestamp = models.DateTimeField(auto_now_add=True)
    in_campus = models.BooleanField(default=False)
    current_zone = models.ForeignKey(CampusZone, on_delete=models.SET_NULL, null=True, blank=True)

class Attendance(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role': 'student'})
    subject = models.CharField(max_length=100)
    date = models.DateField()
    status = models.CharField(max_length=20, choices=(('Present', 'Present'), ('Absent', 'Absent')))

class Note(models.Model):
    title = models.CharField(max_length=200)
    subject = models.CharField(max_length=100)
    file_url = models.URLField(max_length=300)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, limit_choices_to={'role': 'faculty'})
    uploaded_at = models.DateTimeField(auto_now_add=True)
