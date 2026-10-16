import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { kycAPI } from '../../lib/api';

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
  });
  const [assetFiles, setAssetFiles] = useState({
    deed: null,
    surveyPlan: null,
    extracts: null,
    priorDeeds: null,
    certificates: null,
  });
  const [assetUploading, setAssetUploading] = useState(false);
  const [verifyingAssetId, setVerifyingAssetId] = useState(null);
  const [expandedAssetId, setExpandedAssetId] = useState(null);

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

    // Add required documents
    if (assetFiles.deed) formData.append('deed', assetFiles.deed);
    if (assetFiles.surveyPlan) formData.append('surveyPlan', assetFiles.surveyPlan);

    // Add optional documents
    if (assetFiles.extracts) formData.append('extracts', assetFiles.extracts);
    if (assetFiles.priorDeeds) formData.append('priorDeeds', assetFiles.priorDeeds);
    if (assetFiles.certificates) formData.append('certificates', assetFiles.certificates);

    try {
      const response = await kycAPI.uploadAsset(formData);
      console.log('Asset upload response:', response.data);

      // Reset form
      setAssetUploadData({
        assetName: '',
        assetType: 'real_estate',
        valuation: '',
        currency: 'USD',
      });
      setAssetFiles({
        deed: null,
        surveyPlan: null,
        extracts: null,
        priorDeeds: null,
        certificates: null,
      });

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
            Asset Owner Dashboard
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
                onClick={() => setActiveTab('kyc')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'kyc'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-300'
                }`}
              >
                KYC Verification
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

          {/* KYC Tab */}
          {activeTab === 'kyc' && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* KYC Status Card */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6">
                  <h2 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
                    KYC Status
                  </h2>
                  {kycStatus ? (
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-zinc-600 dark:text-zinc-400">Status:</span>
                        <span className={`font-medium ${
                          kycStatus.verificationStatus === 'approved' ? 'text-green-600' :
                          kycStatus.verificationStatus === 'rejected' ? 'text-red-600' :
                          'text-yellow-600'
                        }`}>
                          {kycStatus.verificationStatus.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600 dark:text-zinc-400">Face Score:</span>
                        <span className="font-medium">{kycStatus.faceScore || 'N/A'}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600 dark:text-zinc-400">Risk Score:</span>
                        <span className="font-medium">{kycStatus.riskScore || 'N/A'}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600 dark:text-zinc-400">Document Authentic:</span>
                        <span className={`font-medium ${kycStatus.documentAuthentic ? 'text-green-600' : 'text-red-600'}`}>
                          {kycStatus.documentAuthentic ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-zinc-600 dark:text-zinc-400">
                      No KYC record found. Please upload your documents.
                    </p>
                  )}
                </div>

                {/* Document Upload Card */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6">
                  <h2 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
                    Upload Documents
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        ID Number
                      </label>
                      <input
                        type="text"
                        value={idNumber}
                        onChange={(e) => setIdNumber(e.target.value)}
                        placeholder="Enter your ID number"
                        className="w-full px-4 py-2 rounded-lg border border-zinc-300 bg-white dark:bg-zinc-800 dark:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={kycStatus?.documentImage}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        ID Document
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleDocumentUpload}
                        disabled={uploading || kycStatus?.documentImage}
                        className="w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                      />
                      {kycStatus?.documentImage && (
                        <p className="text-sm text-green-600 mt-1">Document uploaded ✓</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Selfie
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleSelfieUpload}
                        disabled={uploading || kycStatus?.selfie}
                        className="w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                      />
                      {kycStatus?.selfie && (
                        <p className="text-sm text-green-600 mt-1">Selfie uploaded ✓</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Verification Card */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6 md:col-span-2">
                  <h2 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
                    KYC Verification
                  </h2>
                  <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                    Run the complete KYC verification pipeline including OCR, face verification, and risk analysis.
                  </p>
                  <div className="flex gap-4">
                    <button
                      onClick={handleVerification}
                      disabled={verifying || !kycStatus?.documentImage || !kycStatus?.selfie}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {verifying ? 'Running Verification...' : 'Start KYC Verification'}
                    </button>
                    <button
                      onClick={fetchKYCStatus}
                      disabled={loading}
                      className="bg-zinc-200 hover:bg-zinc-300 text-zinc-900 dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:text-zinc-100 font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Refresh Status
                    </button>
                  </div>
                  {(!kycStatus?.documentImage || !kycStatus?.selfie) && (
                    <p className="text-sm text-zinc-500 mt-2">
                      Please upload both document and selfie before verification.
                    </p>
                  )}
                  {kycStatus?.documentImage && kycStatus?.selfie && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ Both documents uploaded - Ready for verification
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Assets Tab */}
          {activeTab === 'assets' && (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Asset Upload Form */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6">
                  <h2 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
                    Upload New Asset
                  </h2>
                  <form onSubmit={handleAssetUpload} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Asset Name
                      </label>
                      <input
                        type="text"
                        value={assetUploadData.assetName}
                        onChange={(e) => setAssetUploadData({ ...assetUploadData, assetName: e.target.value })}
                        placeholder="Enter asset name"
                        className="w-full px-4 py-2 rounded-lg border border-zinc-300 bg-white dark:bg-zinc-800 dark:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Asset Type
                      </label>
                      <select
                        value={assetUploadData.assetType}
                        onChange={(e) => setAssetUploadData({ ...assetUploadData, assetType: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-zinc-300 bg-white dark:bg-zinc-800 dark:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="real_estate">Real Estate</option>
                        <option value="vehicle">Vehicle</option>
                        <option value="equipment">Equipment</option>
                        <option value="intellectual_property">Intellectual Property</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Valuation
                      </label>
                      <input
                        type="number"
                        value={assetUploadData.valuation}
                        onChange={(e) => setAssetUploadData({ ...assetUploadData, valuation: e.target.value })}
                        placeholder="Enter asset value"
                        className="w-full px-4 py-2 rounded-lg border border-zinc-300 bg-white dark:bg-zinc-800 dark:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Currency
                      </label>
                      <select
                        value={assetUploadData.currency}
                        onChange={(e) => setAssetUploadData({ ...assetUploadData, currency: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-zinc-300 bg-white dark:bg-zinc-800 dark:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="NGN">NGN</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Deed Document (Required)
                      </label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setAssetFiles({ ...assetFiles, deed: e.target.files?.[0] })}
                        className="w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Survey Plan (Required)
                      </label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setAssetFiles({ ...assetFiles, surveyPlan: e.target.files?.[0] })}
                        className="w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Extracts (Optional)
                      </label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setAssetFiles({ ...assetFiles, extracts: e.target.files?.[0] })}
                        className="w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Prior Deeds (Optional)
                      </label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setAssetFiles({ ...assetFiles, priorDeeds: e.target.files?.[0] })}
                        className="w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Certificates (Optional)
                      </label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setAssetFiles({ ...assetFiles, certificates: e.target.files?.[0] })}
                        className="w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={assetUploading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {assetUploading ? 'Uploading...' : 'Upload Asset'}
                    </button>
                  </form>
                </div>

                {/* Assets List */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6">
                  <h2 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
                    My Assets
                  </h2>
                  {assetLoading ? (
                    <div className="text-center py-8">
                      <div className="text-lg">Loading assets...</div>
                    </div>
                  ) : assets.length === 0 ? (
                    <p className="text-zinc-600 dark:text-zinc-400 text-center py-8">
                      No assets uploaded yet
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {assets.map((asset) => (
                        <div key={asset.assetId} className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                                {asset.assetName}
                              </h3>
                              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                {getAssetTypeLabel(asset.assetType)}
                              </p>
                              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                {asset.currency} {Number(asset.valuation).toLocaleString()}
                              </p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAssetStatusColor(asset.verificationStatus)}`}>
                              {asset.verificationStatus.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="mt-4 flex gap-2">
                            <button
                              onClick={() => toggleAssetExpansion(asset.assetId)}
                              className="text-sm text-blue-600 hover:text-blue-700"
                            >
                              {expandedAssetId === asset.assetId ? 'Hide Details' : 'View Details'}
                            </button>
                            {!asset.verificationStatus || asset.verificationStatus === 'pending' ? (
                              <button
                                onClick={() => handleAssetVerification(asset.assetId)}
                                disabled={verifyingAssetId === asset.assetId}
                                className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded disabled:opacity-50"
                              >
                                {verifyingAssetId === asset.assetId ? 'Verifying...' : 'Verify'}
                              </button>
                            ) : null}
                          </div>
                          {expandedAssetId === asset.assetId && (
                            <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700 text-sm">
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-zinc-600 dark:text-zinc-400">Risk Score:</span>
                                  <span className="text-zinc-900 dark:text-zinc-100">
                                    {asset.riskScore !== undefined ? `${asset.riskScore}/100` : 'N/A'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-zinc-600 dark:text-zinc-400">Document Authentic:</span>
                                  <span className={`font-medium ${asset.documentAuthentic ? 'text-green-600' : 'text-red-600'}`}>
                                    {asset.documentAuthentic ? 'Yes' : 'No'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-zinc-600 dark:text-zinc-400">Ownership Verified:</span>
                                  <span className={`font-medium ${asset.ownershipVerified ? 'text-green-600' : 'text-red-600'}`}>
                                    {asset.ownershipVerified ? 'Yes' : 'No'}
                                  </span>
                                </div>
                                {asset.rejectionReason && (
                                  <div className="flex justify-between">
                                    <span className="text-zinc-600 dark:text-zinc-400">Rejection Reason:</span>
                                    <span className="text-red-600">{asset.rejectionReason}</span>
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
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
