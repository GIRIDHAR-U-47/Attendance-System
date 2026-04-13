from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    login_view, update_location, admin_stats, CampusZoneViewSet, 
    LocationRecordViewSet, AttendanceViewSet, NoteViewSet,
    engine_create_user, engine_log_attendance, enroll_face
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
    path('', include(router.urls)),
]
