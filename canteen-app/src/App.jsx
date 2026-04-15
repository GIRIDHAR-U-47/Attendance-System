import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, LogOut, UtensilsCrossed, Star, ClipboardList, Plus, Trash2, ToggleLeft, ToggleRight, Package } from 'lucide-react';
import axios from 'axios';
import { getApiUrl } from './offline';

// ──────────────────── LOGIN ────────────────────
const LoginScreen = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${getApiUrl()}/api/canteen/login/`, { username, password });
      onLogin(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 to-purple-700 p-4">
      <div className="card w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-3">
            <UtensilsCrossed className="text-white" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-primary">Canteen Manager</h2>
          <p className="text-gray-400 text-sm mt-1">Owner Dashboard Login</p>
        </div>
        {error && <p className="text-red-500 text-sm mb-4 text-center bg-red-50 p-2 rounded-lg">{error}</p>}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input type="text" placeholder="Username" className="p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" value={username} onChange={e => setUsername(e.target.value)} />
          <input type="password" placeholder="Password" className="p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" value={password} onChange={e => setPassword(e.target.value)} />
          <button type="submit" className="btn-primary text-lg py-3">Login</button>
        </form>
      </div>
    </div>
  );
};

// ──────────────────── DASHBOARD ────────────────────
const DashboardScreen = ({ authData }) => {
  const [stats, setStats] = useState({ total_sales: 0, pending_redemptions: 0, orders_count: 0, low_stock_count: 0 });

  useEffect(() => {
    axios.get(`${getApiUrl()}/api/canteen/dashboard/?canteen_id=${authData.canteen.canteen_id}`)
      .then(res => setStats(res.data))
      .catch(err => console.error(err));
  }, [authData]);

  return (
    <div className="p-4 flex flex-col gap-4">
      <h2 className="text-xl font-bold text-gray-800">Today's Overview</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="card bg-purple-50 border-purple-200 border">
          <p className="text-xs text-gray-500 font-medium">Total Sales</p>
          <p className="text-2xl font-bold text-primary mt-1">₹{stats.total_sales}</p>
        </div>
        <div className="card bg-blue-50 border-blue-200 border">
          <p className="text-xs text-gray-500 font-medium">Orders</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{stats.orders_count}</p>
        </div>
        <div className="card bg-orange-50 border-orange-200 border">
          <p className="text-xs text-gray-500 font-medium">Low Stock</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{stats.low_stock_count}</p>
        </div>
        <div className="card bg-green-50 border-green-200 border">
          <p className="text-xs text-gray-500 font-medium">Pending Tokens</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{stats.pending_redemptions}</p>
        </div>
      </div>
    </div>
  );
};

// ──────────────────── MENU MANAGER ────────────────────
const MenuScreen = ({ authData }) => {
  const [menuData, setMenuData] = useState({ items: [], categories: [] });
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ item_name: '', category: '', price: '', stock_quantity: '100', description: '' });
  const canteenId = authData.canteen.canteen_id;

  const fetchMenu = useCallback(() => {
    axios.get(`${getApiUrl()}/api/canteen/menu/?canteen_id=${canteenId}`)
      .then(res => setMenuData(res.data))
      .catch(err => console.error(err));
  }, [canteenId]);

  useEffect(() => { fetchMenu(); }, [fetchMenu]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${getApiUrl()}/api/canteen/add-item/`, { ...newItem, canteen_id: canteenId });
      setNewItem({ item_name: '', category: '', price: '', stock_quantity: '100', description: '' });
      setShowAdd(false);
      fetchMenu();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add item');
    }
  };

  const handleToggle = async (itemId, currentStatus) => {
    await axios.post(`${getApiUrl()}/api/canteen/toggle-item/`, { item_id: itemId, is_available: !currentStatus });
    fetchMenu();
  };

  const handleDelete = async (itemId) => {
    if (!confirm('Delete this item permanently?')) return;
    await axios.delete(`${getApiUrl()}/api/canteen/delete-item/${itemId}/`);
    fetchMenu();
  };

  const handleStockUpdate = async (itemId, newStock) => {
    await axios.post(`${getApiUrl()}/api/canteen/toggle-item/`, { item_id: itemId, stock_quantity: parseInt(newStock) });
    fetchMenu();
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">Menu Manager</h2>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Add Item
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAddItem} className="card mb-4 border-2 border-primary border-dashed">
          <h3 className="font-bold text-primary mb-3">New Food Item</h3>
          <div className="grid grid-cols-2 gap-3">
            <input className="p-2 border rounded-lg text-sm" placeholder="Item Name *" required value={newItem.item_name} onChange={e => setNewItem({...newItem, item_name: e.target.value})} />
            <input className="p-2 border rounded-lg text-sm" placeholder="Category (e.g. Snacks)" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} />
            <input className="p-2 border rounded-lg text-sm" placeholder="Price ₹ *" type="number" required value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
            <input className="p-2 border rounded-lg text-sm" placeholder="Stock Qty" type="number" value={newItem.stock_quantity} onChange={e => setNewItem({...newItem, stock_quantity: e.target.value})} />
          </div>
          <div className="flex gap-2 mt-3">
            <button type="submit" className="btn-primary text-sm">Save</button>
            <button type="button" onClick={() => setShowAdd(false)} className="btn-outline text-sm">Cancel</button>
          </div>
        </form>
      )}

      {menuData.items.length === 0 ? (
        <p className="text-center text-gray-400 mt-10">No items yet. Add your first food item!</p>
      ) : (
        <div className="flex flex-col gap-3">
          {menuData.items.map(item => (
            <div key={item.item_id} className={`card flex items-center justify-between ${!item.is_available ? 'opacity-50' : ''}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-800">{item.item_name}</span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{item.category_name}</span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm">
                  <span className="font-bold text-green-700">₹{item.price}</span>
                  <span className="text-gray-400">
                    <Package size={12} className="inline mr-1" />
                    <input
                      type="number"
                      className="w-14 border border-gray-200 rounded px-1 py-0.5 text-center text-xs"
                      value={item.stock_quantity}
                      onChange={e => handleStockUpdate(item.item_id, e.target.value)}
                    />
                  </span>
                  {item.average_rating > 0 && <span className="text-yellow-500 text-xs"><Star size={12} className="inline" /> {item.average_rating.toFixed(1)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button onClick={() => handleToggle(item.item_id, item.is_available)} title={item.is_available ? 'Mark Unavailable' : 'Mark Available'}>
                  {item.is_available ? <ToggleRight size={28} className="text-green-600" /> : <ToggleLeft size={28} className="text-gray-400" />}
                </button>
                <button onClick={() => handleDelete(item.item_id)} className="text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ──────────────────── ORDERS ────────────────────
const OrdersScreen = ({ authData }) => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    axios.get(`${getApiUrl()}/api/canteen/orders/?canteen_id=${authData.canteen.canteen_id}`)
      .then(res => setOrders(res.data))
      .catch(err => console.error(err));
  }, [authData]);

  const statusColor = (s) => {
    if (s === 'REDEEMED') return 'bg-green-100 text-green-700';
    if (s === 'ACTIVE') return 'bg-blue-100 text-blue-700';
    if (s === 'EXPIRED') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-500';
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Orders</h2>
      {orders.length === 0 ? (
        <p className="text-center text-gray-400 mt-10">No orders yet today</p>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map(order => (
            <div key={order.order_id} className="card">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-gray-800">{order.student_details?.username || 'Student'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(order.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusColor(order.token_status)}`}>{order.token_status}</span>
                  <p className="font-bold text-primary mt-1">₹{order.total_amount}</p>
                </div>
              </div>
              {order.items && order.items.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  {order.items.map(oi => (
                    <p key={oi.order_item_id} className="text-sm text-gray-500">{oi.quantity}x {oi.item_name} — ₹{oi.price_at_purchase}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ──────────────────── REVIEWS ────────────────────
const ReviewsScreen = ({ authData }) => {
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    axios.get(`${getApiUrl()}/api/canteen/reviews/?canteen_id=${authData.canteen.canteen_id}`)
      .then(res => setReviews(res.data))
      .catch(err => console.error(err));
  }, [authData]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Student Reviews</h2>
      {reviews.length === 0 ? (
        <p className="text-center text-gray-400 mt-10">No reviews yet</p>
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map(r => (
            <div key={r.review_id} className="card">
              <div className="flex justify-between items-center">
                <p className="font-bold text-gray-800">{r.student_name}</p>
                <div className="flex items-center gap-1 text-yellow-500">
                  {[...Array(5)].map((_, i) => <Star key={i} size={14} fill={i < r.rating ? '#f59e0b' : 'none'} />)}
                </div>
              </div>
              {r.review_text && <p className="text-sm text-gray-500 mt-2">{r.review_text}</p>}
              <p className="text-xs text-gray-300 mt-2">{new Date(r.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ──────────────────── NAVIGATION LAYOUT ────────────────────
const NavigationLayout = ({ authData, setAuthData, children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { path: '/', icon: LayoutDashboard, label: 'Home' },
    { path: '/menu', icon: UtensilsCrossed, label: 'Menu' },
    { path: '/orders', icon: ClipboardList, label: 'Orders' },
    { path: '/reviews', icon: Star, label: 'Reviews' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
      <header className="bg-white p-4 shadow-sm flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="font-bold text-lg text-primary">{authData.canteen.canteen_name}</h1>
          <p className="text-xs text-gray-400">Management Dashboard</p>
        </div>
        <button className="p-2 text-gray-400 hover:text-red-500 transition-colors" onClick={() => setAuthData(null)}>
          <LogOut size={20} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto">{children}</main>

      <nav className="fixed bottom-0 w-full bg-white border-t flex justify-around items-center py-2 pb-3 shadow-[0_-5px_15px_rgba(0,0,0,0.06)] z-20">
        {tabs.map(tab => {
          const isActive = location.pathname === tab.path;
          return (
            <button key={tab.path} onClick={() => navigate(tab.path)} className={`flex flex-col items-center pt-1 transition-colors ${isActive ? 'text-primary' : 'text-gray-400'}`}>
              <tab.icon size={20} />
              <span className="text-[10px] mt-1 font-medium">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

// ──────────────────── APP ROOT ────────────────────
export default function App() {
  const [authData, setAuthData] = useState(null);

  if (!authData) return <LoginScreen onLogin={setAuthData} />;

  return (
    <BrowserRouter>
      <NavigationLayout authData={authData} setAuthData={setAuthData}>
        <Routes>
          <Route path="/" element={<DashboardScreen authData={authData} />} />
          <Route path="/menu" element={<MenuScreen authData={authData} />} />
          <Route path="/orders" element={<OrdersScreen authData={authData} />} />
          <Route path="/reviews" element={<ReviewsScreen authData={authData} />} />
        </Routes>
      </NavigationLayout>
    </BrowserRouter>
  );
}
