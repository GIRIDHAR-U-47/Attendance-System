from rest_framework import serializers
from .models import User, CampusZone, LocationRecord, Attendance, Note, Subject, StudentSubjectEnrollment, AttendanceSession, AttendanceRecord, SubjectCatalog

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['roll_number', 'username', 'email', 'role', 'rfid_tag', 'department', 'year_of_joining', 'image_path']

class CampusZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampusZone
        fields = ['id', 'name', 'polygon_coordinates']

class LocationRecordSerializer(serializers.ModelSerializer):
    student_details = UserSerializer(source='student', read_only=True)
    current_zone_name = serializers.CharField(source='current_zone.name', read_only=True, allow_null=True)
    
    class Meta:
        model = LocationRecord
        fields = ['id', 'student', 'student_details', 'latitude', 'longitude', 'timestamp', 'in_campus', 'current_zone', 'current_zone_name']

class AttendanceSerializer(serializers.ModelSerializer):
    student_details = UserSerializer(source='student', read_only=True)

    class Meta:
        model = Attendance
        fields = '__all__'

class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = '__all__'

class SubjectSerializer(serializers.ModelSerializer):
    faculty_name = serializers.CharField(source='faculty.username', read_only=True)

    class Meta:
        model = Subject
        fields = ['subject_code', 'subject_name', 'department', 'year', 'faculty', 'faculty_name']

class StudentSubjectEnrollmentSerializer(serializers.ModelSerializer):
    student_details = UserSerializer(source='student', read_only=True)

    class Meta:
        model = StudentSubjectEnrollment
        fields = ['id', 'student', 'student_details', 'subject', 'semester', 'is_active']

class AttendanceSessionSerializer(serializers.ModelSerializer):
    subject_details = SubjectSerializer(source='subject', read_only=True)

    class Meta:
        model = AttendanceSession
        fields = [
            'session_id', 'subject', 'subject_details', 'faculty', 'department',
            'year', 'session_date', 'start_time', 'end_time', 'status',
            'expected_count', 'present_count', 'absent_count'
        ]

class AttendanceRecordSerializer(serializers.ModelSerializer):
    student_details = UserSerializer(source='student', read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = ['id', 'session', 'student', 'student_details', 'status', 'marked_at', 'confidence', 'spoof_status']

class SubjectCatalogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubjectCatalog
        fields = ['subject_code', 'subject_name', 'department', 'year', 'semester']

