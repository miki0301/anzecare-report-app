import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Building, Calendar, FileText, Plus, 
  Trash2, Save, Printer, ChevronRight, CheckSquare,
  Clock, Activity, AlertTriangle, UserCircle,
  Briefcase, Settings, LogOut, X, Edit, Eye, EyeOff, Upload
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
  setDoc
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
// 使用 try-catch 避免 React Strict Mode 重複初始化報錯
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

// 固定 App ID，用於資料庫路徑
const appId = 'anze-care-default';

// --- Utils & Logic ---

// 附表一：事業之分類資料庫
const INDUSTRY_DATA = {
  cat1: [
    "礦業及土石採取業 (煤/石油/天然氣/金屬/土石等)",
    "製造業-紡織業",
    "製造業-木竹製品及非金屬家具",
    "製造業-造紙、紙製品",
    "製造業-化學材料",
    "製造業-化學品",
    "製造業-石油及煤製品",
    "製造業-橡膠製品",
    "製造業-塑膠製品",
    "製造業-水泥及水泥製品",
    "製造業-金屬基本工業",
    "製造業-金屬製品",
    "製造業-機械設備製造修配",
    "製造業-電力機械器材製造修配",
    "製造業-運輸工具製造修配",
    "製造業-電子機械器材/電池製造",
    "製造業-食品製造",
    "製造業-飲料及菸草製造",
    "製造業-皮革、毛皮及其製品",
    "製造業-電腦、電子產品及光學製品",
    "製造業-電子零組件",
    "製造業-其他非金屬礦物製品",
    "營造業 (土木/建築/電路管道/油漆等)",
    "水電燃氣業 (電力/氣體燃料/暖氣熱水)",
    "運輸、倉儲及通信業 (水上/航空/陸上運輸/倉儲)",
    "機械設備租賃業 (生產性機械)",
    "環境衛生服務業",
    "洗染業",
    "批發零售業 (建材/燃料批發零售)",
    "其他服務業 (建築清潔/病媒防治/環境衛生)",
    "公共行政業 (營造作業/廢棄物處理/污水處理)",
    "國防事業 (生產機構)",
    "中央主管機關指定達一定規模之事業"
  ],
  cat2: [
    "農、林、漁、牧業",
    "礦業及土石採取業中之鹽業",
    "製造業-普通及特殊陶瓷",
    "製造業-玻璃及玻璃製品",
    "製造業-精密器械",
    "製造業-雜項工業製品",
    "製造業-成衣及服飾品",
    "製造業-印刷、出版及有關事業",
    "製造業-藥品製造",
    "製造業-其它製造業",
    "水電燃氣業中之自來水供應業",
    "運輸、倉儲及通信業 (電信/郵政)",
    "餐旅業 (飲食/旅館)",
    "機械設備租賃業 (事務性/其他)",
    "醫療保健服務業 (醫院/診所/衛生所/醫事技術/獸醫)",
    "修理服務業 (鞋傘/電器/汽機車/鐘錶/家具)",
    "批發零售業 (家電/機械器具/回收物料/綜合零售)",
    "不動產及租賃業 (投資/管理)",
    "輸入、輸出或批發化學原料及其製品",
    "運輸工具設備租賃業 (汽車/船舶/貨櫃)",
    "專業、科學及技術服務業 (建築工程/廣告/環境檢測)",
    "其他服務業 (保全/汽車美容/浴室)",
    "個人服務業中之停車場業",
    "學術研究/教育訓練之實驗室/實習工廠",
    "公共行政業 (工程規劃/設計/施工/驗收)",
    "工程顧問業 (非破壞性檢測)",
    "零售化學原料 (含裝卸搬運)",
    "批發零售 (具冷凍設備/操作堆高機/儲存高度3M以上)",
    "休閒服務業",
    "動物園業",
    "國防事業 (軍醫院/研究機構)",
    "零售車用燃料/化學原料 (含裝卸搬運)",
    "大專校院/國防部軍備局 (工程施工品管場所)"
  ],
  cat3: [
    "其他 (上述指定以外之事業，如一般辦公室、金融業等)"
  ]
};

// 頻率選項定義
const FREQ_OPTIONS = {
  nurse: [
    "顧問諮詢 (未達50人)",
    "1次/3個月", "1次/2個月", "1次/月", "2次/月", "3次/月", "4次/月", "6次/月",
    "專職護理人員 (300人以上)"
  ],
  doctor: [
    "顧問諮詢 (未達50人)",
    "1次/年", "2次/年", "3次/年", "4次/年", "6次/年",
    "1次/6個月", "1次/3個月", "1次/2個月", "1次/月", "3次/月", "6次/月", "9次/月", "12次/月", "15次/月", "18次/月"
  ]
};

// 勞工健康保護規則頻率判斷引擎
const calculateRegulationFrequency = (category, count, standard = 'rule4') => {
  if (count < 50) return { nurse: "顧問諮詢 (未達50人)", doctor: "顧問諮詢 (未達50人)", desc: "未達50人門檻，建議採顧問服務" };
  
  let nurse = "1次/月";
  let doctor = "1次/年";
  let desc = "";

  if (standard === 'rule7') {
    desc = `依據附表七 (第13條)，勞工${count}人`;
    if (count >= 3000) {
      doctor = "1次/2個月";
      nurse = "1次/月";
      desc += " (需僱用專職護理人員)";
    } else if (count >= 1000) {
      doctor = "1次/3個月";
      nurse = "1次/月";
    } else if (count >= 300) {
      doctor = "1次/6個月";
      nurse = "1次/2個月";
    } else if (count >= 50) { 
      doctor = "1次/年";
      nurse = "1次/3個月";
      if (count < 100) desc += " (註：50-99人且未具特別危害者不適用此表)";
    }
  } else {
    desc = `依據附表四 (第4條)，勞工${count}人，屬第${category}類事業`;
    // Nurse
    if (count >= 300) nurse = "專職護理人員 (300人以上)";
    else if (count >= 200) nurse = category === "1" ? "6次/月" : category === "2" ? "4次/月" : "3次/月";
    else if (count >= 100) nurse = category === "1" ? "4次/月" : category === "2" ? "3次/月" : "2次/月";
    else nurse = "1次/月";

    // Doctor
    if (count >= 6000) doctor = "18次/月";
    else if (count >= 5000) doctor = category === "1" ? "15次/月" : category === "2" ? "9次/月" : "4次/月";
    else if (count >= 4000) doctor = category === "1" ? "12次/月" : category === "2" ? "7次/月" : "3次/月";
    else if (count >= 3000) doctor = category === "1" ? "9次/月" : category === "2" ? "5次/月" : "2次/月";
    else if (count >= 2000) doctor = category === "1" ? "6次/月" : category === "2" ? "3次/月" : "1次/月";
    else if (count >= 1000) doctor = category === "1" ? "3次/月" : category === "2" ? "1次/月" : "1次/2個月";
    else if (count >= 300) doctor = category === "1" ? "1次/月" : category === "2" ? "1次/2個月" : "1次/3個月";
    else if (count >= 200) doctor = category === "1" ? "6次/年" : category === "2" ? "4次/年" : "3次/年";
    else if (count >= 100) doctor = category === "1" ? "4次/年" : category === "2" ? "3次/年" : "2次/年";
    else doctor = "1次/年";
  }

  return { nurse, doctor, desc };
};

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
      active ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-teal-50'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

const LoginScreen = ({ onSelectRole }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <div className="flex justify-center mb-4 text-teal-700">
          <Activity size={64} />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Anze Care Manager</h1>
        <p className="text-gray-500">請選擇您的使用身分以進入系統</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        <button 
          onClick={() => onSelectRole('individual')}
          className="bg-white p-8 rounded-2xl shadow-sm border-2 border-transparent hover:border-teal-500 hover:shadow-xl transition-all group text-left"
        >
          <div className="bg-teal-100 w-16 h-16 rounded-full flex items-center justify-center mb-6 group-hover:bg-teal-600 transition-colors">
            <UserCircle size={32} className="text-teal-700 group-hover:text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">我是獨立護理師</h2>
          <p className="text-gray-500 mb-4">適合個人接案者。管理我自己的客戶、行程與服務紀錄。</p>
          <span className="text-teal-600 font-bold flex items-center">
            進入個人版 <ChevronRight size={18} className="ml-1" />
          </span>
        </button>
        <button 
          onClick={() => onSelectRole('agency')}
          className="bg-white p-8 rounded-2xl shadow-sm border-2 border-transparent hover:border-blue-500 hover:shadow-xl transition-all group text-left"
        >
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors">
            <Briefcase size={32} className="text-blue-700 group-hover:text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">我是顧問管理公司</h2>
          <p className="text-gray-500 mb-4">適合企業用戶。管理多位護理師/醫師團隊、指派任務、與查看整體營運報表。</p>
          <span className="text-blue-600 font-bold flex items-center">
            進入企業版 <ChevronRight size={18} className="ml-1" />
          </span>
        </button>
      </div>
    </div>
  );
};

const UserProfile = ({ profile, onSave }) => {
  const [data, setData] = useState({ name: '', title: '勞工健康服務護理師', license: '', ...profile });
  const handleSave = (e) => {
    e.preventDefault();
    onSave(data);
    alert('個人資料已更新！');
  };
  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
        <Settings className="mr-2" /> 個人執業設定
      </h2>
      <form onSubmit={handleSave} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">您的姓名</label>
          <input type="text" value={data.name} onChange={e => setData({...data, name: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="如：李小明" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">專業職稱</label>
            <select value={data.title} onChange={e => setData({...data, title: e.target.value})} className="w-full p-2 border rounded-lg">
              <option value="勞工健康服務護理師">勞工健康服務護理師</option>
              <option value="勞工健康服務醫師">勞工健康服務醫師</option>
              <option value="職業醫學專科醫師">職業醫學專科醫師</option>
              <option value="職安管理人員">職安管理人員</option>
              <option value="心理師">心理師</option>
              <option value="物理治療師">物理治療師</option>
              <option value="職能治療師">職能治療師</option>
              <option value="營養師">營養師</option>
            </select>
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
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newStaff.name) return;
    onAdd(newStaff);
    setNewStaff({ name: '', role: '勞工健康服務護理師', hourlyRate: 2000 });
  };
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center"><Users className="mr-2" /> 內部團隊管理</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
            <input type="text" value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500" placeholder="如：李小明" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">職稱</label>
            <select value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})} className="w-full p-2 border rounded-lg">
              <option value="勞工健康服務護理師">勞工健康服務護理師</option>
              <option value="勞工健康服務醫師">勞工健康服務醫師</option>
              <option value="職業醫學專科醫師">職業醫學專科醫師</option>
              <option value="職安管理人員">職安管理人員</option>
              <option value="心理師">心理師</option>
              <option value="物理治療師">物理治療師</option>
              <option value="職能治療師">職能治療師</option>
              <option value="營養師">營養師</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">預設時薪 (成本)</label>
            <input type="number" value={newStaff.hourlyRate} onChange={e => setNewStaff({...newStaff, hourlyRate: parseInt(e.target.value) || 0})} className="w-full p-2 border rounded-lg" />
          </div>
          <button type="submit" className="bg-teal-600 text-white p-2 rounded-lg hover:bg-teal-700 flex items-center justify-center"><Plus size={20} className="mr-1" /> 新增人員</button>
        </form>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-semibold text-gray-600">姓名</th>
              <th className="p-4 font-semibold text-gray-600">職稱</th>
              <th className="p-4 font-semibold text-gray-600">時薪設定</th>
              <th className="p-4 font-semibold text-gray-600 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {staff.map(s => (
              <tr key={s.id} className="border-b hover:bg-gray-50">
                <td className="p-4">{s.name}</td>
                <td className="p-4">{s.role}</td>
                <td className="p-4 text-gray-600">${s.hourlyRate}/hr</td>
                <td className="p-4 text-right">
                  <button onClick={() => onDelete(s.id)} className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ClientManager = ({ clients, onAdd, onDelete, role }) => {
  const [newClient, setNewClient] = useState({ name: '', industry: '', category: '1', regulationStd: 'rule4', employees: '', nurseFreq: '', doctorFreq: '', contractAmount: 0, customMode: false });
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
    setNewClient({ name: '', industry: '', category: '1', regulationStd: 'rule4', employees: '', nurseFreq: '', doctorFreq: '', contractAmount: 0, customMode: false });
  };
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center"><Building className="mr-2" /> {role === 'agency' ? '企業客戶合約管理' : '我的客戶管理'}</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="col-span-full md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">企業名稱</label>
            <input type="text" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="如：ABC股份有限公司" />
          </div>
          <div className="col-span-full md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">法規判定標準</label>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2 border p-3 rounded-lg cursor-pointer hover:bg-gray-50 flex-1">
                <input type="radio" name="regulationStd" value="rule4" checked={newClient.regulationStd === 'rule4'} onChange={e => setNewClient({...newClient, regulationStd: e.target.value})} className="w-4 h-4 text-teal-600" />
                <div><div className="font-bold text-gray-800">勞工健康保護規則 第4條</div><div className="text-xs text-gray-500">適用附表四，依事業類別(風險)區分頻率。</div></div>
              </label>
              <label className="flex items-center space-x-2 border p-3 rounded-lg cursor-pointer hover:bg-gray-50 flex-1">
                <input type="radio" name="regulationStd" value="rule7" checked={newClient.regulationStd === 'rule7'} onChange={e => setNewClient({...newClient, regulationStd: e.target.value})} className="w-4 h-4 text-teal-600" />
                <div><div className="font-bold text-gray-800">勞工健康保護規則 第13條 (附表七)</div><div className="text-xs text-gray-500">依人數規模配置，頻率較彈性 (如: 護理師1次/3個月)。</div></div>
              </label>
            </div>
          </div>
          <div className="col-span-full md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">具體行業 (附表一分類)</label>
            <select value={newClient.industry} onChange={handleIndustryChange} className="w-full p-2 border rounded-lg bg-white">
              <option value="">-- 請選擇行業 --</option>
              <optgroup label="【第一類事業】顯著風險">{INDUSTRY_DATA.cat1.map(item => <option key={item} value={item}>{item}</option>)}</optgroup>
              <optgroup label="【第二類事業】中度風險">{INDUSTRY_DATA.cat2.map(item => <option key={item} value={item}>{item}</option>)}</optgroup>
              <optgroup label="【第三類事業】低度風險">{INDUSTRY_DATA.cat3.map(item => <option key={item} value={item}>{item}</option>)}</optgroup>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">判定類別</label>
            <div className={`w-full p-2 border rounded-lg font-bold text-center ${newClient.category === '1' ? 'bg-red-100 text-red-800' : newClient.category === '2' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
              {newClient.category === '1' ? '第一類事業' : newClient.category === '2' ? '第二類事業' : '第三類事業'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">勞工人數</label>
            <input type="number" value={newClient.employees} onChange={e => setNewClient({...newClient, employees: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="0" />
          </div>
        
          <div className="col-span-full border-t pt-4 mt-2 flex justify-between items-end">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide">合約頻率設定</h3>
            <label className="flex items-center space-x-2 text-sm text-teal-600 cursor-pointer bg-teal-50 px-3 py-1 rounded-full hover:bg-teal-100 transition">
              <input type="checkbox" checked={newClient.customMode} onChange={e => setNewClient({...newClient, customMode: e.target.checked})} className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500" />
              <span className="font-bold"><Edit size={14} className="inline mr-1"/> 啟用手動自訂 (優於法規)</span>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">護理師頻率</label>
            {newClient.customMode ? <input type="text" value={newClient.nurseFreq} onChange={e => setNewClient({...newClient, nurseFreq: e.target.value})} className="w-full p-2 border rounded-lg bg-white border-teal-300 ring-2 ring-teal-50" placeholder="手動輸入" /> : <select value={newClient.nurseFreq} onChange={e => setNewClient({...newClient, nurseFreq: e.target.value})} className="w-full p-2 border rounded-lg bg-yellow-50 focus:bg-white">{FREQ_OPTIONS.nurse.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>}
            <p className="text-xs text-gray-500 mt-1">建議: {newClient.suggestion}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">醫師頻率</label>
            {newClient.customMode ? <input type="text" value={newClient.doctorFreq} onChange={e => setNewClient({...newClient, doctorFreq: e.target.value})} className="w-full p-2 border rounded-lg bg-white border-teal-300 ring-2 ring-teal-50" placeholder="手動輸入" /> : <select value={newClient.doctorFreq} onChange={e => setNewClient({...newClient, doctorFreq: e.target.value})} className="w-full p-2 border rounded-lg bg-yellow-50 focus:bg-white">{FREQ_OPTIONS.doctor.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>}
          </div>
          <div className="flex items-end"><button type="submit" className="w-full bg-teal-600 text-white p-2 rounded-lg hover:bg-teal-700 flex items-center justify-center"><Plus size={20} className="mr-1" /> 新增合約</button></div>
        </form>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {clients.map(client => (
          <div key={client.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg text-gray-800">{client.name}</h3>
              <p className="text-sm text-gray-500 mb-1">{client.industry || '未分類'}</p>
              <p className="text-xs text-gray-400 mb-2">{client.employees} 人 | {client.regulationStd === 'rule7' ? '第13條(附表七)' : `第4條(附表四)-第${client.category}類`}{client.customMode && <span className="ml-2 text-teal-600 font-bold">(自訂頻率)</span>}</p>
              <div className="flex space-x-2"><span className="text-xs bg-teal-100 text-teal-800 px-2 py-1 rounded">護: {client.nurseFreq}</span><span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">醫: {client.doctorFreq}</span></div>
            </div>
            <button onClick={() => onDelete(client.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={20} /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Service Logger ---
const ServiceLogger = ({ staff, clients, onAddLog, role, userProfile }) => {
  const [log, setLog] = useState({
    clientId: '',
    serviceMode: 'nurse_only',
    date: new Date().toISOString().split('T')[0],
    startTime: '14:00', endTime: '17:00',
    dept_name: '', address: '',
    admin_male: 0, admin_female: 0,
    field_male: 0, field_female: 0,
    work_general_count: 0,
    special_hazards: [], 
    process: '', work_type_time: '',
    hazards: [],
    // Checklist
    check_health: false, check_job: false, check_track: false,
    check_high_risk: false, check_research: false, check_edu: false,
    check_emerg: false, check_report: false, check_env: false,
    check_env_impr: false, check_survey: false, check_return: false,
    check_other: false,
    // Checklist inputs
    job_sel_count: 0, tracking_count: 0, high_risk_count: 0, emergency_count: 0, other_note: '',
    // Plans
    plan_ergo: false, plan_overwork: false, plan_maternal: false,
    plan_violence: false, plan_age: false, plan_hearing: false,
    plan_breath: false, plan_epidemic: false, plan_other_central: false,
    other_central_note: '',
    // Section 3 Findings
    section3_findings: '',
    // Section 4 Dynamic Suggestions
    suggestions_map: {}, 
    
    // --- [Modified] Section 5 Tracking Display Toggles ---
    prev_tracking: '', 
    show_tracking_2: true,
    show_tracking_3: true,
    show_tracking_4: true,
    show_tracking_5: true,

    // Section 5 Data
    exam_year: new Date().getFullYear(),
    level4_interview: 0, level4_not: 0, level4_close: 0, level4_track: 0,
    level3_interview: 0, level3_not: 0, level3_close: 0, level3_track: 0,
    level2_interview: 0, level2_not: 0, level2_close: 0, level2_track: 0,
    showLevel2: true, 
    overwork_survey_total: 0, overwork_survey_done: 0, overwork_survey_not: 0,
    overwork_risk_count: 0, overwork_int_need: '', overwork_int_done: 0, overwork_int_not: 0,
    ergo_survey_total: 0, ergo_survey_done: 0, ergo_survey_not: 0,
    ergo_risk_count: '', ergo_int_done: 0, ergo_int_not: 0,
    violence_statement: false, violence_assess_target: '', violence_assess_done: 0, violence_assess_not: 0,
    violence_config: false, violence_adjust: false,
    maternal_hazard_check: false, mat_female_total: 0, mat_repro_age: 0, mat_pregnant: 0, mat_postpartum: 0, mat_breastfeeding: 0,
    mat_doc_interview: 0, mat_doc_done: 0, mat_doc_not: 0,
    mat_track: 0, mat_medical: 0,
    mat_nurse_guidance: 0, mat_nurse_done: 0, mat_nurse_not: 0,
    mat_referral: 0, mat_regular_track: 0,
    injury_report_count: 0, injury_unclosed: 0, injury_closed: 0, injury_note: '',
    
    // --- [Modified] Section 6 Signatures ---
    signatures: {
      onsite: [
        { id: 'doc', title: '勞工健康服務醫師', name: '', required: false },
        { id: 'nurse', title: '勞工健康服務護理人員', name: userProfile.name || '', required: true },
      ],
      client: [
        { id: 'osh', title: '職安衛人員', name: '' },
        { id: 'mgr', title: '部門主管', name: '' }
      ]
    },

    // Attachments
    attachments: [] 
  });

  const [newHazard, setNewHazard] = useState({ type: '', job: '', desc: '' });
  const [newSpecial, setNewSpecial] = useState({ category: '', count: 0 });
  const fileInputRef = useRef(null);

  // Initialize Agency PM Field
  useEffect(() => {
    if (role === 'agency') {
      setLog(prev => {
        if (prev.signatures.onsite.find(s => s.id === 'pm')) return prev;
        return {
          ...prev,
          signatures: {
            ...prev.signatures,
            onsite: [...prev.signatures.onsite, { id: 'pm', title: '專案管理人員', name: '', required: false }]
          }
        };
      });
    }
  }, [role]);

  // Set default client labor count
  useEffect(() => {
    const client = clients.find(c => c.id === log.clientId);
    if (client) {
      setLog(prev => ({ ...prev, work_general_count: client.employees }));
    }
  }, [log.clientId, clients]);

  const totalLabor = (parseInt(log.admin_male)||0) + (parseInt(log.admin_female)||0) + (parseInt(log.field_male)||0) + (parseInt(log.field_female)||0);
  const totalSpecial = log.special_hazards.reduce((acc, curr) => acc + (parseInt(curr.count)||0), 0);

  const addHazard = () => { if(!newHazard.type) return; setLog(prev => ({...prev, hazards: [...prev.hazards, newHazard]})); setNewHazard({ type: '', job: '', desc: '' }); };
  const removeHazard = (idx) => { setLog(prev => ({...prev, hazards: prev.hazards.filter((_, i) => i !== idx)})); };
  
  const addSpecial = () => { if(!newSpecial.category) return; setLog(prev => ({...prev, special_hazards: [...prev.special_hazards, newSpecial]})); setNewSpecial({ category: '', count: 0 }); };
  const removeSpecial = (idx) => { setLog(prev => ({...prev, special_hazards: prev.special_hazards.filter((_, i) => i !== idx)})); };

  const handleSuggestionChange = (key, val) => {
    setLog(prev => ({...prev, suggestions_map: {...prev.suggestions_map, [key]: val}}));
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    files.forEach(file => {
      if (file.size > 500 * 1024) { alert(`檔案 ${file.name} 太大，請上傳小於 500KB 的圖片`); return; }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setLog(prev => ({ ...prev, attachments: [...prev.attachments, {name: file.name, dataUrl: ev.target.result}] }));
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const removeAttachment = (idx) => { setLog(prev => ({...prev, attachments: prev.attachments.filter((_, i) => i !== idx)})); };

  // Signature handlers
  const handleSignatureChange = (side, index, field, value) => {
    setLog(prev => {
      const newSigs = { ...prev.signatures };
      // Copy array to avoid mutation
      newSigs[side] = [...newSigs[side]];
      newSigs[side][index] = { ...newSigs[side][index], [field]: value };
      return { ...prev, signatures: newSigs };
    });
  };

  const addClientSignature = () => {
    setLog(prev => ({
      ...prev,
      signatures: {
        ...prev.signatures,
        client: [...prev.signatures.client, { id: Date.now(), title: '自訂職稱', name: '' }]
      }
    }));
  };

  const removeClientSignature = (index) => {
    setLog(prev => {
      const newClientSigs = [...prev.signatures.client];
      newClientSigs.splice(index, 1);
      return {
        ...prev,
        signatures: { ...prev.signatures, client: newClientSigs }
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!log.clientId) { alert("請選擇客戶"); return; }
    const clientName = clients.find(c => c.id === log.clientId)?.name;
    
    // Extract key names for dashboard compatibility
    const nurseSig = log.signatures.onsite.find(s => s.title.includes('護理') || s.title.includes('Nurse'));
    const docSig = log.signatures.onsite.find(s => s.title.includes('醫師') || s.title.includes('Doctor'));
    const nurseName = nurseSig ? nurseSig.name : "";
    const doctorName = docSig ? docSig.name : "";

    const findings = Object.entries(log.suggestions_map).map(([k, v]) => `${k}: ${v}`).join('\n');

    onAddLog({ 
        ...log, 
        clientName, 
        nurseName, 
        doctorName, 
        staffName: nurseName || doctorName || "未簽名", 
        findings, 
        hours: ((new Date(`2000/01/01 ${log.endTime}`) - new Date(`2000/01/01 ${log.startTime}`)) / 36e5).toFixed(1), 
        createdAt: serverTimestamp() 
    });
    alert("紀錄已儲存！");
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
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center"><Clock className="mr-2" /> 服務紀錄填寫 (附表八)</h2>
        <form onSubmit={handleSubmit} className="space-y-8">
          
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h3 className="font-bold text-lg mb-3 border-b pb-2">一、作業場所基本資料</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium">企業名稱</label>
                <select className="w-full mt-1 p-2 border rounded" value={log.clientId} onChange={e => setLog({...log, clientId: e.target.value})}>
                  <option value="">請選擇...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div><label className="text-sm font-medium">部門名稱</label><input type="text" className="w-full mt-1 p-2 border rounded" value={log.dept_name} onChange={e => setLog({...log, dept_name: e.target.value})}/></div>
              <div><label className="text-sm font-medium">臨場地址</label><input type="text" className="w-full mt-1 p-2 border rounded" value={log.address} onChange={e => setLog({...log, address: e.target.value})}/></div>
            </div>
            
            <div className="bg-white p-3 rounded border mb-3">
              <h4 className="text-sm font-bold mb-2 text-gray-700">勞工人數統計 (目前總計: {totalLabor} 人)</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><label className="text-xs">行政(男)</label><input type="number" className="w-full border p-1" value={log.admin_male} onChange={e=>setLog({...log, admin_male: e.target.value})}/></div>
                <div><label className="text-xs">行政(女)</label><input type="number" className="w-full border p-1" value={log.admin_female} onChange={e=>setLog({...log, admin_female: e.target.value})}/></div>
                <div><label className="text-xs">現場(男)</label><input type="number" className="w-full border p-1" value={log.field_male} onChange={e=>setLog({...log, field_male: e.target.value})}/></div>
                <div><label className="text-xs">現場(女)</label><input type="number" className="w-full border p-1" value={log.field_female} onChange={e=>setLog({...log, field_female: e.target.value})}/></div>
              </div>
            </div>

            <div className="bg-white p-3 rounded border">
              <h4 className="text-sm font-bold mb-2 text-gray-700">作業類別與人數</h4>
              <div className="mb-2"><label className="text-xs">一般作業人數</label><input type="number" className="w-full border p-1" value={log.work_general_count} onChange={e=>setLog({...log, work_general_count: e.target.value})}/></div>
              <div className="border-t pt-2 mt-2">
                <label className="text-xs font-bold text-red-600 block mb-1">特別危害健康作業 (可多選)</label>
                {totalSpecial >= 50 && (
                  <div className="bg-red-100 text-red-800 p-2 rounded mb-2 text-xs font-bold flex items-center">
                    <AlertTriangle size={14} className="mr-1"/> 警示：特危作業 {totalSpecial} 人，依法需由職業醫學科專科醫師臨場服務。
                  </div>
                )}
                <div className="flex space-x-2 mb-2">
                  <input placeholder="類別(如:噪音)" className="border p-1 w-2/3" value={newSpecial.category} onChange={e=>setNewSpecial({...newSpecial, category: e.target.value})}/>
                  <input type="number" placeholder="人數" className="border p-1 w-1/3" value={newSpecial.count} onChange={e=>setNewSpecial({...newSpecial, count: e.target.value})}/>
                  <button type="button" onClick={addSpecial} className="bg-teal-600 text-white px-3 rounded"><Plus size={16}/></button>
                </div>
                {log.special_hazards.map((h, i) => (
                   <div key={i} className="flex justify-between items-center bg-red-50 p-1 mb-1 rounded text-xs">
                     <span>{h.category}: {h.count}人</span>
                     <button type="button" onClick={()=>removeSpecial(i)} className="text-red-500"><X size={14}/></button>
                   </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
             <h3 className="font-bold text-lg mb-3 border-b pb-2">二、作業場所與勞動條件概況</h3>
             <div className="space-y-3">
               <div><label className="text-sm">工作流程(製程)</label><input type="text" className="w-full border p-2 rounded" value={log.process} onChange={e=>setLog({...log, process: e.target.value})}/></div>
               <div><label className="text-sm">工作型態與時間</label><input type="text" className="w-full border p-2 rounded" value={log.work_type_time} onChange={e=>setLog({...log, work_type_time: e.target.value})}/></div>
               <div className="bg-white p-3 rounded border">
                 <h4 className="text-sm font-bold mb-2">初步危害辨識表</h4>
                 <div className="flex space-x-2 mb-2">
                   <input placeholder="工作類型" className="border p-1 w-1/3" value={newHazard.type} onChange={e=>setNewHazard({...newHazard, type: e.target.value})}/>
                   <input placeholder="職務" className="border p-1 w-1/3" value={newHazard.job} onChange={e=>setNewHazard({...newHazard, job: e.target.value})}/>
                   <input placeholder="初步危害辨識" className="border p-1 w-1/3" value={newHazard.desc} onChange={e=>setNewHazard({...newHazard, desc: e.target.value})}/>
                   <button type="button" onClick={addHazard} className="bg-teal-600 text-white px-3 rounded"><Plus size={16}/></button>
                 </div>
                 {log.hazards.map((h, i) => (
                   <div key={i} className="flex justify-between items-center bg-gray-100 p-2 mb-1 rounded text-sm">
                     <span>{h.type} - {h.job} - {h.desc}</span>
                     <button type="button" onClick={()=>removeHazard(i)} className="text-red-500"><X size={14}/></button>
                   </div>
                 ))}
               </div>
             </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h3 className="font-bold text-lg mb-3 border-b pb-2">三、臨場健康服務執行情形 (本規則第九條至第十三條事項)</h3>
            <div className="space-y-3 text-sm">
               {CHECKLIST_ITEMS.map(item => (
                 <div key={item.key}>
                   <div className="flex items-start">
                     <input type="checkbox" className="mt-1 mr-2" checked={log[item.key]} onChange={e=>setLog({...log, [item.key]: e.target.checked})}/>
                     <div className="flex-1">
                       <span className="leading-relaxed">{item.label}</span>
                       {item.hasCount && log[item.key] && (
                         <span className="ml-2 inline-flex items-center">
                           共 <input type="number" className="border w-16 p-0.5 mx-1" value={log[item.countKey]} onChange={e=>setLog({...log, [item.countKey]: e.target.value})}/> 名
                         </span>
                       )}
                     </div>
                   </div>
                   {item.key === 'check_other' && log.check_other && (
                     <div className="pl-6 mt-2 grid grid-cols-1 gap-2 bg-white p-2 border rounded">
                        <label className="flex items-center"><input type="checkbox" className="mr-2" checked={log.plan_ergo} onChange={e=>setLog({...log, plan_ergo: e.target.checked})}/> 人因性危害預防計劃</label>
                        <label className="flex items-center"><input type="checkbox" className="mr-2" checked={log.plan_overwork} onChange={e=>setLog({...log, plan_overwork: e.target.checked})}/> 異常工作負荷促發疾病預防計劃</label>
                        <label className="flex items-center"><input type="checkbox" className="mr-2" checked={log.plan_maternal} onChange={e=>setLog({...log, plan_maternal: e.target.checked})}/> 工作場所母性健康保護計劃</label>
                        <label className="flex items-center"><input type="checkbox" className="mr-2" checked={log.plan_violence} onChange={e=>setLog({...log, plan_violence: e.target.checked})}/> 執行職務遭受不法侵害預防計劃</label>
                        <label className="flex items-center"><input type="checkbox" className="mr-2" checked={log.plan_age} onChange={e=>setLog({...log, plan_age: e.target.checked})}/> 中高齡及高齡工作者工作適能評估</label>
                        <label className="flex items-center"><input type="checkbox" className="mr-2" checked={log.plan_hearing} onChange={e=>setLog({...log, plan_hearing: e.target.checked})}/> 聽力保護計劃</label>
                        <label className="flex items-center"><input type="checkbox" className="mr-2" checked={log.plan_breath} onChange={e=>setLog({...log, plan_breath: e.target.checked})}/> 呼吸防護計劃</label>
                        <label className="flex items-center"><input type="checkbox" className="mr-2" checked={log.plan_epidemic} onChange={e=>setLog({...log, plan_epidemic: e.target.checked})}/> 防疫措施之策劃及實施</label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" checked={log.plan_other_central} onChange={e=>setLog({...log, plan_other_central: e.target.checked})}/> 
                          其他中央主管機關指定事項：
                          <input type="text" className="border-b ml-1 w-40 outline-none" value={log.other_central_note} onChange={e=>setLog({...log, other_central_note: e.target.value})}/>
                        </label>
                     </div>
                   )}
                 </div>
               ))}
            </div>
            <div className="mt-6 pt-4 border-t border-dashed">
               <label className="font-bold text-sm block mb-2 text-teal-800">（二）發現問題 (對應辦理事項描述)</label>
               <textarea 
                 rows="3" 
                 className="w-full border p-2 rounded bg-yellow-50 focus:bg-white"
                 placeholder="若有申請臨場補助，請務必輸入50個字以上..."
                 value={log.section3_findings}
                 onChange={e => setLog({...log, section3_findings: e.target.value})}
               />
               <div className={`text-xs mt-1 text-right ${log.section3_findings?.length < 50 ? 'text-red-500' : 'text-green-600'}`}>
                 字數統計: {log.section3_findings?.length || 0} 字 {log.section3_findings?.length < 50 && "(未達50字)"}
               </div>
            </div>
          </div>

          <div className="border border-blue-100 rounded-lg p-4 bg-blue-50">
             <h3 className="font-bold text-lg mb-3 border-b border-blue-200 pb-2 text-blue-800">四、建議採行措施 (執行紀錄)</h3>
             <p className="text-xs text-gray-500 mb-4">請針對上方勾選的項目填寫具體的執行內容與建議。</p>
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

          {/* --- Section 5: Tracking (Modified with toggles) --- */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
             <h3 className="font-bold text-lg mb-3 border-b pb-2">五、對於前次建議改善事項之追蹤辦理情形</h3>
             
             {/* (1) Fixed */}
             <div className="mb-4">
               <label className="font-bold text-sm block mb-1">(1) 前次建議事項追蹤情形 (固定)</label>
               <textarea placeholder="請輸入前次追蹤情形..." rows="2" className="w-full border p-2 rounded" value={log.prev_tracking} onChange={e=>setLog({...log, prev_tracking: e.target.value})}/>
             </div>

             <div className="bg-white p-4 rounded border space-y-6">
                <div className="flex items-center space-x-2 text-teal-700 bg-teal-50 p-2 rounded mb-2">
                  <CheckSquare size={16}/>
                  <span className="text-sm font-bold">請勾選本次報表要呈現的追蹤項目：</span>
                </div>

                {/* (2) 健檢分析 */}
                <div className={`transition-opacity ${log.show_tracking_2 ? 'opacity-100' : 'opacity-50'}`}>
                  <label className="flex items-center font-bold text-sm mb-2 cursor-pointer">
                    <input type="checkbox" className="mr-2 w-4 h-4 text-teal-600" checked={log.show_tracking_2} onChange={e=>setLog({...log, show_tracking_2: e.target.checked})}/>
                    (2) 健康檢查結果分析之異常追蹤
                  </label>
                  {log.show_tracking_2 && (
                    <div className="pl-6">
                       <div className="flex justify-between items-center mb-2">
                          <span className="text-xs text-gray-500">年度: {log.exam_year}</span>
                          <button type="button" onClick={()=>setLog(p=>({...p, showLevel2: !p.showLevel2}))} className="text-xs bg-gray-200 px-2 py-1 rounded flex items-center">
                             {log.showLevel2 ? <Eye size={12} className="mr-1"/> : <EyeOff size={12} className="mr-1"/>} {log.showLevel2 ? '隱藏第二級' : '顯示第二級'}
                          </button>
                       </div>
                       <table className="w-full text-center text-xs bg-gray-50 rounded border">
                          <thead><tr className="bg-gray-100 border-b"><th>分級</th><th>已面談</th><th>未面談</th><th>結案</th><th>追蹤中</th></tr></thead>
                          <tbody>
                            <tr className="border-b"><td className="p-2 font-bold">第四級</td><td><input type="number" className="border w-16 text-center" value={log.level4_interview} onChange={e=>setLog({...log, level4_interview: e.target.value})}/></td><td><input type="number" className="border w-16 text-center" value={log.level4_not} onChange={e=>setLog({...log, level4_not: e.target.value})}/></td><td><input type="number" className="border w-16 text-center" value={log.level4_close} onChange={e=>setLog({...log, level4_close: e.target.value})}/></td><td><input type="number" className="border w-16 text-center" value={log.level4_track} onChange={e=>setLog({...log, level4_track: e.target.value})}/></td></tr>
                            <tr className="border-b"><td className="p-2 font-bold">第三級</td><td><input type="number" className="border w-16 text-center" value={log.level3_interview} onChange={e=>setLog({...log, level3_interview: e.target.value})}/></td><td><input type="number" className="border w-16 text-center" value={log.level3_not} onChange={e=>setLog({...log, level3_not: e.target.value})}/></td><td><input type="number" className="border w-16 text-center" value={log.level3_close} onChange={e=>setLog({...log, level3_close: e.target.value})}/></td><td><input type="number" className="border w-16 text-center" value={log.level3_track} onChange={e=>setLog({...log, level3_track: e.target.value})}/></td></tr>
                            {log.showLevel2 && <tr className="border-b"><td className="p-2 font-bold text-gray-500">第二級</td><td><input type="number" className="border w-16 text-center" value={log.level2_interview} onChange={e=>setLog({...log, level2_interview: e.target.value})}/></td><td><input type="number" className="border w-16 text-center" value={log.level2_not} onChange={e=>setLog({...log, level2_not: e.target.value})}/></td><td><input type="number" className="border w-16 text-center" value={log.level2_close} onChange={e=>setLog({...log, level2_close: e.target.value})}/></td><td><input type="number" className="border w-16 text-center" value={log.level2_track} onChange={e=>setLog({...log, level2_track: e.target.value})}/></td></tr>}
                          </tbody>
                       </table>
                    </div>
                  )}
                </div>

                {/* (3) 計畫追蹤 */}
                <div className={`transition-opacity ${log.show_tracking_3 ? 'opacity-100' : 'opacity-50'}`}>
                  <label className="flex items-center font-bold text-sm mb-2 cursor-pointer">
                    <input type="checkbox" className="mr-2 w-4 h-4 text-teal-600" checked={log.show_tracking_3} onChange={e=>setLog({...log, show_tracking_3: e.target.checked})}/>
                    (3) 勞工健康保護計畫執行進度 (過負荷/人因/不法侵害)
                  </label>
                  {log.show_tracking_3 && (
                     <div className="pl-6 space-y-4">
                        {/* 過負荷 */}
                        <div className="bg-gray-50 p-3 border rounded text-xs">
                          <div className="font-bold text-sm mb-2 border-b pb-1">異常工作負荷促發疾病預防</div>
                          <div className="grid grid-cols-1 gap-2">
                             <div className="flex items-center space-x-2">
                               <span className="w-24 font-bold">問卷回收:</span>
                               應做 <input className="w-12 border p-1" value={log.overwork_survey_total} onChange={e=>setLog({...log, overwork_survey_total:e.target.value})}/> 
                               已做 <input className="w-12 border p-1" value={log.overwork_survey_done} onChange={e=>setLog({...log, overwork_survey_done:e.target.value})}/>
                             </div>
                             <div className="flex items-center space-x-2">
                               <span className="w-24 font-bold">高風險群:</span>
                               <input className="w-12 border p-1" value={log.overwork_risk_count} onChange={e=>setLog({...log, overwork_risk_count:e.target.value})}/> 人
                             </div>
                             <div className="flex items-center space-x-2">
                               <span className="w-24 font-bold">面談指導:</span>
                               已面談 <input className="w-12 border p-1" value={log.overwork_int_done} onChange={e=>setLog({...log, overwork_int_done:e.target.value})}/> 人
                             </div>
                          </div>
                        </div>
                        {/* 人因 */}
                        <div className="bg-gray-50 p-3 border rounded text-xs">
                          <div className="font-bold text-sm mb-2 border-b pb-1">重複性肌肉骨骼疾病預防</div>
                          <div className="grid grid-cols-1 gap-2">
                            <div className="flex items-center space-x-2">
                              <span className="w-24 font-bold">症狀調查:</span>
                              應做 <input className="w-12 border p-1" value={log.ergo_survey_total} onChange={e=>setLog({...log, ergo_survey_total:e.target.value})}/> 
                              已做 <input className="w-12 border p-1" value={log.ergo_survey_done} onChange={e=>setLog({...log, ergo_survey_done:e.target.value})}/>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="w-24 font-bold">危害追蹤:</span>
                              疑似危害 <input className="w-16 border p-1" value={log.ergo_risk_count} onChange={e=>setLog({...log, ergo_risk_count:e.target.value})}/>
                            </div>
                          </div>
                        </div>
                        {/* 不法侵害 */}
                        <div className="bg-gray-50 p-3 border rounded text-xs">
                           <div className="font-bold text-sm mb-2 border-b pb-1">職場不法侵害預防</div>
                           <div className="flex items-center justify-between mb-2">
                             <span>書面聲明</span>
                             <div className="space-x-2"><label><input type="radio" checked={log.violence_statement} onChange={()=>setLog({...log, violence_statement: true})}/> 已完成</label><label><input type="radio" checked={!log.violence_statement} onChange={()=>setLog({...log, violence_statement: false})}/> 未完成</label></div>
                           </div>
                           <div className="flex items-center space-x-2">
                              <span>危害評估:</span>
                              應做 <input className="w-16 border p-1" value={log.violence_assess_target} onChange={e=>setLog({...log, violence_assess_target:e.target.value})}/>
                              已做 <input className="w-12 border p-1" value={log.violence_assess_done} onChange={e=>setLog({...log, violence_assess_done:e.target.value})}/>
                           </div>
                        </div>
                     </div>
                  )}
                </div>

                {/* (4) 母性健康 */}
                <div className={`transition-opacity ${log.show_tracking_4 ? 'opacity-100' : 'opacity-50'}`}>
                   <label className="flex items-center font-bold text-sm mb-2 cursor-pointer">
                    <input type="checkbox" className="mr-2 w-4 h-4 text-teal-600" checked={log.show_tracking_4} onChange={e=>setLog({...log, show_tracking_4: e.target.checked})}/>
                    (4) 母性健康保護
                  </label>
                  {log.show_tracking_4 && (
                     <div className="pl-6 text-xs bg-gray-50 p-3 border rounded space-y-2">
                       <div className="flex items-center justify-between border-b pb-2">
                         <span className="font-bold">危害辨識及評估</span>
                         <div className="space-x-4">
                           <label><input type="radio" checked={!log.maternal_hazard_check} onChange={()=>setLog({...log, maternal_hazard_check: false})}/> 未完成</label>
                           <label><input type="radio" checked={log.maternal_hazard_check} onChange={()=>setLog({...log, maternal_hazard_check: true})}/> 已完成</label>
                         </div>
                       </div>
                       <div className="grid grid-cols-2 gap-2">
                           <div>妊娠中: <input className="w-12 border p-1" value={log.mat_pregnant} onChange={e=>setLog({...log, mat_pregnant: e.target.value})}/></div>
                           <div>分娩後: <input className="w-12 border p-1" value={log.mat_postpartum} onChange={e=>setLog({...log, mat_postpartum: e.target.value})}/></div>
                           <div>哺乳中: <input className="w-12 border p-1" value={log.mat_breastfeeding} onChange={e=>setLog({...log, mat_breastfeeding: e.target.value})}/></div>
                       </div>
                       <div>
                          <div className="font-bold mb-1">面談及指導：</div>
                          <div className="space-y-1">
                             <div>需醫師面談 <input className="w-8 border p-1" value={log.mat_doc_interview} onChange={e=>setLog({...log, mat_doc_interview:e.target.value})}/> (已完成 <input className="w-8 border p-1" value={log.mat_doc_done} onChange={e=>setLog({...log, mat_doc_done:e.target.value})}/>)</div>
                             <div>需護理指導 <input className="w-8 border p-1" value={log.mat_nurse_guidance} onChange={e=>setLog({...log, mat_nurse_guidance:e.target.value})}/> (已完成 <input className="w-8 border p-1" value={log.mat_nurse_done} onChange={e=>setLog({...log, mat_nurse_done:e.target.value})}/>)</div>
                          </div>
                       </div>
                     </div>
                  )}
                </div>

                {/* (5) 職傷追蹤 */}
                <div className={`transition-opacity ${log.show_tracking_5 ? 'opacity-100' : 'opacity-50'}`}>
                   <label className="flex items-center font-bold text-sm mb-2 cursor-pointer">
                    <input type="checkbox" className="mr-2 w-4 h-4 text-teal-600" checked={log.show_tracking_5} onChange={e=>setLog({...log, show_tracking_5: e.target.checked})}/>
                    (5) 職業傷病追蹤
                  </label>
                  {log.show_tracking_5 && (
                     <div className="pl-6">
                        <div className="p-3 border rounded bg-gray-50 text-xs flex space-x-2">
                           <span>通報: <input className="w-12 border p-1" value={log.injury_report_count} onChange={e=>setLog({...log, injury_report_count: e.target.value})}/></span>
                           <span>結案: <input className="w-12 border p-1" value={log.injury_closed} onChange={e=>setLog({...log, injury_closed: e.target.value})}/></span>
                           <span>備註: <input className="w-24 border p-1" value={log.injury_note} onChange={e=>setLog({...log, injury_note: e.target.value})}/></span>
                        </div>
                     </div>
                  )}
                </div>
             </div>
          </div>

          {/* --- Section 6: Signatures (Modified Layout) --- */}
          <div className="border border-teal-200 rounded-lg p-4 bg-teal-50">
             <h3 className="font-bold text-lg mb-4 border-b border-teal-200 pb-2 text-teal-800">
               六、執行人員及日期（僅就當次實際執行者簽章）
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Onsite */}
                <div className="bg-white p-4 rounded-lg border border-teal-100 shadow-sm">
                   <h4 className="font-bold text-teal-700 mb-3 text-center border-b pb-2">臨場服務人員 (甲方/顧問)</h4>
                   <div className="space-y-4">
                     {log.signatures.onsite.map((sig, idx) => (
                       <div key={sig.id} className="relative">
                          <label className="block text-xs text-gray-500 mb-1">職稱 (可修改)</label>
                          <input 
                            type="text" 
                            className="w-full text-sm font-bold border-b-2 border-teal-100 focus:border-teal-500 outline-none bg-transparent mb-1"
                            value={sig.title}
                            onChange={(e) => handleSignatureChange('onsite', idx, 'title', e.target.value)}
                          />
                          <input 
                             type="text" 
                             className="w-full p-2 border rounded bg-gray-50 focus:bg-white"
                             placeholder="請輸入姓名"
                             value={sig.name}
                             onChange={(e) => handleSignatureChange('onsite', idx, 'name', e.target.value)}
                          />
                       </div>
                     ))}
                   </div>
                </div>
                {/* Right: Client */}
                <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
                   <div className="flex justify-between items-center mb-3 border-b pb-2">
                     <h4 className="font-bold text-blue-700">事業單位人員 (乙方/客戶)</h4>
                     <button type="button" onClick={addClientSignature} className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200 flex items-center">
                        <Plus size={12} className="mr-1"/> 新增欄位
                     </button>
                   </div>
                   <div className="space-y-4">
                     {log.signatures.client.map((sig, idx) => (
                       <div key={sig.id} className="relative group">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs text-gray-500 mb-1">職稱</label>
                            <button type="button" onClick={() => removeClientSignature(idx)} className="text-gray-300 hover:text-red-500"><X size={12}/></button>
                          </div>
                          <input 
                            type="text" 
                            className="w-full text-sm font-bold border-b-2 border-blue-100 focus:border-blue-500 outline-none bg-transparent mb-1"
                            value={sig.title}
                            onChange={(e) => handleSignatureChange('client', idx, 'title', e.target.value)}
                          />
                          <input 
                             type="text" 
                             className="w-full p-2 border rounded bg-gray-50 focus:bg-white"
                             placeholder="請輸入姓名"
                             value={sig.name}
                             onChange={(e) => handleSignatureChange('client', idx, 'name', e.target.value)}
                          />
                       </div>
                     ))}
                   </div>
                </div>
             </div>
             <div className="w-full grid grid-cols-2 gap-4 mt-6 border-t pt-4">
                 <div><label className="text-sm font-bold">執行日期</label><input type="date" className="w-full border p-2 rounded" value={log.date} onChange={e=>setLog({...log, date: e.target.value})}/></div>
                 <div className="flex space-x-2">
                   <div className="flex-1"><label className="text-sm font-bold">開始時間</label><input type="time" className="w-full border p-2 rounded" value={log.startTime} onChange={e=>setLog({...log, startTime: e.target.value})}/></div>
                   <div className="flex-1"><label className="text-sm font-bold">結束時間</label><input type="time" className="w-full border p-2 rounded" value={log.endTime} onChange={e=>setLog({...log, endTime: e.target.value})}/></div>
                 </div>
             </div>
          </div>

          <div className="border border-indigo-200 rounded-lg p-4 bg-indigo-50">
             <h3 className="font-bold text-lg mb-3 border-b border-indigo-200 pb-2 text-indigo-800 flex items-center">
               <Upload className="mr-2" size={20}/> 附件上傳 (海報/表單)
             </h3>
             <input type="file" multiple accept="image/*" ref={fileInputRef} onChange={handleFileUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200 mb-4"/>
             {log.attachments && log.attachments.length > 0 && (
               <div className="grid grid-cols-3 gap-2">
                 {log.attachments.map((file, idx) => (
                   <div key={idx} className="relative group">
                     <img src={file.dataUrl} alt="preview" className="h-24 w-full object-cover rounded border"/>
                     <button type="button" onClick={() => removeAttachment(idx)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"><X size={12}/></button>
                     <p className="text-xs truncate mt-1">{file.name}</p>
                   </div>
                 ))}
               </div>
             )}
          </div>

          <button type="submit" className="w-full bg-teal-600 text-white py-3 rounded-xl font-bold hover:bg-teal-700 shadow-lg"><Save className="inline mr-2" /> 儲存並生成紀錄表</button>
        </form>
      </div>
    </div>
  );
};

// --- Report View (Modified) ---
const ReportView = ({ logs, onDelete }) => {
  const [selectedLog, setSelectedLog] = useState(null);
  
  if (!selectedLog) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-800">歷史服務紀錄</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
             <thead className="bg-gray-50 border-b">
               <tr>
                 <th className="p-4">日期</th><th className="p-4">客戶</th><th className="p-4">執行人員</th><th className="p-4">時數</th><th className="p-4 text-right">操作</th>
               </tr>
             </thead>
             <tbody>
               {logs.map(log => (
                 <tr key={log.id} className="border-b hover:bg-gray-50">
                   <td className="p-4">{log.date}</td>
                   <td className="p-4 font-medium">{log.clientName}</td>
                   <td className="p-4">
                      {log.doctorName && <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1">{log.doctorName}</span>}
                      {log.nurseName && <span className="bg-teal-100 text-teal-800 text-xs px-2 py-1 rounded">{log.nurseName}</span>}
                      {!log.doctorName && !log.nurseName && log.staffName}
                   </td>
                   <td className="p-4">{log.hours} hr</td>
                   <td className="p-4 text-right flex justify-end space-x-2">
                     <button onClick={() => setSelectedLog(log)} className="text-teal-600 hover:text-teal-800 flex items-center text-sm font-bold"><FileText size={16} className="mr-1"/> 查看</button>
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

  const getItemLabel = (key) => {
    if(key === 'check_health') return '勞工一般/特殊/供膳等體格（健康）檢查結果之分析與評估、健康管理及資料保存。';
    if(key === 'check_job') return `協助雇主選配勞工從事適當之工作，共 ${selectedLog.job_sel_count || '_'} 名。`;
    if(key === 'check_track') return `辦理健康檢查結果異常者之追蹤管理及健康指導，共 ${selectedLog.tracking_count || '_'} 名。`;
    if(key === 'check_high_risk') return `辦理未滿十八歲勞工、有母性健康危害之虞之勞工、職業傷病勞工與職業健康相關高風險勞工之評估及個案管理，共 ${selectedLog.high_risk_count || '_'} 名。`;
    if(key === 'check_research') return '職業衛生或職業健康之相關研究報告及傷害、疾病紀錄之保存。';
    if(key === 'check_edu') return '勞工之健康教育、衛生指導、身心健康保護、健康促進等措施之策劃及實施。';
    if(key === 'check_emerg') return `工作相關傷病之預防、健康諮詢與急救及緊急處置，共 ${selectedLog.emergency_count || '_'} 名。`;
    if(key === 'check_report') return '定期向雇主報告及勞工健康服務之建議。';
    if(key === 'check_env') return '辨識與評估工作場所環境、作業及組織內部影響勞工身心健康之危害因子，提出改善與建議。';
    if(key === 'check_env_impr') return '提出作業環境安全衛生設施改善規劃之建議。';
    if(key === 'check_survey') return '調查勞工健康情形與作業之關連性，並採取必要之預防及健康促進措施。';
    if(key === 'check_return') return '提供復工勞工之職能評估、職務再設計或調整之諮詢及建議。';
    if(key === 'check_other') return '其他經中央主管機關指定公告者。';
    return '';
  };

  const totalLabor = (parseInt(selectedLog.admin_male)||0) + (parseInt(selectedLog.admin_female)||0) + (parseInt(selectedLog.field_male)||0) + (parseInt(selectedLog.field_female)||0);
  
  return (
    <div className="relative">
      <div className="mb-4 flex items-center justify-between print:hidden bg-gray-100 p-3 rounded">
        <div className="flex space-x-2">
          <button onClick={() => setSelectedLog(null)} className="px-4 py-2 bg-gray-200 rounded text-gray-700">返回</button>
          <button onClick={() => window.print()} className="px-4 py-2 bg-teal-600 text-white rounded flex items-center"><Printer className="mr-2" size={18} /> 列印 PDF</button>
        </div>
      </div>

      <div className="bg-white w-[210mm] mx-auto p-[15mm] shadow-lg print:shadow-none print:w-full print:m-0 print:p-0 text-black text-sm leading-tight font-serif">
        <h1 className="text-center text-xl font-bold mb-4">{selectedLog.clientName} / 附表八 勞工健康服務執行紀錄表</h1>
        
        <div className="mb-4">
           <h3 className="font-bold mb-1">一、作業場所基本資料</h3>
           <table className="w-full border-collapse border border-black">
             <tbody>
               <tr>
                 <td className="border border-black p-1 w-20">企業名稱</td><td className="border border-black p-1">{selectedLog.clientName}</td>
                 <td className="border border-black p-1 w-20">執行日期</td><td className="border border-black p-1">{selectedLog.date}</td>
               </tr>
               <tr>
                 <td className="border border-black p-1">部門名稱</td><td className="border border-black p-1">{selectedLog.dept_name}</td>
                 <td className="border border-black p-1">臨場地址</td><td className="border border-black p-1">{selectedLog.address}</td>
               </tr>
               <tr>
                 <td className="border border-black p-1" colSpan="4">
                   行政人員: 男 {selectedLog.admin_male} 人; 女 {selectedLog.admin_female} 人; &nbsp;&nbsp;
                   作業人員(現場操作): 男 {selectedLog.field_male} 人; 女 {selectedLog.field_female} 人<br/>
                   <strong>勞工總人數: {totalLabor} 人</strong>; &nbsp;&nbsp;
                   一般作業: {selectedLog.work_general_count} 人; <br/>
                   特別危害健康作業: 
                   {selectedLog.special_hazards && selectedLog.special_hazards.length > 0 
                     ? selectedLog.special_hazards.map(h => `${h.category}(${h.count}人)`).join('、')
                     : ' 無'}
                 </td>
               </tr>
             </tbody>
           </table>
        </div>

        <div className="mb-4">
           <h3 className="font-bold mb-1">二、作業場所與勞動條件概況</h3>
           <div className="border border-black p-2 mb-2">工作流程(製程): {selectedLog.process} <br/>工作型態與時間: {selectedLog.work_type_time}</div>
           <table className="w-full border-collapse border border-black text-center">
             <thead><tr className="bg-gray-100"><th className="border border-black p-1">工作類型</th><th className="border border-black p-1">職務</th><th className="border border-black p-1">初步危害辨識表</th></tr></thead>
             <tbody>
               {selectedLog.hazards && selectedLog.hazards.length > 0 ? selectedLog.hazards.map((h, i) => (
                 <tr key={i}><td className="border border-black p-1">{h.type}</td><td className="border border-black p-1">{h.job}</td><td className="border border-black p-1">{h.desc}</td></tr>
               )) : <tr><td colSpan="3" className="border border-black p-1 h-8"></td></tr>}
             </tbody>
           </table>
        </div>

        <div className="mb-4">
           <h3 className="font-bold mb-1">三、臨場健康服務執行情形 (本規則第九條至第十三條事項)</h3>
           <div className="border border-black p-2">
             <div className="mb-2 font-bold">（一）辦理事項</div>
             <ul className="list-none space-y-1">
               {['check_health','check_job','check_track','check_high_risk','check_research','check_edu','check_emerg','check_report','check_env','check_env_impr','check_survey','check_return','check_other'].map(key => (
                 <div key={key}>
                   <li className="flex"><span className="w-6">{selectedLog[key]?'☑':'☐'}</span> {getItemLabel(key)}</li>
                   {key === 'check_other' && (
                     <div className="pl-6 grid grid-cols-2 gap-1 text-xs">
                       <span>{selectedLog.plan_ergo?'☑':'☐'} 人因性危害預防計劃</span>
                       <span>{selectedLog.plan_overwork?'☑':'☐'} 異常工作負荷促發疾病預防計劃</span>
                       <span>{selectedLog.plan_maternal?'☑':'☐'} 工作場所母性健康保護計劃</span>
                       <span>{selectedLog.plan_violence?'☑':'☐'} 執行職務遭受不法侵害預防計劃</span>
                       <span>{selectedLog.plan_age?'☑':'☐'} 中高齡及高齡工作者工作適能評估</span>
                       <span>{selectedLog.plan_hearing?'☑':'☐'} 聽力保護計劃</span>
                       <span>{selectedLog.plan_breath?'☑':'☐'} 呼吸防護計劃</span>
                       <span>{selectedLog.plan_epidemic?'☑':'☐'} 防疫措施之策劃及實施</span>
                       <span className="col-span-2">{selectedLog.plan_other_central?'☑':'☐'} 其他中央主管機關指定事項：<u>{selectedLog.other_central_note}</u></span>
                     </div>
                   )}
                 </div>
               ))}
             </ul>
             <div className="mt-4 pt-2 border-t border-dashed">
                <div className="font-bold mb-1">（二）發現問題 (請對應辦理事項描述)</div>
                <div className="whitespace-pre-wrap min-h-[40px] text-sm">{selectedLog.section3_findings}</div>
             </div>
           </div>
        </div>

        <div className="mb-4">
           <table className="w-full border-collapse border border-black text-sm">
             <thead><tr><th className="border border-black p-1 w-1/3">四、建議採行措施 (對應執行情形)</th><th className="border border-black p-1 w-2/3">執行紀錄內容</th></tr></thead>
             <tbody>
               {Object.keys(selectedLog.suggestions_map || {}).length > 0 ? (
                 Object.entries(selectedLog.suggestions_map).map(([key, text]) => {
                   const label = getItemLabel(key).split('，')[0]; 
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

        {/* --- [Modified] Section 5: Tracking - Conditional Rendering --- */}
        <div className="mb-4 page-break-inside-avoid">
           <h3 className="font-bold mb-1">五、對於前次建議改善事項之追蹤辦理情形</h3>
           <div className="border border-black p-2 mb-2 text-xs">(1) 前次追蹤: {selectedLog.prev_tracking || '無'}</div>
           
           {selectedLog.show_tracking_2 && (
             <div className="mb-2">
               <div className="text-xs font-bold">(2) 健康檢查結果分析之異常追蹤 (年份: {selectedLog.exam_year})</div>
               <table className="w-full border-collapse border border-black text-center text-xs">
                  <thead><tr><th className="border border-black">分級</th><th className="border border-black">已面談/發送關懷單</th><th className="border border-black">未面談</th><th className="border border-black">結案</th><th className="border border-black">追蹤中</th></tr></thead>
                  <tbody>
                    <tr><td>第四級</td><td className="border border-black">{selectedLog.level4_interview}</td><td className="border border-black">{selectedLog.level4_not}</td><td className="border border-black">{selectedLog.level4_close}</td><td className="border border-black">{selectedLog.level4_track}</td></tr>
                    <tr><td>第三級</td><td className="border border-black">{selectedLog.level3_interview}</td><td className="border border-black">{selectedLog.level3_not}</td><td className="border border-black">{selectedLog.level3_close}</td><td className="border border-black">{selectedLog.level3_track}</td></tr>
                    {selectedLog.showLevel2 && (
                      <tr><td>第二級</td><td className="border border-black">{selectedLog.level2_interview}</td><td className="border border-black">{selectedLog.level2_not}</td><td className="border border-black">{selectedLog.level2_close}</td><td className="border border-black">{selectedLog.level2_track}</td></tr>
                    )}
                  </tbody>
               </table>
             </div>
           )}

           {selectedLog.show_tracking_3 && (
             <div className="mt-2 text-xs">
                <div className="font-bold mb-1">(3) 勞工健康保護計畫執行進度 (年度: {selectedLog.exam_year})</div>
                <div className="border border-black text-xs mb-2 break-inside-avoid">
                   <div className="bg-gray-100 font-bold p-1 border-b border-black">異常工作負荷 / 人因 / 不法侵害</div>
                   <div className="p-1 border-b border-black">
                      [過負荷] 問卷回收: {selectedLog.overwork_survey_done}/{selectedLog.overwork_survey_total}, 高風險: {selectedLog.overwork_risk_count}, 面談: {selectedLog.overwork_int_done}
                   </div>
                   <div className="p-1 border-b border-black">
                      [人因] 問卷回收: {selectedLog.ergo_survey_done}/{selectedLog.ergo_survey_total}, 疑似危害: {selectedLog.ergo_risk_count}
                   </div>
                   <div className="p-1">
                      [不法侵害] 聲明: {selectedLog.violence_statement?'已完成':'未完成'}, 評估: {selectedLog.violence_assess_done}/{selectedLog.violence_assess_target}
                   </div>
                </div>
             </div>
           )}

           {selectedLog.show_tracking_4 && (
             <div className="mt-2 border border-black text-xs mb-2 break-inside-avoid">
                 <div className="bg-gray-100 font-bold p-1 border-b border-black">(4) 母性健康保護</div>
                 <div className="p-1 border-b border-black">
                    <strong>危害評估：</strong> {selectedLog.maternal_hazard_check ? '已完成' : '未完成'}
                 </div>
                 <div className="p-1">
                    妊娠中: {selectedLog.mat_pregnant}, 分娩後: {selectedLog.mat_postpartum}, 哺乳中: {selectedLog.mat_breastfeeding} | 醫師面談: {selectedLog.mat_doc_done}, 護理指導: {selectedLog.mat_nurse_done}
                 </div>
             </div>
           )}

           {selectedLog.show_tracking_5 && (
              <div className="mt-2 border border-black text-xs break-inside-avoid">
                 <div className="bg-gray-100 font-bold p-1 border-b border-black">(5) 職業傷病追蹤（包含上下班途中交通事故）</div>
                 <div className="p-1">
                    通報: {selectedLog.injury_report_count} 人, 未結案: {selectedLog.injury_unclosed} 人, 結案: {selectedLog.injury_closed} 人 | 備註: {selectedLog.injury_note}
                 </div>
              </div>
           )}
        </div>

        {selectedLog.attachments && selectedLog.attachments.length > 0 && (
          <div className="mb-4 page-break-before-always">
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

        {/* --- [Modified] Section 6: Signatures (Split Layout) --- */}
        <div className="mt-4 break-inside-avoid">
           <h3 className="font-bold mb-1">六、執行人員及日期（僅就當次實際執行者簽章）</h3>
           <div className="border border-black">
              <div className="flex border-b border-black">
                 {/* Left: Onsite */}
                 <div className="w-1/2 border-r border-black p-2">
                    <div className="text-center font-bold text-xs mb-2 bg-gray-100 rounded">臨場服務人員 (甲方)</div>
                    <div className="space-y-6 px-4">
                      {selectedLog.signatures?.onsite?.map((sig, i) => (
                        <div key={i} className="flex flex-col items-center">
                           <span className="text-xs text-gray-500 mb-6">{sig.title}</span>
                           <div className="font-script text-xl border-b border-gray-300 w-full text-center pb-1 min-h-[30px]">
                             {sig.name}
                           </div>
                        </div>
                      ))}
                    </div>
                 </div>
                 {/* Right: Client */}
                 <div className="w-1/2 p-2">
                    <div className="text-center font-bold text-xs mb-2 bg-gray-100 rounded">事業單位人員 (乙方)</div>
                    <div className="space-y-6 px-4">
                      {selectedLog.signatures?.client?.map((sig, i) => (
                        <div key={i} className="flex flex-col items-center">
                           <span className="text-xs text-gray-500 mb-6">{sig.title}</span>
                           <div className="font-script text-xl border-b border-gray-300 w-full text-center pb-1 min-h-[30px]">
                             {sig.name}
                           </div>
                        </div>
                      ))}
                    </div>
                 </div>
              </div>
              <div className="p-2 text-center text-sm font-bold bg-gray-50">
                 執行日期: {selectedLog.date} &nbsp;&nbsp;&nbsp;&nbsp; 
                 時間: {selectedLog.startTime} 至 {selectedLog.endTime} (共 {selectedLog.hours} 小時)
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

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

export default function AnzeApp() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userRole, setUserRole] = useState(null); 
  const [staff, setStaff] = useState([]);
  const [clients, setClients] = useState([]);
  const [logs, setLogs] = useState([]);
  const [userProfile, setUserProfile] = useState({});

  useEffect(() => {
    // 監聽登入狀態
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
    });
    
    // 初始化匿名登入
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("登入失敗:", error);
      }
    };
    
    initAuth();
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubStaff = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'staff'), (snap) => setStaff(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubClients = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'clients'), (snap) => setClients(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'serviceLogs'), orderBy('date', 'desc'));
    const unsubLogs = onSnapshot(q, (snap) => setLogs(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubProfile = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', 'user_profile_default'), (doc) => { if (doc.exists()) setUserProfile(doc.data()); });
    return () => { unsubStaff(); unsubClients(); unsubLogs(); unsubProfile(); };
  }, [user]);

  const addStaff = async (data) => await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'staff'), data);
  const deleteStaff = async (id) => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'staff', id));
  const addClient = async (data) => await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'clients'), data);
  const deleteClient = async (id) => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clients', id));
  const addLog = async (data) => { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'serviceLogs'), data); setActiveTab('reports'); };
  const deleteLog = async (id) => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'serviceLogs', id));
  const saveProfile = async (data) => await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', 'user_profile_default'), data);

  if (!user) return <div className="flex items-center justify-center h-screen text-gray-500">系統載入中...</div>;
  if (!userRole) return <LoginScreen onSelectRole={(role) => { setUserRole(role); setActiveTab('dashboard'); }} />;

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
      <div className="w-64 bg-white border-r border-gray-200 p-4 hidden md:flex flex-col shadow-sm print:hidden">
        <div className="mb-8 px-2 flex items-center text-teal-700"><Activity size={28} className="mr-2" /><h1 className="text-xl font-extrabold tracking-tight">Anze Care</h1></div>
        <div className="mb-6 px-4 py-2 bg-gray-100 rounded-lg text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center">{userRole === 'individual' ? <UserCircle size={14} className="mr-2"/> : <Briefcase size={14} className="mr-2"/>}{userRole === 'individual' ? '獨立護理師版' : '企業管理版'}</div>
        <nav className="space-y-1 flex-1">
          <SidebarItem icon={Activity} label="儀表板" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          {userRole === 'agency' && <SidebarItem icon={Users} label="團隊人員管理" active={activeTab === 'staff'} onClick={() => setActiveTab('staff')} />}
          <SidebarItem icon={Building} label={userRole === 'agency' ? "客戶與頻率" : "我的客戶"} active={activeTab === 'clients'} onClick={() => setActiveTab('clients')} />
          <SidebarItem icon={CheckSquare} label="服務打卡/紀錄" active={activeTab === 'service'} onClick={() => setActiveTab('service')} />
          <SidebarItem icon={FileText} label="報表中心" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
          {userRole === 'individual' && <SidebarItem icon={Settings} label="個人執業設定" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />}
        </nav>
        <button onClick={() => setUserRole(null)} className="mt-auto flex items-center px-4 py-2 text-gray-400 hover:text-gray-600"><LogOut size={16} className="mr-2" /> 登出 / 切換身分</button>
      </div>
      <div className="flex-1 p-4 md:p-8 overflow-y-auto print:p-0">
        <div className="md:hidden mb-6 flex justify-between items-center print:hidden"><span className="font-bold text-lg text-teal-800">Anze Care</span><div className="flex space-x-2"><button onClick={() => setActiveTab('service')} className="p-2 bg-teal-100 rounded text-teal-800"><CheckSquare size={20}/></button><button onClick={() => setActiveTab('reports')} className="p-2 bg-gray-100 rounded text-gray-800"><FileText size={20}/></button></div></div>
        {activeTab === 'dashboard' && <Dashboard logs={logs} clients={clients} staff={staff} userRole={userRole} userProfile={userProfile} setActiveTab={setActiveTab} />}
        {activeTab === 'staff' && userRole === 'agency' && <StaffManager staff={staff} onAdd={addStaff} onDelete={deleteStaff} />}
        {activeTab === 'clients' && <ClientManager clients={clients} onAdd={addClient} onDelete={deleteClient} role={userRole} />}
        {activeTab === 'service' && <ServiceLogger staff={staff} clients={clients} onAddLog={addLog} role={userRole} userProfile={userProfile} />}
        {activeTab === 'reports' && <ReportView logs={logs} onDelete={deleteLog} />}
        {activeTab === 'profile' && userRole === 'individual' && <UserProfile profile={userProfile} onSave={saveProfile} />}
      </div>
    </div>
  );
}