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

// --- Firebase Configuration (您的真實設定) ---
const firebaseConfig = {
  apiKey: "AIzaSyBn4N2OOA5EkW0k4ZEiMYtLSJS-LgtWOtQ",
  authDomain: "anzecare-report-app.firebaseapp.com",
  projectId: "anzecare-report-app",
  storageBucket: "anzecare-report-app.firebasestorage.app",
  messagingSenderId: "119343301156",
  appId: "1:119343301156:web:32364d2a4185380cedceb1",
  measurementId: "G-3J4XKE067K"
};

// 初始化 Firebase
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
    else if (count >= 50) { doctor = "1次/年"; nurse = "1次/3個月"; }
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

const ClientManager = ({ clients, onAdd, onDelete }) => {
  const [newClient, setNewClient] = useState({ name: '', industry: '', employees: '' });
  const handleSubmit = (e) => { e.preventDefault(); onAdd({...newClient, employees: parseInt(newClient.employees)}); setNewClient({ name: '', industry: '', employees: '' }); };
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center"><Building className="mr-2" /> 客戶管理</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label className="text-sm font-medium">企業名稱</label><input type="text" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
          <div><label className="text-sm font-medium">行業</label><select value={newClient.industry} onChange={e => setNewClient({...newClient, industry: e.target.value})} className="w-full p-2 border rounded-lg"><option value="">請選擇</option>{INDUSTRY_DATA.cat1.map(i=><option key={i} value={i}>{i}</option>)}</select></div>
          <div><label className="text-sm font-medium">人數</label><input type="number" value={newClient.employees} onChange={e => setNewClient({...newClient, employees: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
          <button type="submit" className="bg-teal-600 text-white p-2 rounded-lg hover:bg-teal-700 flex items-center justify-center col-span-full"><Plus size={20} className="mr-1" /> 新增客戶</button>
        </form>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{clients.map(c => <div key={c.id} className="bg-white p-4 rounded-xl shadow-sm border flex justify-between"><div><h3 className="font-bold">{c.name}</h3><p className="text-sm text-gray-500">{c.industry} | {c.employees}人</p></div><button onClick={()=>onDelete(c.id)} className="text-red-500"><Trash2 size={20}/></button></div>)}</div>
    </div>
  );
};

// --- Service Logger (With Auto-Fill Logic) ---
const ServiceLogger = ({ staff, clients, onSaveLog, role, userProfile, initialData, onCancelEdit, logs }) => {
  
  // Default State Definition
  const createDefaultState = (clientId = '') => ({
    clientId: clientId, 
    serviceMode: 'nurse_only', 
    date: new Date().toISOString().split('T')[0], 
    startTime: '14:00', endTime: '17:00',
    dept_name: '', address: '', admin_male: 0, admin_female: 0, field_male: 0, field_female: 0, work_general_count: 0, special_hazards: [], process: '', work_type_time: '', hazards: [],
    check_health: false, check_job: false, check_track: false, check_high_risk: false, check_research: false, check_edu: false, check_emerg: false, check_report: false, check_env: false, check_env_impr: false, check_survey: false, check_return: false, check_other: false,
    job_sel_count: 0, tracking_count: 0, high_risk_count: 0, emergency_count: 0, other_note: '',
    plan_ergo: false, plan_overwork: false, plan_maternal: false, plan_violence: false, plan_age: false, plan_hearing: false, plan_breath: false, plan_epidemic: false, plan_other_central: false, other_central_note: '',
    section3_findings: '', suggestions_map: {}, prev_tracking: '', 
    show_tracking_2: true, show_tracking_3: true, show_tracking_4: true, show_tracking_5: true,
    exam_year: new Date().getFullYear(),
    level4_interview: 0, level4_not: 0, level4_close: 0, level4_track: 0, level3_interview: 0, level3_not: 0, level3_close: 0, level3_track: 0, level2_interview: 0, level2_not: 0, level2_close: 0, level2_track: 0, showLevel2: true,
    overwork_survey_total: 0, overwork_survey_done: 0, overwork_risk_count: 0, overwork_int_done: 0,
    ergo_survey_total: 0, ergo_survey_done: 0, ergo_risk_count: '',
    violence_statement: false, violence_assess_target: '', violence_assess_done: 0,
    maternal_hazard_check: false, mat_pregnant: 0, mat_postpartum: 0, mat_breastfeeding: 0, mat_doc_done: 0, mat_nurse_done: 0,
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

  // 1. Init Data (Edit Mode)
  useEffect(() => {
    if (initialData) {
      setLog({ ...createDefaultState(), ...initialData });
    }
  }, [initialData]);

  // 2. Auto-Fill Logic (Create Mode)
  useEffect(() => {
    if (!initialData && log.clientId) {
      // Find history for this client
      const history = logs.filter(l => l.clientId === log.clientId);
      if (history.length > 0) {
        // Sort by date desc to get the latest
        const lastReport = history.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        
        // Merge last report data BUT reset specific fields for the new report
        setLog(prev => ({
          ...prev,
          ...lastReport, // Copy everything from last report
          // Reset fields that must be new
          date: new Date().toISOString().split('T')[0],
          startTime: '14:00', 
          endTime: '17:00',
          status: 'draft',
          version: 1,
          id: undefined, // Clear ID to ensure creation
          createdAt: undefined,
          updatedAt: undefined,
          // Keep signatures from last time as it's convenient, but ensure logic is consistent
          signatures: lastReport.signatures || prev.signatures
        }));
        setAutoFilled(true);
        // Toast/Alert could go here
      } else {
        // No history, reset to default but keep clientId and sync employee count
        const client = clients.find(c => c.id === log.clientId);
        setLog(prev => ({
            ...createDefaultState(prev.clientId),
            work_general_count: client ? client.employees : 0
        }));
        setAutoFilled(false);
      }
    }
  }, [log.clientId, initialData]); // Run when clientId changes (dropdown selection)

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

  const handleSave = (status) => {
    if (!log.clientId) { alert("請選擇客戶"); return; }
    const clientName = clients.find(c => c.id === log.clientId)?.name;
    const nurseSig = log.signatures.onsite.find(s => s.title.includes('護理'));
    const docSig = log.signatures.onsite.find(s => s.title.includes('醫師'));
    const nurseName = nurseSig ? nurseSig.name : "";
    const doctorName = docSig ? docSig.name : "";
    
    let newVersion = log.version;
    if (initialData && initialData.status === 'completed') {
        newVersion = initialData.version + 1;
    }

    const dataToSave = {
        ...log,
        clientName, nurseName, doctorName, staffName: nurseName || doctorName || "未簽名",
        status: status, 
        version: newVersion,
        hours: ((new Date(`2000/01/01 ${log.endTime}`) - new Date(`2000/01/01 ${log.startTime}`)) / 36e5).toFixed(1),
        updatedAt: serverTimestamp()
    };
    if (!initialData) dataToSave.createdAt = serverTimestamp();

    onSaveLog(dataToSave, initialData?.id);
    if (!initialData) {
        setLog(createDefaultState()); 
        setAutoFilled(false);
    }
  };

  const CHECKLIST_ITEMS = [
    { key: 'check_health', label: '勞工一般/特殊/供膳等體格（健康）檢查結果之分析與評估。' },
    { key: 'check_job', label: '協助雇主選配勞工從事適當之工作' },
    { key: 'check_track', label: '辦理健康檢查結果異常者之追蹤管理及健康指導' },
    { key: 'check_high_risk', label: '辦理高風險勞工(母性/職傷/未滿18)之評估及個案管理' },
    { key: 'check_edu', label: '勞工之健康教育、衛生指導、身心健康保護。' },
    { key: 'check_emerg', label: '工作相關傷病之預防、健康諮詢與急救。' },
    { key: 'check_env', label: '辨識與評估工作場所環境危害。' },
    { key: 'check_other', label: '其他經中央主管機關指定公告者(四大計畫等)。' },
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
            <span>一、基本資料</span>
            {autoFilled && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded flex items-center"><RefreshCw size={12} className="mr-1"/>已自動帶入前次資料</span>}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div><label className="text-sm font-bold">企業名稱</label>
            <select className="w-full p-2 border rounded" value={log.clientId} onChange={e => setLog({...log, clientId: e.target.value})} disabled={!!initialData}>
                <option value="">請選擇...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></div>
            <div><label className="text-sm font-bold">日期</label><input type="date" className="w-full p-2 border rounded" value={log.date} onChange={e=>setLog({...log, date: e.target.value})}/></div>
        </div>
        <div className="bg-white p-3 border rounded text-sm">
            <span className="font-bold">總人數: {totalLabor}</span> (男{log.field_male+log.admin_male}/女{log.field_female+log.admin_female})
            <div className="grid grid-cols-4 gap-2 mt-2">
                <input placeholder="現場男" type="number" className="border p-1" value={log.field_male} onChange={e=>setLog({...log, field_male: e.target.value})}/>
                <input placeholder="現場女" type="number" className="border p-1" value={log.field_female} onChange={e=>setLog({...log, field_female: e.target.value})}/>
            </div>
        </div>
      </div>

      <div className="border p-4 rounded-lg bg-gray-50">
        <h3 className="font-bold border-b pb-2 mb-3">二、執行情形勾選</h3>
        <div className="space-y-2">
            {CHECKLIST_ITEMS.map(item => (
                <div key={item.key}>
                    <label className="flex items-center space-x-2">
                        <input type="checkbox" checked={log[item.key]} onChange={e=>setLog({...log, [item.key]: e.target.checked})} className="w-4 h-4"/>
                        <span>{item.label}</span>
                    </label>
                    {item.key === 'check_other' && log.check_other && (
                        <div className="pl-6 mt-1 grid grid-cols-2 gap-2 text-sm bg-white p-2 rounded border">
                            <label><input type="checkbox" checked={log.plan_overwork} onChange={e=>setLog({...log, plan_overwork: e.target.checked})}/> 過負荷預防</label>
                            <label><input type="checkbox" checked={log.plan_ergo} onChange={e=>setLog({...log, plan_ergo: e.target.checked})}/> 人因危害預防</label>
                            <label><input type="checkbox" checked={log.plan_maternal} onChange={e=>setLog({...log, plan_maternal: e.target.checked})}/> 母性健康保護</label>
                            <label><input type="checkbox" checked={log.plan_violence} onChange={e=>setLog({...log, plan_violence: e.target.checked})}/> 不法侵害預防</label>
                        </div>
                    )}
                </div>
            ))}
        </div>
        <div className="mt-4">
            <label className="font-bold block mb-1">發現問題與建議</label>
            <textarea className="w-full border p-2 rounded h-20" value={log.section3_findings} onChange={e=>setLog({...log, section3_findings: e.target.value})} placeholder="請輸入..."></textarea>
        </div>
      </div>

      <div className="border p-4 rounded-lg bg-gray-50">
        <h3 className="font-bold border-b pb-2 mb-3">三、追蹤辦理情形 (勾選即顯示於報表)</h3>
        <div className="mb-2"><label className="text-sm font-bold">前次追蹤(必填)</label><input className="w-full border p-2 rounded" value={log.prev_tracking} onChange={e=>setLog({...log, prev_tracking: e.target.value})}/></div>
        <div className="bg-white p-3 rounded border space-y-3">
            <label className="flex items-center font-bold"><input type="checkbox" checked={log.show_tracking_2} onChange={e=>setLog({...log, show_tracking_2: e.target.checked})} className="mr-2"/> (2) 健檢分級追蹤</label>
            {log.show_tracking_2 && <div className="pl-6 text-sm grid grid-cols-2 gap-2"><div>第四級面談 <input className="border w-12" value={log.level4_interview} onChange={e=>setLog({...log, level4_interview: e.target.value})}/></div><div>第三級面談 <input className="border w-12" value={log.level3_interview} onChange={e=>setLog({...log, level3_interview: e.target.value})}/></div></div>}
            
            <label className="flex items-center font-bold"><input type="checkbox" checked={log.show_tracking_3} onChange={e=>setLog({...log, show_tracking_3: e.target.checked})} className="mr-2"/> (3) 四大計畫進度</label>
            {log.show_tracking_3 && <div className="pl-6 text-sm space-y-2">
                <div>過負荷問卷回收: <input className="border w-10" value={log.overwork_survey_done} onChange={e=>setLog({...log, overwork_survey_done:e.target.value})}/>/{log.overwork_survey_total}</div>
                <div>人因問卷回收: <input className="border w-10" value={log.ergo_survey_done} onChange={e=>setLog({...log, ergo_survey_done:e.target.value})}/></div>
            </div>}

            <label className="flex items-center font-bold"><input type="checkbox" checked={log.show_tracking_4} onChange={e=>setLog({...log, show_tracking_4: e.target.checked})} className="mr-2"/> (4) 母性健康保護</label>
            {log.show_tracking_4 && <div className="pl-6 text-sm flex space-x-2"><span>妊娠:<input className="border w-10" value={log.mat_pregnant} onChange={e=>setLog({...log, mat_pregnant:e.target.value})}/></span><span>分娩:<input className="border w-10" value={log.mat_postpartum} onChange={e=>setLog({...log, mat_postpartum:e.target.value})}/></span></div>}
        </div>
      </div>

      <div className="border border-teal-200 rounded-lg p-4 bg-teal-50">
        <h3 className="font-bold border-b border-teal-200 pb-2 mb-3 text-teal-800">四、執行人員及日期 (僅就當次實際執行者簽章)</h3>
        <div className="grid grid-cols-2 gap-6">
            <div className="bg-white p-3 rounded border border-teal-100">
                <h4 className="text-center font-bold text-sm mb-2 text-teal-700">臨場服務人員</h4>
                {log.signatures.onsite.map((sig, idx) => (
                    <div key={sig.id} className="mb-2">
                        <input className="block w-full text-xs text-gray-500 border-none bg-transparent mb-1" value={sig.title} onChange={e=>handleSignatureChange('onsite', idx, 'title', e.target.value)} />
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

// --- Report View ---
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
               <tr><td className="border border-black p-1" colSpan="4">勞工總人數: {totalLabor} 人 (男:{parseInt(selectedLog.admin_male)+parseInt(selectedLog.field_male)} / 女:{parseInt(selectedLog.admin_female)+parseInt(selectedLog.field_female)}) | 特危作業: {selectedLog.special_hazards?.length > 0 ? '有' : '無'}</td></tr>
           </tbody></table>
        </div>

        <div className="mb-4"><h3 className="font-bold mb-1">二、作業場所概況</h3><div className="border border-black p-2">製程: {selectedLog.process}</div></div>

        <div className="mb-4">
           <h3 className="font-bold mb-1">三、服務執行情形</h3>
           <div className="border border-black p-2">
             <ul className="list-none space-y-1">
               {['check_health','check_job','check_track','check_high_risk','check_edu','check_emerg','check_env','check_other'].map(k => <li key={k} className="flex"><span className="w-6">{selectedLog[k]?'☑':'☐'}</span> 項目代碼: {k}</li>)}
             </ul>
             <div className="mt-2 pt-2 border-t border-dashed font-bold">發現問題: <span className="font-normal">{selectedLog.section3_findings}</span></div>
           </div>
        </div>

        <div className="mb-4">
           <h3 className="font-bold mb-1">五、追蹤辦理情形</h3>
           <div className="border border-black p-2 text-xs">
             <div className="mb-1">(1) 前次追蹤: {selectedLog.prev_tracking || '無'}</div>
             {selectedLog.show_tracking_2 && <div>(2) 健檢分級: L4({selectedLog.level4_interview}) L3({selectedLog.level3_interview})</div>}
             {selectedLog.show_tracking_3 && <div>(3) 計畫進度: 過負荷({selectedLog.overwork_survey_done}) 人因({selectedLog.ergo_survey_done})</div>}
             {selectedLog.show_tracking_4 && <div>(4) 母性: 妊娠({selectedLog.mat_pregnant})</div>}
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
        {activeTab === 'dashboard' && <div className="p-4 bg-teal-600 text-white rounded-xl">歡迎使用 Anze Care 系統</div>}
      </div>
    </div>
  );
}