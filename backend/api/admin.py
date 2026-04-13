from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserCreationForm
from django import forms
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.core.validators import RegexValidator
from .models import User, CampusZone, LocationRecord, Attendance, Note, Student, Faculty

custom_username_validator = RegexValidator(
    r'^[\w.@+\- ]+$',
    'Enter a valid username. Letters, digits, and spaces are allowed.'
)

class CustomStudentCreationForm(UserCreationForm):
    username = forms.CharField(max_length=50, help_text='Required. Letters, numbers, and spaces are allowed.', validators=[custom_username_validator])
    class Meta(UserCreationForm.Meta):
        model = Student
        fields = ('username', 'first_name', 'last_name', 'roll_number', 'department', 'year_of_joining')

class CustomFacultyCreationForm(UserCreationForm):
    username = forms.CharField(max_length=50, help_text='Required. Letters, numbers, and spaces are allowed.', validators=[custom_username_validator])
    roll_number = forms.CharField(max_length=50, label='Faculty ID', help_text='Unique identifier for this faculty member (e.g. FAC001).')
    class Meta(UserCreationForm.Meta):
        model = Faculty
        fields = ('username', 'first_name', 'last_name', 'roll_number', 'department')

class CustomAdminCreationForm(UserCreationForm):
    username = forms.CharField(max_length=50, help_text='Required. Letters, numbers, and spaces are allowed.', validators=[custom_username_validator])
    class Meta(UserCreationForm.Meta):
        model = User
        fields = ('username', 'roll_number')

class StudentAdmin(BaseUserAdmin):
    add_form = CustomStudentCreationForm
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'first_name', 'last_name', 'password1', 'password2', 'roll_number', 'department', 'year_of_joining'),
        }),
    )
    def password_status(self, obj):
        return mark_safe('<span style="color: green;">[Hashed & Secured]</span>')
    password_status.short_description = 'Password'

    def locate_student(self, obj):
        latest = LocationRecord.objects.filter(student=obj).order_by('-timestamp').first()
        if latest:
            url = f"https://www.google.com/maps?q={latest.latitude},{latest.longitude}"
            return format_html('<a class="button" href="{}" target="_blank" style="background-color: #6A1B9A; padding: 5px 10px; border-radius: 5px; color: white; text-decoration: none;">📍 Locate Now</a>', url)
        return mark_safe('<span style="color: grey;">No Data</span>')
    locate_student.short_description = 'Live Location'

    @admin.action(description='Reset Device ID (Allow new phone login)')
    def reset_device_id(self, request, queryset):
        updated = queryset.update(device_id=None)
        self.message_user(request, f"Successfully reset device ID for {updated} student(s).")

    list_display = ('roll_number', 'username', 'department', 'year_of_joining', 'locate_student', 'password_status', 'role', 'device_id')
    list_filter = ('department', 'year_of_joining')
    search_fields = ('username', 'roll_number')
    actions = ['reset_device_id']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Smart Campus Data', {'fields': ('role', 'device_id', 'roll_number', 'department', 'year_of_joining', 'image_path')}),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).filter(role='student')

    def save_model(self, request, obj, form, change):
        obj.role = 'student'
        super().save_model(request, obj, form, change)

class FacultyAdmin(BaseUserAdmin):
    add_form = CustomFacultyCreationForm
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'first_name', 'last_name', 'password1', 'password2', 'roll_number', 'department'),
        }),
    )
    def password_status(self, obj):
        return mark_safe('<span style="color: green;">[Hashed & Secured]</span>')
    password_status.short_description = 'Password'

    def faculty_id(self, obj):
        return obj.roll_number
    faculty_id.short_description = 'Faculty ID'
    faculty_id.admin_order_field = 'roll_number'

    list_display = ('faculty_id', 'username', 'first_name', 'department', 'password_status', 'image_path')
    search_fields = ('roll_number', 'first_name', 'department')
    
    fieldsets = (
        (None, {'fields': ('username',)}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'email')}),
        ('Faculty Data', {'fields': ('role', 'roll_number', 'department', 'image_path')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).filter(role='faculty')

    def save_model(self, request, obj, form, change):
        obj.role = 'faculty'
        if not change:
            obj.username = obj.roll_number  # Sync username with Roll/User ID
        super().save_model(request, obj, form, change)

class CoreAdminUser(BaseUserAdmin):
    add_form = CustomAdminCreationForm
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'password1', 'password2', 'roll_number'),
        }),
    )
    def get_queryset(self, request):
        return super().get_queryset(request).filter(role='admin')

class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('student', 'subject', 'date', 'status')
    list_filter = ('date', 'status', 'subject')
    search_fields = ('student__username', 'subject')
    date_hierarchy = 'date'

class LocationRecordAdmin(admin.ModelAdmin):
    def google_maps_link(self, obj):
        url = f"https://www.google.com/maps?q={obj.latitude},{obj.longitude}"
        return format_html('<a class="button" href="{}" target="_blank" style="background-color: #616161; padding: 4px 8px; border-radius: 4px; color: white; text-decoration: none; font-size: 11px;">View on Map</a>', url)
    google_maps_link.short_description = 'Map Link'

    list_display = ('student', 'timestamp', 'google_maps_link', 'in_campus', 'current_zone')
    list_filter = ('in_campus', 'current_zone', 'timestamp')
    search_fields = ('student__username',)

class CampusZoneAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)

# Override Default Admin with Custom Sections
try:
    admin.site.unregister(User) # Unregister from generic apps view if it was registered automatically
except admin.sites.NotRegistered:
    pass
admin.site.register(User, CoreAdminUser)
admin.site.register(Student, StudentAdmin)
admin.site.register(Faculty, FacultyAdmin)
admin.site.register(CampusZone, CampusZoneAdmin)
admin.site.register(LocationRecord, LocationRecordAdmin)
admin.site.register(Attendance, AttendanceAdmin)
admin.site.register(Note)
