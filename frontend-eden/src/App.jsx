import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './Topbar';
import Home from './Home';
import Menu from './Menu';
import Contracts from './Contracts';

function App() {
  return (
    <BrowserRouter>
      {/* กล่องใหญ่สุด: คลุมทั้งหน้าจอ (h-screen) และซ่อนส่วนที่ล้น (overflow-hidden) */}
      <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
        
        {/* 1. Sidebar ด้านซ้าย */}
        <Sidebar />

        {/* 2. พื้นที่ด้านขวา (มี TopBar และเนื้อหา) */}
        <div className="flex flex-col flex-1 w-full">
          
          {/* แถบด้านบน */}
          <TopBar />

          {/* 3. พื้นที่เนื้อหาหลัก (เลื่อน Scroll ได้เฉพาะตรงนี้) */}
          <main className="flex-1 overflow-y-auto p-6">
            
            {/* การ์ดสีขาวแบบในรูป ที่จะครอบเนื้อหาของทุกหน้า */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-full">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/menu" element={<Menu />} />
                {/* สร้างหน้าอื่นๆ ไว้รอได้เลย */}
                <Route path="/tenants" element={<h1 className="text-2xl font-bold">หน้าผู้เช่า</h1>} />
                <Route path="/contracts" element={<Contracts />} />
              </Routes>
            </div>

          </main>
        </div>

      </div>
    </BrowserRouter>
  );
}

export default App;