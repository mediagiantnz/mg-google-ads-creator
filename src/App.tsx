import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UploadScreen } from './screens/UploadScreen';
import { PreviewScreen } from './screens/PreviewScreen';
import { ProgressScreen } from './screens/ProgressScreen';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<UploadScreen />} />
        <Route path="/preview" element={<PreviewScreen />} />
        <Route path="/progress" element={<ProgressScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;