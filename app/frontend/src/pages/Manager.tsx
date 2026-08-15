import { useState, useEffect, useCallback, useRef } from "react";
import { client } from "@/lib/api";

interface AdminUser {
  id: number;
  username: string;
  role: string;
  is_active: boolean;
}

interface Setting {
  id: number;
  setting_key: string;
  setting_value: string;
}

interface CryptoWallet {
  id: number;
  crypto_name: string;
  wallet_address: string;
  qr_code_url: string;
  is_active: boolean;
  display_order: number;
}

interface ReportData {
  total_visits: number;
  visitor_ips: string[];
  new_files_count: number;
  mobile_count: number;
  desktop_count: number;
}

interface FeedbackItem {
  id: number;
  message: string;
  feedback_type: string;
  contact_info: string;
  device_info: string;
  ip_address: string;
  created_at: string;
}

interface EmailLogItem {
  id: number;
  subject: string;
  recipients: string;
  body_preview: string;
  email_type: string;
  status: string;
  sent_at: string;
}

type Tab = "dashboard" | "admins" | "settings" | "wallets" | "feedbacks";

const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fa", label: "فارسی" },
  { code: "ar", label: "العربية" },
  { code: "zh", label: "中文" },
  { code: "ru", label: "Русский" },
];

export default function Manager() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [adminId, setAdminId] = useState<number | null>(null);
  const [adminRole, setAdminRole] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  // Dashboard state
  const [reports, setReports] = useState<ReportData | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [emailLogs, setEmailLogs] = useState<EmailLogItem[]>([]);

  // Admin management
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [newAdminUser, setNewAdminUser] = useState("");
  const [newAdminPass, setNewAdminPass] = useState("");
  const [changeUsername, setChangeUsername] = useState("");
  const [changePassword, setChangePassword] = useState("");

  // Settings
  const [settings, setSettings] = useState<Setting[]>([]);
  const [editingSettings, setEditingSettings] = useState<Record<string, string>>({});
  const [settingSaveStatus, setSettingSaveStatus] = useState<Record<string, string>>({});

  // Wallets
  const [wallets, setWallets] = useState<CryptoWallet[]>([]);
  const [newWalletName, setNewWalletName] = useState("");
  const [newWalletAddress, setNewWalletAddress] = useState("");
  const [newWalletQr, setNewWalletQr] = useState("");
  const [uploadingQr, setUploadingQr] = useState<number | null>(null);
  const qrFileRef = useRef<HTMLInputElement>(null);
  const [qrUploadTarget, setQrUploadTarget] = useState<number | null>(null);

  // Feedbacks
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [fbFilter, setFbFilter] = useState<"" | "normal" | "urgent">("");

  // Batch send status
  const [batchSending, setBatchSending] = useState(false);

  const handleLogin = async () => {
    setLoginError("");
    try {
      const res = await client.apiCall.invoke({
        url: "/api/v1/admin/login",
        method: "POST",
        data: { username, password },
      });
      const d = (res as any)?.data;
      if (d?.success) {
        setLoggedIn(true);
        setAdminId(d.admin_id);
        setAdminRole(d.role);
      } else {
        setLoginError(d?.message || "Invalid credentials");
      }
    } catch {
      setLoginError("Login failed");
    }
  };

  const loadReports = useCallback(async () => {
    try {
      const res = await client.apiCall.invoke({
        url: "/api/v1/admin/reports",
        method: "POST",
        data: { start_date: startDate || null, end_date: endDate || null },
      });
      setReports((res as any)?.data || null);
    } catch {
      // ignore
    }
  }, [startDate, endDate]);

  const loadEmailLogs = async () => {
    try {
      const res = await client.apiCall.invoke({
        url: "/api/v1/admin/email-logs",
        method: "GET",
        data: {},
      });
      setEmailLogs((res as any)?.data?.items || []);
    } catch { /* ignore */ }
  };

  const loadAdmins = async () => {
    try {
      const res = await client.apiCall.invoke({ url: "/api/v1/admin/list-admins", method: "GET", data: {} });
      setAdmins((res as any)?.data || []);
    } catch { /* ignore */ }
  };

  const loadSettings = async () => {
    try {
      const res = await client.apiCall.invoke({ url: "/api/v1/admin/settings", method: "GET", data: {} });
      const items: Setting[] = (res as any)?.data || [];
      setSettings(items);
      const map: Record<string, string> = {};
      items.forEach((s) => { map[s.setting_key] = s.setting_value; });
      setEditingSettings(map);
    } catch { /* ignore */ }
  };

  const loadWallets = async () => {
    try {
      const res = await client.apiCall.invoke({ url: "/api/v1/admin/wallets", method: "GET", data: {} });
      setWallets((res as any)?.data || []);
    } catch { /* ignore */ }
  };

  const loadFeedbacks = async () => {
    try {
      const url = fbFilter ? `/api/v1/admin/feedbacks?feedback_type=${fbFilter}` : "/api/v1/admin/feedbacks";
      const res = await client.apiCall.invoke({ url, method: "GET", data: {} });
      setFeedbacks((res as any)?.data?.items || []);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!loggedIn) return;
    if (activeTab === "dashboard") { loadReports(); loadEmailLogs(); }
    else if (activeTab === "admins") loadAdmins();
    else if (activeTab === "settings") loadSettings();
    else if (activeTab === "wallets") loadWallets();
    else if (activeTab === "feedbacks") loadFeedbacks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn, activeTab]);

  const handleCreateAdmin = async () => {
    if (!newAdminUser || !newAdminPass) return;
    await client.apiCall.invoke({
      url: "/api/v1/admin/create-admin",
      method: "POST",
      data: { username: newAdminUser, password: newAdminPass, role: "admin" },
    });
    setNewAdminUser("");
    setNewAdminPass("");
    loadAdmins();
  };

  const handleDeleteAdmin = async (id: number) => {
    await client.apiCall.invoke({ url: `/api/v1/admin/delete-admin/${id}`, method: "DELETE", data: {} });
    loadAdmins();
  };

  const handleChangeCredentials = async () => {
    if (!adminId) return;
    await client.apiCall.invoke({
      url: "/api/v1/admin/change-credentials",
      method: "POST",
      data: {
        admin_id: adminId,
        new_username: changeUsername || null,
        new_password: changePassword || null,
      },
    });
    setChangeUsername("");
    setChangePassword("");
    alert("Credentials updated!");
  };

  const handleSaveSetting = async (key: string) => {
    await client.apiCall.invoke({
      url: "/api/v1/admin/settings",
      method: "POST",
      data: { setting_key: key, setting_value: editingSettings[key] || "" },
    });
    setSettingSaveStatus({ ...settingSaveStatus, [key]: "saved" });
    setTimeout(() => setSettingSaveStatus((prev) => ({ ...prev, [key]: "" })), 2000);
  };

  const handleAddWallet = async () => {
    if (!newWalletName || !newWalletAddress) return;
    await client.apiCall.invoke({
      url: "/api/v1/admin/wallets",
      method: "POST",
      data: {
        crypto_name: newWalletName,
        wallet_address: newWalletAddress,
        qr_code_url: newWalletQr,
        is_active: true,
        display_order: wallets.length,
      },
    });
    setNewWalletName("");
    setNewWalletAddress("");
    setNewWalletQr("");
    loadWallets();
  };

  const handleDeleteWallet = async (id: number) => {
    await client.apiCall.invoke({ url: `/api/v1/admin/wallets/${id}`, method: "DELETE", data: {} });
    loadWallets();
  };

  const handleUploadQrClick = (walletId: number) => {
    setQrUploadTarget(walletId);
    qrFileRef.current?.click();
  };

  const handleQrFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !qrUploadTarget) return;
    setUploadingQr(qrUploadTarget);

    try {
      // Use client.storage.upload to upload the file, then save object_key via API
      const uploadResult = await client.storage.upload({
        bucket_name: "qr-images",
        object_key: `wallet-qr/${qrUploadTarget}/${file.name}`,
        file,
      });
      const objectKey = (uploadResult as any)?.object_key || "";
      if (objectKey) {
        // Update wallet's qr_code_url with the object_key
        await client.apiCall.invoke({
          url: `/api/v1/admin/wallets/${qrUploadTarget}`,
          method: "PUT",
          data: {
            crypto_name: wallets.find((w) => w.id === qrUploadTarget)?.crypto_name || "",
            wallet_address: wallets.find((w) => w.id === qrUploadTarget)?.wallet_address || "",
            qr_code_url: objectKey,
            is_active: true,
            display_order: wallets.find((w) => w.id === qrUploadTarget)?.display_order || 0,
          },
        });
        loadWallets();
      }
    } catch (err) {
      console.error("QR upload failed:", err);
      alert("Failed to upload QR image");
    }

    setUploadingQr(null);
    setQrUploadTarget(null);
    e.target.value = "";
  };

  const handleSendBatch = async () => {
    setBatchSending(true);
    try {
      await client.apiCall.invoke({
        url: "/api/v1/admin/send-feedback-batch",
        method: "POST",
        data: {},
      });
      alert("Batch email sent!");
      loadEmailLogs();
    } catch {
      alert("Failed to send batch");
    }
    setBatchSending(false);
  };

  // Login screen
  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 w-96 max-w-full">
          <h1 className="text-xl font-bold text-slate-800 mb-6 text-center">Admin Panel</h1>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
          {loginError && <p className="text-red-500 text-xs mb-3">{loginError}</p>}
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 font-medium hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  // Main admin panel
  const tabs: { key: Tab; label: string }[] = [
    { key: "dashboard", label: "📊 Dashboard" },
    { key: "admins", label: "👤 Admins" },
    { key: "settings", label: "⚙️ Settings" },
    { key: "wallets", label: "💰 Wallets" },
    { key: "feedbacks", label: "💬 Feedbacks" },
  ];

  // Settings field definitions - SMTP + emails + schedule + telegram + multilingual about us
  const smtpFields = [
    { key: "smtp_host", label: "SMTP Host", multiline: false, isPassword: false },
    { key: "smtp_port", label: "SMTP Port", multiline: false, isPassword: false },
    { key: "smtp_username", label: "SMTP Username", multiline: false, isPassword: false },
    { key: "smtp_password", label: "SMTP Password", multiline: false, isPassword: true },
    { key: "smtp_from_email", label: "SMTP From Email", multiline: false, isPassword: false },
  ];

  const emailFields = [
    { key: "feedback_normal_email_1", label: "Normal Feedback Email 1", multiline: false, isPassword: false },
    { key: "feedback_normal_email_2", label: "Normal Feedback Email 2", multiline: false, isPassword: false },
    { key: "feedback_urgent_email_1", label: "Urgent Feedback Email 1", multiline: false, isPassword: false },
    { key: "feedback_urgent_email_2", label: "Urgent Feedback Email 2", multiline: false, isPassword: false },
    { key: "feedback_schedule", label: "Feedback Batch Schedule (daily/weekly/hourly)", multiline: false, isPassword: false },
    { key: "telegram_support", label: "Telegram Support ID", multiline: false, isPassword: false },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-800">PMindMap Admin</h1>
          <span className="text-xs text-slate-500">
            {adminRole} • <button onClick={() => setLoggedIn(false)} className="text-red-500 hover:underline cursor-pointer">Logout</button>
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === tab.key
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Reports Dashboard</h2>
              <div className="flex flex-wrap gap-3 mb-4">
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                <button onClick={loadReports} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 cursor-pointer">Filter</button>
              </div>
              {reports && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                    <p className="text-2xl font-bold text-blue-700">{reports.total_visits}</p>
                    <p className="text-xs text-blue-600 mt-1">Total Visits</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                    <p className="text-2xl font-bold text-green-700">{reports.new_files_count}</p>
                    <p className="text-xs text-green-600 mt-1">New Files</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                    <p className="text-2xl font-bold text-purple-700">{reports.mobile_count}</p>
                    <p className="text-xs text-purple-600 mt-1">Mobile Users</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                    <p className="text-2xl font-bold text-amber-700">{reports.desktop_count}</p>
                    <p className="text-xs text-amber-600 mt-1">Desktop Users</p>
                  </div>
                </div>
              )}
              {reports && reports.visitor_ips.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Visitor IPs ({reports.visitor_ips.length})</h3>
                  <div className="max-h-48 overflow-y-auto bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs font-mono">
                    {reports.visitor_ips.map((ip, i) => (
                      <div key={i} className="py-0.5">{ip}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Email Logs Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">📧 Email Sending Logs</h2>
                <button
                  onClick={loadEmailLogs}
                  className="text-xs text-blue-600 hover:underline cursor-pointer"
                >
                  Refresh
                </button>
              </div>
              {emailLogs.length === 0 ? (
                <p className="text-sm text-slate-500">No email logs found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left">
                        <th className="py-2 px-2 text-xs font-semibold text-slate-500">Subject</th>
                        <th className="py-2 px-2 text-xs font-semibold text-slate-500">Recipients</th>
                        <th className="py-2 px-2 text-xs font-semibold text-slate-500">Type</th>
                        <th className="py-2 px-2 text-xs font-semibold text-slate-500">Status</th>
                        <th className="py-2 px-2 text-xs font-semibold text-slate-500">Sent At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emailLogs.map((log) => (
                        <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-2 px-2 text-xs max-w-[200px] truncate">{log.subject}</td>
                          <td className="py-2 px-2 text-xs max-w-[200px] truncate font-mono">{log.recipients}</td>
                          <td className="py-2 px-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${log.email_type === "urgent_immediate" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                              {log.email_type}
                            </span>
                          </td>
                          <td className="py-2 px-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${log.status === "sent" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-xs text-slate-500">{log.sent_at}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Admins Tab */}
        {activeTab === "admins" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Change My Credentials</h2>
              <div className="flex flex-wrap gap-3">
                <input
                  type="text"
                  placeholder="New username"
                  value={changeUsername}
                  onChange={(e) => setChangeUsername(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="password"
                  placeholder="New password"
                  value={changePassword}
                  onChange={(e) => setChangePassword(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
                <button onClick={handleChangeCredentials} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 cursor-pointer">
                  Update
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Add New Admin</h2>
              <div className="flex flex-wrap gap-3 mb-4">
                <input
                  type="text"
                  placeholder="Username"
                  value={newAdminUser}
                  onChange={(e) => setNewAdminUser(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={newAdminPass}
                  onChange={(e) => setNewAdminPass(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
                <button onClick={handleCreateAdmin} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 cursor-pointer">
                  Create
                </button>
              </div>

              <h3 className="text-sm font-semibold mb-2">Existing Admins</h3>
              <div className="space-y-2">
                {admins.map((a) => (
                  <div key={a.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-2 border border-slate-200">
                    <span className="text-sm">{a.username} <span className="text-xs text-slate-500">({a.role})</span></span>
                    <button
                      onClick={() => handleDeleteAdmin(a.id)}
                      className="text-xs text-red-500 hover:underline cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            {/* SMTP Configuration */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold mb-4">🔐 SMTP Configuration</h2>
              <p className="text-xs text-slate-500 mb-4">Configure SMTP server for all outgoing emails (feedback notifications, batch reports, etc.)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {smtpFields.map((field) => (
                  <div key={field.key} className="border border-slate-200 rounded-lg p-3">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">{field.label}</label>
                    <div className="flex gap-2">
                      <input
                        type={field.isPassword ? "password" : "text"}
                        value={editingSettings[field.key] || ""}
                        onChange={(e) => setEditingSettings({ ...editingSettings, [field.key]: e.target.value })}
                        className="flex-1 border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
                        placeholder={field.key === "smtp_port" ? "587" : ""}
                      />
                      <button
                        onClick={() => handleSaveSetting(field.key)}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-700 cursor-pointer shrink-0"
                      >
                        {settingSaveStatus[field.key] === "saved" ? "✓" : "Save"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Email Recipients & Schedule */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold mb-4">📧 Email Recipients & Schedule</h2>
              <p className="text-xs text-slate-500 mb-4">
                <strong>Normal feedback:</strong> Collected and sent as a batch at the configured interval.<br />
                <strong>Urgent feedback:</strong> Sent immediately in real-time.
              </p>
              <div className="space-y-4">
                {emailFields.map((field) => (
                  <div key={field.key} className="border border-slate-200 rounded-lg p-3">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">{field.label}</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editingSettings[field.key] || ""}
                        onChange={(e) => setEditingSettings({ ...editingSettings, [field.key]: e.target.value })}
                        className="flex-1 border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
                      />
                      <button
                        onClick={() => handleSaveSetting(field.key)}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-700 cursor-pointer shrink-0"
                      >
                        {settingSaveStatus[field.key] === "saved" ? "✓" : "Save"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <button
                  onClick={handleSendBatch}
                  disabled={batchSending}
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 cursor-pointer disabled:opacity-50"
                >
                  {batchSending ? "Sending..." : "📤 Send Normal Feedback Batch Now"}
                </button>
              </div>
            </div>

            {/* Multilingual About Us */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold mb-4">📝 About Us Text (Multilingual)</h2>
              <p className="text-xs text-slate-500 mb-4">Enter the "About Us" text for each supported language. The frontend will display the text matching the user's selected language.</p>
              <div className="space-y-4">
                {SUPPORTED_LANGUAGES.map((lang) => {
                  const key = `about_us_text_${lang.code}`;
                  return (
                    <div key={key} className="border border-slate-200 rounded-lg p-4">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        About Us — {lang.label} ({lang.code})
                      </label>
                      <textarea
                        value={editingSettings[key] || ""}
                        onChange={(e) => setEditingSettings({ ...editingSettings, [key]: e.target.value })}
                        className="w-full border border-slate-200 rounded p-2 text-sm h-24 resize-y focus:outline-none focus:ring-1 focus:ring-blue-300"
                        dir={lang.code === "fa" || lang.code === "ar" ? "rtl" : "ltr"}
                        placeholder={`Enter about us text in ${lang.label}...`}
                      />
                      <button
                        onClick={() => handleSaveSetting(key)}
                        className="mt-2 bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-700 cursor-pointer"
                      >
                        {settingSaveStatus[key] === "saved" ? "✓ Saved" : "Save"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Wallets Tab */}
        {activeTab === "wallets" && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Crypto Wallets</h2>
            <div className="flex flex-wrap gap-3 mb-4">
              <input
                type="text"
                placeholder="Crypto name (e.g. Bitcoin)"
                value={newWalletName}
                onChange={(e) => setNewWalletName(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Wallet address"
                value={newWalletAddress}
                onChange={(e) => setNewWalletAddress(e.target.value)}
                className="flex-1 min-w-[200px] border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="QR URL (optional, or upload below)"
                value={newWalletQr}
                onChange={(e) => setNewWalletQr(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
              <button onClick={handleAddWallet} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 cursor-pointer">
                Add Wallet
              </button>
            </div>

            <input
              ref={qrFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleQrFileChange}
            />

            <div className="space-y-3">
              {wallets.map((w) => (
                <div key={w.id} className="bg-slate-50 rounded-lg px-4 py-3 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">{w.crypto_name}</span>
                      <p className="text-xs text-slate-500 font-mono break-all">{w.wallet_address}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <button
                        onClick={() => handleUploadQrClick(w.id)}
                        disabled={uploadingQr === w.id}
                        className="text-xs text-blue-600 hover:underline cursor-pointer disabled:opacity-50"
                      >
                        {uploadingQr === w.id ? "Uploading..." : "📷 Upload QR"}
                      </button>
                      <button
                        onClick={() => handleDeleteWallet(w.id)}
                        className="text-xs text-red-500 hover:underline cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {w.qr_code_url && (
                    <div className="mt-2">
                      <p className="text-xs text-slate-500 mb-1">QR: <span className="font-mono">{w.qr_code_url}</span></p>
                      <QrPreview objectKey={w.qr_code_url} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feedbacks Tab */}
        {activeTab === "feedbacks" && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Feedbacks</h2>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => { setFbFilter(""); setTimeout(loadFeedbacks, 50); }}
                className={`px-3 py-1.5 rounded-lg text-sm border cursor-pointer ${!fbFilter ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 text-slate-700 hover:bg-slate-100"}`}
              >
                All
              </button>
              <button
                onClick={() => { setFbFilter("normal"); setTimeout(loadFeedbacks, 50); }}
                className={`px-3 py-1.5 rounded-lg text-sm border cursor-pointer ${fbFilter === "normal" ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 text-slate-700 hover:bg-slate-100"}`}
              >
                Normal
              </button>
              <button
                onClick={() => { setFbFilter("urgent"); setTimeout(loadFeedbacks, 50); }}
                className={`px-3 py-1.5 rounded-lg text-sm border cursor-pointer ${fbFilter === "urgent" ? "bg-red-600 text-white border-red-600" : "border-slate-200 text-slate-700 hover:bg-slate-100"}`}
              >
                Urgent
              </button>
            </div>
            <div className="space-y-3">
              {feedbacks.length === 0 && <p className="text-sm text-slate-500">No feedbacks found.</p>}
              {feedbacks.map((fb) => (
                <div key={fb.id} className={`rounded-lg px-4 py-3 border ${fb.feedback_type === "urgent" ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${fb.feedback_type === "urgent" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                      {fb.feedback_type}
                    </span>
                    <span className="text-xs text-slate-500">{fb.created_at}</span>
                  </div>
                  <p className="text-sm text-slate-700 mb-1">{fb.message}</p>
                  {fb.contact_info && <p className="text-xs text-slate-500">Contact: {fb.contact_info}</p>}
                  <p className="text-xs text-slate-400">IP: {fb.ip_address} • {fb.device_info?.slice(0, 60)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Component to preview QR images from object storage */
function QrPreview({ objectKey }: { objectKey: string }) {
  const [url, setUrl] = useState<string>("");

  useEffect(() => {
    if (!objectKey) return;
    // If it's already a full URL, use directly
    if (objectKey.startsWith("http://") || objectKey.startsWith("https://")) {
      setUrl(objectKey);
      return;
    }
    // Otherwise resolve from object storage
    client.storage
      .getDownloadUrl({ bucket_name: "qr-images", object_key: objectKey })
      .then((res: any) => {
        const downloadUrl = res?.data?.download_url || res?.download_url || "";
        if (downloadUrl) setUrl(downloadUrl);
      })
      .catch(() => {});
  }, [objectKey]);

  if (!url) return null;
  return (
    <img
      src={url}
      alt="QR Code"
      className="w-32 h-32 border border-slate-200 rounded-lg object-contain bg-white"
    />
  );
}