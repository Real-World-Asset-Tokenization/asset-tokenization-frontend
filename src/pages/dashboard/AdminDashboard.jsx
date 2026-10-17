import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI, kycAPI } from '../../lib/api';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [kycDetails, setKycDetails] = useState(null);
  const [kycLoading, setKycLoading] = useState(false);
  const [showKYCModal, setShowKYCModal] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [assets, setAssets] = useState([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [assetUpdateStatus, setAssetUpdateStatus] = useState('');
  const [assetRejectionReason, setAssetRejectionReason] = useState('');
  const [assetUpdating, setAssetUpdating] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchAssets();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await authAPI.getAllUsers();
      setUsers(response.data.data.users);
    } catch (err) {
      console.error('Fetch users error:', err);
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async () => {
    setAssetsLoading(true);
    try {
      const response = await kycAPI.getAllAssets();
      setAssets(response.data.data.assets);
    } catch (err) {
      console.error('Fetch assets error:', err);
      setError(err.response?.data?.message || 'Failed to fetch assets');
    } finally {
      setAssetsLoading(false);
    }
  };

  const fetchKYCDetails = async (userId) => {
    setKycLoading(true);
    try {
      const response = await kycAPI.getKYCDetailsByUserId(userId);
      setKycDetails(response.data.data);
      setUpdateStatus(response.data.data.kyc.verificationStatus);
      setRejectionReason(response.data.data.kyc.rejectionReason || '');
    } catch (err) {
      console.error('Fetch KYC details error:', err);
      setError(err.response?.data?.message || 'Failed to fetch KYC details');
    } finally {
      setKycLoading(false);
    }
  };

  const handleViewKYC = (userItem) => {
    setSelectedUser(userItem);
    setShowKYCModal(true);
    fetchKYCDetails(userItem._id);
  };

  const handleUpdateStatus = async () => {
    if (!selectedUser) return;

    setUpdating(true);
    try {
      await kycAPI.updateKYCStatus(selectedUser._id, {
        verificationStatus: updateStatus,
        rejectionReason: updateStatus === 'rejected' ? rejectionReason : undefined,
      });

      // Refresh KYC details
      await fetchKYCDetails(selectedUser._id);

      // Show success message
      alert('KYC status updated successfully');
    } catch (err) {
      console.error('Update KYC status error:', err);
      setError(err.response?.data?.message || 'Failed to update KYC status');
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleViewAsset = (asset) => {
    setSelectedAsset(asset);
    setShowAssetModal(true);
    setAssetUpdateStatus(asset.verificationStatus);
    setAssetRejectionReason(asset.rejectionReason || '');
  };

  const handleUpdateAssetStatus = async () => {
    if (!selectedAsset) return;

    setAssetUpdating(true);
    try {
      await kycAPI.updateAssetStatus(selectedAsset.assetId, {
        verificationStatus: assetUpdateStatus,
        rejectionReason: assetUpdateStatus === 'rejected' ? assetRejectionReason : undefined,
      });

      // Refresh assets
      await fetchAssets();

      // Show success message
      alert('Asset status updated successfully');
      setShowAssetModal(false);
    } catch (err) {
      console.error('Update asset status error:', err);
      setError(err.response?.data?.message || 'Failed to update asset status');
    } finally {
      setAssetUpdating(false);
    }
  };

  const getAssetTypeLabel = (type) => {
    const labels = {
      real_estate: 'Real Estate',
      vehicle: 'Vehicle',
      equipment: 'Equipment',
      intellectual_property: 'Intellectual Property',
      other: 'Other',
    };
    return labels[type] || type;
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'compliance_officer':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'investor':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'asset_owner':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'pending':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <nav className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Admin Dashboard
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-zinc-600 dark:text-zinc-400">
              Welcome, {user?.name}
            </span>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg mb-6">
          <div className="border-b border-zinc-200 dark:border-zinc-700">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('users')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-300'
                }`}
              >
                User Management
              </button>
              <button
                onClick={() => setActiveTab('assets')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'assets'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-300'
                }`}
              >
                Asset Management
              </button>
            </nav>
          </div>
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              All Users
            </h2>
            <button
              onClick={fetchUsers}
              className="bg-zinc-200 hover:bg-zinc-300 text-zinc-900 dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:text-zinc-100 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>

          {users.length === 0 ? (
            <p className="text-zinc-600 dark:text-zinc-400 text-center py-8">
              No users found
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Name
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Role
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      User Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Created
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((userItem) => (
                    <tr key={userItem._id} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                      <td className="py-3 px-4 text-sm text-zinc-900 dark:text-zinc-100">
                        {userItem.name}
                      </td>
                      <td className="py-3 px-4 text-sm text-zinc-600 dark:text-zinc-400">
                        {userItem.email}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(userItem.role)}`}>
                          {userItem.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          userItem.isVerified
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}>
                          {userItem.isVerified ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-zinc-600 dark:text-zinc-400">
                        {new Date(userItem.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleViewKYC(userItem)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          View KYC
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Total Users: <span className="font-medium text-zinc-900 dark:text-zinc-100">{users.length}</span>
            </p>
          </div>
        </div>
        )}

        {/* Assets Tab */}
        {activeTab === 'assets' && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                All Assets
              </h2>
              <button
                onClick={fetchAssets}
                className="bg-zinc-200 hover:bg-zinc-300 text-zinc-900 dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:text-zinc-100 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Refresh
              </button>
            </div>

            {assetsLoading ? (
              <div className="text-center py-8">
                <div className="text-lg">Loading assets...</div>
              </div>
            ) : assets.length === 0 ? (
              <p className="text-zinc-600 dark:text-zinc-400 text-center py-8">
                No assets found
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Asset Name
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Type
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Owner
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Value
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Risk Score
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((asset) => (
                      <tr key={asset.assetId} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                        <td className="py-3 px-4 text-sm text-zinc-900 dark:text-zinc-100">
                          {asset.assetName}
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-600 dark:text-zinc-400">
                          {getAssetTypeLabel(asset.assetType)}
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-600 dark:text-zinc-400">
                          {asset.owner?.name || 'Unknown'}
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-600 dark:text-zinc-400">
                          {asset.currency} {Number(asset.valuation).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(asset.verificationStatus)}`}>
                            {asset.verificationStatus.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-600 dark:text-zinc-400">
                          {asset.riskScore !== undefined ? `${asset.riskScore}/100` : 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleViewAsset(asset)}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Total Assets: <span className="font-medium text-zinc-900 dark:text-zinc-100">{assets.length}</span>
              </p>
            </div>
          </div>
        )}

        {/* KYC Details Modal */}
        {showKYCModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    KYC Details - {selectedUser.name}
                  </h2>
                  <button
                    onClick={() => setShowKYCModal(false)}
                    className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    ✕
                  </button>
                </div>

                {kycLoading ? (
                  <div className="text-center py-8">
                    <div className="text-lg">Loading KYC details...</div>
                  </div>
                ) : kycDetails ? (
                  <div className="space-y-6">
                    {/* User Info */}
                    <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4">
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3">User Information</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-zinc-600 dark:text-zinc-400">Name:</span>
                          <span className="ml-2 text-zinc-900 dark:text-zinc-100">{kycDetails.user.name}</span>
                        </div>
                        <div>
                          <span className="text-zinc-600 dark:text-zinc-400">Email:</span>
                          <span className="ml-2 text-zinc-900 dark:text-zinc-100">{kycDetails.user.email}</span>
                        </div>
                        <div>
                          <span className="text-zinc-600 dark:text-zinc-400">Role:</span>
                          <span className="ml-2 text-zinc-900 dark:text-zinc-100">{kycDetails.user.role}</span>
                        </div>
                      </div>
                    </div>

                    {/* KYC Status */}
                    <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4">
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3">KYC Status</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-zinc-600 dark:text-zinc-400">Verification Status:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(kycDetails.kyc.verificationStatus)}`}>
                            {kycDetails.kyc.verificationStatus.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-600 dark:text-zinc-400">ID Type:</span>
                          <span className="text-zinc-900 dark:text-zinc-100">{kycDetails.kyc.idType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-600 dark:text-zinc-400">ID Number:</span>
                          <span className="text-zinc-900 dark:text-zinc-100">{kycDetails.kyc.idNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-600 dark:text-zinc-400">Face Score:</span>
                          <span className="text-zinc-900 dark:text-zinc-100">{kycDetails.kyc.faceScore || 'N/A'}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-600 dark:text-zinc-400">Risk Score:</span>
                          <span className="text-zinc-900 dark:text-zinc-100">{kycDetails.kyc.riskScore || 'N/A'}/100</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-600 dark:text-zinc-400">Document Authentic:</span>
                          <span className={`font-medium ${kycDetails.kyc.documentAuthentic ? 'text-green-600' : 'text-red-600'}`}>
                            {kycDetails.kyc.documentAuthentic ? 'Yes' : 'No'}
                          </span>
                        </div>
                        {kycDetails.kyc.rejectionReason && (
                          <div className="flex justify-between">
                            <span className="text-zinc-600 dark:text-zinc-400">Rejection Reason:</span>
                            <span className="text-red-600">{kycDetails.kyc.rejectionReason}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Documents */}
                    <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4">
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Uploaded Documents</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {kycDetails.kyc.documentImage && (
                          <div>
                            <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">ID Document</h4>
                            <img
                              src={kycDetails.kyc.documentImage}
                              alt="ID Document"
                              className="w-full h-48 object-cover rounded-lg border border-zinc-200 dark:border-zinc-700"
                            />
                          </div>
                        )}
                        {kycDetails.kyc.selfie && (
                          <div>
                            <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Selfie</h4>
                            <img
                              src={kycDetails.kyc.selfie}
                              alt="Selfie"
                              className="w-full h-48 object-cover rounded-lg border border-zinc-200 dark:border-zinc-700"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Update Status */}
                    <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4">
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Update KYC Status</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Verification Status
                          </label>
                          <select
                            value={updateStatus}
                            onChange={(e) => setUpdateStatus(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-zinc-300 bg-white dark:bg-zinc-800 dark:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="pending">Pending</option>
                            <option value="under_review">Under Review</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>
                        {updateStatus === 'rejected' && (
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                              Rejection Reason
                            </label>
                            <textarea
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              placeholder="Enter reason for rejection"
                              className="w-full px-4 py-2 rounded-lg border border-zinc-300 bg-white dark:bg-zinc-800 dark:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              rows={3}
                            />
                          </div>
                        )}
                        <button
                          onClick={handleUpdateStatus}
                          disabled={updating}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {updating ? 'Updating...' : 'Update Status'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-zinc-600 dark:text-zinc-400">No KYC record found for this user</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Asset Details Modal */}
        {showAssetModal && selectedAsset && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    Asset Details - {selectedAsset.assetName}
                  </h2>
                  <button
                    onClick={() => setShowAssetModal(false)}
                    className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Asset Info */}
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Asset Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-zinc-600 dark:text-zinc-400">Asset Name:</span>
                        <span className="text-zinc-900 dark:text-zinc-100">{selectedAsset.assetName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600 dark:text-zinc-400">Type:</span>
                        <span className="text-zinc-900 dark:text-zinc-100">{getAssetTypeLabel(selectedAsset.assetType)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600 dark:text-zinc-400">Valuation:</span>
                        <span className="text-zinc-900 dark:text-zinc-100">{selectedAsset.currency} {Number(selectedAsset.valuation).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600 dark:text-zinc-400">Verification Status:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(selectedAsset.verificationStatus)}`}>
                          {selectedAsset.verificationStatus.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600 dark:text-zinc-400">Risk Score:</span>
                        <span className="text-zinc-900 dark:text-zinc-100">{selectedAsset.riskScore !== undefined ? `${selectedAsset.riskScore}/100` : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600 dark:text-zinc-400">Document Authentic:</span>
                        <span className={`font-medium ${selectedAsset.documentAuthentic ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedAsset.documentAuthentic ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600 dark:text-zinc-400">Ownership Verified:</span>
                        <span className={`font-medium ${selectedAsset.ownershipVerified ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedAsset.ownershipVerified ? 'Yes' : 'No'}
                        </span>
                      </div>
                      {selectedAsset.rejectionReason && (
                        <div className="flex justify-between">
                          <span className="text-zinc-600 dark:text-zinc-400">Rejection Reason:</span>
                          <span className="text-red-600">{selectedAsset.rejectionReason}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Update Status */}
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Update Asset Status</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                          Verification Status
                        </label>
                        <select
                          value={assetUpdateStatus}
                          onChange={(e) => setAssetUpdateStatus(e.target.value)}
                          className="w-full px-4 py-2 rounded-lg border border-zinc-300 bg-white dark:bg-zinc-800 dark:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="pending">Pending</option>
                          <option value="under_review">Under Review</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                      {assetUpdateStatus === 'rejected' && (
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Rejection Reason
                          </label>
                          <textarea
                            value={assetRejectionReason}
                            onChange={(e) => setAssetRejectionReason(e.target.value)}
                            placeholder="Enter reason for rejection"
                            className="w-full px-4 py-2 rounded-lg border border-zinc-300 bg-white dark:bg-zinc-800 dark:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                          />
                        </div>
                      )}
                      <button
                        onClick={handleUpdateAssetStatus}
                        disabled={assetUpdating}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {assetUpdating ? 'Updating...' : 'Update Status'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
