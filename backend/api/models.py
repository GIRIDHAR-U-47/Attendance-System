from django.db import models
from django.contrib.auth.models import AbstractUser
import uuid

class User(AbstractUser):
    ROLE_CHOICES = (
        ('student', 'Student'),
        ('faculty', 'Faculty'),
        ('admin', 'Admin'),
        ('canteen', 'Canteen Owner'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    rfid_tag = models.CharField(max_length=100, blank=True, null=True)
    device_id = models.CharField(max_length=255, blank=True, null=True)
    
    # Newly added fields merged from face recognition database
    roll_number = models.CharField(max_length=50, primary_key=True)
    department = models.CharField(max_length=100, blank=True, null=True)
    year_of_joining = models.IntegerField(blank=True, null=True)
    image_path = models.CharField(max_length=500, blank=True, null=True)

class Student(User):
    class Meta:
        proxy = True
        verbose_name = 'Student'
        verbose_name_plural = 'Students'

class Faculty(User):
    class Meta:
        proxy = True
        verbose_name = 'Faculty'
        verbose_name_plural = 'Faculties'

class CampusZone(models.Model):
    name = models.CharField(max_length=100)
    polygon_coordinates = models.JSONField(default=list)

    def __str__(self):
        return self.name

class LocationRecord(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role': 'student'})
    latitude = models.FloatField()
    longitude = models.FloatField()
    timestamp = models.DateTimeField(auto_now_add=True)
    in_campus = models.BooleanField(default=False)
    current_zone = models.ForeignKey(CampusZone, on_delete=models.SET_NULL, null=True, blank=True)

class Attendance(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role': 'student'})
    subject = models.CharField(max_length=100)
    date = models.DateField()
    status = models.CharField(max_length=20, choices=(('Present', 'Present'), ('Absent', 'Absent')))

class Note(models.Model):
    title = models.CharField(max_length=200)
    subject = models.CharField(max_length=100)
    file_url = models.URLField(max_length=300)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, limit_choices_to={'role': 'faculty'})
    uploaded_at = models.DateTimeField(auto_now_add=True)

class Subject(models.Model):
    subject_code = models.CharField(max_length=50, primary_key=True)
    subject_name = models.CharField(max_length=200)
    department = models.CharField(max_length=100)
    year = models.IntegerField()
    faculty = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role': 'faculty'})

    def __str__(self):
        return f"{self.subject_name} ({self.subject_code})"

class StudentSubjectEnrollment(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role': 'student'})
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    semester = models.CharField(max_length=50, null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('student', 'subject')

class AttendanceSession(models.Model):
    session_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    faculty = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role': 'faculty'})
    department = models.CharField(max_length=100)
    year = models.IntegerField()
    session_date = models.DateField(auto_now_add=True)
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, default='Active') # Active, Finalized
    
    # Pre-calculated aggregates for speed
    expected_count = models.IntegerField(default=0)
    present_count = models.IntegerField(default=0)
    absent_count = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.subject.subject_code} - {self.session_date}"

class AttendanceRecord(models.Model):
    session = models.ForeignKey(AttendanceSession, on_delete=models.CASCADE, related_name='records')
    student = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role': 'student'})
    status = models.CharField(max_length=20, choices=[('Present', 'Present'), ('Absent', 'Absent'), ('Excused', 'Excused')])
    marked_at = models.DateTimeField(auto_now_add=True)
    confidence = models.FloatField(null=True, blank=True)
    spoof_status = models.CharField(max_length=50, null=True, blank=True)

    class Meta:
        unique_together = ('session', 'student')

class SubjectCatalog(models.Model):
    """Master syllabus table – one row per regulated subject in the curriculum."""
    SEMESTER_CHOICES = [('Odd', 'Odd'), ('Even', 'Even')]

    subject_code = models.CharField(max_length=50, primary_key=True)
    subject_name = models.CharField(max_length=200)
    department   = models.CharField(max_length=100)
    year         = models.IntegerField()   # 1 / 2 / 3 / 4
    semester     = models.CharField(max_length=10, choices=SEMESTER_CHOICES)

    def __str__(self):
        return f"[{self.subject_code}] {self.subject_name} ({self.department} Yr{self.year} {self.semester})"

# ----------------- CANTEEN MODULE MODELS -----------------

class Canteen(models.Model):
    canteen_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    canteen_name = models.CharField(max_length=200)
    owner_name = models.CharField(max_length=150)
    owner_phone = models.CharField(max_length=20)
    location_inside_campus = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    logo_image = models.CharField(max_length=500, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.canteen_name

class CanteenOwnerProfile(models.Model):
    owner_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='canteen_profile')
    canteen = models.OneToOneField(Canteen, on_delete=models.CASCADE, related_name='owner_profile')

    def __str__(self):
        return f"{self.user.username} - {self.canteen.canteen_name}"

class FoodCategory(models.Model):
    category_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    canteen = models.ForeignKey(Canteen, on_delete=models.CASCADE, related_name='categories')
    category_name = models.CharField(max_length=100)

    class Meta:
        verbose_name_plural = 'Food Categories'
        unique_together = ('canteen', 'category_name')

    def __str__(self):
        return f"{self.category_name} ({self.canteen.canteen_name})"

class FoodItem(models.Model):
    item_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    canteen = models.ForeignKey(Canteen, on_delete=models.CASCADE, related_name='food_items')
    category = models.ForeignKey(FoodCategory, on_delete=models.CASCADE, related_name='items')
    item_name = models.CharField(max_length=150)
    description = models.TextField(blank=True, null=True)
    image_url = models.CharField(max_length=500, blank=True, null=True)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    stock_quantity = models.IntegerField(default=100)
    is_available = models.BooleanField(default=True)
    average_rating = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.item_name} - ₹{self.price}"

class FoodReview(models.Model):
    review_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    item = models.ForeignKey(FoodItem, on_delete=models.CASCADE, related_name='reviews')
    student = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role': 'student'})
    rating = models.IntegerField() # 1 to 5
    review_text = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('item', 'student')

    def __str__(self):
        return f"{self.rating} stars by {self.student.username}"

class FoodOrder(models.Model):
    TOKEN_STATUS_CHOICES = (
        ('ACTIVE', 'Active'),
        ('REDEEMED', 'Redeemed'),
        ('EXPIRED', 'Expired'),
        ('CANCELLED', 'Cancelled'),
    )
    ORDER_STATUS_CHOICES = (
        ('PENDING', 'Pending Payment'),
        ('PAID', 'Paid'),
    )

    order_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    canteen = models.ForeignKey(Canteen, on_delete=models.CASCADE, related_name='orders')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='food_orders')
    
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    order_status = models.CharField(max_length=20, choices=ORDER_STATUS_CHOICES, default='PENDING')
    token_status = models.CharField(max_length=20, choices=TOKEN_STATUS_CHOICES, default='ACTIVE')
    qr_token = models.TextField(blank=True, null=True) # Will store signed JWT string
    
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    redeemed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Order {self.order_id} - {self.token_status}"

class FoodOrderItem(models.Model):
    order_item_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(FoodOrder, on_delete=models.CASCADE, related_name='items')
    item = models.ForeignKey(FoodItem, on_delete=models.SET_NULL, null=True)
    quantity = models.IntegerField(default=1)
    price_at_purchase = models.DecimalField(max_digits=8, decimal_places=2)

    def __str__(self):
        return f"{self.quantity} x {self.item.item_name if self.item else 'Deleted Item'}"
