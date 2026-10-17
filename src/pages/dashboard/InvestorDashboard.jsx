import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { kycAPI } from '../../lib/api';

export default function InvestorDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [kycStatus, setKycStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [idNumber, setIdNumber] = useState('');

  useEffect(() => {
    fetchKYCStatus();
  }, []);

  // Update ID number when KYC status loads
  useEffect(() => {
    if (kycStatus?.idNumber) {
      setIdNumber(kycStatus.idNumber);
    }
  }, [kycStatus]);

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
            Investor Dashboard
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
      </main>
    </div>
  );
}
