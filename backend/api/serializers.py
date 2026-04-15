from rest_framework import serializers
from .models import (
    User, CampusZone, LocationRecord, Attendance, Note, Subject, 
    StudentSubjectEnrollment, AttendanceSession, AttendanceRecord, SubjectCatalog,
    Canteen, CanteenOwnerProfile, FoodCategory, FoodItem, FoodReview, FoodOrder, FoodOrderItem
)

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

# ----------------- CANTEEN MODULE SERIALIZERS -----------------

class CanteenSerializer(serializers.ModelSerializer):
    class Meta:
        model = Canteen
        fields = '__all__'

class FoodCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodCategory
        fields = '__all__'

class FoodReviewSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.username', read_only=True)

    class Meta:
        model = FoodReview
        fields = ['review_id', 'item', 'student', 'student_name', 'rating', 'review_text', 'created_at']

class FoodItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.category_name', read_only=True)
    reviews_count = serializers.SerializerMethodField()

    class Meta:
        model = FoodItem
        fields = [
            'item_id', 'canteen', 'category', 'category_name', 'item_name', 
            'description', 'image_url', 'price', 'stock_quantity', 'is_available', 
            'average_rating', 'reviews_count'
        ]

    def get_reviews_count(self, obj):
        return obj.reviews.count()

class FoodOrderItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.item_name', read_only=True)
    
    class Meta:
        model = FoodOrderItem
        fields = ['order_item_id', 'item', 'item_name', 'quantity', 'price_at_purchase']

class FoodOrderSerializer(serializers.ModelSerializer):
    student_details = UserSerializer(source='student', read_only=True)
    canteen_name = serializers.CharField(source='canteen.canteen_name', read_only=True)
    items = FoodOrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = FoodOrder
        fields = [
            'order_id', 'canteen', 'canteen_name', 'student', 'student_details', 
            'total_amount', 'order_status', 'token_status', 'qr_token', 
            'created_at', 'expires_at', 'redeemed_at', 'items'
        ]
