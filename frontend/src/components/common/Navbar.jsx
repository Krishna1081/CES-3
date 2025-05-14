import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const hostname = import.meta.env.VITE_API_HOSTNAME;

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    try {
      const response = await fetch(`${hostname}api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        navigate('/login');
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-gray-800">Cold Email</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {[
                { path: '/smtp', label: 'SMTP' },
                { path: '/campaigns', label: 'Campaigns' },
                { path: '/upload-recipients', label: 'Upload Recipients' },
                { path: '/recipients', label: 'Manage Recipients' },
                { path: '/unibox', label: "Unibox"},
              ].map(({ path, label }) => (
                <NavLink
                  key={path}
                  to={path}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive(path)
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
