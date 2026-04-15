import jwt
import datetime
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.utils import timezone
from .models import (
    User, Canteen, CanteenOwnerProfile, FoodCategory, FoodItem, 
    FoodReview, FoodOrder, FoodOrderItem
)
from .serializers import (
    CanteenSerializer, FoodCategorySerializer, FoodItemSerializer, 
    FoodOrderSerializer, FoodReviewSerializer
)
import uuid

# ----------------- JWT HELPERS -----------------
def generate_order_qr_token(order_id, student_id, canteen_id, expiry_minutes=30):
    payload = {
        'order_id': str(order_id),
        'student_id': str(student_id),
        'canteen_id': str(canteen_id),
        'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=expiry_minutes),
        'iat': datetime.datetime.utcnow(),
    }
    encoded_jwt = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
    return encoded_jwt

def decode_order_qr_token(token):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return 'EXPIRED'
    except jwt.InvalidTokenError:
        return 'INVALID'

# ----------------- STUDENT APIS -----------------

@api_view(['GET'])
@permission_classes([AllowAny])
def list_canteens(request):
    """GET /api/student/canteens/"""
    canteens = Canteen.objects.filter(is_active=True)
    return Response(CanteenSerializer(canteens, many=True).data)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_canteen_menu(request, canteen_id):
    """GET /api/student/canteen/<id>/menu/"""
    try:
        canteen = Canteen.objects.get(pk=canteen_id)
    except Canteen.DoesNotExist:
        return Response({'error': 'Canteen not found'}, status=404)
        
    categories = FoodCategory.objects.filter(canteen=canteen)
    items = FoodItem.objects.filter(canteen=canteen, is_available=True)
    
    cat_data = FoodCategorySerializer(categories, many=True).data
    item_data = FoodItemSerializer(items, many=True).data
    
    # Optional: Group items by category in the frontend, sending flat lists here
    return Response({'canteen': CanteenSerializer(canteen).data, 'categories': cat_data, 'items': item_data})

@api_view(['POST'])
@permission_classes([AllowAny])
def place_food_order(request):
    """POST /api/student/place-food-order/"""
    student_id = request.data.get('student_id')
    canteen_id = request.data.get('canteen_id')
    items = request.data.get('items', []) # [{'item_id': str, 'quantity': int}]
    
    if not items:
        return Response({'error': 'Cart is empty'}, status=400)
        
    try:
        student = User.objects.get(roll_number=student_id, role='student')
        canteen = Canteen.objects.get(pk=canteen_id)
    except User.DoesNotExist:
        return Response({'error': 'Student not found'}, status=404)
    except Canteen.DoesNotExist:
        return Response({'error': 'Canteen not found'}, status=404)
        
    total_amount = 0
    order_items_to_create = []
    
    # Create the order first to get its ID
    # Expiry 30 mins
    expires_at = timezone.now() + timezone.timedelta(minutes=30)
    
    order = FoodOrder.objects.create(
        canteen=canteen,
        student=student,
        total_amount=0, # Computed below
        order_status='PENDING',
        token_status='ACTIVE',
        expires_at=expires_at
    )
    
    for item_data in items:
        try:
            food_item = FoodItem.objects.get(pk=item_data['item_id'], canteen=canteen)
            quantity = int(item_data['quantity'])
            
            # Reduce Stock (Very basic inline approach, suitable for 5 canteens)
            if food_item.stock_quantity >= quantity:
                food_item.stock_quantity -= quantity
                food_item.save()
            else:
                order.delete() # Rollback (basic)
                return Response({'error': f'Item {food_item.item_name} out of stock'}, status=400)
                
            price = food_item.price * quantity
            total_amount += price
            order_items_to_create.append(
                FoodOrderItem(order=order, item=food_item, quantity=quantity, price_at_purchase=food_item.price)
            )
        except FoodItem.DoesNotExist:
            order.delete()
            return Response({'error': 'Invalid food item in cart'}, status=400)
            
    FoodOrderItem.objects.bulk_create(order_items_to_create)
    
    # Update total and generate secure QR Token
    order.total_amount = total_amount
    order.qr_token = generate_order_qr_token(order.order_id, student.roll_number, canteen.canteen_id)
    order.save()
    
    return Response(FoodOrderSerializer(order).data, status=201)

@api_view(['GET'])
@permission_classes([AllowAny])
def student_order_history(request):
    """GET /api/student/order-history/?student_id="""
    student_id = request.query_params.get('student_id')
    orders = FoodOrder.objects.filter(student__roll_number=student_id).order_by('-created_at')
    return Response(FoodOrderSerializer(orders, many=True).data)

# ----------------- CANTEEN OWNER APIS -----------------

@api_view(['POST'])
@permission_classes([AllowAny])
def canteen_login(request):
    """POST /api/canteen/login/"""
    username = request.data.get('username')
    password = request.data.get('password')
    # Simplified login (use authenticate in production)
    from django.contrib.auth import authenticate
    user = authenticate(username=username, password=password)
    
    if user and user.role == 'canteen':
        try:
            profile = CanteenOwnerProfile.objects.get(user=user)
            user.last_login = timezone.now()
            user.save(update_fields=['last_login'])
            return Response({
                'user': {'username': user.username, 'role': user.role},
                'canteen': CanteenSerializer(profile.canteen).data
            })
        except CanteenOwnerProfile.DoesNotExist:
             return Response({'error': 'No canteen linked to this owner'}, status=403)
    return Response({'error': 'Invalid credentials'}, status=401)

@api_view(['GET'])
@permission_classes([AllowAny])
def canteen_dashboard_data(request):
    """GET /api/canteen/dashboard/?canteen_id="""
    canteen_id = request.query_params.get('canteen_id')
    # Today's stats
    today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    orders = FoodOrder.objects.filter(canteen_id=canteen_id, created_at__gte=today_start)
    
    total_sales = sum(o.total_amount for o in orders if o.token_status == 'REDEEMED')
    pending_redemptions = orders.filter(token_status='ACTIVE').count()
    
    # Low stock
    low_stock_items = FoodItem.objects.filter(canteen_id=canteen_id, stock_quantity__lt=10)
    
    return Response({
        'total_sales': total_sales,
        'pending_redemptions': pending_redemptions,
        'orders_count': orders.count(),
        'low_stock_count': low_stock_items.count()
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def canteen_scan_qr(request):
    """POST /api/canteen/scan-qr/"""
    canteen_id = request.data.get('canteen_id')
    qr_token = request.data.get('qr_token')
    
    payload = decode_order_qr_token(qr_token)
    if payload == 'EXPIRED':
         return Response({'error': 'Token has expired', 'status': 'EXPIRED'}, status=400)
    if payload == 'INVALID':
         return Response({'error': 'Invalid tampering detected on token', 'status': 'INVALID'}, status=400)
         
    if str(payload.get('canteen_id')) != str(canteen_id):
         return Response({'error': 'Token belongs to another canteen!', 'status': 'WRONG_CANTEEN'}, status=403)
         
    try:
        order = FoodOrder.objects.get(order_id=payload.get('order_id'))
        
        if order.token_status == 'REDEEMED':
            return Response({'error': 'Token ALREADY REDEEMED!', 'status': 'ALREADY_REDEEMED'}, status=400)
            
        if order.token_status != 'ACTIVE':
            return Response({'error': f'Order is {order.token_status}', 'status': order.token_status}, status=400)
            
        # Optional check if time elapsed beyond db expiry
        if timezone.now() > order.expires_at:
            order.token_status = 'EXPIRED'
            order.save()
            return Response({'error': 'Order expired in DB', 'status': 'EXPIRED'}, status=400)
            
        # Valid! Display it to canteen owner or auto-redeem
        # If auto-redeem flag passed:
        if request.data.get('auto_redeem', True):
            order.token_status = 'REDEEMED'
            order.redeemed_at = timezone.now()
            order.save()
            
        return Response({'message': 'Scan successful', 'order': FoodOrderSerializer(order).data})
        
    except FoodOrder.DoesNotExist:
        return Response({'error': 'Order not found in DB', 'status': 'NOT_FOUND'}, status=404)

@api_view(['POST'])
@permission_classes([AllowAny])
def canteen_sync_offline_orders(request):
    """POST /api/canteen/sync-offline-orders/"""
    # Payload format: {'redeemed_tokens': ['jwt_str1', 'jwt_str2', ...]}
    canteen_id = request.data.get('canteen_id')
    redeemed_tokens = request.data.get('redeemed_tokens', [])
    
    synced = 0
    failed = []
    
    for token in redeemed_tokens:
        payload = decode_order_qr_token(token)
        if isinstance(payload, dict) and str(payload.get('canteen_id')) == str(canteen_id):
            try:
                order = FoodOrder.objects.get(order_id=payload.get('order_id'), token_status='ACTIVE')
                order.token_status = 'REDEEMED'
                order.redeemed_at = timezone.now()
                order.save()
                synced += 1
            except FoodOrder.DoesNotExist:
                failed.append({'token': token[-10:], 'error': 'Invalid state or not found'})
        else:
             failed.append({'token': token[-10:], 'error': 'Invalid signature or canteen mismatch'})
             
    return Response({'synced': synced, 'failed': failed})

# ----------------- ADMIN ANALYTICS (READ-ONLY) -----------------

@api_view(['GET'])
@permission_classes([AllowAny])
def canteen_admin_analytics(request):
    """GET /api/admin/canteen-analytics/ — College Admin read-only overview"""
    today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)

    all_canteens = Canteen.objects.all()
    active_canteens = all_canteens.filter(is_active=True).count()
    total_canteens = all_canteens.count()

    today_orders = FoodOrder.objects.filter(created_at__gte=today_start)
    total_orders_today = today_orders.count()
    total_sales_today = float(sum(o.total_amount for o in today_orders.filter(token_status='REDEEMED')))
    pending_orders = today_orders.filter(token_status='ACTIVE').count()
    expired_orders = today_orders.filter(token_status='EXPIRED').count()

    low_stock_items = FoodItem.objects.filter(stock_quantity__lt=10, is_available=True)
    low_stock_list = [{'item': i.item_name, 'canteen': i.canteen.canteen_name, 'stock': i.stock_quantity} for i in low_stock_items[:10]]

    canteen_breakdown = []
    for c in all_canteens:
        c_orders = today_orders.filter(canteen=c)
        canteen_breakdown.append({
            'canteen_id': str(c.canteen_id),
            'canteen_name': c.canteen_name,
            'is_active': c.is_active,
            'orders_today': c_orders.count(),
            'sales_today': float(sum(o.total_amount for o in c_orders.filter(token_status='REDEEMED'))),
            'pending': c_orders.filter(token_status='ACTIVE').count(),
        })

    all_orders = FoodOrder.objects.all()
    total_revenue = float(sum(o.total_amount for o in all_orders.filter(token_status='REDEEMED')))

    return Response({
        'active_canteens': active_canteens,
        'total_canteens': total_canteens,
        'total_orders_today': total_orders_today,
        'total_sales_today': total_sales_today,
        'pending_orders': pending_orders,
        'expired_orders': expired_orders,
        'total_revenue_alltime': total_revenue,
        'low_stock_alerts': low_stock_list,
        'canteen_breakdown': canteen_breakdown,
    })

# ----------------- CANTEEN OWNER CRUD -----------------

@api_view(['GET'])
@permission_classes([AllowAny])
def canteen_menu_list(request):
    """GET /api/canteen/menu/?canteen_id="""
    canteen_id = request.query_params.get('canteen_id')
    items = FoodItem.objects.filter(canteen_id=canteen_id).order_by('category__category_name', 'item_name')
    categories = FoodCategory.objects.filter(canteen_id=canteen_id)
    return Response({
        'items': FoodItemSerializer(items, many=True).data,
        'categories': FoodCategorySerializer(categories, many=True).data
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def canteen_add_item(request):
    """POST /api/canteen/add-item/"""
    canteen_id = request.data.get('canteen_id')
    try:
        canteen = Canteen.objects.get(pk=canteen_id)
        category, _ = FoodCategory.objects.get_or_create(canteen=canteen, category_name=request.data.get('category', 'General'))
        item = FoodItem.objects.create(
            canteen=canteen,
            category=category,
            item_name=request.data.get('item_name'),
            description=request.data.get('description', ''),
            price=request.data.get('price', 0),
            stock_quantity=request.data.get('stock_quantity', 100),
            is_available=True,
        )
        return Response(FoodItemSerializer(item).data, status=201)
    except Canteen.DoesNotExist:
        return Response({'error': 'Canteen not found'}, status=404)

@api_view(['POST'])
@permission_classes([AllowAny])
def canteen_toggle_item(request):
    """POST /api/canteen/toggle-item/"""
    item_id = request.data.get('item_id')
    try:
        item = FoodItem.objects.get(pk=item_id)
        if 'is_available' in request.data:
            item.is_available = request.data['is_available']
        if 'stock_quantity' in request.data:
            item.stock_quantity = request.data['stock_quantity']
        if 'price' in request.data:
            item.price = request.data['price']
        item.save()
        return Response(FoodItemSerializer(item).data)
    except FoodItem.DoesNotExist:
        return Response({'error': 'Item not found'}, status=404)

@api_view(['DELETE'])
@permission_classes([AllowAny])
def canteen_delete_item(request, item_id):
    """DELETE /api/canteen/delete-item/<id>/"""
    try:
        item = FoodItem.objects.get(pk=item_id)
        item.delete()
        return Response({'message': 'Deleted'})
    except FoodItem.DoesNotExist:
        return Response({'error': 'Item not found'}, status=404)

@api_view(['GET'])
@permission_classes([AllowAny])
def canteen_reviews(request):
    """GET /api/canteen/reviews/?canteen_id="""
    canteen_id = request.query_params.get('canteen_id')
    reviews = FoodReview.objects.filter(item__canteen_id=canteen_id).order_by('-created_at')[:50]
    return Response(FoodReviewSerializer(reviews, many=True).data)

@api_view(['GET'])
@permission_classes([AllowAny])
def canteen_orders(request):
    """GET /api/canteen/orders/?canteen_id="""
    canteen_id = request.query_params.get('canteen_id')
    orders = FoodOrder.objects.filter(canteen_id=canteen_id).order_by('-created_at')[:50]
    return Response(FoodOrderSerializer(orders, many=True).data)
