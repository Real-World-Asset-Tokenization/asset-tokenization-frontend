import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { kycAPI } from '../../lib/api';

/* ------------------------------------------------------------------ */
/*  Presentational icon components (decoration only – no logic)        */
/* ------------------------------------------------------------------ */
const ShieldCheckIcon = ({ className = 'h-5 w-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
  </svg>
);

const CubeIcon = ({ className = 'h-5 w-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
  </svg>
);

const UploadIcon = ({ className = 'h-5 w-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const CheckIcon = ({ className = 'h-5 w-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
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

const SparklesIcon = ({ className = 'h-5 w-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
  </svg>
);

const UserIcon = ({ className = 'h-5 w-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
  </svg>
);

const MapPinIcon = ({ className = 'h-5 w-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
  </svg>
);

/* Shared decorative class strings */
const inputClass =
  'w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500/60 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100 dark:placeholder-zinc-500';

const fileClass =
  'block w-full cursor-pointer text-sm text-zinc-500 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 transition hover:file:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:file:bg-blue-500/10 dark:file:text-blue-300 dark:hover:file:bg-blue-500/20 dark:text-zinc-400';

const labelClass = 'mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300';

export default function AssetOwnerDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [kycStatus, setKycStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [activeTab, setActiveTab] = useState('kyc');
  const [assets, setAssets] = useState([]);
  const [assetLoading, setAssetLoading] = useState(false);
  const [assetUploadData, setAssetUploadData] = useState({
    assetName: '',
    assetType: 'real_estate',
    valuation: '',
    currency: 'USD',
    location: '',
    latitude: null,
    longitude: null,
    address: '',
  });
  const [assetFiles, setAssetFiles] = useState({
    deed: null,
    surveyPlan: null,
    extracts: null,
    priorDeeds: null,
    certificates: null,
  });
  const [assetImages, setAssetImages] = useState([]);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [assetUploading, setAssetUploading] = useState(false);
  const [verifyingAssetId, setVerifyingAssetId] = useState(null);
  const [expandedAssetId, setExpandedAssetId] = useState(null);
  const [tokenizationStatus, setTokenizationStatus] = useState(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentingAssetId, setConsentingAssetId] = useState(null);
  const [consenting, setConsenting] = useState(false);

  useEffect(() => {
    fetchKYCStatus();
    fetchAssets();
  }, []);

  // Update ID number when KYC status loads
  useEffect(() => {
    if (kycStatus?.idNumber) {
      setIdNumber(kycStatus.idNumber);
    }
  }, [kycStatus]);

  const fetchAssets = async () => {
    setAssetLoading(true);
    try {
      const response = await kycAPI.getUserAssets();
      setAssets(response.data.data.assets);
    } catch (err) {
      console.error('Fetch assets error:', err);
      // Don't show error if no assets exist
      if (err.response?.status !== 404) {
        setError('Failed to fetch assets: ' + (err.response?.data?.message || err.message));
      }
    } finally {
      setAssetLoading(false);
    }
  };

  const fetchKYCStatus = async () => {
    try {
      const response = await kycAPI.getKYCStatus();
      const kycData = response.data.data;
      console.log('KYC Status data:', kycData);
      console.log('Document image:', kycData?.documentImage);
      console.log('Selfie:', kycData?.selfie);
      setKycStatus(kycData);
    } catch (err) {
      console.error('KYC status error:', err);
      if (err.response?.status === 404) {
        setKycStatus(null); // No KYC record exists
      } else {
        setError('Failed to fetch KYC status: ' + (err.response?.data?.message || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!idNumber.trim()) {
      setError('Please enter your ID number before uploading the document');
      return;
    }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('document', file);
    formData.append('idType', 'national_id');
    formData.append('idNumber', idNumber);

    try {
      const response = await kycAPI.uploadDocument(formData);
      console.log('Document upload response:', response.data);
      await fetchKYCStatus();
    } catch (err) {
      console.error('Document upload error:', err);
      setError(err.response?.data?.message || 'Document upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSelfieUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('selfie', file);

    try {
      const response = await kycAPI.uploadSelfie(formData);
      console.log('Selfie upload response:', response.data);
      await fetchKYCStatus();
    } catch (err) {
      console.error('Selfie upload error:', err);
      setError(err.response?.data?.message || 'Selfie upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleVerification = async () => {
    setVerifying(true);
    setError('');

    try {
      await kycAPI.runPipeline();
      await fetchKYCStatus();
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleFetchLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setFetchingLocation(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Use reverse geocoding to get address (using OpenStreetMap Nominatim API)
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();

          setAssetUploadData({
            ...assetUploadData,
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            address: data.display_name || '',
            location: data.display_name || `${latitude}, ${longitude}`,
          });
        } catch (err) {
          // If geocoding fails, just use coordinates
          setAssetUploadData({
            ...assetUploadData,
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            location: `${latitude}, ${longitude}`,
          });
        } finally {
          setFetchingLocation(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setError('Unable to retrieve your location. Please enter it manually.');
        setFetchingLocation(false);
      }
    );
  };

  const handleAssetUpload = async (e) => {
    e.preventDefault();

    // Validate required documents
    if (!assetFiles.deed || !assetFiles.surveyPlan) {
      setError('Deed and Survey Plan are required documents');
      return;
    }

    setAssetUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('assetName', assetUploadData.assetName);
    formData.append('assetType', assetUploadData.assetType);
    formData.append('valuation', assetUploadData.valuation);
    formData.append('currency', assetUploadData.currency);
    formData.append('location', assetUploadData.location);
    formData.append('latitude', assetUploadData.latitude || '');
    formData.append('longitude', assetUploadData.longitude || '');
    formData.append('address', assetUploadData.address || '');

    // Add required documents
    if (assetFiles.deed) formData.append('deed', assetFiles.deed);
    if (assetFiles.surveyPlan) formData.append('surveyPlan', assetFiles.surveyPlan);

    // Add optional documents
    if (assetFiles.extracts) formData.append('extracts', assetFiles.extracts);
    if (assetFiles.priorDeeds) formData.append('priorDeeds', assetFiles.priorDeeds);
    if (assetFiles.certificates) formData.append('certificates', assetFiles.certificates);

    // Add asset images (up to 5)
    assetImages.forEach((image) => {
      formData.append('images', image);
    });

    try {
      const response = await kycAPI.uploadAsset(formData);
      console.log('Asset upload response:', response.data);

      // Reset form
      setAssetUploadData({
        assetName: '',
        assetType: 'real_estate',
        valuation: '',
        currency: 'USD',
        location: '',
        latitude: null,
        longitude: null,
        address: '',
      });
      setAssetFiles({
        deed: null,
        surveyPlan: null,
        extracts: null,
        priorDeeds: null,
        certificates: null,
      });
      setAssetImages([]);

      // Refresh assets list
      await fetchAssets();
    } catch (err) {
      console.error('Asset upload error:', err);
      setError(err.response?.data?.message || 'Asset upload failed');
    } finally {
      setAssetUploading(false);
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

  const getAssetStatusColor = (status) => {
    switch (status) {
      case 'approved':
      case 'Tokenized':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'under_review':
      case 'awaiting_consent':
      case 'spv_creation':
      case 'ownership_transfer':
      case 'ready_for_tokenization':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'pending':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getAssetStatusLabel = (status) => {
    const labels = {
      'pending': 'Pending',
      'under_review': 'Under Review',
      'approved': 'Approved',
      'rejected': 'Rejected',
      'awaiting_consent': 'Awaiting Consent',
      'spv_creation': 'Creating SPV',
      'ownership_transfer': 'Transferring Ownership',
      'ready_for_tokenization': 'Ready for Tokenization',
      'Tokenized': 'Tokenized',
    };
    return labels[status] || status.replace('_', ' ');
  };

  const getProgressStepLabel = (step) => {
    const labels = {
      'document_approval': 'Document Approved',
      'owner_consent': 'Owner Consent',
      'spv_creation': 'SPV Creation',
      'ownership_transfer': 'Ownership Transfer',
      'blockchain_tokenization': 'Blockchain Tokenization',
      'complete': 'Complete',
    };
    return labels[step] || step.replace('_', ' ');
  };

  const handleAssetVerification = async (assetId) => {
    setVerifyingAssetId(assetId);
    setError('');

    try {
      const response = await kycAPI.verifyAsset(assetId);
      console.log('Asset verification response:', response.data);

      // Refresh assets to show updated status
      await fetchAssets();

      // Expand the verified asset to show results
      setExpandedAssetId(assetId);
    } catch (err) {
      console.error('Asset verification error:', err);
      setError(err.response?.data?.message || 'Asset verification failed');
    } finally {
      setVerifyingAssetId(null);
    }
  };

  const toggleAssetExpansion = (assetId) => {
    setExpandedAssetId(expandedAssetId === assetId ? null : assetId);
  };

  const fetchTokenizationStatus = async (assetId) => {
    try {
      const response = await kycAPI.getTokenizationStatus(assetId);
      setTokenizationStatus(response.data.data);
    } catch (err) {
      console.error('Fetch tokenization status error:', err);
    }
  };

  const handleConsentClick = (assetId) => {
    setConsentingAssetId(assetId);
    setShowConsentModal(true);
  };

  const handleConfirmConsent = async () => {
    if (!consentingAssetId) return;

    setConsenting(true);
    setError('');

    try {
      const response = await kycAPI.confirmTokenizationConsent(consentingAssetId);
      setShowConsentModal(false);
      setConsentingAssetId(null);

      // Refresh assets and tokenization status
      await fetchAssets();
      await fetchTokenizationStatus(consentingAssetId);

      // Show success message based on response
      if (response.data.data.alreadyProvided) {
        alert(response.data.message);
      } else if (response.data.data.blockchainSkipped) {
        alert('Consent recorded successfully! SPV created and ownership transferred. Blockchain tokenization will complete when the blockchain node is running.');
      } else {
        alert('Consent recorded successfully! SPV created, ownership transferred, and blockchain tokenization completed.');
      }
    } catch (err) {
      console.error('Confirm consent error:', err);
      setError(err.response?.data?.message || 'Failed to confirm consent');
    } finally {
      setConsenting(false);
    }
  };

  const handleCancelConsent = () => {
    setShowConsentModal(false);
    setConsentingAssetId(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 via-white to-blue-50 dark:from-black dark:via-zinc-950 dark:to-zinc-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-200 border-t-blue-600 dark:border-zinc-800 dark:border-t-blue-500" />
          <p className="text-sm font-medium tracking-wide text-zinc-500 dark:text-zinc-400">
            Loading your dashboard…
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
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
              <ShieldCheckIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50">
                Asset Owner Dashboard
              </h1>
              <p className="hidden text-xs text-zinc-500 dark:text-zinc-400 sm:block">
                KYC verification &amp; asset tokenization
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 rounded-full border border-zinc-200 bg-white/70 py-1.5 pl-1.5 pr-4 dark:border-zinc-700 dark:bg-zinc-800/60 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-sm font-bold text-white shadow-sm">
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
              onClick={() => setActiveTab('kyc')}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                activeTab === 'kyc'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
              }`}
            >
              <ShieldCheckIcon className="h-4 w-4" />
              KYC Verification
            </button>
            <button
              onClick={() => setActiveTab('assets')}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                activeTab === 'assets'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
              }`}
            >
              <CubeIcon className="h-4 w-4" />
              Asset Management
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* KYC Tab                                                           */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === 'kyc' && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* KYC Status Card */}
            <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-lg shadow-zinc-200/40 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/40">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  <ShieldCheckIcon className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  KYC Status
                </h2>
              </div>

              {kycStatus ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800/50">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">Status</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold tracking-wide ${
                      kycStatus.verificationStatus === 'approved'
                        ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300'
                        : kycStatus.verificationStatus === 'rejected'
                          ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300'
                    }`}>
                      {kycStatus.verificationStatus.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-zinc-200/70 bg-gradient-to-br from-white to-zinc-50 p-3 dark:border-zinc-700/60 dark:from-zinc-800/40 dark:to-zinc-900/40">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Face Score
                      </p>
                      <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-50">
                        {kycStatus.faceScore || 'N/A'}%
                      </p>
                    </div>
                    <div className="rounded-xl border border-zinc-200/70 bg-gradient-to-br from-white to-zinc-50 p-3 dark:border-zinc-700/60 dark:from-zinc-800/40 dark:to-zinc-900/40">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Risk Score
                      </p>
                      <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-50">
                        {kycStatus.riskScore || 'N/A'}/100
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-zinc-200/70 px-4 py-3 dark:border-zinc-700/60">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      Document Authentic
                    </span>
                    <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                      kycStatus.documentAuthentic ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      <span className={`h-2 w-2 rounded-full ${kycStatus.documentAuthentic ? 'bg-green-500' : 'bg-red-500'}`} />
                      {kycStatus.documentAuthentic ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/60 px-4 py-8 text-center dark:border-zinc-700 dark:bg-zinc-800/30">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    No KYC record found. Please upload your documents.
                  </p>
                </div>
              )}
            </div>

            {/* Document Upload Card */}
            <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-lg shadow-zinc-200/40 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/40">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500" />
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <UploadIcon className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Upload Documents
                </h2>
              </div>

              <div className="space-y-5">
                <div>
                  <label className={labelClass}>ID Number</label>
                  <input
                    type="text"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="Enter your ID number"
                    className={inputClass}
                    disabled={kycStatus?.documentImage}
                  />
                </div>

                <div>
                  <label className={`${labelClass} flex items-center gap-2`}>
                    <DocumentIcon className="h-4 w-4 text-blue-500" />
                    ID Document
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleDocumentUpload}
                    disabled={uploading || kycStatus?.documentImage}
                    className={fileClass}
                  />
                  {kycStatus?.documentImage && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400">
                      <CheckIcon className="h-4 w-4" /> Document uploaded
                    </p>
                  )}
                </div>

                <div>
                  <label className={`${labelClass} flex items-center gap-2`}>
                    <PhotoIcon className="h-4 w-4 text-blue-500" />
                    Selfie
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSelfieUpload}
                    disabled={uploading || kycStatus?.selfie}
                    className={fileClass}
                  />
                  {kycStatus?.selfie && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400">
                      <CheckIcon className="h-4 w-4" /> Selfie uploaded
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Verification Card */}
            <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-lg shadow-zinc-200/40 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/40 md:col-span-2">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <SparklesIcon className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  KYC Verification
                </h2>
              </div>

              <p className="mb-5 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Run the complete KYC verification pipeline including OCR, face verification, and risk analysis.
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleVerification}
                  disabled={verifying || !kycStatus?.documentImage || !kycStatus?.selfie}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition-all hover:shadow-lg hover:shadow-blue-500/35 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  {verifying ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Running Verification…
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="h-4 w-4" />
                      Start KYC Verification
                    </>
                  )}
                </button>

                <button
                  onClick={fetchKYCStatus}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-6 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  <RefreshIcon className="h-4 w-4" />
                  Refresh Status
                </button>
              </div>

              {(!kycStatus?.documentImage || !kycStatus?.selfie) && (
                <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                  Please upload both document and selfie before verification.
                </p>
              )}
              {kycStatus?.documentImage && kycStatus?.selfie && (
                <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400">
                  <CheckIcon className="h-4 w-4" /> Both documents uploaded — ready for verification
                </p>
              )}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Assets Tab                                                        */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === 'assets' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Asset Upload Form */}
            <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-lg shadow-zinc-200/40 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/40">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-sky-500 to-cyan-500" />
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  <UploadIcon className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Upload New Asset
                </h2>
              </div>

              <form onSubmit={handleAssetUpload} className="space-y-4">
                <div>
                  <label className={labelClass}>Asset Name</label>
                  <input
                    type="text"
                    value={assetUploadData.assetName}
                    onChange={(e) => setAssetUploadData({ ...assetUploadData, assetName: e.target.value })}
                    placeholder="Enter asset name"
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>Asset Type</label>
                  <select
                    value={assetUploadData.assetType}
                    onChange={(e) => setAssetUploadData({ ...assetUploadData, assetType: e.target.value })}
                    className={inputClass}
                    required
                  >
                    <option value="real_estate">Real Estate</option>
                    <option value="vehicle">Vehicle</option>
                    <option value="equipment">Equipment</option>
                    <option value="intellectual_property">Intellectual Property</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Valuation</label>
                    <input
                      type="number"
                      value={assetUploadData.valuation}
                      onChange={(e) => setAssetUploadData({ ...assetUploadData, valuation: e.target.value })}
                      placeholder="Enter asset value"
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Currency</label>
                    <select
                      value={assetUploadData.currency}
                      onChange={(e) => setAssetUploadData({ ...assetUploadData, currency: e.target.value })}
                      className={inputClass}
                      required
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="NGN">NGN</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Location</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={assetUploadData.location}
                      onChange={(e) => setAssetUploadData({ ...assetUploadData, location: e.target.value })}
                      placeholder="Enter asset location"
                      className={inputClass}
                      required
                    />
                    <button
                      type="button"
                      onClick={handleFetchLocation}
                      disabled={fetchingLocation}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      title="Get current location"
                    >
                      {fetchingLocation ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                          Locating...
                        </>
                      ) : (
                        <>
                          <MapPinIcon className="h-4 w-4" />
                          Get Location
                        </>
                      )}
                    </button>
                  </div>
                  {assetUploadData.latitude && assetUploadData.longitude && (
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Coordinates: {assetUploadData.latitude}, {assetUploadData.longitude}
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-4 dark:border-zinc-700/60 dark:bg-zinc-800/30">
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Asset Images (up to 5)
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files);
                      if (files.length > 5) {
                        setError('Maximum 5 images allowed');
                        return;
                      }
                      setAssetImages(files);
                    }}
                    className={fileClass}
                  />
                  {assetImages.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {assetImages.map((file, index) => (
                        <div key={index} className="relative w-16 h-16 rounded-lg overflow-hidden border border-zinc-300">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newImages = assetImages.filter((_, i) => i !== index);
                              setAssetImages(newImages);
                            }}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {assetImages.length}/5 images selected
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-4 dark:border-zinc-700/60 dark:bg-zinc-800/30">
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Supporting Documents
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>
                        Deed Document <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setAssetFiles({ ...assetFiles, deed: e.target.files?.[0] })}
                        className={fileClass}
                        required
                      />
                    </div>

                    <div>
                      <label className={labelClass}>
                        Survey Plan <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setAssetFiles({ ...assetFiles, surveyPlan: e.target.files?.[0] })}
                        className={fileClass}
                        required
                      />
                    </div>

                    <div>
                      <label className={`${labelClass} flex items-center gap-2`}>
                        Extracts
                        <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                          Optional
                        </span>
                      </label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setAssetFiles({ ...assetFiles, extracts: e.target.files?.[0] })}
                        className={fileClass}
                      />
                    </div>

                    <div>
                      <label className={`${labelClass} flex items-center gap-2`}>
                        Prior Deeds
                        <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                          Optional
                        </span>
                      </label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setAssetFiles({ ...assetFiles, priorDeeds: e.target.files?.[0] })}
                        className={fileClass}
                      />
                    </div>

                    <div>
                      <label className={`${labelClass} flex items-center gap-2`}>
                        Certificates
                        <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                          Optional
                        </span>
                      </label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setAssetFiles({ ...assetFiles, certificates: e.target.files?.[0] })}
                        className={fileClass}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={assetUploading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition-all hover:shadow-lg hover:shadow-blue-500/35 hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  {assetUploading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <UploadIcon className="h-4 w-4" />
                      Upload Asset
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Assets List */}
            <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-lg shadow-zinc-200/40 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/40">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500" />
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                  <CubeIcon className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  My Assets
                </h2>
              </div>

              {assetLoading ? (
                <div className="flex flex-col items-center gap-3 py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-zinc-200 border-t-blue-600 dark:border-zinc-700 dark:border-t-blue-500" />
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">Loading assets…</div>
                </div>
              ) : assets.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/60 px-4 py-12 text-center dark:border-zinc-700 dark:bg-zinc-800/30">
                  <CubeIcon className="mx-auto mb-3 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    No assets uploaded yet
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assets.map((asset) => (
                    <div
                      key={asset.assetId}
                      className="rounded-xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50/60 p-4 transition-all hover:border-blue-300 hover:shadow-md dark:border-zinc-700 dark:from-zinc-800/40 dark:to-zinc-900/40 dark:hover:border-blue-700"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate font-semibold text-zinc-900 dark:text-zinc-50">
                            {asset.assetName}
                          </h3>
                          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                            {getAssetTypeLabel(asset.assetType)}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                            {asset.currency} {Number(asset.valuation).toLocaleString()}
                          </p>
                        </div>
                        <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide ${getAssetStatusColor(asset.status || asset.verificationStatus)}`}>
                          {getAssetStatusLabel(asset.status || asset.verificationStatus)}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => toggleAssetExpansion(asset.assetId)}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-500/10"
                        >
                          {expandedAssetId === asset.assetId ? 'Hide Details' : 'View Details'}
                        </button>

                        {!asset.verificationStatus || asset.verificationStatus === 'pending' ? (
                          <button
                            onClick={() => handleAssetVerification(asset.assetId)}
                            disabled={verifyingAssetId === asset.assetId}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
                          >
                            {verifyingAssetId === asset.assetId ? 'Verifying…' : 'Verify'}
                          </button>
                        ) : null}

                        {asset.verificationStatus === 'approved' && !asset.tokenizationConsent && asset.status !== 'ready_for_tokenization' && asset.status !== 'Tokenized' && (
                          <button
                            onClick={() => handleConsentClick(asset.assetId)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 active:scale-[0.98]"
                          >
                            <SparklesIcon className="h-3.5 w-3.5" />
                            Proceed with Tokenization
                          </button>
                        )}
                      </div>

                      {expandedAssetId === asset.assetId && (
                        <div className="mt-4 border-t border-zinc-200 pt-4 text-sm dark:border-zinc-700">
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-zinc-500 dark:text-zinc-400">Risk Score</span>
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                {asset.riskScore !== undefined ? `${asset.riskScore}/100` : 'N/A'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-zinc-500 dark:text-zinc-400">Document Authentic</span>
                              <span className={`inline-flex items-center gap-1.5 font-semibold ${
                                asset.documentAuthentic ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                              }`}>
                                <span className={`h-2 w-2 rounded-full ${asset.documentAuthentic ? 'bg-green-500' : 'bg-red-500'}`} />
                                {asset.documentAuthentic ? 'Yes' : 'No'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-zinc-500 dark:text-zinc-400">Ownership Verified</span>
                              <span className={`inline-flex items-center gap-1.5 font-semibold ${
                                asset.ownershipVerified ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                              }`}>
                                <span className={`h-2 w-2 rounded-full ${asset.ownershipVerified ? 'bg-green-500' : 'bg-red-500'}`} />
                                {asset.ownershipVerified ? 'Yes' : 'No'}
                              </span>
                            </div>
                            {asset.rejectionReason && (
                              <div className="flex items-start justify-between gap-4">
                                <span className="text-zinc-500 dark:text-zinc-400">Rejection Reason</span>
                                <span className="text-right font-medium text-red-600 dark:text-red-400">
                                  {asset.rejectionReason}
                                </span>
                              </div>
                            )}

                            {asset.verificationStatus === 'approved' && (
                              <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                                <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                  <SparklesIcon className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                                  Tokenization Progress
                                </p>

                                <div className="relative pl-6">
                                  <div className="absolute bottom-2 left-[7px] top-2 w-px bg-zinc-200 dark:bg-zinc-700" />
                                  <div className="space-y-3">
                                    {/* Document Approved */}
                                    <div className="relative">
                                      <span className="absolute -left-6 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 ring-4 ring-green-500/15">
                                        <CheckIcon className="h-2.5 w-2.5 text-white" />
                                      </span>
                                      <span className="text-sm text-zinc-700 dark:text-zinc-300">
                                        Document Approved
                                      </span>
                                    </div>

                                    {/* Owner Consent */}
                                    <div className="relative">
                                      {asset.tokenizationConsent || asset.status === 'ready_for_tokenization' || asset.status === 'Tokenized' ? (
                                        <span className="absolute -left-6 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 ring-4 ring-green-500/15">
                                          <CheckIcon className="h-2.5 w-2.5 text-white" />
                                        </span>
                                      ) : (
                                        <span className="absolute -left-6 top-0.5 h-4 w-4 rounded-full border-2 border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900" />
                                      )}
                                      <span className="text-sm text-zinc-700 dark:text-zinc-300">
                                        Owner Consent
                                      </span>
                                    </div>

                                    {/* SPV Creation */}
                                    <div className="relative">
                                      {asset.spvCreated || asset.status === 'ready_for_tokenization' || asset.status === 'Tokenized' ? (
                                        <span className="absolute -left-6 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 ring-4 ring-green-500/15">
                                          <CheckIcon className="h-2.5 w-2.5 text-white" />
                                        </span>
                                      ) : (
                                        <span className="absolute -left-6 top-0.5 h-4 w-4 rounded-full border-2 border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900" />
                                      )}
                                      <span className="text-sm text-zinc-700 dark:text-zinc-300">
                                        SPV Creation
                                      </span>
                                    </div>

                                    {/* Ownership Transfer */}
                                    <div className="relative">
                                      {asset.ownershipTransferred || asset.status === 'ready_for_tokenization' || asset.status === 'Tokenized' ? (
                                        <span className="absolute -left-6 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 ring-4 ring-green-500/15">
                                          <CheckIcon className="h-2.5 w-2.5 text-white" />
                                        </span>
                                      ) : (
                                        <span className="absolute -left-6 top-0.5 h-4 w-4 rounded-full border-2 border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900" />
                                      )}
                                      <span className="text-sm text-zinc-700 dark:text-zinc-300">
                                        Ownership Transfer
                                      </span>
                                    </div>

                                    {/* Blockchain Tokenization */}
                                    <div className="relative">
                                      {asset.status === 'Tokenized' || asset.status === 'ready_for_tokenization' ? (
                                        <span className="absolute -left-6 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 ring-4 ring-green-500/15">
                                          <CheckIcon className="h-2.5 w-2.5 text-white" />
                                        </span>
                                      ) : (
                                        <span className="absolute -left-6 top-0.5 h-4 w-4 rounded-full border-2 border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900" />
                                      )}
                                      <span className="text-sm text-zinc-700 dark:text-zinc-300">
                                        Blockchain Tokenization
                                        {asset.status === 'ready_for_tokenization' && (
                                          <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300">
                                            Pending blockchain node
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* Consent Modal                                                        */}
      {/* ------------------------------------------------------------------ */}
      {showConsentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200/60 bg-white shadow-2xl dark:border-zinc-700/60 dark:bg-zinc-900">
            <div className="h-1.5 w-full bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500" />
            <div className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25">
                  <SparklesIcon className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                  Proceed with Tokenization
                </h2>
              </div>

              <p className="mb-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Your asset has been approved for tokenization. Do you agree to proceed with the following steps:
              </p>

              <ul className="mb-4 space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-zinc-600 dark:text-zinc-400">
                  <CheckIcon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-500" />
                  Create a Special Purpose Vehicle (SPV) for your asset
                </li>
                <li className="flex items-start gap-2.5 text-sm text-zinc-600 dark:text-zinc-400">
                  <CheckIcon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-500" />
                  Transfer ownership of the asset to the company via the SPV
                </li>
                <li className="flex items-start gap-2.5 text-sm text-zinc-600 dark:text-zinc-400">
                  <CheckIcon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-500" />
                  Initiate blockchain tokenization
                </li>
              </ul>

              <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-3 text-xs text-amber-700 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-300">
                <AlertIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>
                  Note: This process is irreversible. Please ensure you understand the implications before proceeding.
                </span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleConfirmConsent}
                  disabled={consenting}
                  className="flex-1 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-green-500/25 transition-all hover:shadow-lg hover:shadow-green-500/35 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  {consenting ? 'Processing…' : 'I Agree, Proceed'}
                </button>
                <button
                  onClick={handleCancelConsent}
                  disabled={consenting}
                  className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}