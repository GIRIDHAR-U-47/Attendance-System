from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    login_view, update_location, admin_stats, CampusZoneViewSet,
    LocationRecordViewSet, AttendanceViewSet, NoteViewSet,
    engine_create_user, engine_log_attendance, enroll_face,
    # New normalized endpoints
    filter_students, subject_catalog,
    faculty_create_subject, faculty_subjects,
    faculty_start_session, faculty_stop_session,
    student_attendance_summary, student_attendance_history,
)

router = DefaultRouter()
router.register(r'zones', CampusZoneViewSet)
router.register(r'locations', LocationRecordViewSet)
router.register(r'attendance', AttendanceViewSet)
router.register(r'notes', NoteViewSet)

urlpatterns = [
    path('auth/login/', login_view, name='api_login'),
    path('auth/enroll_face/', enroll_face, name='enroll_face'),
    path('location/update/', update_location, name='api_location_update'),
    path('admin-stats/', admin_stats, name='admin_stats'),
    path('engine/create_user/', engine_create_user, name='engine_create_user'),
    path('engine/log_attendance/', engine_log_attendance, name='engine_log_attendance'),
    # New normalized endpoints
    path('students/filter/', filter_students, name='filter_students'),
    path('subjects/catalog/', subject_catalog, name='subject_catalog'),
    path('faculty/create-subject/', faculty_create_subject, name='faculty_create_subject'),
    path('faculty/subjects/', faculty_subjects, name='faculty_subjects'),
    path('faculty/start-session/', faculty_start_session, name='faculty_start_session'),
    path('faculty/stop-session/', faculty_stop_session, name='faculty_stop_session'),
    path('student/attendance-summary/', student_attendance_summary, name='student_attendance_summary'),
    path('student/attendance-history/', student_attendance_history, name='student_attendance_history'),
    path('', include(router.urls)),
]
