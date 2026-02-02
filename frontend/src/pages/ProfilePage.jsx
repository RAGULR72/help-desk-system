import React from 'react';
import UserProfileView from '../ticket_system/components/UserProfileView';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { useTranslation } from '../context/TranslationContext';

const ProfilePage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { t } = useTranslation();

    const handleBack = () => {
        if (user?.role === 'admin') navigate('/dashboard/admin');
        else if (user?.role === 'manager') navigate('/dashboard/manager');
        else if (user?.role === 'technician') navigate('/dashboard/technician');
        else navigate('/dashboard/user');
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Simple Header for standalone profile page */}
            <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex items-center gap-4">
                <button
                    onClick={handleBack}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                >
                    <FiArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-bold text-gray-900">{t('profile.title')}</h1>
            </header>

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <UserProfileView />
            </main>
        </div>
    );
};

export default ProfilePage;
