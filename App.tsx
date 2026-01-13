import React, { useState, useEffect } from 'react';
import { Auth } from './components/Auth';
import { Messenger } from './components/Messenger';
import { User } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);

  // Load user from local storage on mount (simple persistence simulation)
  useEffect(() => {
    const savedUser = localStorage.getItem('spark_chat_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse user data", e);
      }
    }
  }, []);

  const handleLogin = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem('spark_chat_user', JSON.stringify(newUser));
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('spark_chat_user', JSON.stringify(updatedUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('spark_chat_user');
  };

  return (
    <div className="antialiased text-slate-100">
      {!user ? (
        <Auth onComplete={handleLogin} />
      ) : (
        <Messenger 
          currentUser={user} 
          onUpdateUser={handleUpdateUser}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

export default App;