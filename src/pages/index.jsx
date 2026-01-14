import Layout from "./Layout.jsx";

import Home from "./Home";

import Login from "./Login";

import Settings from "./Settings";

import SprayWallSelect from "./SprayWallSelect";

import SprayWallCreate from "./SprayWallCreate";

import SprayWallDashboard from "./SprayWallDashboard";

import BoulderCreate from "./BoulderCreate";

import ContiBoucleCreate from "./ContiBoucleCreate";

import BoulderView from "./BoulderView";

import ContiBoucleView from "./ContiBoucleView";

import BoulderCatalog from "./BoulderCatalog";

import BoulderList from "./BoulderList";

import BoulderSearch from "./BoulderSearch";

import BoulderRandom from "./BoulderRandom";

import SprayWallEdit from "./SprayWallEdit";

import Performance from "./Performance";

import BoulderEdit from "./BoulderEdit";

import ContiBoucleEdit from "./ContiBoucleEdit";

import BelleOuvertureCatalog from "./BelleOuvertureCatalog";

import BelleOuvertureCreate from "./BelleOuvertureCreate";

import BelleOuvertureView from "./BelleOuvertureView";

import BelleOuvertureList from "./BelleOuvertureList";
import UserManagement from "./UserManagement";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

// Map URL pathname to a page key used by Layout for current page context
const PAGES = {
    
    Home: Home,
    
    Login: Login,
    
    Settings: Settings,
    
    SprayWallSelect: SprayWallSelect,
    
    SprayWallCreate: SprayWallCreate,
    
    SprayWallDashboard: SprayWallDashboard,
    
    BoulderCreate: BoulderCreate,
    
    ContiBoucleCreate: ContiBoucleCreate,
    
    BoulderView: BoulderView,
    
    ContiBoucleView: ContiBoucleView,
    
    BoulderCatalog: BoulderCatalog,
    
    BoulderList: BoulderList,
    
    BoulderSearch: BoulderSearch,
    
    BoulderRandom: BoulderRandom,
    
    SprayWallEdit: SprayWallEdit,
    
    Performance: Performance,
    
    BoulderEdit: BoulderEdit,
    
    ContiBoucleEdit: ContiBoucleEdit,
    
    BelleOuvertureCatalog: BelleOuvertureCatalog,
    
    BelleOuvertureCreate: BelleOuvertureCreate,
    
    BelleOuvertureView: BelleOuvertureView,
    
    BelleOuvertureList: BelleOuvertureList,
        UserManagement: UserManagement,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Router-aware wrapper that injects Layout and resolves the current page name
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Home />} />
                
                
                <Route path="/Home" element={<Home />} />
                
                <Route path="/Login" element={<Login />} />
                
                <Route path="/Settings" element={<Settings />} />
                
                <Route path="/SprayWallSelect" element={<SprayWallSelect />} />
                
                <Route path="/SprayWallCreate" element={<SprayWallCreate />} />
                
                <Route path="/SprayWallDashboard" element={<SprayWallDashboard />} />
                
                <Route path="/BoulderCreate" element={<BoulderCreate />} />
                
                <Route path="/ContiBoucleCreate" element={<ContiBoucleCreate />} />
                
                <Route path="/BoulderView" element={<BoulderView />} />
                
                <Route path="/ContiBoucleView" element={<ContiBoucleView />} />
                
                <Route path="/BoulderCatalog" element={<BoulderCatalog />} />
                
                <Route path="/BoulderList" element={<BoulderList />} />
                
                <Route path="/BoulderSearch" element={<BoulderSearch />} />
                
                <Route path="/BoulderRandom" element={<BoulderRandom />} />
                
                <Route path="/SprayWallEdit" element={<SprayWallEdit />} />
                
                <Route path="/Performance" element={<Performance />} />
                
                <Route path="/BoulderEdit" element={<BoulderEdit />} />
                
                <Route path="/ContiBoucleEdit" element={<ContiBoucleEdit />} />
                
                <Route path="/BelleOuvertureCatalog" element={<BelleOuvertureCatalog />} />
                
                <Route path="/BelleOuvertureCreate" element={<BelleOuvertureCreate />} />
                
                <Route path="/BelleOuvertureView" element={<BelleOuvertureView />} />
                
                <Route path="/BelleOuvertureList" element={<BelleOuvertureList />} />
                    <Route path="/UserManagement" element={<UserManagement />} />
                
            </Routes>
        </Layout>
    );
}

/** Central router wiring all pages with the shared layout. */
export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}