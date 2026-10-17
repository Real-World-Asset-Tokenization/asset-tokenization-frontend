import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect to appropriate dashboard based on role
      if (user.role === 'investor') {
        navigate('/dashboard/investor');
      } else if (user.role === 'asset_owner') {
        navigate('/dashboard/asset-owner');
      } else if (user.role === 'compliance_officer') {
        navigate('/dashboard/compliance-officer');
      } else {
        navigate('/dashboard/admin');
      }
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black px-4">
      <div className="max-w-4xl w-full bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-12 text-center">
        <h1 className="text-4xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">
          KYC Service
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8">
          Secure Know Your Customer verification platform for investors and asset owners
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/login"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-lg transition-colors"
          >
            Login
          </a>
          <a
            href="/register"
            className="bg-zinc-200 hover:bg-zinc-300 text-zinc-900 dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:text-zinc-100 font-medium py-3 px-8 rounded-lg transition-colors"
          >
            Register
          </a>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-6">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              For Investors
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Complete KYC verification to access investment opportunities
            </p>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-6">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              For Asset Owners
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Manage your assets and attract verified investors
            </p>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-6">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              AI-Powered
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Advanced OCR, face verification, and risk analysis
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
