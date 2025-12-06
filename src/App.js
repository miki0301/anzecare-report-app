import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Building, Calendar, FileText, Plus, 
  Trash2, Save, Printer, ChevronRight, CheckSquare,
  Clock, Activity, AlertTriangle, UserCircle,
  Briefcase, Settings, LogOut, X, Edit, Eye, EyeOff, Upload, Lock, Unlock, FileEdit, RefreshCw
} from 'lucide-react';

// --- Firebase Imports ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  query,
  orderBy,
  setDoc,
  updateDoc
} from 'firebase/firestore';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyBn4N2OOA5EkW0k4ZEiMYtLSJS-LgtWOtQ",
  authDomain: "anzecare-report-app.firebaseapp.com",
  projectId: "anzecare-report-app",
  storageBucket: "anzecare-report-app.firebasestorage.app",
  messagingSenderId: "119343301156",
  appId: "1:119343301156:web:32364d2a4185380cedceb1",
  measurementId: "G-3J4XKE067K"
};

let app;
let auth;
let db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error("Firebase 初始化失敗:", error);
}

const appId = 'anze-care-default';

// --- Utils & Logic ---
const INDUSTRY_DATA = {
  cat1: ["礦業及土石採取業", "製造業-紡織業", "製造業-電子零組件", "營造業", "水電燃氣業", "運輸倉儲通信業", "國防事業", "中央主管機關指定達一定規模之事業"],
  cat2: ["農林漁牧業", "製造業-食品製造", "餐旅業", "醫療保健服務業", "批發零售業", "學術研究", "公共行政業"],
  cat3: ["其他 (一般辦公室、金融業等)"]
};

const FREQ_OPTIONS = {
  nurse: ["顧問諮詢 (未達50人)", "1次/3個月", "1次/2個月", "1次/月", "2次/月", "3次/月", "4次/月", "6次/月", "專職護理人員 (300人以上)"],
  doctor: ["顧問諮詢 (未達50人)", "1次/年", "2次/年", "3次/年", "4次/年", "6次/年", "1次/6個月", "1次/3個月", "1次/2個月", "1次/月", "3次/月"]
};

const calculateRegulationFrequency = (category, count, standard = 'rule4') => {
  if (count < 50) return { nurse: "顧問諮詢 (未達50人)", doctor: "顧問諮詢 (未達50人)", desc: "未達50人門檻" };
  let nurse = "1次/月";
  let doctor = "1次/年";
  let desc = "";
  if (standard === 'rule7') {
    desc = `依據附表七 (第13條)，勞工${count}人`;
    if (count >= 3000) { doctor = "1次/2個月"; nurse = "1次/月"; } 
    else if (count >= 1000) { doctor = "1次/3個月"; nurse = "1次/月"; }
    else if (count >= 300) { doctor = "1次/6個月"; nurse = "1次/2個月"; }
    else if (count >= 50) { 
      doctor = "1次/年"; nurse = "1次/3個月";
      if (count < 100) desc += " (註：50-99人且未具特別危害者不適用此表)";
    }
  } else {
    desc = `依據附表四 (第4條)，勞工${count}人，屬第${category}類事業`;
    if (count >= 300) nurse = "專職護理人員";
    else if (count >= 200) nurse = category === "1" ? "6次/月" : "3次/月";
    else nurse = "1次/月";
    if (count >= 300) doctor = "1次/月";
    else doctor = "1次/年";
  }
  return { nurse, doctor, desc };
};

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${active ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-teal-50'}`}>
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

const LoginScreen = ({ onSelectRole }) => (
  <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
    <div className="mb-8 text-center text-teal-700"><Activity size={64} className="mx-auto mb-4"/><h1 className="text-3xl font-extrabold text-gray-900">Anze Care Manager</h1></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
      <button onClick={() => onSelectRole('individual')} className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all group text-left border-2 border-transparent hover:border-teal-500">
        <div className="bg-teal-100 w-16 h-16 rounded-full flex items-center justify-center mb-6"><UserCircle size={32} className="text-teal-700"/></div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">我是獨立護理師</h2>
        <p className="text-gray-500">進入個人版 <ChevronRight size={18} className="inline"/></p>
      </button>
      <button onClick={() => onSelectRole('agency')} className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all group text-left border-2 border-transparent hover:border-blue-500">
        <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mb-6"><Briefcase size={32} className="text-blue-700"/></div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">我是顧問管理公司</h2>
        <p className="text-gray-500">進入企業版 <ChevronRight size={18} className="inline"/></p>
      </button>
    </div>
  </div>
);

// --- [RESTORED] User Profile Component ---
const UserProfile = ({ profile, onSave }) => {
  const [data, setData] = useState({ name: '', title: '勞工健康服務護理師', license: '', ...profile });
  const handleSave = (e) => {
    e.preventDefault();
    onSave(data);
    alert('個人資料已更新！下次填寫紀錄時將自動帶入。');
  };
  // Sync if profile updates from DB
  useEffect(() => { if (profile) setData(prev => ({...prev, ...profile})); }, [profile]);

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
        <Settings className="mr-2" /> 個人執業設定
      </h2>
      <form onSubmit={handleSave} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">您的姓名 (將自動帶入簽名欄)</label>
          <input type="text" value={data.name} onChange={e => setData({...data, name: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="如：李小明" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">預設職稱</label>
            <input type="text" value={data.title} onChange={e => setData({...data, title: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="如：勞工健康服務護理人員" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">證照/字號 (選填)</label>
            <input type="text" value={data.license} onChange={e => setData({...data, license: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="如：護字第12345號" />
          </div>
        </div>
        <button type="submit" className="w-full bg-teal-600 text-white py-3 rounded-lg hover:bg-teal-700 font-bold">儲存設定</button>
      </form>
    </div>
  );
};

const StaffManager = ({ staff, onAdd, onDelete }) => {
  const [newStaff, setNewStaff] = useState({ name: '', role: '勞工健康服務護理師', hourlyRate: 2000 });
  const handleSubmit = (e) => { e.preventDefault(); onAdd(newStaff); setNewStaff({ name: '', role: '勞工健康服務護理師', hourlyRate: 2000 }); };
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center"><Users className="mr-2" /> 內部團隊管理</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div><label className="text-sm font-medium">姓名</label><input type="text" value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
          <div><label className="text-sm font-medium">職稱</label><select value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})} className="w-full p-2 border rounded-lg"><option value="勞工健康服務護理師">勞工健康服務護理師</option><option value="勞工健康服務醫師">勞工健康服務醫師</option><option value="專案管理人員">專案管理人員</option></select></div>
          <div><label className="text-sm font-medium">時薪</label><input type="number" value={newStaff.hourlyRate} onChange={e => setNewStaff({...newStaff, hourlyRate: parseInt(e.target.value)})} className="w-full p-2 border rounded-lg" /></div>
          <button type="submit" className="bg-teal-600 text-white p-2 rounded-lg hover:bg-teal-700 flex items-center justify-center"><Plus size={20} className="mr-1" /> 新增</button>
        </form>
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden"><table className="w-full text-left"><thead className="bg-gray-50 border-b"><tr><th className="p-4">姓名</th><th className="p-4">職稱</th><th className="p-4">操作</th></tr></thead><tbody>{staff.map(s => <tr key={s.id} className="border-b"><td className="p-4">{s.name}</td><td className="p-4">{s.role}</td><td className="p-4"><button onClick={()=>onDelete(s.id)} className="text-red-500"><Trash2 size={18}/></button></td></tr>)}</tbody></table></div>
    </div>
  );
};

const ClientManager = ({ clients, onAdd, onDelete, role }) => {
  const [newClient, setNewClient] = useState({ name: '', industry: '', category: '1', regulationStd: 'rule4', employees: '', nurseFreq: '', doctorFreq: '', contractAmount: 0, customMode: false, suggestion: '' });
  
  const handleIndustryChange = (e) => {
    const selectedIndustry = e.target.value;
    let cat = '3';
    if (INDUSTRY_DATA.cat1.includes(selectedIndustry)) cat = '1';
    else if (INDUSTRY_DATA.cat2.includes(selectedIndustry)) cat = '2';
    setNewClient(prev => ({ ...prev, industry: selectedIndustry, category: cat }));
  };

  useEffect(() => {
    if (!newClient.customMode) {
      const numEmployees = parseInt(newClient.employees) || 0;
      const rec = calculateRegulationFrequency(newClient.category, numEmployees, newClient.regulationStd);
      setNewClient(prev => ({ ...prev, nurseFreq: rec.nurse, doctorFreq: rec.doctor, suggestion: rec.desc }));
    }
  }, [newClient.category, newClient.employees, newClient.regulationStd, newClient.customMode]);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newClient.name || !newClient.industry) { alert("請填寫企業名稱並選擇行業分類"); return; }
    onAdd({ ...newClient, employees: parseInt(newClient.employees) || 0 });
    setNewClient({ name: '', industry: '', category: '1', regulationStd: 'rule4', employees: '', nurseFreq: '', doctorFreq: '', contractAmount: 0, customMode: false, suggestion: '' });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center"><Building className="mr-2" /> 客戶合約管理</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="col-span-full md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">企業名稱</label>
            <input type="text" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="如：ABC股份有限公司" />
          </div>
          <div className="col-span-full md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">法規標準</label>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer bg-gray-50 p-2 rounded flex-1"><input type="radio" name="std" value="rule4" checked={newClient.regulationStd === 'rule4'} onChange={e => setNewClient({...newClient, regulationStd: e.target.value})}/><span>第4條(附表四)-風險分類</span></label>
              <label className="flex items-center space-x-2 cursor-pointer bg-gray-50 p-2 rounded flex-1"><input type="radio" name="std" value="rule7" checked={newClient.regulationStd === 'rule7'} onChange={e => setNewClient({...newClient, regulationStd: e.target.value})}/><span>第13條(附表七)-人數規模</span></label>
            </div>
          </div>
          <div className="col-span-full md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">行業 (附表一)</label>
            <select value={newClient.industry} onChange={handleIndustryChange} className="w-full p-2 border rounded-lg bg-white">
              <option value="">-- 請選擇行業 --</option>
              <optgroup label="【第一類】顯著風險">{INDUSTRY_DATA.cat1.map(item => <option key={item} value={item}>{item}</option>)}</optgroup>
              <optgroup label="【第二類】中度風險">{INDUSTRY_DATA.cat2.map(item => <option key={item} value={item}>{item}</option>)}</optgroup>
              <optgroup label="【第三類】低度風險">{INDUSTRY_DATA.cat3.map(item => <option key={item} value={item}>{item}</option>)}</optgroup>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">風險類別</label>
            <div className={`w-full p-2 border rounded-lg font-bold text-center ${newClient.category === '1' ? 'bg-red-100 text-red-800' : newClient.category === '2' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
              {newClient.category === '1' ? '第一類事業' : newClient.category === '2' ? '第二類事業' : '第三類事業'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">勞工人數</label>
            <input type="number" value={newClient.employees} onChange={e => setNewClient({...newClient, employees: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="0" />
          </div>
          <div className="col-span-full border-t pt-2 mt-2">
             <label className="flex items-center space-x-2 text-sm text-teal-600 cursor-pointer w-fit mb-2">
               <input type="checkbox" checked={newClient.customMode} onChange={e => setNewClient({...newClient, customMode: e.target.checked})} className="w-4 h-4"/>
               <span className="font-bold">啟用手動頻率設定</span>
             </label>
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="text-xs text-gray-500">護理師頻率</label>
                 {newClient.customMode ? <input className="w-full border p-2 rounded" value={newClient.nurseFreq} onChange={e=>setNewClient({...newClient, nurseFreq: e.target.value})}/> : <select className="w-full border p-2 rounded bg-yellow-50" value={newClient.nurseFreq} onChange={e=>setNewClient({...newClient, nurseFreq: e.target.value})}>{FREQ_OPTIONS.nurse.map(o=><option key={o} value={o}>{o}</option>)}</select>}
               </div>
               <div>
                 <label className="text-xs text-gray-500">醫師頻率</label>
                 {newClient.customMode ? <input className="w-full border p-2 rounded" value={newClient.doctorFreq} onChange={e=>setNewClient({...newClient, doctorFreq: e.target.value})}/> : <select className="w-full border p-2 rounded bg-yellow-50" value={newClient.doctorFreq} onChange={e=>setNewClient({...newClient, doctorFreq: e.target.value})}>{FREQ_OPTIONS.doctor.map(o=><option key={o} value={o}>{o}</option>)}</select>}
               </div>
             </div>
             <p className="text-xs text-gray-400 mt-1">法規建議: {newClient.suggestion}</p>
          </div>
          <button type="submit" className="bg-teal-600 text-white p-2 rounded-lg hover:bg-teal-700 flex items-center justify-center col-span-full"><Plus size={20} className="mr-1" /> 新增合約</button>
        </form>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {clients.map(client => (
          <div key={client.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg text-gray-800">{client.name}</h3>
              <p className="text-sm text-gray-500 mb-1">{client.industry || '未分類'}</p>
              <p className="text-xs text-gray-400 mb-2">{client.employees} 人 | {client.regulationStd === 'rule7' ? '第13條' : `第4條-第${client.category}類`}</p>
              <div className="flex space-x-2"><span className="text-xs bg-teal-100 text-teal-800 px-2 py-1 rounded">護: {client.nurseFreq}</span><span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">醫: {client.doctorFreq}</span></div>
            </div>
            <button onClick={() => onDelete(client.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={20} /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Dashboard ---
const Dashboard = ({ logs, clients, staff, userRole, userProfile, setActiveTab }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const monthlyLogs = logs.filter(log => { const d = new Date(log.date); return d.getFullYear() === selectedYear && (d.getMonth() + 1) === selectedMonth; });
  const yearlyLogs = logs.filter(log => { const d = new Date(log.date); return d.getFullYear() === selectedYear; });
  const monthlyHours = monthlyLogs.reduce((acc, curr) => acc + parseFloat(curr.hours || 0), 0);
  const yearlyHours = yearlyLogs.reduce((acc, curr) => acc + parseFloat(curr.hours || 0), 0);
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">{userRole === 'individual' ? `早安，${userProfile.name || '護理師'}` : '企業營運總覽'}</h2>
        <div className="flex space-x-2 bg-white p-1 rounded-lg shadow-sm border border-gray-200">
           <select className="p-1 text-sm bg-transparent font-medium text-gray-700 outline-none" value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>{[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}年</option>)}</select>
           <select className="p-1 text-sm bg-transparent font-medium text-gray-700 outline-none border-l pl-2" value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}>{Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}月</option>)}</select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div><p className="text-teal-100 mb-1 text-sm font-medium flex items-center"><Calendar size={14} className="mr-1"/> {selectedMonth}月 服務場次</p><h3 className="text-4xl font-bold mb-1">{monthlyLogs.length} <span className="text-lg font-normal opacity-80">場</span></h3><p className="text-xs text-teal-100 opacity-80">累積時數: {monthlyHours.toFixed(1)} hr</p></div>
            <div className="bg-white/20 p-2 rounded-lg"><Activity className="text-white" size={24} /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div><p className="text-gray-500 mb-1 text-sm font-medium flex items-center"><Clock size={14} className="mr-1"/> {selectedYear}年度 累積</p><h3 className="text-4xl font-bold text-gray-800 mb-1">{yearlyLogs.length} <span className="text-lg font-normal text-gray-400">場</span></h3><p className="text-xs text-gray-400">年度累積時數: {yearlyHours.toFixed(1)} hr</p></div>
            <div className="bg-blue-50 p-2 rounded-lg"><Calendar className="text-blue-500" size={24} /></div>
          </div>
        </div>
        <button onClick={() => setActiveTab('clients')} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-left hover:border-teal-400 hover:shadow-md transition-all group">
          <div className="flex justify-between items-start">
            <div><p className="text-gray-500 mb-1 group-hover:text-teal-600 text-sm font-medium">現有合約客戶</p><h3 className="text-4xl font-bold text-gray-800 mb-1">{clients.length} <span className="text-lg font-normal text-gray-400">家</span></h3><p className="text-xs text-gray-400 group-hover:text-teal-500 flex items-center">點擊管理客戶清單 <ChevronRight size={12}/></p></div>
            <div className="bg-gray-50 group-hover:bg-teal-50 p-2 rounded-lg transition-colors"><Building className="text-gray-400 group-hover:text-teal-500" size={24} /></div>
          </div>
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button onClick={() => setActiveTab('service')} className="p-6 bg-white border border-gray-200 rounded-xl flex items-center hover:bg-gray-50 transition-colors group">
           <div className="bg-teal-100 p-3 rounded-full mr-4 text-teal-600 group-hover:scale-110 transition-transform"><Plus size={24} /></div>
           <div className="text-left"><h4 className="font-bold text-lg text-gray-800">新增服務紀錄</h4><p className="text-gray-500 text-sm">填寫臨場服務日誌 (附表八)</p></div>
           <ChevronRight className="ml-auto text-gray-300 group-hover:text-teal-500" />
        </button>
        <button onClick={() => setActiveTab('reports')} className="p-6 bg-white border border-gray-200 rounded-xl flex items-center hover:bg-gray-50 transition-colors group">
           <div className="bg-blue-100 p-3 rounded-full mr-4 text-blue-600 group-hover:scale-110 transition-transform"><FileText size={24} /></div>
           <div className="text-left"><h4 className="font-bold text-lg text-gray-800">報表中心</h4><p className="text-gray-500 text-sm">查看歷史紀錄與列印報表</p></div>
           <ChevronRight className="ml-auto text-gray-300 group-hover:text-blue-500" />
        </button>
      </div>
    </div>
  );
};

// --- Service Logger (FIXED & RESTORED FULL VERSION) ---
const ServiceLogger = ({ staff, clients, onSaveLog, role, userProfile, initialData, onCancelEdit, logs }) => {
  
  const createDefaultState = (clientId = '') => ({
    clientId: clientId, serviceMode: 'nurse_only', date: new Date().toISOString().split('T')[0], startTime: '14:00', endTime: '17:00',
    dept_name: '', address: '', admin_male: 0, admin_female: 0, field_male: 0, field_female: 0, work_general_count: 0, special_hazards: [], process: '', work_type_time: '', hazards: [],
    check_health: false, check_job: false, check_track: false, check_high_risk: false, check_research: false, check_edu: false, check_emerg: false, check_report: false, check_env: false, check_env_impr: false, check_survey: false, check_return: false, check_other: false,
    job_sel_count: '', tracking_count: '', high_risk_count: '', emergency_count: '', other_note: '',
    plan_ergo: false, plan_overwork: false, plan_maternal: false, plan_violence: false, plan_age: false, plan_hearing: false, plan_breath: false, plan_epidemic: false, plan_other_central: false, other_central_note: '',
    section3_findings: '', suggestions_map: {}, prev_tracking: '', 
    // Show Toggles
    show_tracking_2: true, show_tracking_3: true, show_tracking_4: true, show_tracking_5: true,
    show_plan_overwork: true, show_plan_ergo: true, show_plan_violence: true, 
    showLevel2: true, // [Restore] Level 2 Toggle
    exam_year: new Date().getFullYear(),
    level4_interview: '', level4_not: '', level4_close: '', level4_track: '', 
    level3_interview: '', level3_not: '', level3_close: '', level3_track: '', 
    level2_interview: '', level2_not: '', level2_close: '', level2_track: '', 
    // Plan Details (Overwork)
    overwork_survey_total: '', overwork_survey_done: '', overwork_survey_not: '',
    overwork_risk_count: '', overwork_int_need: '', overwork_int_done: '', overwork_int_not: '',
    // Plan Details (Ergo)
    ergo_survey_total: '', ergo_survey_done: '', ergo_survey_not: '',
    ergo_risk_count: '', ergo_int_done: '', ergo_int_not: '',
    // Plan Details (Violence)
    violence_statement: false, violence_assess_target: '', violence_assess_done: '', violence_assess_not: '',
    violence_config: false, violence_adjust: false, violence_report: false,
    // Plan Details (Maternal)
    maternal_hazard_check: false, 
    mat_female_total: '', mat_repro_age: '', mat_pregnant: '', mat_postpartum: '', mat_breastfeeding: '',
    mat_doc_need: '', mat_doc_done: '', mat_doc_not: '', 
    mat_track: '', mat_medical: '',
    mat_nurse_need: '', mat_nurse_done: '', mat_nurse_not: '',
    mat_referral: '', mat_regular_track: '',
    // Injury
    injury_report_count: 0, injury_unclosed: 0, injury_closed: 0, injury_note: '',
    
    signatures: { 
        onsite: [
            { id: 'doc', title: '勞工健康服務醫師', name: '', required: false }, 
            { id: 'nurse', title: '勞工健康服務護理人員', name: userProfile.name || '', required: true },
            ...(role === 'agency' ? [{ id: 'pm', title: '專案管理人員', name: '', required: false }] : [])
        ], 
        client: [{ id: 'osh', title: '職安衛人員', name: '' }, { id: 'mgr', title: '部門主管', name: '' }] 
    },
    attachments: [], status: 'draft', version: 1
  });

  const [log, setLog] = useState(createDefaultState());
  const [newHazard, setNewHazard] = useState({ type: '', job: '', desc: '' });
  const [newSpecial, setNewSpecial] = useState({ category: '', count: 0 });
  const [autoFilled, setAutoFilled] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (initialData) setLog({ ...createDefaultState(), ...initialData });
  }, [initialData]);

  useEffect(() => {
    if (!initialData && log.clientId) {
      const history = logs.filter(l => l.clientId === log.clientId);
      if (history.length > 0) {
        const lastReport = history.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        setLog(prev => ({
          ...prev, ...lastReport, 
          date: new Date().toISOString().split('T')[0], startTime: '14:00', endTime: '17:00',
          status: 'draft', version: 1, id: undefined, createdAt: undefined, updatedAt: undefined,
          signatures: lastReport.signatures || prev.signatures
        }));
        setAutoFilled(true);
      } else {
        const client = clients.find(c => c.id === log.clientId);
        setLog(prev => ({ ...createDefaultState(prev.clientId), work_general_count: client ? client.employees : 0 }));
        setAutoFilled(false);
      }
    }
  }, [log.clientId, initialData]); 

  // --- Auto-Calc Handlers ---
  const handleOverworkCalc = (field, val) => {
    const newVal = val;
    let updates = { [field]: newVal };
    if (field === 'overwork_int_need' || field === 'overwork_int_done') {
        const need = parseInt(field === 'overwork_int_need' ? newVal : log.overwork_int_need) || 0;
        const done = parseInt(field === 'overwork_int_done' ? newVal : log.overwork_int_done) || 0;
        updates.overwork_int_not = need - done;
    }
    setLog(prev => ({...prev, ...updates}));
  };

  const handleErgoCalc = (field, val) => {
    const newVal = val;
    let updates = { [field]: newVal };
    if (field === 'ergo_survey_total' || field === 'ergo_survey_done') {
        const total = parseInt(field === 'ergo_survey_total' ? newVal : log.ergo_survey_total) || 0;
        const done = parseInt(field === 'ergo_survey_done' ? newVal : log.ergo_survey_done) || 0;
        updates.ergo_survey_not = total - done;
    }
    setLog(prev => ({...prev, ...updates}));
  };

  const handleMatDocCalc = (field, val) => {
    const newVal = val;
    let updates = { [field]: newVal };
    if (field === 'mat_doc_need' || field === 'mat_doc_done') {
        const need = parseInt(field === 'mat_doc_need' ? newVal : log.mat_doc_need) || 0;
        const done = parseInt(field === 'mat_doc_done' ? newVal : log.mat_doc_done) || 0;
        updates.mat_doc_not = need - done;
    }
    setLog(prev => ({...prev, ...updates}));
  };

  const handleMatNurseCalc = (field, val) => {
    const newVal = val;
    let updates = { [field]: newVal };
    if (field === 'mat_nurse_need' || field === 'mat_nurse_done') {
        const need = parseInt(field === 'mat_nurse_need' ? newVal : log.mat_nurse_need) || 0;
        const done = parseInt(field === 'mat_nurse_done' ? newVal : log.mat_nurse_done) || 0;
        updates.mat_nurse_not = need - done;
    }
    setLog(prev => ({...prev, ...updates}));
  };

  const totalLabor = (parseInt(log.admin_male)||0) + (parseInt(log.admin_female)||0) + (parseInt(log.field_male)||0) + (parseInt(log.field_female)||0);
  const totalSpecial = log.special_hazards.reduce((acc, curr) => acc + (parseInt(curr.count)||0), 0);

  const addHazard = () => { if(!newHazard.type) return; setLog(prev => ({...prev, hazards: [...prev.hazards, newHazard]})); setNewHazard({ type: '', job: '', desc: '' }); };
  const removeHazard = (idx) => { setLog(prev => ({...prev, hazards: prev.hazards.filter((_, i) => i !== idx)})); };
  const addSpecial = () => { if(!newSpecial.category) return; setLog(prev => ({...prev, special_hazards: [...prev.special_hazards, newSpecial]})); setNewSpecial({ category: '', count: 0 }); };
  const removeSpecial = (idx) => { setLog(prev => ({...prev, special_hazards: prev.special_hazards.filter((_, i) => i !== idx)})); };
  const handleSuggestionChange = (key, val) => { setLog(prev => ({...prev, suggestions_map: {...prev.suggestions_map, [key]: val}})); };
  
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => { setLog(prev => ({ ...prev, attachments: [...prev.attachments, {name: file.name, dataUrl: ev.target.result}] })); };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const removeAttachment = (idx) => { setLog(prev => ({...prev, attachments: prev.attachments.filter((_, i) => i !== idx)})); };

  const handleSignatureChange = (side, index, field, value) => {
    setLog(prev => {
      const newSigs = { ...prev.signatures };
      newSigs[side] = [...newSigs[side]];
      newSigs[side][index] = { ...newSigs[side][index], [field]: value };
      return { ...prev, signatures: newSigs };
    });
  };
  const addClientSignature = () => setLog(prev => ({...prev, signatures: { ...prev.signatures, client: [...prev.signatures.client, { id: Date.now(), title: '自訂職稱', name: '' }] }}));
  const removeClientSignature = (index) => setLog(prev => { const newClientSigs = [...prev.signatures.client]; newClientSigs.splice(index, 1); return { ...prev, signatures: { ...prev.signatures, client: newClientSigs } }; });
  
  // [NEW] Add Onsite Signature
  const addOnsiteSignature = () => setLog(prev => ({...prev, signatures: { ...prev.signatures, onsite: [...prev.signatures.onsite, { id: Date.now(), title: '自訂職稱', name: '' }] }}));
  const removeOnsiteSignature = (index) => setLog(prev => { const newOnsiteSigs = [...prev.signatures.onsite]; newOnsiteSigs.splice(index, 1); return { ...prev, signatures: { ...prev.signatures, onsite: newOnsiteSigs } }; });

  const handleSave = (status) => {
    if (!log.clientId) { alert("請選擇客戶"); return; }
    const clientName = clients.find(c => c.id === log.clientId)?.name;
    const nurseSig = log.signatures.onsite.find(s => s.title.includes('護理'));
    const docSig = log.signatures.onsite.find(s => s.title.includes('醫師'));
    const nurseName = nurseSig ? nurseSig.name : "";
    const doctorName = docSig ? docSig.name : "";
    let newVersion = log.version;
    if (initialData && initialData.status === 'completed') newVersion = initialData.version + 1;

    const dataToSave = {
        ...log,
        clientName, nurseName, doctorName, staffName: nurseName || doctorName || "未簽名",
        status: status, version: newVersion,
        hours: ((new Date(`2000/01/01 ${log.endTime}`) - new Date(`2000/01/01 ${log.startTime}`)) / 36e5).toFixed(1),
        updatedAt: serverTimestamp()
    };
    if (!initialData) dataToSave.createdAt = serverTimestamp();

    onSaveLog(dataToSave, initialData?.id);
    if (!initialData) { setLog(createDefaultState()); setAutoFilled(false); }
  };

  const CHECKLIST_ITEMS = [
    { key: 'check_health', label: '勞工一般/特殊/供膳等體格（健康）檢查結果之分析與評估、健康管理及資料保存。' },
    { key: 'check_job', label: '協助雇主選配勞工從事適當之工作', hasCount: true, countKey: 'job_sel_count' },
    { key: 'check_track', label: '辦理健康檢查結果異常者之追蹤管理及健康指導', hasCount: true, countKey: 'tracking_count' },
    { key: 'check_high_risk', label: '辦理未滿十八歲勞工、有母性健康危害之虞之勞工、職業傷病勞工與職業健康相關高風險勞工之評估及個案管理', hasCount: true, countKey: 'high_risk_count' },
    { key: 'check_research', label: '職業衛生或職業健康之相關研究報告及傷害、疾病紀錄之保存。' },
    { key: 'check_edu', label: '勞工之健康教育、衛生指導、身心健康保護、健康促進等措施之策劃及實施。' },
    { key: 'check_emerg', label: '工作相關傷病之預防、健康諮詢與急救及緊急處置', hasCount: true, countKey: 'emergency_count' },
    { key: 'check_report', label: '定期向雇主報告及勞工健康服務之建議。' },
    { key: 'check_env', label: '辨識與評估工作場所環境、作業及組織內部影響勞工身心健康之危害因子，提出改善與建議。' },
    { key: 'check_env_impr', label: '提出作業環境安全衛生設施改善規劃之建議。' },
    { key: 'check_survey', label: '調查勞工健康情形與作業之關連性，並採取必要之預防及健康促進措施。' },
    { key: 'check_return', label: '提供復工勞工之職能評估、職務再設計或調整之諮詢及建議。' },
    { key: 'check_other', label: '其他經中央主管機關指定公告者。' },
  ];

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <Clock className="mr-2" /> 
            {initialData ? `編輯服務紀錄 (目前版本: V${log.version})` : '新增服務紀錄'}
        </h2>
        {initialData && <button onClick={onCancelEdit} className="text-gray-500 hover:text-gray-700">取消編輯</button>}
      </div>

      <div className="border p-4 rounded-lg bg-gray-50">
        <h3 className="font-bold border-b pb-2 mb-3 flex justify-between">
            <span>一、作業場所基本資料</span>
            {autoFilled && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded flex items-center"><RefreshCw size={12} className="mr-1"/>已自動帶入前次資料</span>}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div><label className="text-sm font-bold">企業名稱</label>
            <select className="w-full p-2 border rounded" value={log.clientId} onChange={e => setLog({...log, clientId: e.target.value})} disabled={!!initialData}>
                <option value="">請選擇...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></div>
            <div><label className="text-sm font-bold">日期</label><input type="date" className="w-full p-2 border rounded" value={log.date} onChange={e=>setLog({...log, date: e.target.value})}/></div>
            <div><label className="text-sm font-medium">部門</label><input type="text" className="w-full p-2 border rounded" value={log.dept_name} onChange={e => setLog({...log, dept_name: e.target.value})}/></div>
            <div><label className="text-sm font-medium">地址</label><input type="text" className="w-full p-2 border rounded" value={log.address} onChange={e => setLog({...log, address: e.target.value})}/></div>
        </div>
        <div className="bg-white p-3 border rounded text-sm mb-3">
            <span className="font-bold">勞工總人數: {totalLabor}</span> (男{log.field_male+log.admin_male}/女{log.field_female+log.admin_female})
            <div className="grid grid-cols-4 gap-2 mt-2">
                <div><label className="text-xs">行政(男)</label><input type="number" className="border p-1 w-full" value={log.admin_male} onChange={e=>setLog({...log, admin_male: parseInt(e.target.value)||0})}/></div>
                <div><label className="text-xs">行政(女)</label><input type="number" className="border p-1 w-full" value={log.admin_female} onChange={e=>setLog({...log, admin_female: parseInt(e.target.value)||0})}/></div>
                <div><label className="text-xs">現場(男)</label><input type="number" className="border p-1 w-full" value={log.field_male} onChange={e=>setLog({...log, field_male: parseInt(e.target.value)||0})}/></div>
                <div><label className="text-xs">現場(女)</label><input type="number" className="border p-1 w-full" value={log.field_female} onChange={e=>setLog({...log, field_female: parseInt(e.target.value)||0})}/></div>
            </div>
        </div>
        <div className="bg-white p-3 rounded border">
            <h4 className="text-sm font-bold mb-2">作業類別與危害</h4>
            <div className="mb-2"><label className="text-xs">一般作業人數</label><input type="number" className="border p-1 w-20 ml-2" value={log.work_general_count} onChange={e=>setLog({...log, work_general_count: e.target.value})}/></div>
            <div className="border-t pt-2 mt-2">
                <label className="text-xs font-bold text-red-600 block mb-1">特別危害健康作業 ({totalSpecial}人)</label>
                {totalSpecial >= 50 && <div className="bg-red-100 text-red-800 p-1 rounded mb-1 text-xs"><AlertTriangle size={12} className="inline mr-1"/> 警示：需職醫臨場</div>}
                <div className="flex space-x-2 mb-2"><input placeholder="類別(如:噪音)" className="border p-1 w-2/3" value={newSpecial.category} onChange={e=>setNewSpecial({...newSpecial, category: e.target.value})}/><input type="number" placeholder="人數" className="border p-1 w-1/3" value={newSpecial.count} onChange={e=>setNewSpecial({...newSpecial, count: e.target.value})}/><button type="button" onClick={addSpecial}><Plus size={16}/></button></div>
                {log.special_hazards.map((h, i) => (<div key={i} className="flex justify-between items-center bg-red-50 p-1 mb-1 rounded text-xs"><span>{h.category}: {h.count}人</span><button type="button" onClick={()=>removeSpecial(i)}><X size={12}/></button></div>))}
            </div>
        </div>
      </div>

      <div className="border p-4 rounded-lg bg-gray-50">
        <h3 className="font-bold border-b pb-2 mb-3">二、作業場所與勞動條件概況</h3>
        <div className="space-y-2 mb-3">
            <div><label className="text-sm">工作流程(製程)</label><input className="w-full border p-2 rounded" value={log.process} onChange={e=>setLog({...log, process: e.target.value})}/></div>
            <div><label className="text-sm">工作型態與時間</label><input className="w-full border p-2 rounded" value={log.work_type_time} onChange={e=>setLog({...log, work_type_time: e.target.value})}/></div>
        </div>
        <div className="bg-white p-3 rounded border">
            <h4 className="text-sm font-bold mb-2">初步危害辨識表</h4>
            <div className="flex space-x-2 mb-2"><input placeholder="工作類型" className="border p-1 w-1/3" value={newHazard.type} onChange={e=>setNewHazard({...newHazard, type: e.target.value})}/><input placeholder="職務" className="border p-1 w-1/3" value={newHazard.job} onChange={e=>setNewHazard({...newHazard, job: e.target.value})}/><input placeholder="初步危害辨識" className="border p-1 w-1/3" value={newHazard.desc} onChange={e=>setNewHazard({...newHazard, desc: e.target.value})}/><button type="button" onClick={addHazard}><Plus size={16}/></button></div>
            {log.hazards.map((h, i) => (<div key={i} className="flex justify-between bg-gray-100 p-2 mb-1 rounded text-sm"><span>{h.type} - {h.job} - {h.desc}</span><button type="button" onClick={()=>removeHazard(i)}><X size={12}/></button></div>))}
        </div>
      </div>

      <div className="border p-4 rounded-lg bg-gray-50">
        <h3 className="font-bold border-b pb-2 mb-3">三、臨場健康服務執行情形</h3>
        <div className="space-y-2">
            {CHECKLIST_ITEMS.map(item => (
                <div key={item.key}>
                    <label className="flex items-center space-x-2">
                        <input type="checkbox" checked={log[item.key]} onChange={e=>setLog({...log, [item.key]: e.target.checked})} className="w-4 h-4 mt-1"/>
                        <span className="text-sm">{item.label}</span>
                        {item.hasCount && log[item.key] && <span className="text-sm ml-2 inline-flex items-center">共 <input type="number" className="border w-16 p-0.5 mx-1" value={log[item.countKey]} onChange={e=>setLog({...log, [item.countKey]: e.target.value})}/> 名</span>}
                    </label>
                    {item.key === 'check_other' && log.check_other && (
                        <div className="pl-6 mt-1 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm bg-white p-2 rounded border">
                            <label><input type="checkbox" checked={log.plan_overwork} onChange={e=>setLog({...log, plan_overwork: e.target.checked})}/> 異常工作負荷促發疾病預防計劃</label>
                            <label><input type="checkbox" checked={log.plan_ergo} onChange={e=>setLog({...log, plan_ergo: e.target.checked})}/> 人因性危害預防計劃</label>
                            <label><input type="checkbox" checked={log.plan_maternal} onChange={e=>setLog({...log, plan_maternal: e.target.checked})}/> 工作場所母性健康保護計劃</label>
                            <label><input type="checkbox" checked={log.plan_violence} onChange={e=>setLog({...log, plan_violence: e.target.checked})}/> 執行職務遭受不法侵害預防計劃</label>
                            <label><input type="checkbox" checked={log.plan_age} onChange={e=>setLog({...log, plan_age: e.target.checked})}/> 中高齡及高齡工作者工作適能評估</label>
                            <label><input type="checkbox" checked={log.plan_hearing} onChange={e=>setLog({...log, plan_hearing: e.target.checked})}/> 聽力保護計劃</label>
                            <label><input type="checkbox" checked={log.plan_breath} onChange={e=>setLog({...log, plan_breath: e.target.checked})}/> 呼吸防護計劃</label>
                            <label><input type="checkbox" checked={log.plan_epidemic} onChange={e=>setLog({...log, plan_epidemic: e.target.checked})}/> 防疫措施之策劃及實施</label>
                        </div>
                    )}
                </div>
            ))}
        </div>
        <div className="mt-4 border-t pt-4">
            <h4 className="font-bold text-sm block mb-2 text-teal-800">（二）發現問題 (對應辦理事項描述)</h4>
            <textarea className="w-full border p-2 rounded h-20" value={log.section3_findings} onChange={e=>setLog({...log, section3_findings: e.target.value})} placeholder="請輸入發現問題..."></textarea>
        </div>
      </div>

      <div className="border border-blue-100 rounded-lg p-4 bg-blue-50">
         <h3 className="font-bold border-b border-blue-200 pb-2 mb-3 text-blue-800">四、建議採行措施 (執行紀錄)</h3>
         <p className="text-xs text-gray-500 mb-2">請針對上方勾選的項目填寫具體的執行內容。</p>
         <div className="space-y-4">
            {CHECKLIST_ITEMS.filter(i => log[i.key]).map(item => (
              <div key={item.key} className="bg-white p-3 rounded shadow-sm">
                <label className="font-bold text-sm text-gray-700 block mb-2">{item.label}</label>
                <textarea 
                  rows="3" 
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-200"
                  placeholder="請輸入執行紀錄或建議..."
                  value={log.suggestions_map[item.key] || ''}
                  onChange={e => handleSuggestionChange(item.key, e.target.value)}
                />
              </div>
            ))}
         </div>
      </div>

      <div className="border p-4 rounded-lg bg-gray-50">
        <h3 className="font-bold border-b pb-2 mb-3">五、對於前次建議改善事項之追蹤辦理情形</h3>
        <div className="mb-2"><label className="text-sm font-bold">前次追蹤(必填)</label><input className="w-full border p-2 rounded" value={log.prev_tracking} onChange={e=>setLog({...log, prev_tracking: e.target.value})}/></div>
        
        <div className="bg-white p-3 rounded border space-y-4">
            {/* 健檢 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="flex items-center font-bold"><input type="checkbox" checked={log.show_tracking_2} onChange={e=>setLog({...log, show_tracking_2: e.target.checked})} className="mr-2"/> (2) 健康檢查結果分析之異常追蹤</label>
                {log.show_tracking_2 && <button type="button" onClick={()=>setLog(p=>({...p, showLevel2: !p.showLevel2}))} className="text-xs bg-gray-200 px-2 py-1 rounded flex items-center">{log.showLevel2 ? <Eye size={12} className="mr-1"/> : <EyeOff size={12} className="mr-1"/>} {log.showLevel2 ? '隱藏第二級' : '顯示第二級'}</button>}
              </div>
              {log.show_tracking_2 && (
                <table className="w-full text-center text-xs bg-gray-50 border">
                  <thead><tr className="bg-gray-200"><th>分級</th><th>已面談</th><th>未面談</th><th>結案</th><th>追蹤中</th></tr></thead>
                  <tbody>
                    <tr><td>第四級</td><td><input className="w-12 border text-center" value={log.level4_interview} onChange={e=>setLog({...log, level4_interview:e.target.value})}/></td><td><input className="w-12 border text-center" value={log.level4_not} onChange={e=>setLog({...log, level4_not:e.target.value})}/></td><td><input className="w-12 border text-center" value={log.level4_close} onChange={e=>setLog({...log, level4_close:e.target.value})}/></td><td><input className="w-12 border text-center" value={log.level4_track} onChange={e=>setLog({...log, level4_track:e.target.value})}/></td></tr>
                    <tr><td>第三級</td><td><input className="w-12 border text-center" value={log.level3_interview} onChange={e=>setLog({...log, level3_interview:e.target.value})}/></td><td><input className="w-12 border text-center" value={log.level3_not} onChange={e=>setLog({...log, level3_not:e.target.value})}/></td><td><input className="w-12 border text-center" value={log.level3_close} onChange={e=>setLog({...log, level3_close:e.target.value})}/></td><td><input className="w-12 border text-center" value={log.level3_track} onChange={e=>setLog({...log, level3_track:e.target.value})}/></td></tr>
                    {log.showLevel2 && <tr><td>第二級</td><td><input className="w-12 border text-center" value={log.level2_interview} onChange={e=>setLog({...log, level2_interview:e.target.value})}/></td><td><input className="w-12 border text-center" value={log.level2_not} onChange={e=>setLog({...log, level2_not:e.target.value})}/></td><td><input className="w-12 border text-center" value={log.level2_close} onChange={e=>setLog({...log, level2_close:e.target.value})}/></td><td><input className="w-12 border text-center" value={log.level2_track} onChange={e=>setLog({...log, level2_track:e.target.value})}/></td></tr>}
                  </tbody>
                </table>
              )}
            </div>

            {/* 計畫 */}
            <div>
              <label className="flex items-center font-bold mb-2"><input type="checkbox" checked={log.show_tracking_3} onChange={e=>setLog({...log, show_tracking_3: e.target.checked})} className="mr-2"/> (3) 勞工健康保護計畫執行進度</label>
              {log.show_tracking_3 && (
                <div className="space-y-3 text-xs pl-6">
                   {/* 過負荷 */}
                   <div className="border p-2 rounded">
                      <div className="flex justify-between items-center border-b pb-1 mb-2">
                          <span className="font-bold">異常工作負荷促發疾病預防</span>
                          <label className="flex items-center"><input type="checkbox" checked={log.show_plan_overwork} onChange={e=>setLog({...log, show_plan_overwork:e.target.checked})} className="mr-1"/> 顯示於報表</label>
                      </div>
                      {log.show_plan_overwork && <div className="grid grid-cols-1 gap-1">
                        <div>問卷回收: 應做 <input className="border w-10" value={log.overwork_survey_total} onChange={e=>setLog({...log, overwork_survey_total:e.target.value})}/> / 已做 <input className="border w-10" value={log.overwork_survey_done} onChange={e=>setLog({...log, overwork_survey_done:e.target.value})}/></div>
                        <div>高風險群: <input className="border w-10" value={log.overwork_risk_count} onChange={e=>setLog({...log, overwork_risk_count:e.target.value})}/> 人</div>
                        <div>面談指導: 需面談 <input className="border w-10" value={log.overwork_int_need} onChange={e=>handleOverworkCalc('overwork_int_need', e.target.value)}/> / 已面談 <input className="border w-10" value={log.overwork_int_done} onChange={e=>handleOverworkCalc('overwork_int_done', e.target.value)}/> / 未面談 {log.overwork_int_not} 人</div>
                      </div>}
                   </div>
                   {/* 人因 */}
                   <div className="border p-2 rounded">
                      <div className="flex justify-between items-center border-b pb-1 mb-2">
                          <span className="font-bold">重複性肌肉骨骼疾病預防</span>
                          <label className="flex items-center"><input type="checkbox" checked={log.show_plan_ergo} onChange={e=>setLog({...log, show_plan_ergo:e.target.checked})} className="mr-1"/> 顯示於報表</label>
                      </div>
                      {log.show_plan_ergo && <div className="grid grid-cols-1 gap-1">
                        <div>症狀調查: 應做 <input className="border w-10" value={log.ergo_survey_total} onChange={e=>handleErgoCalc('ergo_survey_total', e.target.value)}/> / 已做 <input className="border w-10" value={log.ergo_survey_done} onChange={e=>handleErgoCalc('ergo_survey_done', e.target.value)}/> / 未做 {log.ergo_survey_not} 份</div>
                        <div>追蹤一覽: 疑似危害 <input className="border w-10" value={log.ergo_risk_count} onChange={e=>setLog({...log, ergo_risk_count:e.target.value})}/> / 已面談 <input className="border w-10" value={log.ergo_int_done} onChange={e=>setLog({...log, ergo_int_done:e.target.value})}/></div>
                      </div>}
                   </div>
                   {/* 不法侵害 (Revised) */}
                   <div className="border p-2 rounded">
                      <div className="flex justify-between items-center border-b pb-1 mb-2">
                          <span className="font-bold">職場不法侵害預防</span>
                          <label className="flex items-center"><input type="checkbox" checked={log.show_plan_violence} onChange={e=>setLog({...log, show_plan_violence:e.target.checked})} className="mr-1"/> 顯示於報表</label>
                      </div>
                      {log.show_plan_violence && <div className="grid grid-cols-1 gap-1">
                        <div className="flex items-center justify-between"><span>預防書面聲明</span><div><label><input type="radio" checked={log.violence_statement} onChange={()=>setLog({...log, violence_statement:true})}/> 已完成</label> <label><input type="radio" checked={!log.violence_statement} onChange={()=>setLog({...log, violence_statement:false})}/> 未完成</label></div></div>
                        <div>辨識及危害評估: 應做 <input className="border w-10" value={log.violence_assess_target} onChange={e=>setLog({...log, violence_assess_target:e.target.value})}/> / 已做 <input className="border w-10" value={log.violence_assess_done} onChange={e=>setLog({...log, violence_assess_done:e.target.value})}/></div>
                        <div className="flex items-center justify-between"><span>適當配置作業場所</span><div><label><input type="radio" checked={log.violence_config} onChange={()=>setLog({...log, violence_config:true})}/> 已完成</label> <label><input type="radio" checked={!log.violence_config} onChange={()=>setLog({...log, violence_config:false})}/> 未完成</label></div></div>
                        <div className="flex items-center justify-between"><span>依工作適性調整人力</span><div><label><input type="radio" checked={log.violence_adjust} onChange={()=>setLog({...log, violence_adjust:true})}/> 已完成</label> <label><input type="radio" checked={!log.violence_adjust} onChange={()=>setLog({...log, violence_adjust:false})}/> 未完成</label></div></div>
                        <div className="flex items-center justify-between"><span>建立事件處理程序(通報)</span><div><label><input type="radio" checked={log.violence_report} onChange={()=>setLog({...log, violence_report:true})}/> 已完成</label> <label><input type="radio" checked={!log.violence_report} onChange={()=>setLog({...log, violence_report:false})}/> 未完成</label></div></div>
                      </div>}
                   </div>
                </div>
              )}
            </div>

            {/* 母性 */}
            <div>
              <label className="flex items-center font-bold mb-2"><input type="checkbox" checked={log.show_tracking_4} onChange={e=>setLog({...log, show_tracking_4: e.target.checked})} className="mr-2"/> (4) 母性健康保護</label>
              {log.show_tracking_4 && (
                <div className="pl-6 text-xs bg-gray-50 p-2 rounded">
                   <div className="flex items-center justify-between mb-1"><span>危害辨識及評估</span><div><label><input type="radio" checked={log.maternal_hazard_check} onChange={()=>setLog({...log, maternal_hazard_check:true})}/> 已完成</label> <label><input type="radio" checked={!log.maternal_hazard_check} onChange={()=>setLog({...log, maternal_hazard_check:false})}/> 未完成</label></div></div>
                   <div className="grid grid-cols-2 gap-1 mb-1">
                      <div>妊娠中: <input className="border w-10" value={log.mat_pregnant} onChange={e=>setLog({...log, mat_pregnant:e.target.value})}/></div>
                      <div>分娩後: <input className="border w-10" value={log.mat_postpartum} onChange={e=>setLog({...log, mat_postpartum:e.target.value})}/></div>
                      <div>哺乳中: <input className="border w-10" value={log.mat_breastfeeding} onChange={e=>setLog({...log, mat_breastfeeding:e.target.value})}/></div>
                   </div>
                   <div>醫師面談: 需 <input className="border w-10" value={log.mat_doc_need} onChange={e=>handleMatDocCalc('mat_doc_need',e.target.value)}/> / 已 <input className="border w-10" value={log.mat_doc_done} onChange={e=>handleMatDocCalc('mat_doc_done',e.target.value)}/> / 未 {log.mat_doc_not}</div>
                   <div>護理指導: 需 <input className="border w-10" value={log.mat_nurse_need} onChange={e=>handleMatNurseCalc('mat_nurse_need',e.target.value)}/> / 已 <input className="border w-10" value={log.mat_nurse_done} onChange={e=>handleMatNurseCalc('mat_nurse_done',e.target.value)}/> / 未 {log.mat_nurse_not}</div>
                </div>
              )}
            </div>

            {/* 職傷 */}
            <div>
              <label className="flex items-center font-bold mb-2"><input type="checkbox" checked={log.show_tracking_5} onChange={e=>setLog({...log, show_tracking_5: e.target.checked})} className="mr-2"/> (5) 職業傷病追蹤 (含交通)</label>
              {log.show_tracking_5 && (
                <div className="pl-6 text-xs bg-gray-50 p-2 rounded grid grid-cols-3 gap-2">
                   <div>通報人數: <input className="border w-12" value={log.injury_report_count} onChange={e=>setLog({...log, injury_report_count:e.target.value})}/></div>
                   <div>未結案: <input className="border w-12" value={log.injury_unclosed} onChange={e=>setLog({...log, injury_unclosed:e.target.value})}/></div>
                   <div>結案: <input className="border w-12" value={log.injury_closed} onChange={e=>setLog({...log, injury_closed:e.target.value})}/></div>
                   <div className="col-span-3">備註: <input className="border w-full" value={log.injury_note} onChange={e=>setLog({...log, injury_note:e.target.value})}/></div>
                </div>
              )}
            </div>
        </div>
      </div>

      <div className="border border-teal-200 rounded-lg p-4 bg-teal-50">
        <h3 className="font-bold border-b border-teal-200 pb-2 mb-3 text-teal-800">六、執行人員及日期 (僅就當次實際執行者簽章)</h3>
        <div className="grid grid-cols-2 gap-6">
            <div className="bg-white p-3 rounded border border-teal-100">
                <h4 className="text-center font-bold text-sm mb-2 text-teal-700 flex justify-between items-center">
                  <span>臨場服務人員</span>
                  <button type="button" onClick={addOnsiteSignature} className="text-teal-600 hover:text-teal-800"><Plus size={16}/></button>
                </h4>
                {log.signatures.onsite.map((sig, idx) => (
                    <div key={sig.id} className="mb-2 relative group">
                        <div className="flex justify-between items-center mb-1">
                          <input className="text-xs text-gray-500 border-none bg-transparent w-full" value={sig.title} onChange={e=>handleSignatureChange('onsite', idx, 'title', e.target.value)} />
                          <button type="button" onClick={()=>removeOnsiteSignature(idx)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><X size={12}/></button>
                        </div>
                        <input className="w-full border p-1 rounded" placeholder="姓名" value={sig.name} onChange={e=>handleSignatureChange('onsite', idx, 'name', e.target.value)} />
                    </div>
                ))}
            </div>
            <div className="bg-white p-3 rounded border border-blue-100">
                <div className="flex justify-between items-center mb-2"><h4 className="font-bold text-sm text-blue-700">事業單位人員</h4><button type="button" onClick={addClientSignature}><Plus size={14}/></button></div>
                {log.signatures.client.map((sig, idx) => (
                    <div key={sig.id} className="mb-2 relative group">
                        <div className="flex justify-between"><input className="text-xs text-gray-500 border-none bg-transparent" value={sig.title} onChange={e=>handleSignatureChange('client', idx, 'title', e.target.value)} /><button type="button" onClick={()=>removeClientSignature(idx)} className="text-gray-300 hover:text-red-500"><X size={12}/></button></div>
                        <input className="w-full border p-1 rounded" placeholder="姓名" value={sig.name} onChange={e=>handleSignatureChange('client', idx, 'name', e.target.value)} />
                    </div>
                ))}
            </div>
        </div>
        <div className="flex space-x-2 mt-4">
            <input type="date" className="border p-2 rounded" value={log.date} onChange={e=>setLog({...log, date: e.target.value})}/>
            <input type="time" className="border p-2 rounded" value={log.startTime} onChange={e=>setLog({...log, startTime: e.target.value})}/>
            <span className="self-center">至</span>
            <input type="time" className="border p-2 rounded" value={log.endTime} onChange={e=>setLog({...log, endTime: e.target.value})}/>
        </div>
      </div>

      <div className="border border-indigo-200 rounded-lg p-4 bg-indigo-50">
        <h3 className="font-bold mb-2 text-indigo-800 flex items-center"><Upload className="mr-2" size={18}/> 附件上傳 (顯示於報告最後)</h3>
        <input type="file" multiple accept="image/*" ref={fileInputRef} onChange={handleFileUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:bg-indigo-100 file:text-indigo-700 mb-2"/>
        <div className="grid grid-cols-3 gap-2">{log.attachments.map((f, i) => <div key={i} className="relative group"><img src={f.dataUrl} className="h-16 w-full object-cover rounded"/><button type="button" onClick={()=>removeAttachment(i)} className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"><X size={10}/></button></div>)}</div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
        <button type="button" onClick={() => handleSave('draft')} className="w-full bg-gray-500 text-white py-3 rounded-xl font-bold hover:bg-gray-600 flex items-center justify-center">
            <Save className="mr-2" size={18}/> 暫存 (Draft)
        </button>
        <button type="button" onClick={() => handleSave('completed')} className="w-full bg-teal-600 text-white py-3 rounded-xl font-bold hover:bg-teal-700 flex items-center justify-center">
            <CheckSquare className="mr-2" size={18}/> {initialData?.status === 'completed' ? '更新並鎖定 (Update)' : '送出並鎖定 (Submit)'}
        </button>
      </div>
    </div>
  );
};

// --- Report View (Updated) ---
const ReportView = ({ logs, onDelete, onEdit, role }) => {
  const [selectedLog, setSelectedLog] = useState(null);
  
  const handleEditClick = (log) => {
    if (log.status === 'completed' && role !== 'agency') {
      alert("此報告已結案鎖定，僅管理人員(企業版)可解鎖編輯。");
      return;
    }
    onEdit(log);
  };

  if (!selectedLog) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-800">報表中心</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
             <thead className="bg-gray-50 border-b"><tr><th className="p-4">狀態</th><th className="p-4">日期</th><th className="p-4">客戶</th><th className="p-4 text-right">操作</th></tr></thead>
             <tbody>
               {logs.map(log => (
                 <tr key={log.id} className="border-b hover:bg-gray-50">
                   <td className="p-4">
                     {log.status === 'draft' 
                        ? <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-bold">暫存 V{log.version}</span>
                        : <span className="bg-teal-100 text-teal-800 px-2 py-1 rounded text-xs font-bold flex items-center w-fit"><Lock size={10} className="mr-1"/>結案 V{log.version}</span>
                     }
                   </td>
                   <td className="p-4">{log.date}</td>
                   <td className="p-4 font-medium">{log.clientName}</td>
                   <td className="p-4 text-right flex justify-end space-x-2">
                     <button onClick={() => handleEditClick(log)} className="text-blue-600 hover:text-blue-800 flex items-center"><FileEdit size={16}/></button>
                     <button onClick={() => setSelectedLog(log)} className="text-teal-600 hover:text-teal-800 flex items-center"><Eye size={16}/></button>
                     <button onClick={() => onDelete(log.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                   </td>
                 </tr>
               ))}
             </tbody>
          </table>
        </div>
      </div>
    );
  }

  // --- PDF Render ---
  const totalLabor = (parseInt(selectedLog.admin_male)||0) + (parseInt(selectedLog.admin_female)||0) + (parseInt(selectedLog.field_male)||0) + (parseInt(selectedLog.field_female)||0);
  return (
    <div className="relative">
      <div className="mb-4 flex items-center justify-between print:hidden bg-gray-100 p-3 rounded">
        <button onClick={() => setSelectedLog(null)} className="px-4 py-2 bg-gray-200 rounded text-gray-700">返回列表</button>
        <button onClick={() => window.print()} className="px-4 py-2 bg-teal-600 text-white rounded flex items-center"><Printer className="mr-2" size={18} /> 列印 PDF</button>
      </div>

      <div className="bg-white w-[210mm] mx-auto p-[15mm] shadow-lg print:shadow-none print:w-full print:m-0 print:p-0 text-black text-sm leading-tight" style={{ fontFamily: '"Microsoft JhengHei", "Microsoft YaHei", sans-serif' }}>
        <h1 className="text-center text-xl font-bold mb-4">{selectedLog.clientName} / 附表八 勞工健康服務執行紀錄表 <span className="text-xs font-normal ml-2">(版本: V{selectedLog.version})</span></h1>
        
        <div className="mb-4">
           <h3 className="font-bold mb-1">一、作業場所基本資料</h3>
           <table className="w-full border-collapse border border-black"><tbody>
               <tr><td className="border border-black p-1 w-20">企業名稱</td><td className="border border-black p-1">{selectedLog.clientName}</td><td className="border border-black p-1 w-20">日期</td><td className="border border-black p-1">{selectedLog.date}</td></tr>
               <tr><td className="border border-black p-1" colSpan="4">勞工總人數: {totalLabor} 人 (男:{parseInt(selectedLog.admin_male)+parseInt(selectedLog.field_male)} / 女:{parseInt(selectedLog.admin_female)+parseInt(selectedLog.field_female)}) | 特危作業: {selectedLog.special_hazards?.length > 0 ? selectedLog.special_hazards.map(h=>h.category).join(',') : '無'}</td></tr>
           </tbody></table>
        </div>

        <div className="mb-4">
            <h3 className="font-bold mb-1">二、作業場所與勞動條件概況</h3>
            <div className="border border-black p-2 mb-2">製程: {selectedLog.process} <br/>工時: {selectedLog.work_type_time}</div>
            <table className="w-full border-collapse border border-black text-center">
                <thead><tr className="bg-gray-100"><th className="border border-black p-1">工作類型</th><th className="border border-black p-1">職務</th><th className="border border-black p-1">初步危害辨識</th></tr></thead>
                <tbody>
                    {selectedLog.hazards && selectedLog.hazards.length > 0 ? selectedLog.hazards.map((h, i) => (
                        <tr key={i}><td className="border border-black p-1">{h.type}</td><td className="border border-black p-1">{h.job}</td><td className="border border-black p-1">{h.desc}</td></tr>
                    )) : <tr><td colSpan="3" className="border border-black p-1 h-8"></td></tr>}
                </tbody>
            </table>
        </div>

        <div className="mb-4">
           <h3 className="font-bold mb-1">三、服務執行情形</h3>
           <div className="border border-black p-2">
             <ul className="list-none space-y-1">
               {['check_health','check_job','check_track','check_high_risk','check_research','check_edu','check_emerg','check_report','check_env','check_env_impr','check_survey','check_return','check_other'].map(k => {
                   let label = '';
                   if(k==='check_job') label = `協助雇主選配勞工從事適當之工作，共 ${selectedLog.job_sel_count||'_'} 名`;
                   else if(k==='check_track') label = `辦理健康檢查結果異常者之追蹤管理及健康指導，共 ${selectedLog.tracking_count||'_'} 名`;
                   else if(k==='check_high_risk') label = `辦理高風險勞工(母性/職傷/未滿18)之評估及個案管理，共 ${selectedLog.high_risk_count||'_'} 名`;
                   else if(k==='check_emerg') label = `工作相關傷病之預防、健康諮詢與急救及緊急處置，共 ${selectedLog.emergency_count||'_'} 名`;
                   else if(k==='check_health') label = '勞工一般/特殊/供膳等體格（健康）檢查結果之分析與評估、健康管理及資料保存';
                   else if(k==='check_other') label = '其他經中央主管機關指定公告者';
                   else label = '...'; 
                   
                   // Complete Mapping for Print
                   if(k==='check_research') label='職業衛生或職業健康之相關研究報告及傷害、疾病紀錄之保存';
                   if(k==='check_edu') label='勞工之健康教育、衛生指導、身心健康保護、健康促進等措施之策劃及實施';
                   if(k==='check_report') label='定期向雇主報告及勞工健康服務之建議';
                   if(k==='check_env') label='辨識與評估工作場所環境、作業及組織內部影響勞工身心健康之危害因子，提出改善與建議';
                   if(k==='check_env_impr') label='提出作業環境安全衛生設施改善規劃之建議';
                   if(k==='check_survey') label='調查勞工健康情形與作業之關連性，並採取必要之預防及健康促進措施';
                   if(k==='check_return') label='提供復工勞工之職能評估、職務再設計或調整之諮詢及建議';

                   return (
                    <div key={k}>
                        <li className="flex"><span className="w-6">{selectedLog[k]?'☑':'☐'}</span> {label}</li>
                        {k === 'check_other' && (
                            <div className="pl-6 grid grid-cols-2 text-xs">
                                <span>{selectedLog.plan_ergo?'☑':'☐'} 人因性危害預防計劃</span>
                                <span>{selectedLog.plan_overwork?'☑':'☐'} 異常工作負荷促發疾病預防計劃</span>
                                <span>{selectedLog.plan_maternal?'☑':'☐'} 工作場所母性健康保護計劃</span>
                                <span>{selectedLog.plan_violence?'☑':'☐'} 執行職務遭受不法侵害預防計劃</span>
                                <span>{selectedLog.plan_age?'☑':'☐'} 中高齡及高齡工作者工作適能評估</span>
                                <span>{selectedLog.plan_hearing?'☑':'☐'} 聽力保護計劃</span>
                                <span>{selectedLog.plan_breath?'☑':'☐'} 呼吸防護計劃</span>
                                <span>{selectedLog.plan_epidemic?'☑':'☐'} 防疫措施之策劃及實施</span>
                            </div>
                        )}
                    </div>
                   );
               })}
             </ul>
             <div className="mt-2 pt-2 border-t border-dashed font-bold">發現問題: <span className="font-normal">{selectedLog.section3_findings}</span></div>
           </div>
        </div>

        <div className="mb-4">
           <table className="w-full border-collapse border border-black text-sm">
             <thead><tr><th className="border border-black p-1 w-1/3">四、建議採行措施 (對應執行情形)</th><th className="border border-black p-1 w-2/3">執行紀錄內容</th></tr></thead>
             <tbody>
               {Object.keys(selectedLog.suggestions_map || {}).length > 0 ? (
                 Object.entries(selectedLog.suggestions_map).map(([key, text]) => {
                   let label = '';
                   if(key==='check_health') label='體格檢查分析';
                   else if(key==='check_job') label='適性配工';
                   else if(key==='check_track') label='健檢異常追蹤';
                   else if(key==='check_high_risk') label='高風險評估';
                   else if(key==='check_edu') label='健康教育指導';
                   else if(key==='check_emerg') label='急救處置';
                   else if(key==='check_env') label='環境危害辨識';
                   else label = '其他事項';

                   return (
                     <tr key={key}>
                       <td className="border border-black p-2 align-top">{label}</td>
                       <td className="border border-black p-2 align-top whitespace-pre-wrap">{text}</td>
                     </tr>
                   );
                 })
               ) : (
                 <tr><td className="border border-black p-2 align-top h-16"></td><td className="border border-black p-2 align-top h-16"></td></tr>
               )}
             </tbody>
           </table>
        </div>

        <div className="mb-4 page-break-inside-avoid">
           <h3 className="font-bold mb-1">五、追蹤辦理情形</h3>
           <div className="border border-black p-2 text-xs">
             <div className="mb-1">(1) 前次追蹤: {selectedLog.prev_tracking || '無'}</div>
             {selectedLog.show_tracking_2 && (
                 <table className="w-full text-center border-collapse border border-black mb-2">
                     <thead><tr><th className="border border-black">健康管理分級</th><th className="border border-black">已面談或發送關懷單</th><th className="border border-black">未面談</th><th className="border border-black">結案</th><th className="border border-black">需持續追蹤</th></tr></thead>
                     <tbody>
                         <tr><td className="border border-black">四級</td><td className="border border-black">{selectedLog.level4_interview}人</td><td className="border border-black">{selectedLog.level4_not}人</td><td className="border border-black">{selectedLog.level4_close}人</td><td className="border border-black">{selectedLog.level4_track}人</td></tr>
                         <tr><td className="border border-black">三級</td><td className="border border-black">{selectedLog.level3_interview}人</td><td className="border border-black">{selectedLog.level3_not}人</td><td className="border border-black">{selectedLog.level3_close}人</td><td className="border border-black">{selectedLog.level3_track}人</td></tr>
                         {selectedLog.showLevel2 && <tr><td className="border border-black">二級</td><td className="border border-black">{selectedLog.level2_interview}人</td><td className="border border-black">{selectedLog.level2_not}人</td><td className="border border-black">{selectedLog.level2_close}人</td><td className="border border-black">{selectedLog.level2_track}人</td></tr>}
                     </tbody>
                 </table>
             )}
             {selectedLog.show_tracking_3 && (
                 <div className="border border-black mb-2">
                     {selectedLog.show_plan_overwork && <>
                        <div className="bg-gray-100 font-bold border-b border-black p-1">異常工作負荷促發疾病預防</div>
                        <div className="flex border-b border-black"><div className="w-1/4 border-r border-black p-1">評量問卷回收</div><div className="w-3/4 p-1">應做{selectedLog.overwork_survey_total}份 / 已做{selectedLog.overwork_survey_done}份 / 未做{selectedLog.overwork_survey_not}份</div></div>
                        <div className="flex border-b border-black"><div className="w-1/4 border-r border-black p-1">辨識高風險群</div><div className="w-3/4 p-1">具異常工作負荷促發疾病高風險者 {selectedLog.overwork_risk_count} 人</div></div>
                        <div className="flex border-b border-black"><div className="w-1/4 border-r border-black p-1">面談及指導</div><div className="w-3/4 p-1">需面談{selectedLog.overwork_int_need}人 / 已面談{selectedLog.overwork_int_done}人 / 未面談{selectedLog.overwork_int_not}人</div></div>
                     </>}
                     
                     {selectedLog.show_plan_ergo && <>
                        <div className="bg-gray-100 font-bold border-b border-black p-1">重複性肌肉骨骼疾病預防</div>
                        <div className="flex border-b border-black"><div className="w-1/4 border-r border-black p-1">症狀調查表</div><div className="w-3/4 p-1">應做{selectedLog.ergo_survey_total}份 / 已做{selectedLog.ergo_survey_done}份 / 未做{selectedLog.ergo_survey_not}份</div></div>
                        <div className="flex border-b border-black"><div className="w-1/4 border-r border-black p-1">調查表追蹤</div><div className="w-3/4 p-1">疑似有危害{selectedLog.ergo_risk_count}人 / 已面談{selectedLog.ergo_int_done}人</div></div>
                     </>}

                     {selectedLog.show_plan_violence && <>
                        <div className="bg-gray-100 font-bold border-b border-black p-1">職場不法侵害預防</div>
                        <div className="flex border-b border-black"><div className="w-1/2 p-1">預防書面聲明: {selectedLog.violence_statement?'☑ 已完成':'☐ 未完成'}</div><div className="w-1/2 p-1 border-l border-black">建立事件處理程序: {selectedLog.violence_report?'☑ 已完成':'☐ 未完成'}</div></div>
                        <div className="flex border-b border-black"><div className="w-1/4 border-r border-black p-1">辨識及危害評估</div><div className="w-3/4 p-1">應做{selectedLog.violence_assess_target}份 / 已做{selectedLog.violence_assess_done}份 / 未做{selectedLog.violence_assess_not}份</div></div>
                        <div className="flex border-b border-black"><div className="w-1/2 p-1">適當配置作業場所: {selectedLog.violence_config?'☑ 已完成':'☐ 未完成'}</div><div className="w-1/2 p-1 border-l border-black">依工作適性調整人力: {selectedLog.violence_adjust?'☑ 已完成':'☐ 未完成'}</div></div>
                     </>}
                 </div>
             )}
             {selectedLog.show_tracking_4 && (
                 <div className="border border-black p-1 mb-2">
                     <strong>(4) 母性健康保護: </strong> 
                     危害評估({selectedLog.maternal_hazard_check?'已完成':'未完成'}) / 
                     妊娠中{selectedLog.mat_pregnant}人 / 
                     醫師面談(需{selectedLog.mat_doc_need}/已{selectedLog.mat_doc_done}/未{selectedLog.mat_doc_not}) / 
                     護理指導(需{selectedLog.mat_nurse_need}/已{selectedLog.mat_nurse_done}/未{selectedLog.mat_nurse_not})
                 </div>
             )}
             {selectedLog.show_tracking_5 && (
                 <div className="border border-black p-1">
                     <strong>(5) 職業傷病追蹤 (含上下班交通):</strong> 通報 {selectedLog.injury_report_count} 人, 未結案 {selectedLog.injury_unclosed} 人, 結案 {selectedLog.injury_closed} 人 | 備註: {selectedLog.injury_note}
                 </div>
             )}
           </div>
        </div>

        {/* Section 6: Signatures (No Jia/Yi Fang text) */}
        <div className="mt-4 break-inside-avoid">
           <h3 className="font-bold mb-1">六、執行人員及日期 (僅就當次實際執行者簽章)</h3>
           <div className="border border-black">
              <div className="flex border-b border-black">
                 <div className="w-1/2 border-r border-black p-2">
                    <div className="text-center font-bold text-xs mb-2 bg-gray-100 rounded">臨場服務人員</div>
                    <div className="space-y-6 px-4">
                      {selectedLog.signatures?.onsite?.map((sig, i) => (
                        <div key={i} className="flex flex-col items-center">
                           <span className="text-xs text-gray-500 mb-6">{sig.title}</span>
                           <div className="font-script text-xl border-b border-gray-300 w-full text-center pb-1 min-h-[30px]">{sig.name}</div>
                        </div>
                      ))}
                    </div>
                 </div>
                 <div className="w-1/2 p-2">
                    <div className="text-center font-bold text-xs mb-2 bg-gray-100 rounded">事業單位人員</div>
                    <div className="space-y-6 px-4">
                      {selectedLog.signatures?.client?.map((sig, i) => (
                        <div key={i} className="flex flex-col items-center">
                           <span className="text-xs text-gray-500 mb-6">{sig.title}</span>
                           <div className="font-script text-xl border-b border-gray-300 w-full text-center pb-1 min-h-[30px]">{sig.name}</div>
                        </div>
                      ))}
                    </div>
                 </div>
              </div>
              <div className="p-2 text-center text-sm font-bold bg-gray-50">執行日期: {selectedLog.date} &nbsp; {selectedLog.startTime} 至 {selectedLog.endTime} (共 {selectedLog.hours} 小時)</div>
           </div>
        </div>

        {/* Attachments at the END */}
        {selectedLog.attachments && selectedLog.attachments.length > 0 && (
          <div className="mb-4 page-break-before-always mt-8">
             <h3 className="font-bold mb-1">附件資料 (佐證/海報)</h3>
             <div className="grid grid-cols-2 gap-4">
               {selectedLog.attachments.map((file, idx) => (
                 <div key={idx} className="border border-black p-1 break-inside-avoid">
                   <img src={file.dataUrl} className="w-full h-auto max-h-[300px] object-contain" alt="attachment"/>
                   <div className="text-center text-xs mt-1">{file.name}</div>
                 </div>
               ))}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main App ---
export default function AnzeApp() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userRole, setUserRole] = useState(null); 
  const [staff, setStaff] = useState([]);
  const [clients, setClients] = useState([]);
  const [logs, setLogs] = useState([]);
  const [userProfile, setUserProfile] = useState({});
  const [editingLog, setEditingLog] = useState(null); 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    signInAnonymously(auth).catch(e => console.error(e));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubStaff = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'staff'), (s) => setStaff(s.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubClients = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'clients'), (s) => setClients(s.docs.map(d => ({id: d.id, ...d.data()}))));
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'serviceLogs'), orderBy('date', 'desc'));
    const unsubLogs = onSnapshot(q, (s) => setLogs(s.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubProfile = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', 'user_profile_default'), (d) => { if (d.exists()) setUserProfile(d.data()); });
    return () => { unsubStaff(); unsubClients(); unsubLogs(); unsubProfile(); };
  }, [user]);

  // Handlers
  const addStaff = async (d) => await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'staff'), d);
  const deleteStaff = async (id) => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'staff', id));
  const addClient = async (d) => await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'clients'), d);
  const deleteClient = async (id) => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clients', id));
  
  // Save Log (Create or Update)
  const saveLog = async (data, id = null) => {
    if (id) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'serviceLogs', id), data);
    } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'serviceLogs'), data);
    }
    setEditingLog(null); // Clear edit state
    setActiveTab('reports'); // Go to reports
  };

  const deleteLog = async (id) => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'serviceLogs', id));
  const saveProfile = async (d) => await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', 'user_profile_default'), d);

  // Edit Trigger
  const handleEditLog = (log) => {
    setEditingLog(log);
    setActiveTab('service');
  };

  if (!user) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!userRole) return <LoginScreen onSelectRole={r => { setUserRole(r); setActiveTab('dashboard'); }} />;

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
      <div className="w-64 bg-white border-r p-4 hidden md:flex flex-col shadow-sm print:hidden">
        <div className="mb-8 px-2 flex items-center text-teal-700"><Activity size={28} className="mr-2" /><h1 className="text-xl font-bold">Anze Care</h1></div>
        <div className="mb-6 px-4 py-2 bg-gray-100 rounded text-xs font-bold text-gray-500">{userRole === 'individual' ? '獨立護理師' : '企業管理員'}</div>
        <nav className="space-y-1 flex-1">
          <SidebarItem icon={Activity} label="儀表板" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          {userRole === 'agency' && <SidebarItem icon={Users} label="團隊管理" active={activeTab === 'staff'} onClick={() => setActiveTab('staff')} />}
          <SidebarItem icon={Building} label="客戶管理" active={activeTab === 'clients'} onClick={() => setActiveTab('clients')} />
          <SidebarItem icon={CheckSquare} label={editingLog ? "編輯紀錄" : "服務打卡"} active={activeTab === 'service'} onClick={() => { setEditingLog(null); setActiveTab('service'); }} />
          <SidebarItem icon={FileText} label="報表中心" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
          {userRole === 'individual' && <SidebarItem icon={Settings} label="設定" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />}
        </nav>
        <button onClick={() => setUserRole(null)} className="mt-auto flex items-center px-4 py-2 text-gray-400 hover:text-gray-600"><LogOut size={16} className="mr-2" /> 登出</button>
      </div>
      <div className="flex-1 p-8 overflow-y-auto print:p-0">
        {activeTab === 'staff' && <StaffManager staff={staff} onAdd={addStaff} onDelete={deleteStaff} />}
        {activeTab === 'clients' && <ClientManager clients={clients} onAdd={addClient} onDelete={deleteClient} />}
        {activeTab === 'service' && <ServiceLogger staff={staff} clients={clients} onSaveLog={saveLog} role={userRole} userProfile={userProfile} initialData={editingLog} logs={logs} onCancelEdit={()=>{setEditingLog(null); setActiveTab('reports');}} />}
        {activeTab === 'reports' && <ReportView logs={logs} onDelete={deleteLog} onEdit={handleEditLog} role={userRole} />}
        {activeTab === 'dashboard' && <Dashboard logs={logs} clients={clients} staff={staff} userRole={userRole} userProfile={userProfile} setActiveTab={setActiveTab} />}
        {activeTab === 'profile' && userRole === 'individual' && <UserProfile profile={userProfile} onSave={saveProfile} />}
      </div>
    </div>
  );
}