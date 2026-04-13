from rest_framework import serializers
from .models import User, CampusZone, LocationRecord, Attendance, Note

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['roll_number', 'username', 'email', 'role', 'rfid_tag', 'image_path']

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
