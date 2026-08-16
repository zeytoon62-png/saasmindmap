import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Auth callback page — in standalone deployment this simply redirects to home.
 */
export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to home page after a brief moment
    const timer = setTimeout(() => navigate('/', { replace: true }), 500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}