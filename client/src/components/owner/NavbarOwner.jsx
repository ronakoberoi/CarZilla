import React, { useState, useRef, useEffect } from 'react';
import { assets } from '../../assets/assets';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import logoutIcon from '../../assets/logout.svg';
import ArrowDown from '../../assets/arrow_down.svg'

const NavbarOwner = () => {
  const { user, logout } = useAppContext();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
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
    <div className='flex items-center justify-between w-full border-b px-6 md:px-8 border-borderColor relative transition-all'>
      <Link to='/'>
        <img src={assets.logoo} alt="" className='h-7' />
      </Link>
      <div className='flex items-center -mx-5 gap-2 text-xl font-medium'>
        <p>Welcome, {user?.name || "Owner"}</p>
        <div className='relative' ref={dropdownRef}>
          <img
            src={
              user?.image ||
              "https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=300"
            }
            alt=""
            className='h-10 w-10 items-center justify-center mt-1.5 rounded-full object-cover cursor-pointer'
            onClick={() => setOpen((prev) => !prev)}
          />
          <img
            src={ArrowDown}
            alt="arrow"
            className={`w-5 h-5 ml-2 cursor-pointer transition-transform ${open ? 'rotate-180' : ''}`}
            onClick={() => setOpen((prev) => !prev)}
          />
          {open && (
  <div className='absolute right-0 w-40 bg-white border border-borderColor rounded shadow-lg z-50'>
    <button
      className='flex justify-center items-center w-full px-4 py-2 text-base font-semibold text-gray-700 hover:bg-primary hover:text-white transition-all rounded'
      onClick={handleLogout}
    >
      Logout
    </button>
  </div>
)}
        </div>
      </div>
    </div>
  );
};

export default NavbarOwner;
