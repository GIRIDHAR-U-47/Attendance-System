from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from django import forms
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.core.validators import RegexValidator
from django.utils import timezone
from .models import (
    User, CampusZone, LocationRecord, Attendance, Note, Student, Faculty,
    Canteen, CanteenOwnerProfile, FoodCategory, FoodItem, FoodReview, FoodOrder, FoodOrderItem
)

# ─────────────────────────────────────────
# Constants
# ─────────────────────────────────────────
CURRENT_YEAR = timezone.now().year

DEPARTMENT_CHOICES = [
    ('', '— Select Department —'),
    ('CSE',   'CSE  – Computer Science & Engineering'),
    ('IT',    'IT   – Information Technology'),
    ('ECE',   'ECE  – Electronics & Communication'),
    ('EEE',   'EEE  – Electrical & Electronics'),
    ('MECH',  'MECH – Mechanical Engineering'),
    ('CIVIL', 'CIVIL – Civil Engineering'),
    ('AI&DS', 'AI&DS – AI & Data Science'),
    ('AIML',  'AIML – AI & Machine Learning'),
]

ACADEMIC_YEAR_CHOICES = [
    ('', '— Select Current Year —'),
    (1, '1st Year'),
    (2, '2nd Year'),
    (3, '3rd Year'),
    (4, '4th Year'),
]

# Note: We now store year_of_joining as the calendar year (e.g., 2023)
# but for selective UI, we'll keep the logic simple or use direct choices.
# The user wants "selective form not manual typing" for both dept and year.

custom_username_validator = RegexValidator(
    r'^[\w.@+\- ]+$',
    'Enter a valid username. Letters, digits, and spaces are allowed.'
)

# ─────────────────────────────────────────
# Student Forms
# ─────────────────────────────────────────
class CustomStudentCreationForm(UserCreationForm):
    username = forms.CharField(
        max_length=50,
        label='Username *',
        help_text='Required. Full name or short ID.',
        validators=[custom_username_validator]
    )
    first_name = forms.CharField(max_length=50, label='First Name *', required=True)
    last_name  = forms.CharField(max_length=50, label='Last Name *',  required=True)
    roll_number = forms.CharField(
        max_length=50, label='Roll Number *', required=True,
        help_text='Unique roll number (e.g. 240801001)'
    )
    department = forms.ChoiceField(
        choices=DEPARTMENT_CHOICES, label='Department *', required=True
    )
    year_of_joining = forms.IntegerField(
        label='Year of Joining (YYYY) *',
        required=True,
        min_value=2000,
        max_value=2100,
        initial=timezone.now().year,
        help_text='Enter the calendar year the student joined (e.g. 2023).'
    )

    class Meta(UserCreationForm.Meta):
        model = Student
        fields = (
            'username', 'first_name', 'last_name',
            'roll_number', 'department', 'year_of_joining'
        )


class CustomStudentChangeForm(UserChangeForm):
    department = forms.ChoiceField(choices=DEPARTMENT_CHOICES, required=False)
    year_of_joining = forms.ChoiceField(choices=ACADEMIC_YEAR_CHOICES, required=False)

    class Meta(UserChangeForm.Meta):
        model = Student


# ─────────────────────────────────────────
# Faculty Forms
# ─────────────────────────────────────────
class CustomFacultyCreationForm(UserCreationForm):
    username = forms.CharField(
        max_length=50, label='Username *',
        help_text='Required. Letters, numbers, and spaces are allowed.',
        validators=[custom_username_validator]
    )
    first_name = forms.CharField(max_length=50, label='First Name *', required=True)
    last_name  = forms.CharField(max_length=50, label='Last Name *',  required=True)
    roll_number = forms.CharField(
        max_length=50, label='Faculty ID *', required=True,
        help_text='Unique Faculty ID (e.g. FAC001, EC001).'
    )
    department = forms.ChoiceField(
        choices=DEPARTMENT_CHOICES, label='Department *', required=True
    )

    class Meta(UserCreationForm.Meta):
        model = Faculty
        fields = ('username', 'first_name', 'last_name', 'roll_number', 'department')


class CustomFacultyChangeForm(UserChangeForm):
    department = forms.ChoiceField(choices=DEPARTMENT_CHOICES, required=False)

    class Meta(UserChangeForm.Meta):
        model = Faculty


# ─────────────────────────────────────────
# Student Admin
# ─────────────────────────────────────────
class StudentAdmin(BaseUserAdmin):
    add_form    = CustomStudentCreationForm
    form        = CustomStudentChangeForm

    add_fieldsets = (
        ('Account Credentials', {
            'classes': ('wide',),
            'fields': ('username', 'first_name', 'last_name', 'password1', 'password2'),
        }),
        ('Student Information', {
            'classes': ('wide',),
            'fields': ('roll_number', 'department', 'year_of_joining'),
        }),
    )

    fieldsets = (
        ('Account', {'fields': ('username', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'email')}),
        ('Student Data', {
            'fields': ('roll_number', 'department', 'year_of_joining', 'image_path', 'device_id', 'rfid_tag')
        }),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'groups', 'user_permissions'),
            'classes': ('collapse',),
        }),
        ('Important Dates', {'fields': ('last_login', 'date_joined')}),
    )

    # ── Calculated "current year" display
    def academic_year(self, obj):
        if obj.year_of_joining:
            current_calendar_year = timezone.now().year
            # Basic math: (Current - Joined) + 1
            # E.g. joined 2026 in 2026 -> 1st Year
            # E.g. joined 2023 in 2026 -> 4th Year
            calc_year = (current_calendar_year - obj.year_of_joining) + 1
            
            if calc_year <= 0: return 'Upcoming'
            if calc_year > 4:  return 'Alumni'
            
            labels = {1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year'}
            label  = labels.get(calc_year, f'Year {calc_year}')
            
            return format_html(
                '<span style="background:#EDE7F6;color:#6A1B9A;padding:3px 10px;'
                'border-radius:12px;font-weight:700;font-size:12px;">{}</span>', label
            )
        return '—'
    academic_year.short_description = 'Current Year'
    academic_year.admin_order_field = 'year_of_joining'

    def password_status(self, obj):
        return mark_safe('<span style="color:#2E7D32;font-weight:600;">[Hashed &amp; Secured]</span>')
    password_status.short_description = 'Password'

    def locate_student(self, obj):
        latest = LocationRecord.objects.filter(student=obj).order_by('-timestamp').first()
        if latest:
            url = f"https://www.google.com/maps?q={latest.latitude},{latest.longitude}"
            return format_html(
                '<a class="button" href="{}" target="_blank" '
                'style="background-color:#6A1B9A;padding:5px 10px;border-radius:5px;'
                'color:white;text-decoration:none;">📍 Locate Now</a>', url
            )
        return mark_safe('<span style="color:#BDBDBD;">No Data</span>')
    locate_student.short_description = 'Live Location'

    def face_enrolled(self, obj):
        if obj.image_path:
            return format_html(
                '<span style="color:#2E7D32;font-weight:700;">✅ Enrolled</span>'
            )
        return format_html('<span style="color:#C62828;font-weight:700;">❌ Not Enrolled</span>')
    face_enrolled.short_description = 'Face Status'

    def last_seen(self, obj):
        if obj.last_login:
            return obj.last_login.strftime('%d %b %Y, %I:%M %p')
        return '—'
    last_seen.short_description = 'Last Login'
    last_seen.admin_order_field = 'last_login'

    list_display  = (
        'roll_number', 'username', 'first_name', 'department',
        'academic_year', 'locate_student', 'face_enrolled',
        'last_seen', 'password_status'
    )
    list_filter   = ('department', 'year_of_joining', 'is_active')
    search_fields = ('username', 'roll_number', 'first_name', 'last_name', 'department')

    # ── Allow delete from list view
    actions = ['reset_device_id', 'delete_selected']

    @admin.action(description='🔄 Reset Device ID (allow new phone login)')
    def reset_device_id(self, request, queryset):
        updated = queryset.update(device_id=None)
        self.message_user(request, f'Successfully reset Device ID for {updated} student(s).')

    def get_queryset(self, request):
        return super().get_queryset(request).filter(role='student')

    def save_model(self, request, obj, form, change):
        obj.role = 'student'
        super().save_model(request, obj, form, change)


# ─────────────────────────────────────────
# Faculty Admin
# ─────────────────────────────────────────
class FacultyAdmin(BaseUserAdmin):
    add_form = CustomFacultyCreationForm
    form     = CustomFacultyChangeForm

    add_fieldsets = (
        ('Account Credentials', {
            'classes': ('wide',),
            'fields': ('username', 'first_name', 'last_name', 'password1', 'password2'),
        }),
        ('Faculty Information', {
            'classes': ('wide',),
            'fields': ('roll_number', 'department'),
        }),
    )

    fieldsets = (
        ('Account', {'fields': ('username', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'email')}),
        ('Faculty Data', {
            'fields': ('role', 'roll_number', 'department', 'image_path')
        }),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
            'classes': ('collapse',),
        }),
        ('Important Dates', {'fields': ('last_login', 'date_joined')}),
    )

    def faculty_id_display(self, obj):
        return obj.roll_number
    faculty_id_display.short_description = 'Faculty ID'
    faculty_id_display.admin_order_field = 'roll_number'

    def password_status(self, obj):
        return mark_safe('<span style="color:#2E7D32;font-weight:600;">[Hashed &amp; Secured]</span>')
    password_status.short_description = 'Password'

    def face_status(self, obj):
        if obj.image_path:
            return format_html(
                '<span style="color:#2E7D32;font-weight:700;">✅ Face Enrolled</span>'
            )
        return format_html('<span style="color:#C62828;font-weight:700;">❌ Not Enrolled</span>')
    face_status.short_description = 'Face Status'

    def last_seen(self, obj):
        if obj.last_login:
            return obj.last_login.strftime('%d %b %Y, %I:%M %p')
        return '—'
    last_seen.short_description = 'Last Login'
    last_seen.admin_order_field = 'last_login'

    list_display  = (
        'faculty_id_display', 'username', 'first_name',
        'department', 'face_status', 'last_seen', 'password_status'
    )
    search_fields = ('roll_number', 'first_name', 'last_name', 'department')
    list_filter   = ('department', 'is_active')

    # ── Allow delete from list
    actions = ['delete_selected']

    def get_queryset(self, request):
        return super().get_queryset(request).filter(role='faculty')

    def save_model(self, request, obj, form, change):
        obj.role = 'faculty'
        super().save_model(request, obj, form, change)


# ─────────────────────────────────────────
# Other Admin classes
# ─────────────────────────────────────────
class CoreAdminUser(BaseUserAdmin):
    def get_queryset(self, request):
        return super().get_queryset(request).filter(role='admin')

class AttendanceAdmin(admin.ModelAdmin):
    list_display  = ('student', 'subject', 'date', 'status')
    list_filter   = ('date', 'status', 'subject')
    search_fields = ('student__username', 'subject')
    date_hierarchy = 'date'

class LocationRecordAdmin(admin.ModelAdmin):
    def google_maps_link(self, obj):
        url = f"https://www.google.com/maps?q={obj.latitude},{obj.longitude}"
        return format_html(
            '<a href="{}" target="_blank" '
            'style="background:#616161;padding:4px 8px;border-radius:4px;'
            'color:white;text-decoration:none;font-size:11px;">📍 View Map</a>', url
        )
    google_maps_link.short_description = 'Map'

    list_display  = ('student', 'timestamp', 'google_maps_link', 'in_campus', 'current_zone')
    list_filter   = ('in_campus', 'current_zone', 'timestamp')
    search_fields = ('student__username',)

class CampusZoneAdmin(admin.ModelAdmin):
    list_display  = ('name',)
    search_fields = ('name',)


# ─────────────────────────────────────────
# Canteen Admin (Single Step Onboarding)
# ─────────────────────────────────────────
class CanteenAdminForm(forms.ModelForm):
    # Credentials fields only needed for creation
    username = forms.CharField(max_length=150, required=False, help_text="Required when creating a new canteen.")
    password = forms.CharField(widget=forms.PasswordInput, required=False)
    confirm_password = forms.CharField(widget=forms.PasswordInput, required=False)

    class Meta:
        model = Canteen
        fields = ['canteen_name', 'location_inside_campus', 'owner_name', 'owner_phone', 'description', 'logo_image', 'is_active']
        labels = {
            'owner_name': 'Owner Full Name'
        }

    def clean(self):
        cleaned_data = super().clean()
        
        # Because canteen_id has default=uuid.uuid4, self.instance.pk is never None!
        # We must use self.instance._state.adding to check if this is a new creation
        if self.instance._state.adding:
            # We are creating a new canteen, credentials are required
            username = cleaned_data.get("username")
            password = cleaned_data.get("password")
            confirm_password = cleaned_data.get("confirm_password")
            
            if not username or not password:
                raise forms.ValidationError("Username and password are required for new canteens.")
            if password != confirm_password:
                raise forms.ValidationError("Passwords do not match.")
            if User.objects.filter(username=username).exists():
                raise forms.ValidationError("This username is already taken.")
        return cleaned_data

class CanteenAdmin(admin.ModelAdmin):
    form = CanteenAdminForm
    
    fieldsets = (
        ('SECTION 1: Canteen Details', {
            'fields': ('canteen_name', 'location_inside_campus', 'owner_name', 'owner_phone', 'description', 'logo_image', 'is_active'),
        }),
    )

    def get_fieldsets(self, request, obj=None):
        if not obj:
            # Adding a new canteen, include credentials
            return self.fieldsets + (
                ('SECTION 2: Portal Credentials', {
                    'fields': ('username', 'password', 'confirm_password'),
                }),
            )
        # Editing an existing canteen, hide credentials config
        return self.fieldsets

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change) # Save the Canteen first
        
        if not change:
            # Creation process
            username = form.cleaned_data.get('username')
            password = form.cleaned_data.get('password')
            owner_name = form.cleaned_data.get('owner_name')
            
            # 1. Create Django User
            user = User.objects.create_user(
                username=username,
                password=password,
                first_name=owner_name,
                role='canteen',
                roll_number=f"CANT_{username}" # Required PK mapping
            )
            
            # 2. Create and Link CanteenOwnerProfile
            CanteenOwnerProfile.objects.create(
                user=user,
                canteen=obj
            )

    list_display = ('canteen_name', 'owner_name', 'location_inside_campus', 'is_active')
    search_fields = ('canteen_name', 'owner_name', 'owner_phone')
    list_filter = ('is_active',)

# ─────────────────────────────────────────
# Registration
# ─────────────────────────────────────────
try:
    admin.site.unregister(User)
except admin.sites.NotRegistered:
    pass

admin.site.register(User,           CoreAdminUser)
admin.site.register(Student,        StudentAdmin)
admin.site.register(Faculty,        FacultyAdmin)
admin.site.register(CampusZone,     CampusZoneAdmin)
admin.site.register(LocationRecord, LocationRecordAdmin)
admin.site.register(Attendance,     AttendanceAdmin)
admin.site.register(Note)

# --- Canteen Onboarding Only ---
admin.site.register(Canteen, CanteenAdmin)
