import React, { useState, useRef, useEffect } from 'react';
import { assets } from '../../assets/assets';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import logoutIcon from '../../assets/logout.png';
import profileIcon from '../../assets/user.png';
import ArrowDown from '../../assets/arrow_down.svg';

const NavbarOwner = () => {
  const { user, logout } = useAppContext();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex items-center justify-between w-full border-b py-2 px-6 md:px-8 border-borderColor relative transition-all">
      <Link to="/">
        <img src={assets.logoo} alt="App Logo" className="h-7" />
      </Link>

      <div className="flex items-center -mx-5 gap-2 text-xl font-medium">
        <p>Welcome, {user?.name || "Owner"}</p>

        <div className="relative flex items-center cursor-pointer" ref={dropdownRef} onClick={() => setOpen(prev => !prev)}>
          <img
            src={
              user?.image ||
              "https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=300"
            }
            alt="User avatar"
            className="h-10 w-10 rounded-full object-cover"
          />
          <img
            src={ArrowDown}
            alt="open menu"
            className={`w-5 h-5 mt-5 transition-transform ${open ? 'rotate-180' : ''}`}
          />

          {open && (
            <div 
              className="absolute -right-3 mt-25 w-30 bg-white border border-borderColor rounded shadow-lg z-50"
              role="menu"
            >
              <button
                className="flex justify-start items-center w-full px-4 py-2 text-base font-medium text-gray-700 hover:bg-primary hover:cursor-pointer hover:text-white transition-all rounded"
                onClick={handleLogout}
                role="menuitem"
              ><span className='text-lg font-semibold'>Logout</span>
              <img src={logoutIcon} alt="logout" className="h-6 w-6 ml-4"/>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NavbarOwner;
