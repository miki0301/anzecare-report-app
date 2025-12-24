import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Building, Calendar, FileText, Plus, 
  Trash2, Save, Printer, ChevronRight, CheckSquare,
  Clock, DollarSign, Activity, AlertTriangle, UserCircle,
  Briefcase, Settings, LogOut, Search, X, ChevronDown, ChevronLeft, Edit3, Eye, EyeOff, Upload, Image as ImageIcon, BookOpen, Database, Download, FilePlus
} from 'lucide-react';

// --- Firebase Imports ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken,
  signOut
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  setDoc,
  getDoc 
} from 'firebase/firestore';

// --- Firebase Configuration ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'anze-care-default';

// --- Knowledge Tree Data (Initial Seed) ---
const INITIAL_KNOWLEDGE_BASE = [
  // 1. 個人健康管理 (ICM)
  { code: 'ICM-01', category: '個人健康管理', sub: '血壓異常', key: '高血壓、未服藥', so: '檢視年度體檢報告，收縮壓>140mmHg/舒張壓>90mmHg，員工自述近期未服用高血壓藥物且作息不正常。', ap: '1. 衛教高血壓飲食控制(低鹽)及規律測量血壓。\n2. 建議至心臟內科或家醫科門診追蹤，並回報複診結果。' },
  { code: 'ICM-02', category: '個人健康管理', sub: '血壓異常', key: '高血壓、服藥中', so: '追蹤血壓異常個案，現場量測血壓為 135/85 mmHg，員工表示有規律至診所拿藥控制。', ap: '1. 鼓勵持續用藥控制。\n2. 提醒定期監測血壓並記錄，納入年度健康管理追蹤。' },
  { code: 'ICM-03', category: '個人健康管理', sub: '血糖異常', key: '糖尿病、HbA1c', so: '健檢報告顯示空腹血糖 >126 mg/dL 且糖化血色素(HbA1c) >6.5%，員工主訴近期容易口渴、多尿。', ap: '1. 衛教糖尿病飲食原則(低GI飲食)及運動重要性。\n2. 開立轉診單，建議至新陳代謝科進一步檢查。' },
  { code: 'ICM-04', category: '個人健康管理', sub: '血脂異常', key: '膽固醇、TG', so: '總膽固醇 >240 mg/dL 或三酸甘油脂 >200 mg/dL，員工表示飲食多外食且缺乏運動。', ap: '1. 指導低脂高纖飲食，減少油炸物攝取。\n2. 建議增加每週有氧運動頻率至少3次。' },
  { code: 'ICM-05', category: '個人健康管理', sub: '肝功能', key: 'GPT上升、脂肪肝', so: '複查健檢報告，肝指數(GPT)較去年上升，腹部超音波顯示輕度脂肪肝。', ap: '1. 衛教體重控制與避免飲酒。\n2. 建議三個月後至肝膽腸胃科追蹤肝功能指數。' },
  { code: 'ICM-06', category: '個人健康管理', sub: '聽力異常', key: '噪音、聽力損失', so: '聽力檢查結果顯示左耳高頻聽力損失(4k dip)，員工自述工作區噪音較大。', ap: '1. 指導正確配戴聽力防護具(耳塞/耳罩)。\n2. 建議工作時務必全程配戴，並安排複檢。' },
  { code: 'ICM-07', category: '個人健康管理', sub: '過負荷', key: '加班、工時長', so: '評估過勞量表，員工近一個月加班時數超過 46 小時，自訴疲憊感明顯。', ap: '1. 建議調整輪班作息，避免連續夜班。\n2. 安排醫師面談進行適性評估。' },
  { code: 'ICM-08', category: '個人健康管理', sub: '人因危害', key: '肌肉痠痛、姿勢', so: 'NMQ 問卷篩選：肩頸/下背部疼痛指數大於 6 分。觀察作業姿勢發現長期腕部懸空操作滑鼠。', ap: '1. 建議使用護腕或調整座椅高度。\n2. 現場指導肩頸伸展運動，每小時休息 5 分鐘。' },
  { code: 'ICM-09', category: '個人健康管理', sub: '母性保護', key: '懷孕、妊娠', so: '懷孕週數確認(目前X週)，評估目前作業環境(無游離輻射/化學暴露)。', ap: '1. 與主管溝通，建議妊娠期間避免夜間工作。\n2. 指導哺集乳室位置及相關權益申請。' },

  // 2. 工作環境現場訪視 (WT)
  { code: 'WT-01', category: '工作環境', sub: '物理性', key: '噪音、防護具', so: '巡視沖壓區，現場噪音明顯，抽查員工耳塞配戴確實度，發現部分人員未配戴。', ap: '1. 現場立即指導並要求配戴。\n2. 建議現場主管加強督導。' },
  { code: 'WT-02', category: '工作環境', sub: '物理性', key: '照明、昏暗', so: '巡視包裝區，作業區照明目視覺得昏暗，可能影響視力。', ap: '1. 建議請廠務進行照度量測。\n2. 評估是否需增加局部照明燈具。' },
  { code: 'WT-03', category: '工作環境', sub: '化學性', key: '異味、標示', so: '現場有明顯有機溶劑氣味，檢視抽氣設備運轉中，發現分裝瓶未張貼危害標示(GHS)。', ap: '1. 已告知現場主管立即張貼標示。\n2. 檢視局部排氣裝置是否正常運轉。' },
  { code: 'WT-04', category: '工作環境', sub: '設施', key: '急救箱、AED', so: '急救箱內容物盤點，發現優碘/食鹽水已過期。AED 指示燈號正常。', ap: '1. 請總務單位盡速補充急救耗材。\n2. 持續定期每月點檢。' },
  { code: 'WT-05', category: '工作環境', sub: '設施', key: '飲用水、中暑', so: '高溫作業場所巡視，確認飲用水供應充足，並有設置陰涼休息區。', ap: '1. 提醒員工多喝水，若有頭暈不適應立即休息。' },

  // 3. 健康教育與促進 (HEP)
  { code: 'HEP-01', category: '健康教育', sub: '講座', key: '心理健康、舒壓', so: '舉辦年度心理健康講座，主題：「職場壓力調適與正念減壓」，邀請諮商心理師蒞臨演講，共計 45 位員工參與。', ap: '1. 回收課程滿意度問卷，平均滿意度為 4.6 分(滿分5分)。\n2. 員工回饋希冀增加「情緒管理」相關課程。' },
  { code: 'HEP-02', category: '健康教育', sub: '講座', key: '三高、心血管', so: '辦理「預防三高與健康飲食」講座，針對健檢紅字同仁優先報名，現場提供血壓量測服務與健康餐盒。', ap: '1. 參與人數 30 人，現場篩檢發現 2 位血壓異常，已個別衛教。\n2. 鼓勵參與者加入公司減重社團持續追蹤。' },
  { code: 'HEP-03', category: '健康教育', sub: '衛教', key: '流感、電子報', so: '季節性流感高峰期，發送全員衛教電子郵件，主題：「流感 vs 感冒差別在哪？疫苗施打資訊報你知」。', ap: '1. 郵件包含鄰近公費/自費疫苗施打院所清單。\n2. 提醒同仁若有發燒症狀應配戴口罩並在家休養。' },
  { code: 'HEP-04', category: '健康教育', sub: '衛教', key: '中暑、熱危害', so: '針對戶外作業與高溫場所人員，發送防中暑衛教簡訊/LINE訊息，提醒「多喝水、休息、躲太陽」。', ap: '1. 附上尿液顏色判斷水分攝取檢核表圖檔。\n2. 提醒若有頭暈噁心症狀應立即通報並移至陰涼處。' },

  // 4. 行政與其他 (ADM)
  { code: 'ADM-01', category: '行政其他', sub: '選配工', key: '復工、適性', so: '醫師建議復工，但需限制搬運重量 < 10kg。依據體格檢查結果，評估該員適合從事一般作業。', ap: '1. 發出適性配工建議書給人資與主管。\n2. 預計一個月後追蹤適應情形。' },
  { code: 'ADM-02', category: '行政其他', sub: '會議', key: '職安會議', so: '出席季職安衛委員會，報告本季健檢異常追蹤成效與四大計畫執行進度。', ap: '1. 會議決議：下季將加強噪音作業人員聽力防護教育。' },
  { code: 'ADM-03', category: '行政其他', sub: '計畫', key: '計畫書修訂', so: '修訂「職場不法侵害預防計畫」內容，更新申訴管道與處理流程圖。', ap: '1. 將更新後的計畫書公告於公司內部網站。\n2. 安排主管教育訓練說明新版流程。' },
];

// --- Utils & Logic ---

const INDUSTRY_DATA = {
  cat1: [
    "礦業及土石採取業", "製造業-紡織業", "製造業-木竹製品及非金屬家具", "製造業-造紙、紙製品",
    "製造業-化學材料", "製造業-化學品", "製造業-石油及煤製品", "製造業-橡膠製品",
    "製造業-塑膠製品", "製造業-水泥及水泥製品", "製造業-金屬基本工業", "製造業-金屬製品",
    "製造業-機械設備製造修配", "製造業-電力機械器材", "製造業-運輸工具", "製造業-電子/電池",
    "製造業-食品", "製造業-飲料及菸草", "製造業-皮革毛皮", "製造業-電腦光學", "製造業-電子零組件",
    "製造業-其他非金屬", "營造業", "水電燃氣業", "運輸倉儲通信業", "機械設備租賃", "環境衛生服務",
    "洗染業", "批發零售(建材/燃料)", "其他服務(清潔/病媒)", "公共行政(營造/廢棄物)", "國防生產", "指定事業"
  ],
  cat2: [
    "農林漁牧", "鹽業", "製造業-陶瓷", "製造業-玻璃", "製造業-精密器械", "製造業-雜項",
    "製造業-成衣", "製造業-印刷出版", "製造業-藥品", "製造業-其他", "自來水供應",
    "電信郵政", "餐旅業", "機械租賃(事務/其他)", "醫療保健", "修理服務", "批發零售(家電/機械/綜合)",
    "不動產", "化學原料輸入輸出", "運輸工具租賃", "專業科學(建築/廣告/檢測)", "保全/汽車美容/浴室",
    "停車場", "學術研究/實驗室", "公共行政(工程)", "工程顧問(非破壞)", "零售化學(裝卸)",
    "批發零售(堆高機/冷凍)", "休閒服務", "動物園", "國防(醫院/研究)", "零售燃料/化學", "大專校院工程"
  ],
  cat3: [
    "其他 (上述指定以外之事業，如一般辦公室、金融業等)"
  ]
};

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

const SmartFillInput = ({ knowledgeBase, onSelect }) => {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  const results = knowledgeBase.filter(k => 
    k.code.toLowerCase().includes(query.toLowerCase()) || 
    k.key.includes(query) ||
    k.sub.includes(query)
  );

  return (
    <div className="relative mb-2">
       <div className="flex items-center border rounded p-2 bg-indigo-50 focus-within:ring-2 focus-within:ring-indigo-300">
          <Search size={16} className="text-indigo-500 mr-2"/>
          <input 
            className="bg-transparent outline-none w-full text-sm"
            placeholder="搜尋知識樹代碼或關鍵字 (例: ICM-01, 高血壓, 噪音...)"
            value={query}
            onChange={e => { setQuery(e.target.value); setShowResults(true); }}
            onFocus={() => setShowResults(true)}
          />
          {query && <button onClick={()=>{setQuery(''); setShowResults(false)}}><X size={14}/></button>}
       </div>
       {showResults && query && results.length > 0 && (
         <div className="absolute z-10 w-full bg-white border shadow-xl max-h-60 overflow-y-auto rounded-b-lg mt-1">
           {results.map(k => (
             <div 
               key={k.code} 
               className="p-3 hover:bg-indigo-50 cursor-pointer border-b last:border-0"
               onClick={() => {
                  onSelect(k);
                  setQuery('');
                  setShowResults(false);
               }}
             >
               <div className="flex justify-between font-bold text-xs text-indigo-700">
                 <span>{k.code}</span>
                 <span>{k.category} - {k.sub}</span>
               </div>
               <div className="text-sm font-bold text-gray-800">{k.key}</div>
               <div className="text-xs text-gray-500 truncate">{k.so}</div>
             </div>
           ))}
         </div>
       )}
    </div>
  );
};

const KnowledgeManager = ({ knowledgeBase, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [items, setItems] = useState(knowledgeBase);
  const [newItem, setNewItem] = useState({ code: '', category: '個人健康管理', sub: '', key: '', so: '', ap: '' });
  const [importText, setImportText] = useState(''); // Textarea for CSV paste
  const [showImport, setShowImport] = useState(false); // Toggle import modal

  const handleAdd = () => {
    if(!newItem.code || !newItem.key) return alert('代碼與關鍵字為必填');
    const updated = [...items, newItem];
    setItems(updated);
    onUpdate(updated);
    setNewItem({ code: '', category: '個人健康管理', sub: '', key: '', so: '', ap: '' });
  };

  const handleDelete = (code) => {
    const updated = items.filter(i => i.code !== code);
    setItems(updated);
    onUpdate(updated);
  };

  // --- Bulk Import Logic ---
  const handleBulkImport = () => {
    if (!importText) return;
    
    const lines = importText.split('\n');
    const newItems = [];
    
    // Simple CSV parser: Code, Category, Sub, Key, SO, AP
    // Assumes header is NOT present or user knows to paste data only
    // Format: Code,Category,Sub,Key,SO,AP (comma separated)
    
    lines.forEach(line => {
      const parts = line.split(',');
      if (parts.length >= 6) {
        newItems.push({
          code: parts[0].trim(),
          category: parts[1].trim(),
          sub: parts[2].trim(),
          key: parts[3].trim(),
          so: parts[4].trim(),
          ap: parts.slice(5).join(',').trim() // Join rest in case AP has commas
        });
      }
    });

    if (newItems.length > 0) {
      if (confirm(`即將匯入 ${newItems.length} 筆資料，確定嗎？`)) {
        const updated = [...items, ...newItems];
        setItems(updated);
        onUpdate(updated);
        setImportText('');
        setShowImport(false);
      }
    } else {
      alert('無法解析資料，請確認格式：代碼,分類,次分類,關鍵字,S/O,A/P');
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
       <div className="flex justify-between items-center mb-4">
         <h2 className="text-xl font-bold flex items-center text-gray-800"><Database className="mr-2"/> 標準用語知識樹管理</h2>
         <div className="space-x-2">
            <button onClick={()=>setShowImport(!showImport)} className="text-sm bg-teal-100 text-teal-700 px-3 py-1 rounded hover:bg-teal-200 flex items-center inline-flex">
               <FilePlus size={14} className="mr-1"/> 批次匯入
            </button>
            <button onClick={()=>setIsEditing(!isEditing)} className="text-sm bg-gray-100 px-3 py-1 rounded hover:bg-gray-200">
               {isEditing ? '結束編輯' : '編輯模式'}
            </button>
         </div>
       </div>
       
       {/* Import Area */}
       {showImport && (
         <div className="bg-teal-50 p-4 rounded mb-4 border border-teal-200">
            <h4 className="font-bold text-teal-800 mb-2">批次資料匯入 (CSV 格式)</h4>
            <p className="text-xs text-gray-500 mb-2">格式範例: <code>ICM-99,個人健康管理,測試,測試關鍵字,這是S/O內容,這是A/P內容</code></p>
            <textarea 
              className="w-full p-2 border rounded text-xs h-32 font-mono" 
              placeholder="請在此貼上 CSV 資料..."
              value={importText}
              onChange={e=>setImportText(e.target.value)}
            />
            <div className="flex justify-end mt-2">
              <button onClick={handleBulkImport} className="bg-teal-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-teal-700">確認匯入</button>
            </div>
         </div>
       )}

       {isEditing && (
         <div className="bg-indigo-50 p-4 rounded mb-4 grid grid-cols-2 gap-2">
            <input className="p-2 border rounded" placeholder="代碼 (例: ICM-99)" value={newItem.code} onChange={e=>setNewItem({...newItem, code:e.target.value})}/>
            <select className="p-2 border rounded" value={newItem.category} onChange={e=>setNewItem({...newItem, category:e.target.value})}>
              <option>個人健康管理</option><option>工作環境</option><option>健康教育</option><option>行政其他</option>
            </select>
            <input className="p-2 border rounded" placeholder="次分類 (例: 三高)" value={newItem.sub} onChange={e=>setNewItem({...newItem, sub:e.target.value})}/>
            <input className="p-2 border rounded" placeholder="情境關鍵字 (例: 血脂異常)" value={newItem.key} onChange={e=>setNewItem({...newItem, key:e.target.value})}/>
            <textarea className="p-2 border rounded col-span-2" placeholder="服務內容 (S/O)" rows="2" value={newItem.so} onChange={e=>setNewItem({...newItem, so:e.target.value})}/>
            <textarea className="p-2 border rounded col-span-2" placeholder="結果與建議 (A/P)" rows="2" value={newItem.ap} onChange={e=>setNewItem({...newItem, ap:e.target.value})}/>
            <button onClick={handleAdd} className="col-span-2 bg-indigo-600 text-white p-2 rounded font-bold">新增單筆詞條</button>
         </div>
       )}

       <div className="overflow-x-auto">
         <table className="w-full text-sm text-left">
           <thead className="bg-gray-50 border-b">
             <tr><th>代碼</th><th>分類</th><th>關鍵字</th><th>S/O 內容</th><th>操作</th></tr>
           </thead>
           <tbody>
             {items.map(i => (
               <tr key={i.code} className="border-b hover:bg-gray-50">
                 <td className="p-2 font-mono font-bold text-indigo-700">{i.code}</td>
                 <td className="p-2">{i.category}-{i.sub}</td>
                 <td className="p-2 font-bold">{i.key}</td>
                 <td className="p-2 truncate max-w-xs">{i.so}</td>
                 <td className="p-2">
                   {isEditing && <button onClick={()=>handleDelete(i.code)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button>}
                 </td>
               </tr>
             ))}
           </tbody>
         </table>
       </div>
    </div>
  );
};

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
              <span className="font-bold"><Edit3 size={14} className="inline mr-1"/> 啟用手動自訂 (優於法規)</span>
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

const ServiceLogger = ({ staff, clients, onAddLog, role, userProfile, knowledgeBase }) => {
  const [log, setLog] = useState({
    clientId: '',
    serviceMode: 'nurse_only',
    nurseId: '', doctorId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '14:00', endTime: '17:00',
    dept_name: '', address: '',
    admin_male: 0, admin_female: 0,
    field_male: 0, field_female: 0,
    work_general_count: 0,
    special_hazards: [], 
    process: '', work_type_time: '',
    hazards: [],
    check_health: false, check_job: false, check_track: false,
    check_high_risk: false, check_research: false, check_edu: false,
    check_emerg: false, check_report: false, check_env: false,
    check_env_impr: false, check_survey: false, check_return: false,
    check_other: false,
    job_sel_count: 0, tracking_count: 0, high_risk_count: 0, emergency_count: 0, other_note: '',
    plan_ergo: false, plan_overwork: false, plan_maternal: false,
    plan_violence: false, plan_age: false, plan_hearing: false,
    plan_breath: false, plan_epidemic: false, plan_other_central: false,
    other_central_note: '',
    section3_findings: '',
    suggestions_map: {}, 
    prev_tracking: '', exam_year: new Date().getFullYear(),
    level4_interview: 0, level4_not: 0, level4_close: 0, level4_track: 0,
    level3_interview: 0, level3_not: 0, level3_close: 0, level3_track: 0,
    level2_interview: 0, level2_not: 0, level2_close: 0, level2_track: 0,
    showLevel2: true, 
    
    // Section 5 Visibility Toggles
    show_track_health: false, // Default unchecked
    show_track_plan: false, // Default unchecked
    show_track_maternal: false, // Default unchecked
    show_track_injury: false, // Default unchecked

    overwork_survey_total: 0, overwork_survey_done: 0, overwork_survey_not: 0,
    overwork_risk_count: 0, overwork_int_need: '', overwork_int_done: 0, overwork_int_not: 0,
    ergo_survey_total: 0, ergo_survey_done: 0, ergo_survey_not: 0,
    ergo_risk_count: '', ergo_int_done: 0, ergo_int_not: 0,
    violence_statement: false, 
    violence_assess_target: '', violence_assess_done: 0, violence_assess_not: 0,
    violence_config: false, 
    violence_adjust: false, 
    maternal_hazard_check: false, 
    mat_female_total: 0, mat_repro_age: 0, mat_pregnant: 0, mat_postpartum: 0, mat_breastfeeding: 0,
    mat_doc_interview: 0, mat_doc_done: 0, mat_doc_not: 0,
    mat_track: 0, mat_medical: 0,
    mat_nurse_guidance: 0, mat_nurse_done: 0, mat_nurse_not: 0,
    mat_referral: 0, mat_regular_track: 0,
    injury_report_count: 0, injury_unclosed: 0, injury_closed: 0, injury_note: '',
    attachments: [],
    
    // Signature Configs
    signatures: {
      onsite: [
        { id: 'doc', title: '勞工健康服務醫師', name: '' },
        { id: 'nurse', title: '勞工健康服務護理人員', name: userProfile?.name || '', required: true },
        { id: 'related', title: '勞工健康服務之相關人員', name: '' }
      ],
      client: [
        { id: 'osh', title: '職業安全衛生管理人員', name: '' },
        { id: 'hr', title: '人力資源管理人員', name: '' },
        { id: 'mgr', title: '部門主管', name: '' }
      ]
    }
  });

  const [newHazard, setNewHazard] = useState({ type: '', job: '', desc: '' });
  const [newSpecial, setNewSpecial] = useState({ category: '', count: 0 });
  const [newClientSig, setNewClientSig] = useState({ title: '', name: '' });
  const fileInputRef = useRef(null);

  const nurses = staff.filter(s => s.role.includes('護理') || s.role === '勞工健康服務護理師');
  const doctors = staff.filter(s => s.role.includes('醫師'));

  useEffect(() => { if (role === 'individual') setLog(prev => ({ ...prev, serviceMode: 'nurse_only', nurseId: 'self' })); }, [role]);
  
  // Initialize Agency PM
  useEffect(() => {
    if (role === 'agency') {
      setLog(prev => {
        if (prev.signatures.onsite.find(s => s.id === 'pm')) return prev;
        return {
          ...prev,
          signatures: {
            ...prev.signatures,
            onsite: [...prev.signatures.onsite, { id: 'pm', title: '專案管理人員', name: '' }]
          }
        };
      });
    }
  }, [role]);

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
      if (file.size > 500 * 1024) { alert(`檔案 ${file.name} 太大`); return; }
      const reader = new FileReader();
      reader.onload = (ev) => { setLog(prev => ({ ...prev, attachments: [...prev.attachments, {name: file.name, dataUrl: ev.target.result}] })); };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (idx) => { setLog(prev => ({...prev, attachments: prev.attachments.filter((_, i) => i !== idx)})); };

  // Signature Handlers
  const handleSignatureChange = (side, index, field, val) => {
    setLog(prev => {
      const newSigs = { ...prev.signatures };
      const targetArr = [...newSigs[side]];
      targetArr[index] = { ...targetArr[index], [field]: val };
      newSigs[side] = targetArr;
      return { ...prev, signatures: newSigs };
    });
  };

  const addClientSignature = () => {
    if(!newClientSig.title) return;
    setLog(prev => ({
      ...prev,
      signatures: {
        ...prev.signatures,
        client: [...prev.signatures.client, { id: Date.now(), title: newClientSig.title, name: '' }]
      }
    }));
    setNewClientSig({ title: '', name: '' });
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

  const handleSmartFill = (item) => {
    // 1. 自動帶入 S/O 到 發現問題
    const newSO = log.section3_findings 
      ? log.section3_findings + '\n\n' + `[${item.code}] ${item.key}: ${item.so}`
      : `[${item.code}] ${item.key}: ${item.so}`;
    
    // 2. 自動帶入 A/P 到 建議措施 (general)
    const newAP = log.suggestions_map['general']
      ? log.suggestions_map['general'] + '\n\n' + `[${item.code}] 建議: ${item.ap}`
      : `[${item.code}] 建議: ${item.ap}`;

    setLog(prev => ({
      ...prev,
      section3_findings: newSO,
      suggestions_map: { ...prev.suggestions_map, general: newAP }
    }));
  };

  // ... (handleFileUpload, removeAttachment, addHazard, addSpecial from previous version) ...

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!log.clientId) { alert("請選擇客戶"); return; }
    const clientName = clients.find(c => c.id === log.clientId)?.name;
    
    // Resolve main names
    const nurseSig = log.signatures.onsite.find(s => s.title.includes('護理'));
    const docSig = log.signatures.onsite.find(s => s.title.includes('醫師'));
    const nurseName = nurseSig ? nurseSig.name : "";
    const doctorName = docSig ? docSig.name : "";

    const findings = Object.entries(log.suggestions_map).map(([k, v]) => `${k}: ${v}`).join('\n');

    onAddLog({ ...log, clientName, nurseName, doctorName, staffName: nurseName || doctorName || "未簽名", findings, hours: ((new Date(`2000/01/01 ${log.endTime}`) - new Date(`2000/01/01 ${log.startTime}`)) / 36e5).toFixed(1), createdAt: serverTimestamp() });
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
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-xl font-bold flex items-center mb-6"><Clock className="mr-2" /> 服務紀錄填寫 (附表八)</h2>
      <form onSubmit={handleSubmit} className="space-y-8">

        {/* 1. Basic Info */}
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <h3 className="font-bold text-lg mb-3 border-b pb-2">一、作業場所基本資料</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div><label className="text-sm font-medium">企業名稱</label><select className="w-full mt-1 p-2 border rounded" value={log.clientId} onChange={e => setLog({...log, clientId: e.target.value})}><option value="">請選擇...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className="text-sm font-medium">執行日期</label><input type="date" className="w-full mt-1 p-2 border rounded" value={log.date} onChange={e => setLog({...log, date: e.target.value})}/></div>
            <div><label className="text-sm font-medium">部門名稱</label><input className="w-full mt-1 p-2 border rounded" value={log.dept_name} onChange={e => setLog({...log, dept_name: e.target.value})}/></div>
            <div><label className="text-sm font-medium">臨場地址</label><input className="w-full mt-1 p-2 border rounded" value={log.address} onChange={e => setLog({...log, address: e.target.value})}/></div>
          </div>
          {/* ... (Demographics & Hazards) ... */}
        </div>

        {/* 2. Work Conditions (Simplified for brevity) */}
        {/* ... */}

        {/* 3. Checklist & Findings */}
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <h3 className="font-bold text-lg mb-3 border-b pb-2">三、臨場健康服務執行情形</h3>
          
          {/* Knowledge Tree Smart Fill */}
          <div className="mb-4 bg-indigo-50 p-3 rounded border border-indigo-200">
            <h4 className="font-bold text-sm text-indigo-800 mb-2 flex items-center"><BookOpen size={16} className="mr-2"/> 智慧填寫助手 (點擊帶入)</h4>
            <SmartFillInput knowledgeBase={knowledgeBase} onSelect={handleSmartFill} />
          </div>

          <div className="space-y-3 text-sm">
             {CHECKLIST_ITEMS.map(item => (
               <div key={item.key} className="flex items-start">
                 <input type="checkbox" className="mt-1 mr-2" checked={log[item.key]} onChange={e=>setLog({...log, [item.key]: e.target.checked})}/>
                 <div className="flex-1"><span>{item.label}</span>{item.hasCount && log[item.key] && <span className="ml-2">共 <input className="border w-12 mx-1" value={log[item.countKey]} onChange={e=>setLog({...log, [item.countKey]:e.target.value})}/> 名</span>}</div>
               </div>
             ))}
          </div>

          <div className="mt-6 pt-4 border-t border-dashed">
             <label className="font-bold text-sm block mb-2 text-teal-800">（二）發現問題 (S/O)</label>
             <textarea rows="3" className="w-full border p-2 rounded bg-yellow-50 focus:bg-white" value={log.section3_findings} onChange={e => setLog({...log, section3_findings: e.target.value})}/>
          </div>
        </div>

        {/* 4. Suggestions (A/P) */}
        <div className="border border-blue-100 rounded-lg p-4 bg-blue-50">
           <h3 className="font-bold text-lg mb-3 border-b border-blue-200 pb-2 text-blue-800">四、建議採行措施 (A/P)</h3>
           <textarea rows="3" className="w-full border p-2 rounded" value={log.suggestions_map['general'] || ''} onChange={e=>setLog({...log, suggestions_map:{...log.suggestions_map, general:e.target.value}})} placeholder="填寫執行紀錄... (可使用智慧助手帶入)" />
        </div>

        {/* 5. Tracking (Toggleable) */}
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
           <div className="flex justify-between items-center border-b pb-2 mb-3">
             <h3 className="font-bold text-lg">五、追蹤辦理情形</h3>
             <div className="flex space-x-3 text-xs">
               <label className="flex items-center"><input type="checkbox" className="mr-1" checked={log.show_tracking_2} onChange={e=>setLog({...log, show_tracking_2:e.target.checked})}/> 健檢</label>
               <label className="flex items-center"><input type="checkbox" className="mr-1" checked={log.show_tracking_3} onChange={e=>setLog({...log, show_tracking_3:e.target.checked})}/> 計畫</label>
               {/* ... */}
             </div>
           </div>
           <div className="mb-4"><label className="block text-sm font-bold mb-1">(1) 前次追蹤</label><textarea rows="2" className="w-full border p-2 rounded" value={log.prev_tracking} onChange={e=>setLog({...log, prev_tracking: e.target.value})}/></div>
           
           {/* Conditional Sections based on show_tracking_X ... */}
        </div>

        {/* 6. Signatures */}
        <div className="border border-teal-200 rounded-lg p-4 bg-teal-50">
           <h3 className="font-bold text-lg mb-3 border-b border-teal-200 pb-2 text-teal-800">六、執行人員與日期</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-3 rounded border">
                 <h4 className="font-bold text-sm mb-2 text-teal-700">臨場服務人員</h4>
                 {log.signatures.onsite.map((sig, idx) => (
                   <div key={idx} className="mb-2">
                     <input className="text-xs border-b w-full mb-1" value={sig.title} onChange={e=>handleSignatureChange('onsite',idx,'title',e.target.value)}/>
                     <input className="w-full p-1 border rounded" value={sig.name} onChange={e=>handleSignatureChange('onsite',idx,'name',e.target.value)} placeholder="姓名"/>
                   </div>
                 ))}
              </div>
              <div className="bg-white p-3 rounded border">
                 <h4 className="font-bold text-sm mb-2 text-teal-700">事業單位人員</h4>
                 {log.signatures.client.map((sig, idx) => (
                   <div key={idx} className="flex mb-2 space-x-2">
                     <div className="flex-1">
                       <input className="text-xs border-b w-full mb-1" value={sig.title} onChange={e=>handleSignatureChange('client',idx,'title',e.target.value)}/>
                       <input className="w-full p-1 border rounded" value={sig.name} onChange={e=>handleSignatureChange('client',idx,'name',e.target.value)} placeholder="姓名(選填)"/>
                     </div>
                     {idx > 2 && <button type="button" onClick={()=>removeClientSignature(idx)} className="text-red-500"><X size={14}/></button>}
                   </div>
                 ))}
                 <button type="button" onClick={addClientSignature} className="text-xs bg-teal-100 px-2 py-1 rounded">新增人員</button>
              </div>
           </div>
        </div>

        <button type="submit" className="w-full bg-teal-600 text-white py-3 rounded-xl font-bold"><Save className="inline mr-2"/> 儲存紀錄</button>
      </form>
    </div>
  );
};

// ... (ReportView & Dashboard remain largely same, utilizing updated log structure) ...

export default function AnzeApp() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [tab, setTab] = useState('dashboard');
  const [staff, setStaff] = useState([]);
  const [clients, setClients] = useState([]);
  const [logs, setLogs] = useState([]);
  const [profile, setProfile] = useState({});
  const [knowledgeBase, setKnowledgeBase] = useState(INITIAL_KNOWLEDGE_BASE);

  // ... (Auth & Snapshot Effects) ...
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token);
      else await signInAnonymously(auth);
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubStaff = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'staff'), s => setStaff(s.docs.map(d=>({id:d.id,...d.data()}))));
    const unsubClients = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'clients'), s => setClients(s.docs.map(d=>({id:d.id,...d.data()}))));
    const unsubLogs = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'serviceLogs'), orderBy('date','desc')), s => setLogs(s.docs.map(d=>({id:d.id,...d.data()}))));
    const unsubProfile = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', 'user_default'), s => { if(s.exists()) setProfile(s.data()); });
    const unsubKB = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'kb', 'main'), s => { if(s.exists()) setKnowledgeBase(s.data().items || INITIAL_KNOWLEDGE_BASE); });
    
    return () => { unsubStaff(); unsubClients(); unsubLogs(); unsubProfile(); unsubKB(); };
  }, [user]);

  // DB Actions
  const addStaff = async (d) => await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'staff'), d);
  const delStaff = async (id) => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'staff', id));
  const addClient = async (d) => await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'clients'), d);
  const delClient = async (id) => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clients', id));
  const addLog = async (d) => { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'serviceLogs'), d); setTab('reports'); };
  const delLog = async (id) => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'serviceLogs', id));
  const saveProfile = async (d) => await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', 'user_default'), d);
  const updateKB = async (items) => await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'kb', 'main'), { items });

  if (!user) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (!role) return <LoginScreen onSelectRole={(r)=>{setRole(r); setTab('dashboard');}} />;

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
       <div className="w-64 bg-white border-r p-4 hidden md:flex flex-col">
          <div className="text-xl font-bold text-teal-700 mb-8 flex items-center"><Activity className="mr-2"/> Anze Care</div>
          <div className="space-y-1">
             <SidebarItem icon={Activity} label="儀表板" active={tab==='dashboard'} onClick={()=>setTab('dashboard')} />
             {role==='agency' && <SidebarItem icon={Users} label="團隊管理" active={tab==='staff'} onClick={()=>setTab('staff')} />}
             <SidebarItem icon={Building} label="客戶管理" active={tab==='clients'} onClick={()=>setTab('clients')} />
             <SidebarItem icon={CheckSquare} label="服務紀錄" active={tab==='service'} onClick={()=>setTab('service')} />
             <SidebarItem icon={FileText} label="報表中心" active={tab==='reports'} onClick={()=>setTab('reports')} />
             <SidebarItem icon={BookOpen} label="知識庫管理" active={tab==='kb'} onClick={()=>setTab('kb')} />
             {role==='individual' && <SidebarItem icon={Settings} label="個人設定" active={tab==='profile'} onClick={()=>setTab('profile')} />}
          </div>
          <button onClick={()=>setRole(null)} className="mt-auto flex items-center text-gray-400 px-4 py-2"><LogOut className="mr-2" size={16}/> 登出</button>
       </div>
       <div className="flex-1 p-8 overflow-y-auto">
          {/* ... (Other Tabs) ... */}
          {tab==='service' && <ServiceLogger staff={staff} clients={clients} onAddLog={addLog} role={role} userProfile={profile} knowledgeBase={knowledgeBase} />}
          {tab==='kb' && <KnowledgeManager knowledgeBase={knowledgeBase} onUpdate={updateKB} />}
          {/* ... */}
       </div>
    </div>
  );
}