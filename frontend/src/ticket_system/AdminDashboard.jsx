import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import TicketList from './components/TicketList';
import AttendanceView from '../attendance_system/AttendanceView';
import UserProfileView from './components/UserProfileView';
import UserManagementView from './components/UserManagementView';
import AddUserModal from './components/AddUserModal';
import SLAMonitoring from '../sla_system/SLAMonitoring';
import SLAConfiguration from '../sla_system/SLAConfiguration';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/TranslationContext';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import TicketWorkflowConfig from '../workflow_system/TicketWorkflowConfig';

import FeedbackOverview from './components/FeedbackOverview';
import CommandCenterView from './components/CommandCenterView';
import PortalConfig from '../pages/Portal/PortalConfig';
import AssetManagement from '../asset_management/AssetManagement';
import AssetSettings from '../asset_management/AssetSettings';



import ExpenseDashboard from '../expense_system/ExpenseDashboard';


const AdminDashboard = () => {
    const { t } = useTranslation();
    const { user } = useAuth();

    const location = useLocation();
    // Persist active tab across refreshes
    const [activeTab, setActiveTab] = useState(location.state?.activeTab || localStorage.getItem(`activeTab_${user?.role}`) || 'dashboard');
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [slaConfigProps, setSlaConfigProps] = useState({});

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

    const handleTabChange = (tab, extra = {}) => {
        setActiveTab(tab);
        if (tab === 'sla_config') {
            setSlaConfigProps(extra);
        }
    };

    return (
        <DashboardLayout
            activeTab={activeTab}
            userRole="admin"
            onTabChange={handleTabChange}
            onAddUser={() => setIsAddUserModalOpen(true)}
        >
            {activeTab === 'dashboard' && <AnalyticsDashboard />}
            {activeTab === 'tickets' && <TicketList userRole="admin" currentUserId={user?.id} />}

            {activeTab === 'users' && (
                <>
                    <UserManagementView />
                    {isAddUserModalOpen && (
                        <AddUserModal
                            onClose={() => setIsAddUserModalOpen(false)}
                            onUserAdded={() => {
                                // UserManagementView will refresh via shared state or context if needed
                            }}
                        />
                    )}
                </>
            )}
            {activeTab === 'attendance' && <AttendanceView />}
            {activeTab === 'sla' && <SLAMonitoring userRole="admin" onTabChange={handleTabChange} />}
            {activeTab === 'sla_config' && <SLAConfiguration onBack={() => setActiveTab('sla')} {...slaConfigProps} />}
            {activeTab === 'workflows' && <TicketWorkflowConfig />}
            {activeTab === 'profile' && <UserProfileView />}
            {activeTab === 'feedback' && <FeedbackOverview />}
            {activeTab === 'portal_config' && <PortalConfig />}
            {activeTab === 'asset_management' && <AssetManagement />}
            {activeTab === 'asset_settings' && <AssetSettings />}

            {activeTab === 'command_center' && <CommandCenterView />}
            {activeTab === 'expenses' && <ExpenseDashboard />}
        </DashboardLayout >
    );
};

export default AdminDashboard;
