import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import TicketList from './components/TicketList';
import AttendanceView from '../attendance_system/AttendanceView';
import SLAMonitoring from '../sla_system/SLAMonitoring';
import UserProfileView from './components/UserProfileView';
import { useAuth } from '../context/AuthContext';
import AnalyticsDashboard from './components/AnalyticsDashboard';


import AssetManagement from '../asset_management/AssetManagement';
import UserManagementView from './components/UserManagementView';
import FeedbackOverview from './components/FeedbackOverview';

import ExpenseDashboard from '../expense_system/ExpenseDashboard';

const ManagerDashboard = () => {
    const { user } = useAuth();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(location.state?.activeTab || localStorage.getItem(`activeTab_${user?.role}`) || 'dashboard');

    useEffect(() => {
        if (user?.role) {
            localStorage.setItem(`activeTab_${user.role}`, activeTab);
        }
    }, [activeTab, user?.role]);

    useEffect(() => {
        if (location.state?.activeTab) {
            setActiveTab(location.state.activeTab);
        }
    }, [location.state]);

    return (
        <DashboardLayout activeTab={activeTab} userRole="manager" onTabChange={setActiveTab}>
            {activeTab === 'dashboard' && <AnalyticsDashboard />}
            {activeTab === 'tickets' && <TicketList userRole="manager" currentUserId={user?.id} />}

            {activeTab === 'attendance' && <AttendanceView />}
            {activeTab === 'sla' && <SLAMonitoring />}
            {activeTab === 'profile' && <UserProfileView />}

            {activeTab === 'users' && <UserManagementView />}
            {activeTab === 'asset_management' && <AssetManagement />}
            {activeTab === 'feedback' && <FeedbackOverview />}
            {activeTab === 'expenses' && <ExpenseDashboard />}
        </DashboardLayout>
    );
};

export default ManagerDashboard;
