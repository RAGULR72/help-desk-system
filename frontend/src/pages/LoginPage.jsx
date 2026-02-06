import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUser, FiMail, FiLock, FiPhone, FiBriefcase, FiArrowLeft, FiCheckCircle, FiMonitor, FiSmartphone, FiTrash2, FiAlertTriangle, FiShield, FiLogOut, FiActivity, FiAlertCircle } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/TranslationContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';

import { QRCodeSVG } from 'qrcode.react';


const LoginPage = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { login, register, user } = useAuth();

    const [isLogin, setIsLogin] = useState(true);
    const [forgotStep, setForgotStep] = useState(0); // 0: Normal, 1: Request OTP, 2: Verify OTP, 3: New Password
    const [otpIdentifier, setOtpIdentifier] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [newPass, setNewPass] = useState('');

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        full_name: '',
        phone: '',
        company: ''
    });
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);

    // Session Management State
    const [activeSessions, setActiveSessions] = useState([]);

    // Captcha State
    const [showCaptcha, setShowCaptcha] = useState(true);
    const [captcha, setCaptcha] = useState('');
    const [captchaInput, setCaptchaInput] = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [twoFactorData, setTwoFactorData] = useState(null); // { secret, qr_code }
    const [preAuthToken, setPreAuthToken] = useState('');
    const [twoFactorMethod, setTwoFactorMethod] = useState('app'); // 'app' or 'email'

    const handleRequestEmailOTP = async () => {
        setLoading(true);
        setError('');
        try {
            await api.post('/api/auth/2fa/email-otp/request', {
                token: preAuthToken
            });
            setTwoFactorMethod('email');
            setSuccessMessage("Verification code sent to your email!");
            setTwoFactorCode('');
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to send OTP to email.");
        } finally {
            setLoading(false);
        }
    };

    const handleTwoFactorVerify = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const endpoint = twoFactorMethod === 'email'
                ? '/api/auth/2fa/email-otp/verify'
                : '/api/auth/2fa/verify';

            const res = await api.post(endpoint, {
                token: preAuthToken,
                code: twoFactorCode
            });

            const { access_token, session_id } = res.data;
            localStorage.setItem('token', access_token);
            if (session_id) localStorage.setItem('session_id', session_id);

            // Get user profile
            const userResponse = await api.get('/api/auth/me');
            const userData = userResponse.data;
            localStorage.setItem('user', JSON.stringify(userData));

            // Refresh state and navigate
            window.location.href = `/dashboard/${userData.role || 'user'}`;
        } catch (err) {
            const status = err.response?.status;
            const detail = err.response?.data?.detail;

            if (status === 409 || (detail && typeof detail === 'object' && detail.message === 'session_limit_exceeded')) {
                const sessionData = status === 409 ? detail.sessions : detail.sessions;
                setActiveSessions(sessionData);
                setForgotStep(4);
                setError("Maximum concurrent sessions reached.");
            } else if (status === 401) {
                setError("Your login session expired. Please login again.");
                setForgotStep(0);
            } else {
                setError(typeof detail === 'string' ? detail : "Invalid 2FA code.");
            }
            setTwoFactorCode('');
        } finally {
            setLoading(false);
        }
    };

    const handleTwoFactorSetup = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/api/auth/2fa/setup/finalize', {
                token: preAuthToken,
                code: twoFactorCode
            });

            const { access_token, session_id } = res.data;
            localStorage.setItem('token', access_token);
            if (session_id) localStorage.setItem('session_id', session_id);

            setSuccessMessage("2FA setup complete! Logging you in...");

            // Get user profile
            const userResponse = await api.get('/api/auth/me');
            const userData = userResponse.data;
            localStorage.setItem('user', JSON.stringify(userData));

            setTimeout(() => {
                window.location.href = `/dashboard/${userData.role || 'user'}`;
            }, 1000);
        } catch (err) {
            const status = err.response?.status;
            const detail = err.response?.data?.detail;

            if (status === 409 || (detail && typeof detail === 'object' && detail.message === 'session_limit_exceeded')) {
                const sessionData = status === 409 ? detail.sessions : detail.sessions;
                setActiveSessions(sessionData);
                setForgotStep(4);
                setError("Maximum concurrent sessions reached.");
            } else if (status === 401) {
                setError("Your setup session expired. Please start over.");
                setForgotStep(0);
            } else {
                setError(typeof detail === 'string' ? detail : "Verification failed.");
            }
        } finally {
            setLoading(false);
        }
    };

    // QR Login State
    const [qrSession, setQrSession] = useState(null);
    const [qrStatus, setQrStatus] = useState('idle'); // idle, loading, active, authorized, expired
    const [qrPolling, setQrPolling] = useState(null);
    const [qrRotationTimer, setQrRotationTimer] = useState(null);
    const [qrCountdown, setQrCountdown] = useState(30);
    const [qrCountdownInterval, setQrCountdownInterval] = useState(null);

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            const role = user.role || 'user';
            navigate(`/dashboard/${role}`);
        }
        generateCaptcha();
        return () => {
            if (qrPolling) clearInterval(qrPolling);
            if (qrRotationTimer) clearTimeout(qrRotationTimer);
            if (qrCountdownInterval) clearInterval(qrCountdownInterval);
        }
    }, [user, navigate, qrPolling, qrRotationTimer, qrCountdownInterval]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
        setSuccessMessage('');
    };

    const generateCaptcha = () => {
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setCaptcha(result);
        setCaptchaInput('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Verify Captcha for Login & Register
        if (forgotStep === 0 && showCaptcha) {
            if (captchaInput.toUpperCase() !== captcha.toUpperCase()) {
                setError("Invalid Captcha. Please try again.");
                generateCaptcha();
                return;
            }
        }

        setLoading(true);
        setError('');
        setSuccessMessage('');

        const result = isLogin
            ? await login(formData.username, formData.password, captchaInput)
            : await register({ ...formData, captcha_token: captchaInput });

        setLoading(false);

        if (result.success) {
            // ... (keep success logic)
            if (isLogin) {
                if (result.require_password_change) {
                    navigate('/profile');
                } else {
                    const role = result.user?.role || 'user';
                    navigate(`/dashboard/${role}`);
                }
            } else {
                setSuccessMessage(t('auth.success_reg') || 'Registration successful! Wait for admin approval.');
                setIsLogin(true);
                generateCaptcha(); // Refresh on successful registration before login
                setFormData({
                    username: '',
                    email: '',
                    password: '',
                    full_name: '',
                    phone: '',
                    company: ''
                });
            }
        } else {
            // Check for 2FA
            if (result.type === '2fa_required') {
                setPreAuthToken(result.pre_auth_token);
                setForgotStep(5);
                return;
            }
            if (result.type === '2fa_setup_required') {
                setPreAuthToken(result.pre_auth_token);
                setForgotStep(6);
                return;
            }

            // Handle Session Limit Exceeded (409)
            if (result.status === 409 || (result.error && typeof result.error === 'object' && result.error.message === 'session_limit_exceeded')) {
                const sessionData = result.status === 409 ? result.data.detail.sessions : result.error.sessions;
                setActiveSessions(sessionData);
                setForgotStep(4);
                setError("Maximum concurrent sessions reached.");
            } else if (result.error === 'captcha_required') {
                setShowCaptcha(true);
                generateCaptcha();
                setError("Security check required. Please enter the captcha.");
            } else {
                setError(typeof result.error === 'string' ? result.error : "Failed to login");
            }
            if (showCaptcha) generateCaptcha();
        }
    };

    const handleForgotPassword = async (e) => {
        if (e) e.preventDefault();
        if (!otpIdentifier) {
            setError("Please enter your identifier (phone, email or username)");
            return;
        }
        setLoading(true);
        setError('');
        try {
            await api.post('/api/auth/forgot-password', { login_identifier: otpIdentifier });
            setForgotStep(2);
            setSuccessMessage("Verification code sent to your registered phone/email.");
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to send reset code.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (forgotStep === 6 && !twoFactorData && preAuthToken) {
            const fetchSetup = async () => {
                setLoading(true);
                try {
                    const res = await api.post('/api/auth/2fa/setup/initiate', {
                        token: preAuthToken
                    });
                    setTwoFactorData(res.data);
                } catch (err) {
                    console.error("2FA Setup Error:", err);
                    setError(err.response?.data?.detail || "Failed to initialize 2FA setup.");
                    // Don't reset step immediately so user can see error? 
                    // Or maybe invalid token means we SHOULD reset.
                    // If 500, we probably want to stay or retry.
                    if (err.response?.status === 401) {
                        setForgotStep(0);
                    }
                } finally {
                    setLoading(false);
                }
            };
            fetchSetup();
        }
    }, [forgotStep, preAuthToken, twoFactorData]);

    const handleVerifyOtp = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.post('/api/auth/verify-otp', { login_identifier: otpIdentifier, otp_code: otpCode });
            setForgotStep(3);
            setSuccessMessage("Verification successful. Please enter your new password.");
        } catch (err) {
            setError(err.response?.data?.detail || "Invalid or expired code.");
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.post('/api/auth/reset-password', {
                login_identifier: otpIdentifier,
                otp_code: otpCode,
                new_password: newPass
            });
            setSuccessMessage("Password reset successfully! You can now login.");
            setTimeout(() => {
                setForgotStep(0);
                setIsLogin(true);
                setOtpIdentifier('');
                setOtpCode('');
                setNewPass('');
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to reset password.");
        } finally {
            setLoading(false);
        }
    };

    const initiateQrLogin = async () => {
        // Clear any existing timers/polling/intervals
        if (qrPolling) clearInterval(qrPolling);
        if (qrRotationTimer) clearTimeout(qrRotationTimer);
        if (qrCountdownInterval) clearInterval(qrCountdownInterval);

        try {
            setQrStatus('loading');
            setQrCountdown(30); // Reset countdown

            const res = await api.post(`/api/auth/qr/initiate?t=${Date.now()}`);
            setQrSession(res.data);
            setQrStatus('active');

            // 1. Polling for authorization status
            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await api.get(`/api/auth/qr/status/${res.data.session_id}`);
                    if (statusRes.data.status === 'authorized') {
                        clearInterval(pollInterval);
                        if (qrRotationTimer) clearTimeout(qrRotationTimer);
                        if (qrCountdownInterval) clearInterval(qrCountdownInterval);
                        localStorage.setItem('token', statusRes.data.access_token);
                        if (statusRes.data.session_id) localStorage.setItem('session_id', statusRes.data.session_id);
                        window.location.reload();
                    } else if (statusRes.data.status === 'expired') {
                        clearInterval(pollInterval);
                        setQrStatus('expired');
                    }
                } catch (err) {
                    clearInterval(pollInterval);
                }
            }, 3000);
            setQrPolling(pollInterval);

            // 2. Countdown Interval (Visual)
            const countInterval = setInterval(() => {
                setQrCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(countInterval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            setQrCountdownInterval(countInterval);

            // 3. Set timer to rotate QR every 30 seconds
            const rotateTimer = setTimeout(() => {
                initiateQrLogin();
            }, 30000);
            setQrRotationTimer(rotateTimer);
        } catch (err) {
            setError("Failed to initialize QR login");
            setQrStatus('idle');
        }
    };

    const handleTerminateSession = async (sessionId) => {
        setLoading(true);
        setError('');
        try {
            await api.post('/api/auth/sessions/terminate-by-credentials', {
                username: formData.username,
                password: formData.password,
                session_id: sessionId
            });

            setSuccessMessage("Session terminated! Logging you in now...");

            // Wait a second for success message then AUTO LOGIN
            setTimeout(async () => {
                const result = await login(formData.username, formData.password);
                if (result.success) {
                    navigate(`/dashboard/${result.user.role || 'user'}`);
                } else if (result.type === '2fa_required') {
                    setPreAuthToken(result.pre_auth_token);
                    setForgotStep(5);
                } else if (result.type === '2fa_setup_required') {
                    setPreAuthToken(result.pre_auth_token);
                    setForgotStep(6);
                } else {
                    setForgotStep(0);
                    setError(result.error);
                }
                setSuccessMessage('');
            }, 1000);

        } catch (err) {
            setError(err.response?.data?.detail || "Failed to terminate session.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex overflow-hidden bg-white">

            {/* Visual Side - Clean & Professional */}
            <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-center p-16 overflow-hidden bg-slate-50 border-r border-gray-100">
                <div className="absolute inset-0 z-0 opacity-40">
                    <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="relative z-10"
                >
                    <Link to="/" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-bold transition-colors mb-16 px-4 py-2 bg-white rounded-lg shadow-sm w-fit border border-gray-100">
                        <FiArrowLeft />
                        <span className="text-sm">Back to Home</span>
                    </Link>

                    <h1 className="text-5xl font-bold text-gray-900 mb-6 tracking-tight leading-tight italic">
                        The Standard for <br />
                        <span className="text-indigo-600">Enterprise Support.</span>
                    </h1>
                    <p className="text-lg text-gray-500 max-w-sm mb-12 font-medium leading-relaxed italic">
                        Streamlined ticket management, intelligent analytics, and seamless collaboration.
                    </p>

                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 bg-white/60 rounded-xl border border-gray-100 shadow-sm backdrop-blur-sm">
                            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                                <FiShield size={20} />
                            </div>
                            <span className="text-sm font-semibold text-gray-700">Enterprise Grade Security</span>
                        </div>
                        <div className="flex items-center gap-4 p-4 bg-white/60 rounded-xl border border-gray-100 shadow-sm backdrop-blur-sm">
                            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                                <FiActivity size={20} />
                            </div>
                            <span className="text-sm font-semibold text-gray-700">Real-time Performance Monitoring</span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Form Side */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative bg-white">
                <div className="absolute top-0 right-0 p-8 lg:hidden">
                    <Link to="/" className="text-indigo-600 font-bold text-2xl">Proserve</Link>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md"
                >
                    {/* Common Header & Tabs */}
                    {forgotStep <= 0 && (
                        <>
                            <div className="mb-10 text-center lg:text-left">
                                <h2 className="text-4xl font-bold text-gray-900 mb-3">
                                    {forgotStep === -1 ? 'Instant Login' : (isLogin ? 'Welcome Back' : 'Join Proserve')}
                                </h2>
                                <p className="text-gray-500 font-medium">
                                    {forgotStep === -1 ? 'Scan with your logged-in mobile device to enter.' : (isLogin ? 'Enter your details to access your account.' : 'Start your journey with professional support.')}
                                </p>
                            </div>

                            <div className="flex p-1 bg-gray-50 rounded-xl mb-8 border border-gray-200">
                                <button
                                    onClick={() => { setIsLogin(true); setForgotStep(0); setError(''); setSuccessMessage(''); }}
                                    className={`flex-1 py-3 rounded-lg font-bold transition-all ${isLogin && forgotStep === 0 ? 'bg-white text-indigo-600 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Log In
                                </button>
                                <button
                                    onClick={() => { setIsLogin(false); setForgotStep(0); setError(''); setSuccessMessage(''); generateCaptcha(); }}
                                    className={`flex-1 py-3 rounded-lg font-bold transition-all ${!isLogin && forgotStep === 0 ? 'bg-white text-indigo-600 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Register
                                </button>
                                <button
                                    onClick={() => { setForgotStep(-1); initiateQrLogin(); setError(''); setSuccessMessage(''); }}
                                    className={`flex-1 py-3 rounded-lg font-bold transition-all ${forgotStep === -1 ? 'bg-white text-indigo-600 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    QR Login
                                </button>
                            </div>
                        </>
                    )}

                    <AnimatePresence mode="wait">
                        {forgotStep === 0 ? (
                            <motion.div
                                key="login-form"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-5"
                            >
                                {error && (
                                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-3">
                                        <FiLock /> <span>{error}</span>
                                    </div>
                                )}
                                {successMessage && (
                                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 text-sm flex items-center gap-3">
                                        <FiCheckCircle /> <span>{successMessage}</span>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700 ml-1">Username</label>
                                        <div className="relative group">
                                            <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                                            <input
                                                type="text"
                                                name="username"
                                                placeholder="Enter your username"
                                                value={formData.username}
                                                onChange={handleChange}
                                                required
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 pl-12 pr-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                            />
                                        </div>
                                    </div>

                                    {!isLogin && (
                                        <div className="space-y-5">
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-gray-700 ml-1">Email Address</label>
                                                <div className="relative group">
                                                    <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                                                    <input
                                                        type="email"
                                                        name="email"
                                                        placeholder="you@example.com"
                                                        value={formData.email}
                                                        onChange={handleChange}
                                                        required
                                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 pl-12 pr-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-gray-700 ml-1">Full Name</label>
                                                <div className="relative group">
                                                    <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                                                    <input
                                                        type="text"
                                                        name="full_name"
                                                        placeholder="Your full name"
                                                        value={formData.full_name}
                                                        onChange={handleChange}
                                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 pl-12 pr-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center ml-1">
                                            <label className="text-sm font-semibold text-gray-700">Password</label>
                                            {isLogin && (
                                                <button
                                                    type="button"
                                                    onClick={() => { setForgotStep(1); setError(''); setSuccessMessage(''); }}
                                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold transition-colors"
                                                >
                                                    Forgot Password?
                                                </button>
                                            )}
                                        </div>
                                        <div className="relative group">
                                            <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                                            <input
                                                type="password"
                                                name="password"
                                                placeholder="••••••••"
                                                value={formData.password}
                                                onChange={handleChange}
                                                required
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 pl-12 pr-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                            />
                                            {!isLogin && (
                                                <p className="text-[10px] text-gray-400 mt-1 ml-1 font-medium">
                                                    Minimum 12 characters, including uppercase, lowercase, numbers, and symbols.
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {showCaptcha && (
                                        <div className="space-y-4 pt-2 border-t border-gray-100">
                                            <div className="flex justify-between items-center ml-1">
                                                <label className="text-sm font-semibold text-gray-700">Security Check</label>
                                                <button
                                                    type="button"
                                                    onClick={generateCaptcha}
                                                    className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider hover:underline"
                                                >
                                                    Refresh Code
                                                </button>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="flex-1 relative group">
                                                    <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                                                    <input
                                                        type="text"
                                                        placeholder="Enter Code"
                                                        value={captchaInput}
                                                        onChange={(e) => setCaptchaInput(e.target.value)}
                                                        required={showCaptcha}
                                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 pl-12 pr-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all font-mono tracking-widest uppercase"
                                                    />
                                                </div>
                                                <div className="w-32 bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-xl flex items-center justify-center select-none overflow-hidden relative">
                                                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #4f46e5 0, #4f46e5 1px, transparent 0, transparent 50%)', backgroundSize: '10px 10px' }}></div>
                                                    <span className="text-xl font-black text-indigo-600 tracking-widest italic drop-shadow-sm z-10">
                                                        {captcha}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                                        )}
                                    </button>
                                </form>

                                <div className="mt-8 text-center">
                                    <p className="text-gray-500 text-sm font-medium">
                                        {isLogin ? "Don't have an account?" : "Already have an account?"}
                                        <button
                                            onClick={() => { setIsLogin(!isLogin); setForgotStep(0); setError(''); setSuccessMessage(''); }}
                                            className="ml-2 text-indigo-600 hover:text-indigo-800 font-bold transition-colors underline underline-offset-4"
                                        >
                                            {isLogin ? 'Register Now' : 'Sign In'}
                                        </button>
                                    </p>
                                </div>
                            </motion.div>
                        ) : forgotStep === -1 ? (
                            <motion.div
                                key="qr-view"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl text-center"
                            >
                                <div className="relative mx-auto w-64 h-64 mb-10 bg-slate-50 rounded-3xl p-8 flex items-center justify-center border-2 border-dashed border-indigo-100 shadow-inner">
                                    {qrStatus === 'loading' ? (
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                            <p className="text-xs text-indigo-600 font-bold animate-pulse">Generating...</p>
                                        </div>
                                    ) : qrStatus === 'active' ? (
                                        <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
                                            <QRCodeSVG
                                                value={`${window.location.origin}/qr-auth?sid=${qrSession?.session_id}`}
                                                size={180}
                                                level="H"
                                                includeMargin={true}
                                            />
                                        </div>
                                    ) : qrStatus === 'expired' ? (
                                        <div className="text-red-500">
                                            <FiAlertCircle size={40} className="mx-auto mb-3" />
                                            <p className="font-bold mb-2 text-sm">Session Expired</p>
                                            <button onClick={initiateQrLogin} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-900 transition-colors">Generate New</button>
                                        </div>
                                    ) : (
                                        <button onClick={initiateQrLogin} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/20">Generate QR Code</button>
                                    )}

                                    {qrStatus === 'active' && (
                                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-black px-5 py-2 rounded-full whitespace-nowrap shadow-xl tracking-widest ring-4 ring-white flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                                            REFRESHING IN {qrCountdown}s
                                        </div>
                                    )}
                                </div>

                                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest leading-relaxed">
                                    Secure • End-to-End • Proserve Auth
                                </p>
                            </motion.div>
                        ) : forgotStep === 4 ? (
                            <motion.div
                                key="session-mgmt"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="space-y-6"
                            >
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-bounce">
                                        <FiAlertTriangle size={32} />
                                    </div>
                                    <h3 className="text-2xl font-black text-gray-900 mb-2">Maximum Sessions Reached</h3>
                                    <p className="text-gray-500 font-medium">You have reached the maximum active sessions limit. Please logout from at least one session to continue.</p>
                                </div>

                                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl mb-6">
                                    <p className="text-xs text-amber-800 font-bold uppercase tracking-wider text-center">👇 Select a session to logout & continue</p>
                                </div>

                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    {activeSessions.map((session) => (
                                        <div key={session.id} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm hover:border-rose-200 transition-all group relative overflow-hidden">
                                            <div className="flex items-center justify-between relative z-10">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center group-hover:bg-rose-50 group-hover:text-rose-600 transition-colors">
                                                        {session.device === 'Desktop' ? <FiMonitor size={20} /> : <FiSmartphone size={20} />}
                                                    </div>
                                                    <div>
                                                        <h5 className="text-sm font-bold text-gray-900">{session.os} • {session.browser}</h5>
                                                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                                                            IP: {session.ip} • Logged: {session.time}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleTerminateSession(session.id)}
                                                    disabled={loading}
                                                    className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl text-xs font-black transition-all active:scale-95 flex items-center gap-2"
                                                >
                                                    {loading ? '...' : (
                                                        <>
                                                            <FiLogOut />
                                                            LOGOUT
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => { setForgotStep(0); setError(''); setSuccessMessage(''); }}
                                    className="w-full py-3 text-gray-400 font-bold hover:text-gray-600 transition-all text-sm flex items-center justify-center gap-2"
                                >
                                    <FiArrowLeft /> Back to Login
                                </button>
                            </motion.div>
                        ) : forgotStep === 5 ? (
                            <motion.div
                                key="2fa-verify"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="space-y-6"
                            >
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <FiShield size={32} />
                                    </div>
                                    <h3 className="text-2xl font-black text-gray-900 mb-2">Two-Factor Authentication</h3>
                                    <p className="text-gray-500 font-medium text-sm">Please enter the 6-digit code from your authenticator app.</p>
                                </div>

                                <form onSubmit={handleTwoFactorVerify} className="space-y-4">
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <FiLock className="text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                                        </div>
                                        <input
                                            type="text"
                                            maxLength="6"
                                            value={twoFactorCode}
                                            onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, ''))}
                                            className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all placeholder:text-gray-400 font-bold tracking-[0.5em] text-center text-xl"
                                            placeholder="000000"
                                            required
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading || twoFactorCode.length < 6}
                                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all disabled:opacity-50"
                                    >
                                        {loading ? "Verifying..." : "Verify & Sign In"}
                                    </button>
                                </form>

                                {twoFactorMethod === 'app' ? (
                                    <div className="text-center">
                                        <p className="text-xs text-gray-400 mb-3">Authenticator app not working?</p>
                                        <button
                                            onClick={handleRequestEmailOTP}
                                            disabled={loading}
                                            className="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-2 mx-auto"
                                        >
                                            <FiMail /> Receive code via Email
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <p className="text-xs text-gray-400 mb-3">Didn't receive the email?</p>
                                        <button
                                            onClick={() => { setTwoFactorMethod('app'); setTwoFactorCode(''); }}
                                            className="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-2 mx-auto"
                                        >
                                            <FiSmartphone /> Use Authenticator App
                                        </button>
                                    </div>
                                )}

                                <button
                                    onClick={() => setForgotStep(0)}
                                    className="w-full py-2 text-gray-400 font-bold hover:text-gray-600 transition-all text-sm"
                                >
                                    Back to Login
                                </button>
                            </motion.div>
                        ) : forgotStep === 6 ? (
                            <motion.div
                                key="2fa-setup"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="space-y-6"
                            >
                                <div className="text-center">
                                    <h3 className="text-2xl font-black text-gray-900 mb-2">Secure Your Account</h3>
                                    <p className="text-gray-500 font-medium text-sm mb-6">Security feature enabled. Scan this QR code with Google Authenticator or Authy to setup 2FA.</p>

                                    {twoFactorData ? (
                                        <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-indigo-100 inline-block mb-6 shadow-sm">
                                            <img src={twoFactorData.qr_code} alt="QR Code" className="w-44 h-44" />
                                        </div>
                                    ) : (
                                        <div className="w-44 h-44 bg-gray-50 rounded-2xl mx-auto flex items-center justify-center animate-pulse">
                                            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    )}

                                    <div className="text-left bg-indigo-50 p-4 rounded-xl mb-6">
                                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Manual Key</p>
                                        <code className="text-sm font-bold text-gray-700 break-all">{twoFactorData?.secret}</code>
                                    </div>
                                </div>

                                <form onSubmit={handleTwoFactorSetup} className="space-y-4">
                                    <input
                                        type="text"
                                        maxLength="6"
                                        value={twoFactorCode}
                                        onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, ''))}
                                        className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold tracking-[0.5em] text-center text-xl"
                                        placeholder="Enter Code"
                                        required
                                    />
                                    <button
                                        type="submit"
                                        disabled={loading || twoFactorCode.length < 6}
                                        className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg transition-all disabled:opacity-50"
                                    >
                                        {loading ? "Setting up..." : "Complete Setup & Login"}
                                    </button>
                                </form>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="forgot-view"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <button
                                    onClick={() => setForgotStep(0)}
                                    className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 font-bold text-sm transition-colors mb-4"
                                >
                                    <FiArrowLeft />
                                    <span>Back to Login</span>
                                </button>

                                <div className="mb-2">
                                    <h2 className="text-3xl font-black text-gray-900">
                                        {forgotStep === 1 ? 'Reset Password' :
                                            forgotStep === 2 ? 'Verify Code' : 'Set New Password'}
                                    </h2>
                                    <p className="text-gray-500 font-medium mt-2">
                                        {forgotStep === 1 ? 'Enter your email, username or phone number.' :
                                            forgotStep === 2 ? 'We sent a 6-digit code to your registered device.' :
                                                'Create a strong password for your account.'}
                                    </p>
                                </div>

                                {error && (
                                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-3">
                                        <FiLock /> <span>{error}</span>
                                    </div>
                                )}
                                {successMessage && (
                                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 text-sm flex items-center gap-3">
                                        <FiCheckCircle /> <span>{successMessage}</span>
                                    </div>
                                )}

                                {forgotStep === 1 && (
                                    <form onSubmit={handleForgotPassword} className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700 ml-1">Identification</label>
                                            <div className="relative group">
                                                <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600" />
                                                <input
                                                    type="text"
                                                    placeholder="Email, Username or Phone"
                                                    value={otpIdentifier}
                                                    onChange={(e) => setOtpIdentifier(e.target.value)}
                                                    required
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-5 pl-12 pr-4 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all outline-none"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-600/20 hover:bg-slate-900 transition-all flex items-center justify-center gap-3"
                                        >
                                            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Send Reset Code"}
                                        </button>
                                    </form>
                                )}

                                {forgotStep === 2 && (
                                    <form onSubmit={handleVerifyOtp} className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700 ml-1 text-center block">6-Digit Verification Code</label>
                                            <input
                                                type="text"
                                                maxLength="6"
                                                placeholder="••••••"
                                                value={otpCode}
                                                onChange={(e) => setOtpCode(e.target.value)}
                                                required
                                                className="w-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl py-6 text-center text-3xl font-black tracking-[0.5em] focus:bg-white focus:border-indigo-600 transition-all outline-none text-gray-900"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-600/20 hover:bg-slate-900 transition-all flex items-center justify-center"
                                        >
                                            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Verify Code"}
                                        </button>
                                        <p className="text-center text-sm font-bold text-gray-400">
                                            Didn't receive code? <button type="button" onClick={handleForgotPassword} className="text-indigo-600 hover:underline">Resend</button>
                                        </p>
                                    </form>
                                )}

                                {forgotStep === 3 && (
                                    <form onSubmit={handleResetPassword} className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700 ml-1">New Password</label>
                                            <div className="relative group">
                                                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600" />
                                                <input
                                                    type="password"
                                                    placeholder="••••••••"
                                                    value={newPass}
                                                    onChange={(e) => setNewPass(e.target.value)}
                                                    required
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-5 pl-12 pr-4 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all outline-none"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center justify-center"
                                        >
                                            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Update Password"}
                                        </button>
                                    </form>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    );
};

export default LoginPage;
