from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.contrib.auth import authenticate
from django.utils import timezone
from datetime import timedelta
from .models import User, CampusZone, LocationRecord, Attendance, Note
from .serializers import (
    UserSerializer, CampusZoneSerializer, LocationRecordSerializer, 
    AttendanceSerializer, NoteSerializer
)

def is_point_in_polygon(lat, lng, polygon):
    """
    Ray-casting algorithm.
    polygon is a list of dicts: [{'lat': float, 'lng': float}, ...]
    """
    n = len(polygon)
    inside = False
    if n < 3:
        return False
        
    for i in range(n):
        j = (i + 1) % n
        p1 = polygon[i]
        p2 = polygon[j]
        
        if ((p1['lng'] > lng) != (p2['lng'] > lng)) and \
           (lat < (p2['lat'] - p1['lat']) * (lng - p1['lng']) / (p2['lng'] - p1['lng']) + p1['lat']):
            inside = not inside

    return inside

def check_campus_zones(lat, lng):
    zones = CampusZone.objects.all()
    for zone in zones:
        if zone.polygon_coordinates and isinstance(zone.polygon_coordinates, list):
            if is_point_in_polygon(lat, lng, zone.polygon_coordinates):
                return True, zone
    return False, None

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    latitude = request.data.get('latitude')
    longitude = request.data.get('longitude')
    device_id = request.data.get('device_id')
    
    user = authenticate(username=username, password=password)
    
    # Fallback to allow Roll Number mapping
    if not user:
        try:
            student = User.objects.get(roll_number=username)
            user = authenticate(username=student.username, password=password)
        except User.DoesNotExist:
            pass
            
    if not user:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        
    if user.role == 'student':
        if not device_id:
            return Response({'error': 'Device ID is required to secure your account.'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Enforce: One device can only have one login (prevent other users on this device)
        if User.objects.filter(device_id=device_id).exclude(roll_number=user.roll_number).exists():
            return Response({'error': 'Security blocked: This device is already registered to another user.'}, status=status.HTTP_403_FORBIDDEN)
            
        # Enforce: One user can only log in from their globally registered device
        if user.device_id and user.device_id != device_id:
            return Response({'error': 'Security blocked: Your account is securely locked to a different hardware device.'}, status=status.HTTP_403_FORBIDDEN)
            
        # Register the device on first login
        if not user.device_id:
            user.device_id = device_id
            user.save()
    
    inside_campus = None
    current_zone = None
    
    if user.role == 'student':
        if latitude is None or longitude is None:
            return Response({'error': 'Location required for student login'}, status=status.HTTP_400_BAD_REQUEST)
        
        lat, lng = float(latitude), float(longitude)
        print(f"DEBUG: Login attempt from Lat: {lat}, Lng: {lng}")
        inside_campus, current_zone = check_campus_zones(lat, lng)
        
        if not inside_campus:
            print(f"DEBUG: Point {lat}, {lng} is OUTSIDE all marked zones.")
            # For debugging, we will allow login even if outside, but we flag it
            pass
            
        LocationRecord.objects.create(student=user, latitude=lat, longitude=lng, in_campus=inside_campus, current_zone=current_zone)

    return Response({
        'message': 'Login successful', 
        'user': UserSerializer(user).data,
        'in_campus': inside_campus if user.role == 'student' else None,
        'zone_name': current_zone.name if current_zone else None,
        'debug_coords': {'lat': float(latitude), 'lng': float(longitude)} if user.role == 'student' else None
    })

@api_view(['POST'])
def update_location(request):
    student_id = request.data.get('student_id')
    latitude = request.data.get('latitude')
    longitude = request.data.get('longitude')
    
    try:
        student = User.objects.get(roll_number=student_id, role='student')
        lat, lng = float(latitude), float(longitude)
        
        inside_campus, current_zone = check_campus_zones(lat, lng)
        
        LocationRecord.objects.create(
            student=student, latitude=lat, longitude=lng, in_campus=inside_campus, current_zone=current_zone
        )
        return Response({'message': 'Location updated', 'in_campus': inside_campus})
    except User.DoesNotExist:
        return Response({'error': 'Student not found'}, status=status.HTTP_404_NOT_FOUND)

class CampusZoneViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CampusZone.objects.all()
    serializer_class = CampusZoneSerializer

class LocationRecordViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LocationRecord.objects.all().order_by('-timestamp')
    serializer_class = LocationRecordSerializer
    
class AttendanceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    
    def get_queryset(self):
        student_id = self.request.query_params.get('student_id')
        if student_id:
            return Attendance.objects.filter(student_id=student_id)
        return Attendance.objects.all()

class NoteViewSet(viewsets.ModelViewSet):
    queryset = Note.objects.all()
    serializer_class = NoteSerializer

@api_view(['GET'])
@permission_classes([AllowAny])
def admin_stats(request):
    total_students = User.objects.filter(role='student').count()
    
    # Students who pinged in the last 15 minutes and were in campus
    fifteen_mins_ago = timezone.now() - timedelta(minutes=15)
    active_students = LocationRecord.objects.filter(
        timestamp__gte=fifteen_mins_ago, 
        in_campus=True
    ).values('student').distinct().count()
    
    # Attendance rate today
    today = timezone.now().date()
    total_att = Attendance.objects.filter(date=today).count()
    present_att = Attendance.objects.filter(date=today, status='Present').count()
    rate = round((present_att / total_att * 100) if total_att > 0 else 0)
    
    total_notes = Note.objects.count()
    
    return Response({
        'total_students': total_students,
        'active_students': active_students,
        'attendance_rate': rate,
        'total_notes': total_notes
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def engine_create_user(request):
    roll_number = request.data.get('roll_number')
    name = request.data.get('name')
    department = request.data.get('department')
    year = request.data.get('year')
    image_path = request.data.get('image_path')
    
    if not roll_number or not name:
        return Response({'success': False, 'message': 'Missing data'}, status=status.HTTP_400_BAD_REQUEST)
        
    if User.objects.filter(roll_number=roll_number).exists():
        return Response({'success': True, 'message': 'User already exists.'})
        
    try:
        user = User.objects.create_user(
            username=roll_number,
            password=f"studentpass_{roll_number}",
            role='student',
            roll_number=roll_number,
            first_name=name,
            department=department,
            year_of_joining=int(year) if year and str(year).isdigit() else 2024,
            image_path=image_path
        )
        return Response({'success': True, 'message': 'User created natively in DB'})
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def enroll_face(request):
    identifier = request.data.get('roll_number')
    try:
        user = User.objects.filter(roll_number=identifier).first()
        if not user:
            user = User.objects.get(username=identifier)
        user.image_path = 'enrolled'
        user.save()
        return Response({'success': True, 'message': 'User formally enrolled with face biometrics.'})
    except User.DoesNotExist:
        return Response({'success': False, 'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([AllowAny])
def engine_log_attendance(request):
    roll_number = request.data.get('roll_number')
    subject_code = request.data.get('subject_code')
    
    if not roll_number or not subject_code:
        return Response({'success': False, 'message': 'Missing roll or subject'})
        
    try:
        student = User.objects.get(roll_number=roll_number)
        today = timezone.now().date()
        
        # Prevent double logging
        if Attendance.objects.filter(student=student, subject=subject_code, date=today).exists():
            return Response({'success': False, 'message': 'Attendance already marked for today.'})
            
        Attendance.objects.create(
            student=student, 
            subject=subject_code, 
            date=today, 
            status='Present'
        )
        
        # Fetch this session's recent attendance to return
        session_logs = list(Attendance.objects.filter(subject=subject_code, date=today).order_by('-id')[:10].values(
            'student__roll_number', 'student__first_name', 'subject', 'status'
        ))
        
        # Format for compatibility with frontend expectations
        records = []
        for log in session_logs:
            records.append({
                'roll_number': log['student__roll_number'],
                'name': log['student__first_name'],
                'subject_code': log['subject'],
                'status': log['status'],
                'time': timezone.now().strftime("%H:%M:%S")
            })
            
        return Response({'success': True, 'records': records})
    except User.DoesNotExist:
        return Response({'success': False, 'message': 'Unknown Roll Number'})
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
