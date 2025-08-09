import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import FanzaApp from './platforms/fanza/FanzaApp';
import DugaApp from './platforms/duga/DugaApp';

const AppRouter = () => {
  return (
    <Router>
      <Routes>
        <Route path="/duga/*" element={<DugaApp />} />
        <Route path="/*" element={<FanzaApp />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;