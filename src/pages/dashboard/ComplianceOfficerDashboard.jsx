import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI, kycAPI } from '../../lib/api';

/* ------------------------------------------------------------------ */
/*  Presentational icon components (decoration only – no logic)        */
/* ------------------------------------------------------------------ */
const ShieldCheckIcon = ({ className = 'h-5 w-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
  </svg>
);

const UsersIcon = ({ className = 'h-5 w-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
  </svg>
);

const CubeIcon = ({ className = 'h-5 w-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
  </svg>
);

const LogoutIcon = ({ className = 'h-5 w-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
  </svg>
);

const RefreshIcon = ({ className = 'h-5 w-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

const AlertIcon = ({ className = 'h-5 w-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
  </svg>
);

const CloseIcon = ({ className = 'h-5 w-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
);

const CheckIcon = ({ className = 'h-5 w-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
  </svg>
);

const UserIcon = ({ className = 'h-5 w-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
  </svg>
);

const DocumentIcon = ({ className = 'h-5 w-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
);

const PhotoIcon = ({ className = 'h-5 w-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
  </svg>
);

const ClipboardIcon = ({ className = 'h-5 w-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
  </svg>
);

const ExclamationIcon = ({ className = 'h-5 w-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008ZM21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

/* Shared decorative class strings */
const inputClass =
  'w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500/60 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100 dark:placeholder-zinc-500';

const labelClass = 'mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300';

const sectionCardClass =
  'rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-white to-zinc-50/60 p-5 dark:border-zinc-700/70 dark:from-zinc-800/40 dark:to-zinc-900/40';

const sectionTitleClass =
  'mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400';

export default function ComplianceOfficerDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
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

  // Asset states
  const [assets, setAssets] = useState([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [assetDetails, setAssetDetails] = useState(null);
  const [assetLoading, setAssetLoading] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [assetUpdateStatus, setAssetUpdateStatus] = useState('');
  const [assetRejectionReason, setAssetRejectionReason] = useState('');
  const [assetUpdating, setAssetUpdating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (activeTab === 'assets') {
      fetchAssets();
    }
  }, [activeTab]);

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

  // Asset functions
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

  const fetchAssetDetails = async (assetId) => {
    setAssetLoading(true);
    try {
      const response = await kycAPI.getAssetDetails(assetId);
      setAssetDetails(response.data.data);
      setAssetUpdateStatus(response.data.data.asset.verificationStatus);
      setAssetRejectionReason(response.data.data.asset.rejectionReason || '');
    } catch (err) {
      console.error('Fetch asset details error:', err);
      setError(err.response?.data?.message || 'Failed to fetch asset details');
    } finally {
      setAssetLoading(false);
    }
  };

  const handleViewAsset = (asset) => {
    setSelectedAsset(asset);
    setShowAssetModal(true);
    fetchAssetDetails(asset.assetId);
  };

  const handleUpdateAssetStatus = async () => {
    if (!selectedAsset) return;

    setAssetUpdating(true);
    try {
      await kycAPI.updateAssetStatus(selectedAsset.assetId, {
        verificationStatus: assetUpdateStatus,
        rejectionReason: assetUpdateStatus === 'rejected' ? assetRejectionReason : undefined,
      });

      // Refresh asset details
      await fetchAssetDetails(selectedAsset.assetId);

      // Refresh assets list
      await fetchAssets();

      // Show success message
      alert('Asset status updated successfully');
    } catch (err) {
      console.error('Update asset status error:', err);
      setError(err.response?.data?.message || 'Failed to update asset status');
    } finally {
      setAssetUpdating(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 via-white to-blue-50 dark:from-black dark:via-zinc-950 dark:to-zinc-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-200 border-t-blue-600 dark:border-zinc-800 dark:border-t-blue-500" />
          <p className="text-sm font-medium tracking-wide text-zinc-500 dark:text-zinc-400">
            Loading compliance dashboard…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-blue-50/60 dark:from-black dark:via-zinc-950 dark:to-zinc-900">
      {/* ---------------------------------------------------------------- */}
      {/* Navbar                                                            */}
      {/* ---------------------------------------------------------------- */}
      <nav className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/80 backdrop-blur-xl dark:border-zinc-800/70 dark:bg-zinc-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25">
              <ShieldCheckIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50">
                Compliance Officer Dashboard
              </h1>
              <p className="hidden text-xs text-zinc-500 dark:text-zinc-400 sm:block">
                Review users &amp; verify asset submissions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 rounded-full border border-zinc-200 bg-white/70 py-1.5 pl-1.5 pr-4 dark:border-zinc-700 dark:bg-zinc-800/60 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-sm">
                {user?.name?.charAt(0)?.toUpperCase() || <UserIcon className="h-4 w-4" />}
              </div>
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                Welcome, {user?.name}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-red-500/20 transition-all hover:shadow-lg hover:shadow-red-500/30 hover:brightness-110 active:scale-[0.98]"
            >
              <LogoutIcon className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Error banner */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3.5 text-sm text-red-700 shadow-sm backdrop-blur dark:border-red-800/60 dark:bg-red-900/20 dark:text-red-300">
            <AlertIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Tab navigation                                                    */}
        {/* ---------------------------------------------------------------- */}
        <div className="mb-6 flex justify-center sm:justify-start">
          <div className="inline-flex rounded-2xl border border-zinc-200/80 bg-white/80 p-1.5 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70">
            <button
              onClick={() => setActiveTab('users')}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                activeTab === 'users'
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
              }`}
            >
              <UsersIcon className="h-4 w-4" />
              User Management
            </button>
            <button
              onClick={() => setActiveTab('assets')}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                activeTab === 'assets'
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
              }`}
            >
              <CubeIcon className="h-4 w-4" />
              Asset Verification
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* User Management Tab                                               */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === 'users' && (
          <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-lg shadow-zinc-200/40 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/40">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
            <div className="p-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                    <UsersIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      All Users
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Review registered accounts and KYC records
                    </p>
                  </div>
                </div>
                <button
                  onClick={fetchUsers}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  <RefreshIcon className="h-4 w-4" />
                  Refresh
                </button>
              </div>

              {users.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/60 px-4 py-12 text-center dark:border-zinc-700 dark:bg-zinc-800/30">
                  <UsersIcon className="mx-auto mb-3 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    No users found
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-zinc-700/70">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-zinc-50/80 dark:bg-zinc-800/50">
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Email
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Role
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          User Status
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Created
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {users.map((userItem) => (
                        <tr
                          key={userItem._id}
                          className="transition-colors hover:bg-indigo-50/40 dark:hover:bg-indigo-500/5"
                        >
                          <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {userItem.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                            {userItem.email}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize tracking-wide ${getRoleBadgeColor(userItem.role)}`}>
                              {userItem.role.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide ${
                              userItem.isVerified
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${userItem.isVerified ? 'bg-green-500' : 'bg-yellow-500'}`} />
                              {userItem.isVerified ? 'Verified' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                            {new Date(userItem.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleViewKYC(userItem)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
                            >
                              <ClipboardIcon className="h-3.5 w-3.5" />
                              View KYC
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-5 flex items-center gap-2 rounded-xl bg-zinc-50/80 px-4 py-3 text-sm dark:bg-zinc-800/40">
                <UsersIcon className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                <span className="text-zinc-600 dark:text-zinc-400">
                  Total Users:
                </span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{users.length}</span>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Asset Verification Tab                                            */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === 'assets' && (
          <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-lg shadow-zinc-200/40 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/40">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500" />
            <div className="p-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                    <CubeIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      All Assets for Review
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Inspect submitted documents and verification results
                    </p>
                  </div>
                </div>
                <button
                  onClick={fetchAssets}
                  disabled={assetsLoading}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  <RefreshIcon className="h-4 w-4" />
                  Refresh
                </button>
              </div>

              {assetsLoading ? (
                <div className="flex flex-col items-center gap-3 py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-zinc-200 border-t-amber-500 dark:border-zinc-700 dark:border-t-amber-400" />
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">Loading assets…</div>
                </div>
              ) : assets.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/60 px-4 py-12 text-center dark:border-zinc-700 dark:bg-zinc-800/30">
                  <CubeIcon className="mx-auto mb-3 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    No assets found
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-zinc-700/70">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-zinc-50/80 dark:bg-zinc-800/50">
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Asset Name
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Owner
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Value
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Risk Score
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {assets.map((asset) => (
                        <tr
                          key={asset.assetId}
                          className="transition-colors hover:bg-amber-50/40 dark:hover:bg-amber-500/5"
                        >
                          <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {asset.assetName}
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                            {getAssetTypeLabel(asset.assetType)}
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                            {asset.owner.name}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                            {asset.currency} {Number(asset.valuation).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize tracking-wide ${getStatusBadgeColor(asset.verificationStatus)}`}>
                              {asset.verificationStatus.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                            {asset.riskScore !== undefined ? `${asset.riskScore}/100` : 'N/A'}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleViewAsset(asset)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
                            >
                              <ClipboardIcon className="h-3.5 w-3.5" />
                              Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-5 flex items-center gap-2 rounded-xl bg-zinc-50/80 px-4 py-3 text-sm dark:bg-zinc-800/40">
                <CubeIcon className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                <span className="text-zinc-600 dark:text-zinc-400">
                  Total Assets:
                </span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{assets.length}</span>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* KYC Details Modal                                                 */}
        {/* ---------------------------------------------------------------- */}
        {showKYCModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-200/60 bg-white shadow-2xl dark:border-zinc-700/60 dark:bg-zinc-900">
              <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
              <div className="flex items-center justify-between border-b border-zinc-200/80 px-6 py-4 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                    <ShieldCheckIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                      KYC Details
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {selectedUser.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowKYCModal(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  aria-label="Close"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="overflow-y-auto px-6 py-5">
                {kycLoading ? (
                  <div className="flex flex-col items-center gap-3 py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-zinc-200 border-t-indigo-500 dark:border-zinc-700 dark:border-t-indigo-400" />
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">Loading KYC details…</div>
                  </div>
                ) : kycDetails ? (
                  <div className="space-y-5">
                    {/* User Info */}
                    <div className={sectionCardClass}>
                      <h3 className={sectionTitleClass}>
                        <UserIcon className="h-4 w-4" /> User Information
                      </h3>
                      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                        <div className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-2 dark:bg-zinc-800/60">
                          <span className="text-zinc-500 dark:text-zinc-400">Name</span>
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">{kycDetails.user.name}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-2 dark:bg-zinc-800/60">
                          <span className="text-zinc-500 dark:text-zinc-400">Email</span>
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">{kycDetails.user.email}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-2 dark:bg-zinc-800/60">
                          <span className="text-zinc-500 dark:text-zinc-400">Role</span>
                          <span className="font-medium capitalize text-zinc-900 dark:text-zinc-100">{kycDetails.user.role}</span>
                        </div>
                      </div>
                    </div>

                    {/* KYC Status */}
                    <div className={sectionCardClass}>
                      <h3 className={sectionTitleClass}>
                        <ShieldCheckIcon className="h-4 w-4" /> KYC Status
                      </h3>
                      <div className="space-y-2.5 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 dark:text-zinc-400">Verification Status</span>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize tracking-wide ${getStatusBadgeColor(kycDetails.kyc.verificationStatus)}`}>
                            {kycDetails.kyc.verificationStatus.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 dark:text-zinc-400">ID Type</span>
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">{kycDetails.kyc.idType}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 dark:text-zinc-400">ID Number</span>
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">{kycDetails.kyc.idNumber}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 dark:text-zinc-400">Face Score</span>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{kycDetails.kyc.faceScore || 'N/A'}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 dark:text-zinc-400">Risk Score</span>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{kycDetails.kyc.riskScore || 'N/A'}/100</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 dark:text-zinc-400">Document Authentic</span>
                          <span className={`inline-flex items-center gap-1.5 font-semibold ${kycDetails.kyc.documentAuthentic ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            <span className={`h-2 w-2 rounded-full ${kycDetails.kyc.documentAuthentic ? 'bg-green-500' : 'bg-red-500'}`} />
                            {kycDetails.kyc.documentAuthentic ? 'Yes' : 'No'}
                          </span>
                        </div>
                        {kycDetails.kyc.rejectionReason && (
                          <div className="flex items-start justify-between gap-4">
                            <span className="text-zinc-500 dark:text-zinc-400">Rejection Reason</span>
                            <span className="text-right font-medium text-red-600 dark:text-red-400">{kycDetails.kyc.rejectionReason}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Documents */}
                    <div className={sectionCardClass}>
                      <h3 className={sectionTitleClass}>
                        <DocumentIcon className="h-4 w-4" /> Uploaded Documents
                      </h3>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {kycDetails.kyc.documentImage && (
                          <div>
                            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                              <DocumentIcon className="h-3.5 w-3.5" /> ID Document
                            </h4>
                            <img
                              src={kycDetails.kyc.documentImage}
                              alt="ID Document"
                              className="h-48 w-full rounded-xl border border-zinc-200 object-cover shadow-sm dark:border-zinc-700"
                            />
                          </div>
                        )}
                        {kycDetails.kyc.selfie && (
                          <div>
                            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                              <PhotoIcon className="h-3.5 w-3.5" /> Selfie
                            </h4>
                            <img
                              src={kycDetails.kyc.selfie}
                              alt="Selfie"
                              className="h-48 w-full rounded-xl border border-zinc-200 object-cover shadow-sm dark:border-zinc-700"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Update Status */}
                    <div className={sectionCardClass}>
                      <h3 className={sectionTitleClass}>
                        <ClipboardIcon className="h-4 w-4" /> Update KYC Status
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className={labelClass}>Verification Status</label>
                          <select
                            value={updateStatus}
                            onChange={(e) => setUpdateStatus(e.target.value)}
                            className={inputClass}
                          >
                            <option value="pending">Pending</option>
                            <option value="under_review">Under Review</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>
                        {updateStatus === 'rejected' && (
                          <div>
                            <label className={labelClass}>Rejection Reason</label>
                            <textarea
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              placeholder="Enter reason for rejection"
                              className={inputClass}
                              rows={3}
                            />
                          </div>
                        )}
                        <button
                          onClick={handleUpdateStatus}
                          disabled={updating}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition-all hover:shadow-lg hover:shadow-indigo-500/35 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                        >
                          {updating ? (
                            <>
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                              Updating…
                            </>
                          ) : (
                            <>
                              <CheckIcon className="h-4 w-4" />
                              Update Status
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/60 px-4 py-12 text-center dark:border-zinc-700 dark:bg-zinc-800/30">
                    <DocumentIcon className="mx-auto mb-3 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      No KYC record found for this user
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Asset Details Modal                                               */}
        {/* ---------------------------------------------------------------- */}
        {showAssetModal && selectedAsset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-200/60 bg-white shadow-2xl dark:border-zinc-700/60 dark:bg-zinc-900">
              <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500" />
              <div className="flex items-center justify-between border-b border-zinc-200/80 px-6 py-4 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                    <CubeIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                      Asset Review
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {selectedAsset.assetName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAssetModal(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  aria-label="Close"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="overflow-y-auto px-6 py-5">
                {assetLoading ? (
                  <div className="flex flex-col items-center gap-3 py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-zinc-200 border-t-amber-500 dark:border-zinc-700 dark:border-t-amber-400" />
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">Loading asset details…</div>
                  </div>
                ) : assetDetails ? (
                  <div className="space-y-5">
                    {/* Asset Owner Info */}
                    <div className={sectionCardClass}>
                      <h3 className={sectionTitleClass}>
                        <UserIcon className="h-4 w-4" /> Asset Owner
                      </h3>
                      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                        <div className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-2 dark:bg-zinc-800/60">
                          <span className="text-zinc-500 dark:text-zinc-400">Name</span>
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">{assetDetails.owner.name}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-2 dark:bg-zinc-800/60">
                          <span className="text-zinc-500 dark:text-zinc-400">Email</span>
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">{assetDetails.owner.email}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-2 dark:bg-zinc-800/60">
                          <span className="text-zinc-500 dark:text-zinc-400">Role</span>
                          <span className="font-medium capitalize text-zinc-900 dark:text-zinc-100">{assetDetails.owner.role}</span>
                        </div>
                      </div>
                    </div>

                    {/* Asset Info */}
                    <div className={sectionCardClass}>
                      <h3 className={sectionTitleClass}>
                        <CubeIcon className="h-4 w-4" /> Asset Information
                      </h3>
                      <div className="space-y-2.5 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 dark:text-zinc-400">Asset Name</span>
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">{assetDetails.asset.assetName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 dark:text-zinc-400">Type</span>
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">{getAssetTypeLabel(assetDetails.asset.assetType)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 dark:text-zinc-400">Valuation</span>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {assetDetails.asset.currency} {Number(assetDetails.asset.valuation).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 dark:text-zinc-400">Verification Status</span>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize tracking-wide ${getStatusBadgeColor(assetDetails.asset.verificationStatus)}`}>
                            {assetDetails.asset.verificationStatus.replace('_', ' ')}
                          </span>
                        </div>
                        {assetDetails.asset.riskScore !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-500 dark:text-zinc-400">Risk Score</span>
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{assetDetails.asset.riskScore}/100</span>
                          </div>
                        )}
                        {assetDetails.asset.clarityScore !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-500 dark:text-zinc-400">Document Quality</span>
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{Math.round(assetDetails.asset.clarityScore * 100)}%</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 dark:text-zinc-400">Document Authentic</span>
                          <span className={`inline-flex items-center gap-1.5 font-semibold ${assetDetails.asset.documentAuthentic ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            <span className={`h-2 w-2 rounded-full ${assetDetails.asset.documentAuthentic ? 'bg-green-500' : 'bg-red-500'}`} />
                            {assetDetails.asset.documentAuthentic ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 dark:text-zinc-400">Ownership Verified</span>
                          <span className={`inline-flex items-center gap-1.5 font-semibold ${assetDetails.asset.ownershipVerified ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            <span className={`h-2 w-2 rounded-full ${assetDetails.asset.ownershipVerified ? 'bg-green-500' : 'bg-red-500'}`} />
                            {assetDetails.asset.ownershipVerified ? 'Yes' : 'No'}
                          </span>
                        </div>
                        {assetDetails.asset.aiGenerated !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-500 dark:text-zinc-400">AI Generated</span>
                            <span className={`inline-flex items-center gap-1.5 font-semibold ${assetDetails.asset.aiGenerated ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                              <span className={`h-2 w-2 rounded-full ${assetDetails.asset.aiGenerated ? 'bg-red-500' : 'bg-green-500'}`} />
                              {assetDetails.asset.aiGenerated ? 'Yes' : 'No'}
                            </span>
                          </div>
                        )}
                        {assetDetails.asset.manipulationDetected !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-500 dark:text-zinc-400">Manipulation Detected</span>
                            <span className={`inline-flex items-center gap-1.5 font-semibold ${assetDetails.asset.manipulationDetected ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                              <span className={`h-2 w-2 rounded-full ${assetDetails.asset.manipulationDetected ? 'bg-red-500' : 'bg-green-500'}`} />
                              {assetDetails.asset.manipulationDetected ? 'Yes' : 'No'}
                            </span>
                          </div>
                        )}
                        {assetDetails.asset.duplicateOf && (
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-500 dark:text-zinc-400">Duplicate Document</span>
                            <span className="inline-flex items-center gap-1.5 font-semibold text-red-600 dark:text-red-400">
                              <span className="h-2 w-2 rounded-full bg-red-500" /> Yes
                            </span>
                          </div>
                        )}
                        {assetDetails.asset.rejectionReason && (
                          <div className="flex items-start justify-between gap-4">
                            <span className="text-zinc-500 dark:text-zinc-400">Rejection Reason</span>
                            <span className="text-right font-medium text-red-600 dark:text-red-400">{assetDetails.asset.rejectionReason}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Document Preview */}
                    {assetDetails.asset.document && (
                      <div className={sectionCardClass}>
                        <h3 className={sectionTitleClass}>
                          <PhotoIcon className="h-4 w-4" /> Asset Document
                        </h3>
                        <img
                          src={assetDetails.asset.document}
                          alt="Asset Document"
                          className="h-64 w-full rounded-xl border border-zinc-200 object-cover shadow-sm dark:border-zinc-700"
                        />
                      </div>
                    )}

                    {/* OCR Data */}
                    {assetDetails.asset.ocrData && (
                      <div className={sectionCardClass}>
                        <h3 className={sectionTitleClass}>
                          <DocumentIcon className="h-4 w-4" /> OCR Extracted Data
                        </h3>
                        <div className="space-y-2 text-sm">
                          {Object.entries(assetDetails.asset.ocrData).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-2 dark:bg-zinc-800/60">
                              <span className="capitalize text-zinc-500 dark:text-zinc-400">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </span>
                              <span className="font-medium text-zinc-900 dark:text-zinc-100">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Update Status */}
                    <div className={sectionCardClass}>
                      <h3 className={sectionTitleClass}>
                        <ClipboardIcon className="h-4 w-4" /> Update Asset Status
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className={labelClass}>Verification Status</label>
                          <select
                            value={assetUpdateStatus}
                            onChange={(e) => setAssetUpdateStatus(e.target.value)}
                            className={inputClass}
                          >
                            <option value="pending">Pending</option>
                            <option value="under_review">Under Review</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>
                        {assetUpdateStatus === 'rejected' && (
                          <div>
                            <label className={labelClass}>Rejection Reason</label>
                            <textarea
                              value={assetRejectionReason}
                              onChange={(e) => setAssetRejectionReason(e.target.value)}
                              placeholder="Enter reason for rejection"
                              className={inputClass}
                              rows={3}
                            />
                          </div>
                        )}
                        <button
                          onClick={handleUpdateAssetStatus}
                          disabled={assetUpdating}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-500/25 transition-all hover:shadow-lg hover:shadow-amber-500/35 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                        >
                          {assetUpdating ? (
                            <>
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                              Updating…
                            </>
                          ) : (
                            <>
                              <CheckIcon className="h-4 w-4" />
                              Update Status
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/60 px-4 py-12 text-center dark:border-zinc-700 dark:bg-zinc-800/30">
                    <ExclamationIcon className="mx-auto mb-3 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      No asset details found
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}