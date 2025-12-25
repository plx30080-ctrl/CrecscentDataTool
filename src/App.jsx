import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import DataEntry from './pages/DataEntry';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="data-entry" element={<DataEntry />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="upload" element={<Upload />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
