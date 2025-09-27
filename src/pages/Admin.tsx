import React, { useState, useEffect } from 'react';
import { Crown, Users, Shield, Check, X, CreditCard as Edit2, Save, RotateCcw, Trash2, DollarSign, TrendingUp } from 'lucide-react';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { selectWithFallback, TABLE_KEYS } from '../lib/tableMap';

interface UserData {
  id: string;
  email: string;
  user_created_at: string;
  role: string | null;
  active: boolean | null;
  role_created_at: string | null;
  role_updated_at: string | null;
}

interface ConsolidatedPrice {
  id: string;
  source: 'Ocean' | 'Local' | 'Transport';
  description: string;
  originalPrice: number;
  originalCurrency: string;
  audPrice: number;
  route?: string;
  containerType?: string;
  direction?: string;
}

export default function Admin() {
  const { isSuperUser, getAllUsers, updateUserRole, deleteUser } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<string>('');
  const [editActive, setEditActive] = useState<boolean>(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState<string | null>(null);
  const [deactivateConfirm, setDeactivateConfirm] = useState<string | null>(null);
  const [consolidatedPrices, setConsolidatedPrices] = useState<ConsolidatedPrice[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [usdToAudRate, setUsdToAudRate] = useState<number>(1.5); // Default exchange rate
  const [totalAudValue, setTotalAudValue] = useState<number>(0);

  useEffect(() => {
    if (isSuperUser) {
      loadUsers();
      loadConsolidatedPrices();
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

  const loadConsolidatedPrices = async () => {
    setLoadingPrices(true);
    try {
      const consolidated: ConsolidatedPrice[] = [];

      // Load Ocean Freight (USD -> AUD conversion)
      try {
        const { data: oceanData } = await selectWithFallback(TABLE_KEYS.ocean, (q) =>
          q.select('record_id,port_of_loading,port_of_discharge,direction,20gp,40gp_40hc,currency')
            .limit(100)
        );

        oceanData?.forEach(item => {
          const price20gp = parseFloat(item['20gp']) || 0;
          const price40gp = parseFloat(item['40gp_40hc']) || 0;

          if (price20gp > 0) {
            consolidated.push({
              id: `ocean-20gp-${item.record_id}`,
              source: 'Ocean',
              description: `Ocean Freight - ${item.port_of_loading} to ${item.port_of_discharge}`,
              originalPrice: price20gp,
              originalCurrency: item.currency || 'USD',
              audPrice: item.currency === 'USD' ? price20gp * usdToAudRate : price20gp,
              route: `${item.port_of_loading} → ${item.port_of_discharge}`,
              containerType: '20GP',
              direction: item.direction
            });
          }

          if (price40gp > 0) {
            consolidated.push({
              id: `ocean-40gp-${item.record_id}`,
              source: 'Ocean',
              description: `Ocean Freight - ${item.port_of_loading} to ${item.port_of_discharge}`,
              originalPrice: price40gp,
              originalCurrency: item.currency || 'USD',
              audPrice: item.currency === 'USD' ? price40gp * usdToAudRate : price40gp,
              route: `${item.port_of_loading} → ${item.port_of_discharge}`,
              containerType: '40GP/40HC',
              direction: item.direction
            });
          }
        });
      } catch (error) {
        console.error('Error loading ocean freight prices:', error);
      }

      // Load Local Charges (already in AUD)
      try {
        const { data: localData } = await selectWithFallback(TABLE_KEYS.local, (q) =>
          q.select('record_id,port_of_discharge,direction,charge_description,20gp,40gp_40hc,per_shipment_charge,currency')
            .limit(100)
        );

        localData?.forEach(item => {
          const price20gp = parseFloat(item['20gp']) || 0;
          const price40gp = parseFloat(item['40gp_40hc']) || 0;
          const perShipment = parseFloat(item.per_shipment_charge) || 0;

          if (price20gp > 0) {
            consolidated.push({
              id: `local-20gp-${item.record_id}`,
              source: 'Local',
              description: item.charge_description || 'Local Charge',
              originalPrice: price20gp,
              originalCurrency: item.currency || 'AUD',
              audPrice: price20gp,
              route: item.port_of_discharge,
              containerType: '20GP',
              direction: item.direction
            });
          }

          if (price40gp > 0) {
            consolidated.push({
              id: `local-40gp-${item.record_id}`,
              source: 'Local',
              description: item.charge_description || 'Local Charge',
              originalPrice: price40gp,
              originalCurrency: item.currency || 'AUD',
              audPrice: price40gp,
              route: item.port_of_discharge,
              containerType: '40GP/40HC',
              direction: item.direction
            });
          }

          if (perShipment > 0) {
            consolidated.push({
              id: `local-shipment-${item.record_id}`,
              source: 'Local',
              description: item.charge_description || 'Local Charge',
              originalPrice: perShipment,
              originalCurrency: item.currency || 'AUD',
              audPrice: perShipment,
              route: item.port_of_discharge,
              containerType: 'Per Shipment',
              direction: item.direction
            });
          }
        });
      } catch (error) {
        console.error('Error loading local charges:', error);
      }

      // Load Transport (already in AUD)
      try {
        const { data: transportData } = await selectWithFallback(TABLE_KEYS.transport, (q) =>
          q.select('record_id,pick_up_location,delivery_location,direction,charge_description,20gp,40gp_40hc,currency')
            .limit(100)
        );

        transportData?.forEach(item => {
          const price20gp = parseFloat(item['20gp']) || 0;
          const price40gp = parseFloat(item['40gp_40hc']) || 0;

          if (price20gp > 0) {
            consolidated.push({
              id: `transport-20gp-${item.record_id}`,
              source: 'Transport',
              description: item.charge_description || 'Transport',
              originalPrice: price20gp,
              originalCurrency: item.currency || 'AUD',
              audPrice: price20gp,
              route: item.direction === 'import' 
                ? `To ${item.delivery_location}` 
                : `From ${item.pick_up_location}`,
              containerType: '20GP',
              direction: item.direction
            });
          }

          if (price40gp > 0) {
            consolidated.push({
              id: `transport-40gp-${item.record_id}`,
              source: 'Transport',
              description: item.charge_description || 'Transport',
              originalPrice: price40gp,
              originalCurrency: item.currency || 'AUD',
              audPrice: price40gp,
              route: item.direction === 'import' 
                ? `To ${item.delivery_location}` 
                : `From ${item.pick_up_location}`,
              containerType: '40GP/40HC',
              direction: item.direction
            });
          }
        });
      } catch (error) {
        console.error('Error loading transport prices:', error);
      }

      // Sort by AUD price descending
      consolidated.sort((a, b) => b.audPrice - a.audPrice);

      // Calculate total AUD value
      const total = consolidated.reduce((sum, item) => sum + item.audPrice, 0);
      setTotalAudValue(total);
      setConsolidatedPrices(consolidated);
    } catch (error) {
      console.error('Error loading consolidated prices:', error);
    } finally {
      setLoadingPrices(false);
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

  const handleDeactivateUser = async (userId: string, userEmail: string) => {
    if (deactivateConfirm !== userId) {
      setDeactivateConfirm(userId);
      return;
    }

    setDeactivating(userId);
    try {
      const { error } = await deleteUser(userId);
      if (error) {
        console.error('Error deactivating user:', error);
        alert('Error deactivating user: ' + error.message);
      } else {
        alert(`User ${userEmail} has been successfully deactivated.`);
        await loadUsers(); // Refresh the list
      }
    } catch (error) {
      console.error('Error deactivating user:', error);
      alert('Error deactivating user');
    } finally {
      setDeactivating(null);
      setDeactivateConfirm(null);
    }
  };

  const handleCancelDeactivate = () => {
    setDeactivateConfirm(null);
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
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditUser(user)}
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-900"
                            >
                              <Edit2 className="h-4 w-4" />
                              Edit
                            </button>
                            {deactivateConfirm === user.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDeactivateUser(user.id, user.email)}
                                  disabled={deactivating === user.id}
                                  className="flex items-center gap-1 text-red-600 hover:text-red-900 disabled:opacity-50 text-xs bg-red-50 px-2 py-1 rounded"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Confirm Deactivate
                                </button>
                                <button
                                  onClick={handleCancelDeactivate}
                                  disabled={deactivating === user.id}
                                  className="flex items-center gap-1 text-gray-600 hover:text-gray-900 disabled:opacity-50 text-xs"
                                >
                                  <X className="h-3 w-3" />
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleDeactivateUser(user.id, user.email)}
                                disabled={deactivating === user.id}
                                className="flex items-center gap-1 text-red-600 hover:text-red-900 disabled:opacity-50"
                              >
                                <Trash2 className="h-4 w-4" />
                                Deactivate
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Consolidated Pricing Panel */}
        <div className="mt-8 bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-900">Consolidated Pricing (AUD)</h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  USD to AUD Rate: 
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    max="5"
                    value={usdToAudRate}
                    onChange={(e) => {
                      const newRate = parseFloat(e.target.value) || 1.5;
                      setUsdToAudRate(newRate);
                      loadConsolidatedPrices();
                    }}
                    className="ml-2 w-20 px-2 py-1 border border-gray-300 rounded text-center"
                  />
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="font-semibold text-green-800">
                    Total: AUD {totalAudValue.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <button
                  onClick={loadConsolidatedPrices}
                  disabled={loadingPrices}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors duration-200"
                >
                  <RotateCcw className="h-4 w-4" />
                  Refresh Prices
                </button>
              </div>
            </div>
          </div>

          {loadingPrices ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading consolidated prices...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Route/Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Container Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Direction
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Original Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      AUD Price
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {consolidatedPrices.slice(0, 50).map((price) => (
                    <tr key={price.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          price.source === 'Ocean' 
                            ? 'bg-blue-100 text-blue-800' 
                            : price.source === 'Local'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {price.source}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{price.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {price.route}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {price.containerType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          price.direction === 'import' 
                            ? 'bg-orange-100 text-orange-800' 
                            : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {price.direction?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {price.originalCurrency} {price.originalPrice.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        AUD {price.audPrice.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {consolidatedPrices.length > 50 && (
                <div className="px-6 py-4 bg-gray-50 text-center text-sm text-gray-500">
                  Showing top 50 of {consolidatedPrices.length} total prices
                </div>
              )}
            </div>
          )}
        </div>

        {/* Consolidated Pricing Panel */}
        <div className="mt-8 bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-900">Consolidated Pricing (AUD)</h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  USD to AUD Rate: 
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    max="5"
                    value={usdToAudRate}
                    onChange={(e) => {
                      const newRate = parseFloat(e.target.value) || 1.5;
                      setUsdToAudRate(newRate);
                      loadConsolidatedPrices();
                    }}
                    className="ml-2 w-20 px-2 py-1 border border-gray-300 rounded text-center"
                  />
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="font-semibold text-green-800">
                    Total: AUD {totalAudValue.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <button
                  onClick={loadConsolidatedPrices}
                  disabled={loadingPrices}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors duration-200"
                >
                  <RotateCcw className="h-4 w-4" />
                  Refresh Prices
                </button>
              </div>
            </div>
          </div>

          {loadingPrices ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading consolidated prices...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Route/Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Container Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Direction
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Original Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      AUD Price
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {consolidatedPrices.slice(0, 50).map((price) => (
                    <tr key={price.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          price.source === 'Ocean' 
                            ? 'bg-blue-100 text-blue-800' 
                            : price.source === 'Local'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {price.source}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{price.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {price.route}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {price.containerType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          price.direction === 'import' 
                            ? 'bg-orange-100 text-orange-800' 
                            : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {price.direction?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {price.originalCurrency} {price.originalPrice.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        AUD {price.audPrice.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {consolidatedPrices.length > 50 && (
                <div className="px-6 py-4 bg-gray-50 text-center text-sm text-gray-500">
                  Showing top 50 of {consolidatedPrices.length} total prices
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">SuperUser Privileges</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• View all users and their roles</li>
            <li>• Activate/deactivate user accounts</li>
            <li>• Promote users to Super Admin or demote to Regular</li>
            <li>• Deactivate user accounts</li>
            <li>• Access to admin panel and user management</li>
            <li>• View consolidated pricing across all freight tables</li>
            <li>• Convert USD ocean freight prices to AUD automatically</li>
          </ul>
        </div>
      </div>
    </div>
  );
}