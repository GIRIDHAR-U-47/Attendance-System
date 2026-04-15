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

from . import canteen_views

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
    
    # --- CANTEEN SYSTEM ---
    # Canteen Owner
    path('canteen/login/', canteen_views.canteen_login, name='canteen_login'),
    path('canteen/dashboard/', canteen_views.canteen_dashboard_data, name='canteen_dashboard_data'),
    path('canteen/scan-qr/', canteen_views.canteen_scan_qr, name='canteen_scan_qr'),
    path('canteen/sync-offline-orders/', canteen_views.canteen_sync_offline_orders, name='canteen_sync_offline_orders'),
    path('canteen/menu/', canteen_views.canteen_menu_list, name='canteen_menu_list'),
    path('canteen/add-item/', canteen_views.canteen_add_item, name='canteen_add_item'),
    path('canteen/toggle-item/', canteen_views.canteen_toggle_item, name='canteen_toggle_item'),
    path('canteen/delete-item/<uuid:item_id>/', canteen_views.canteen_delete_item, name='canteen_delete_item'),
    path('canteen/reviews/', canteen_views.canteen_reviews, name='canteen_reviews'),
    path('canteen/orders/', canteen_views.canteen_orders, name='canteen_orders'),
    
    # Admin Canteen Analytics (read-only)
    path('admin/canteen-analytics/', canteen_views.canteen_admin_analytics, name='canteen_admin_analytics'),
    
    # Student Canteen
    path('student/canteens/', canteen_views.list_canteens, name='list_canteens'),
    path('student/canteen/<uuid:canteen_id>/menu/', canteen_views.get_canteen_menu, name='get_canteen_menu'),
    path('student/place-food-order/', canteen_views.place_food_order, name='place_food_order'),
    path('student/order-history/', canteen_views.student_order_history, name='student_order_history'),

    path('', include(router.urls)),
]
