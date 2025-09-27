import React, { useState, useEffect } from 'react';
import { Crown, Users, Shield, Check, X, CreditCard as Edit2, Save, RotateCcw } from 'lucide-react';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';

interface UserData {
  id: string;
  email: string;
  user_created_at: string;
  role: string | null;
  active: boolean | null;
  role_created_at: string | null;
  role_updated_at: string | null;
}

export default function Admin() {
  const { isSuperUser, getAllUsers, updateUserRole } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<string>('');
  const [editActive, setEditActive] = useState<boolean>(false);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (isSuperUser) {
      loadUsers();
    }
  }, [isSuperUser]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await getAllUsers();
      if (error) {
        console.error('Error loading users:', error);
      } else {
        setUsers(data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: UserData) => {
    setEditingUser(user.id);
    setEditRole(user.role || 'Regular User');
    setEditActive(user.active || false);
  };

  const handleSaveUser = async (userId: string) => {
    setUpdating(userId);
    try {
      const { error } = await updateUserRole(userId, editRole, editActive);
      if (error) {
        console.error('Error updating user:', error);
        alert('Error updating user: ' + error.message);
      } else {
        setEditingUser(null);
        await loadUsers(); // Refresh the list
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Error updating user');
    } finally {
      setUpdating(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditRole('');
    setEditActive(false);
  };

  if (!isSuperUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You need SuperUser privileges to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Crown className="h-8 w-8 text-yellow-600" />
            <h1 className="text-3xl font-bold text-gray-900">SuperUser Admin Panel</h1>
          </div>
          <p className="text-gray-600">Manage user roles and permissions</p>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
              </div>
              <button
                onClick={loadUsers}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors duration-200"
              >
                <RotateCcw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading users...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.email}</div>
                          <div className="text-sm text-gray-500">ID: {user.id.slice(0, 8)}...</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingUser === user.id ? (
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value)}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="Regular">Regular</option>
                            <option value="Super Admin">Super Admin</option>
                          </select>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.role === 'Super Admin' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {user.role === 'Super Admin' && <Crown className="h-3 w-3 mr-1" />}
                              {user.role || 'Regular'}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingUser === user.id ? (
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={editActive}
                              onChange={(e) => setEditActive(e.target.checked)}
                              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <span className="text-sm">Active</span>
                          </label>
                        ) : (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.active ? (
                              <>
                                <Check className="h-3 w-3 mr-1" />
                                Active
                              </>
                            ) : (
                              <>
                                <X className="h-3 w-3 mr-1" />
                                Deactivated
                              </>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.user_created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {editingUser === user.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSaveUser(user.id)}
                              disabled={updating === user.id}
                              className="flex items-center gap-1 text-green-600 hover:text-green-900 disabled:opacity-50"
                            >
                              <Save className="h-4 w-4" />
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={updating === user.id}
                              className="flex items-center gap-1 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                            >
                              <X className="h-4 w-4" />
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditUser(user)}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-900"
                          >
                            <Edit2 className="h-4 w-4" />
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">SuperUser Privileges</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• View all users and their roles</li>
            <li>• Activate/deactivate user accounts</li>
            <li>• Promote users to Super Admin or demote to Regular</li>
            <li>• Access to admin panel and user management</li>
          </ul>
        </div>
      </div>
    </div>
  );
}