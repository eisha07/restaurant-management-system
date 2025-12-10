import React from 'react';
import './styles/App.css';

// Import customer components with correct paths
import CustomerApp from './components/customer/customerApp';

function App() {
  return (
    <div className="App">
      {/* You can choose which app to show */}
      <CustomerApp />
      
      {/* Or create a router for different user types */}
      {/*
      <Router>
        <Routes>
          <Route path="/customer/*" element={<CustomerApp />} />
          <Route path="/manager/*" element={<ManagerApp />} />
          <Route path="/kitchen/*" element={<KitchenApp />} />
        </Routes>
      </Router>
      */}
    </div>
  );
}

export default App;