import Layout from "./Layout.jsx";


import React, { Suspense } from "react";
const Home = React.lazy(() => import("./Home"));
const Login = React.lazy(() => import("./Login"));
const Settings = React.lazy(() => import("./Settings"));
const SprayWallSelect = React.lazy(() => import("./SprayWallSelect"));
const SprayWallCreate = React.lazy(() => import("./SprayWallCreate"));
const SprayWallDashboard = React.lazy(() => import("./SprayWallDashboard"));
const BoulderCreate = React.lazy(() => import("./BoulderCreate"));
const ContiBoucleCreate = React.lazy(() => import("./ContiBoucleCreate"));
const BoulderView = React.lazy(() => import("./BoulderView"));
const ContiBoucleView = React.lazy(() => import("./ContiBoucleView"));
const BoulderCatalog = React.lazy(() => import("./BoulderCatalog"));
const BoulderList = React.lazy(() => import("./BoulderList"));
const BoulderSearch = React.lazy(() => import("./BoulderSearch"));
const BoulderRandom = React.lazy(() => import("./BoulderRandom"));
const SprayWallEdit = React.lazy(() => import("./SprayWallEdit"));
const Performance = React.lazy(() => import("./Performance"));
const BoulderEdit = React.lazy(() => import("./BoulderEdit"));
const ContiBoucleEdit = React.lazy(() => import("./ContiBoucleEdit"));
const BelleOuvertureCatalog = React.lazy(() => import("./BelleOuvertureCatalog"));
const BelleOuvertureCreate = React.lazy(() => import("./BelleOuvertureCreate"));
const BelleOuvertureEdit = React.lazy(() => import("./BelleOuvertureEdit"));
const BelleOuvertureView = React.lazy(() => import("./BelleOuvertureView"));
const BelleOuvertureList = React.lazy(() => import("./BelleOuvertureList"));
const UserManagement = React.lazy(() => import("./UserManagement"));
import { User } from "@/api/entities";

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
    
    BelleOuvertureEdit: BelleOuvertureEdit,
    
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
            <Suspense fallback={<div>Chargement...</div>}>
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
                    <Route path="/BelleOuvertureEdit" element={<BelleOuvertureEdit />} />
                    <Route path="/BelleOuvertureView" element={<BelleOuvertureView />} />
                    <Route path="/BelleOuvertureList" element={<BelleOuvertureList />} />
                    <Route path="/UserManagement" element={<UserManagement />} />
                </Routes>
            </Suspense>
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