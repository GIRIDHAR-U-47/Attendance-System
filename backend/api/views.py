from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.contrib.auth import authenticate
from django.utils import timezone
from datetime import timedelta
from .models import (
    User, CampusZone, LocationRecord, Attendance, Note,
    Subject, StudentSubjectEnrollment, AttendanceSession, AttendanceRecord,
    SubjectCatalog
)
from .serializers import (
    UserSerializer, CampusZoneSerializer, LocationRecordSerializer,
    AttendanceSerializer, NoteSerializer, SubjectSerializer,
    AttendanceSessionSerializer, AttendanceRecordSerializer,
    SubjectCatalogSerializer
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

# ============================================================
# NEW NORMALIZED FACULTY & STUDENT ENDPOINTS
# ============================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def filter_students(request):
    """GET /api/students/filter/?department=<dept>&year=<year>"""
    department = request.query_params.get('department')
    year = request.query_params.get('year')
    qs = User.objects.filter(role='student')
    if department:
        qs = qs.filter(department__iexact=department)
    if year:
        qs = qs.filter(year_of_joining=year)
    return Response(UserSerializer(qs, many=True).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def subject_catalog(request):
    """GET /api/subjects/catalog/?department=<dept>&year=<year>&semester=<sem>"""
    department = request.query_params.get('department')
    year       = request.query_params.get('year')
    semester   = request.query_params.get('semester')
    qs = SubjectCatalog.objects.all()
    if department:
        qs = qs.filter(department__iexact=department)
    if year:
        qs = qs.filter(year=year)
    if semester:
        qs = qs.filter(semester__iexact=semester)
    return Response(SubjectCatalogSerializer(qs, many=True).data)


@api_view(['POST'])
@permission_classes([AllowAny])
def faculty_create_subject(request):
    """POST /api/faculty/create-subject/"""
    subject_code = request.data.get('subject_code')
    subject_name = request.data.get('subject_name')
    department   = request.data.get('department')
    year         = request.data.get('year')
    faculty_id   = request.data.get('faculty_id')   # roll_number / username
    student_ids  = request.data.get('student_ids', [])  # list of roll_numbers
    semester     = request.data.get('semester', '')

    try:
        faculty = User.objects.get(roll_number=faculty_id, role='faculty')
    except User.DoesNotExist:
        try:
            faculty = User.objects.get(username=faculty_id, role='faculty')
        except User.DoesNotExist:
            return Response({'success': False, 'message': 'Faculty not found'}, status=404)

    if Subject.objects.filter(subject_code=subject_code).exists():
        return Response({'success': False, 'message': 'Subject code already exists'}, status=400)

    subject = Subject.objects.create(
        subject_code=subject_code,
        subject_name=subject_name,
        department=department,
        year=year,
        faculty=faculty
    )

    # Bulk enroll students
    enrollments = []
    for sid in student_ids:
        try:
            student = User.objects.get(roll_number=sid, role='student')
            if not StudentSubjectEnrollment.objects.filter(student=student, subject=subject).exists():
                enrollments.append(StudentSubjectEnrollment(
                    student=student, subject=subject, semester=semester, is_active=True
                ))
        except User.DoesNotExist:
            pass
    StudentSubjectEnrollment.objects.bulk_create(enrollments)

    return Response({
        'success': True,
        'message': f'Subject {subject_code} created with {len(enrollments)} students enrolled.',
        'subject': SubjectSerializer(subject).data
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def faculty_subjects(request):
    """GET /api/faculty/subjects/?faculty_id=<id>"""
    faculty_id = request.query_params.get('faculty_id')
    try:
        faculty = User.objects.get(roll_number=faculty_id, role='faculty')
    except User.DoesNotExist:
        try:
            faculty = User.objects.get(username=faculty_id, role='faculty')
        except User.DoesNotExist:
            return Response([], status=200)
    subjects = Subject.objects.filter(faculty=faculty)
    return Response(SubjectSerializer(subjects, many=True).data)


@api_view(['POST'])
@permission_classes([AllowAny])
def faculty_start_session(request):
    """POST /api/faculty/start-session/"""
    subject_code = request.data.get('subject_code')
    faculty_id   = request.data.get('faculty_id')

    try:
        subject = Subject.objects.get(subject_code=subject_code)
    except Subject.DoesNotExist:
        return Response({'success': False, 'message': 'Subject not found'}, status=404)

    try:
        faculty = User.objects.get(roll_number=faculty_id, role='faculty')
    except User.DoesNotExist:
        try:
            faculty = User.objects.get(username=faculty_id, role='faculty')
        except User.DoesNotExist:
            return Response({'success': False, 'message': 'Faculty not found'}, status=404)

    session = AttendanceSession.objects.create(
        subject=subject,
        faculty=faculty,
        department=subject.department,
        year=subject.year,
        expected_count=StudentSubjectEnrollment.objects.filter(subject=subject, is_active=True).count()
    )
    return Response({
        'success': True,
        'session_id': str(session.session_id),
        'message': f'Session started for {subject_code}'
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def faculty_stop_session(request):
    """POST /api/faculty/stop-session/"""
    session_id     = request.data.get('session_id')
    present_ids    = request.data.get('present_student_ids', [])     # roll_numbers detected
    confidences    = request.data.get('confidences', {})             # {roll_number: float}
    spoof_statuses = request.data.get('spoof_statuses', {})          # {roll_number: str}

    try:
        session = AttendanceSession.objects.get(session_id=session_id)
    except AttendanceSession.DoesNotExist:
        return Response({'success': False, 'message': 'Session not found'}, status=404)

    if session.status == 'Finalized':
        return Response({'success': False, 'message': 'Session already finalized'}, status=400)

    # All enrolled students for this subject
    enrolled_qs = StudentSubjectEnrollment.objects.filter(
        subject=session.subject, is_active=True
    ).select_related('student')

    present_set = set(present_ids)
    records_to_create = []
    present_count = 0
    absent_count = 0

    for enrollment in enrolled_qs:
        sid = enrollment.student.roll_number
        is_present = sid in present_set
        rec_status = 'Present' if is_present else 'Absent'
        # Guard against duplicates from previous partial calls
        if AttendanceRecord.objects.filter(session=session, student=enrollment.student).exists():
            continue
        records_to_create.append(AttendanceRecord(
            session=session,
            student=enrollment.student,
            status=rec_status,
            confidence=confidences.get(sid),
            spoof_status=spoof_statuses.get(sid, 'N/A')
        ))
        if is_present:
            present_count += 1
        else:
            absent_count += 1

    # Bulk insert all attendance records in one DB call
    AttendanceRecord.objects.bulk_create(records_to_create)

    # Finalize session with aggregates
    session.end_time = timezone.now()
    session.status = 'Finalized'
    session.present_count = present_count
    session.absent_count = absent_count
    session.save()

    return Response({
        'success': True,
        'session_id': str(session.session_id),
        'expected': session.expected_count,
        'present': present_count,
        'absent': absent_count
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def student_attendance_summary(request):
    """GET /api/student/attendance-summary/?student_id=<roll_number>"""
    student_id = request.query_params.get('student_id')
    try:
        student = User.objects.get(roll_number=student_id, role='student')
    except User.DoesNotExist:
        return Response([], status=200)

    enrollments = StudentSubjectEnrollment.objects.filter(
        student=student, is_active=True
    ).select_related('subject')

    result = []
    for e in enrollments:
        records = AttendanceRecord.objects.filter(session__subject=e.subject, student=student)
        total   = records.count()
        present = records.filter(status='Present').count()
        absent  = total - present
        latest  = records.order_by('-marked_at').first()
        result.append({
            'subject_code': e.subject.subject_code,
            'subject_name': e.subject.subject_name,
            'department':   e.subject.department,
            'year':         e.subject.year,
            'total_classes': total,
            'present':       present,
            'absent':        absent,
            'percentage':    round((present / total * 100) if total > 0 else 0, 1),
            'latest_date':   latest.marked_at.isoformat() if latest else None
        })
    return Response(result)


@api_view(['GET'])
@permission_classes([AllowAny])
def student_attendance_history(request):
    """GET /api/student/attendance-history/?student_id=<roll_number>&subject_code=<code>"""
    student_id   = request.query_params.get('student_id')
    subject_code = request.query_params.get('subject_code')
    try:
        student = User.objects.get(roll_number=student_id, role='student')
    except User.DoesNotExist:
        return Response([], status=200)

    records = AttendanceRecord.objects.filter(
        student=student
    ).select_related('session', 'session__subject')

    if subject_code:
        records = records.filter(session__subject__subject_code=subject_code)

    records = records.order_by('-marked_at')
    result = []
    for r in records:
        result.append({
            'session_id':   str(r.session.session_id),
            'subject_code': r.session.subject.subject_code,
            'subject_name': r.session.subject.subject_name,
            'session_date': r.session.session_date.isoformat(),
            'status':       r.status,
            'marked_at':    r.marked_at.isoformat(),
            'confidence':   r.confidence,
            'spoof_status': r.spoof_status
        })
    return Response(result)
