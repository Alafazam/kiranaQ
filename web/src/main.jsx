import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import './index.css'
import { AppProvider } from './state.jsx'
import { ToastProvider } from './ui/Toast.jsx'
import { TabBar } from './ui/TabBar.jsx'
import { AssistantProvider } from './assistant/AssistantProvider.jsx'
import { AssistantPanel, BoloButton } from './assistant/AssistantPanel.jsx'
import Home from './screens/Home.jsx'
import Orders from './screens/Orders.jsx'
import Distributors from './screens/Distributors.jsx'
import DistributorDetail from './screens/DistributorDetail.jsx'
import Photo from './screens/Photo.jsx'
import Check from './screens/Check.jsx'
import Result from './screens/Result.jsx'
import PastLog from './screens/PastLog.jsx'
import { SettingsHome, EditDistributor, ItemsList } from './screens/Settings.jsx'

function Tabs() {
  return (
    <>
      <Outlet />
      <TabBar />
    </>
  )
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppProvider>
      <ToastProvider>
        <div className="app-scroll">
        <BrowserRouter basename="/app">
          <AssistantProvider>
          <Routes>
            <Route element={<Tabs />}>
              <Route path="/" element={<Home />} />
              <Route path="/distributors" element={<Distributors />} />
              <Route path="/distributors/:id" element={<DistributorDetail />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/settings" element={<SettingsHome />} />
              <Route path="/settings/distributors/:id" element={<EditDistributor />} />
              <Route path="/settings/items" element={<ItemsList />} />
              <Route path="/log/:id" element={<PastLog />} />
            </Route>
            <Route path="/log/new" element={<Photo />} />
            <Route path="/log/new/check" element={<Check />} />
            <Route path="/log/:id/result" element={<Result />} />
          </Routes>
          <BoloButton />
          <AssistantPanel />
          </AssistantProvider>
        </BrowserRouter>
        </div>
      </ToastProvider>
    </AppProvider>
  </React.StrictMode>
)
