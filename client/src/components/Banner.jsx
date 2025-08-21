import React from 'react'
import { assets } from '../assets/assets'
import { useAppContext } from '../context/AppContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { motion } from 'motion/react'
const Banner = () => {
  const { user, isOwner, setIsOwner, setShowLogin, axios } = useAppContext();
  const navigate = useNavigate();

  const changeRole = async () => {
  try {
    const { data } = await axios.post('/api/owner/change-role');
    if (data.success) {
      setIsOwner(true);
      toast.success(data.message);
      navigate('/owner');
    } else {
      toast.error(data.message);
    }
  } catch (error) {
    toast.error('You Are Not Login...Login First!');
  }
};

const handleListYourCar = () => {
  if (!user) {
    changeRole();
  } else {
    if (isOwner) {
      navigate('/owner');
    } else {
      changeRole();
    }
  }
};
  return (
    <div className='flex flex-col md:flex-row md:items-start items-center
    justify-between px-8 min-md:pl-14 pt-10 bg-gradient-to-r from-[#8c52ff] to-
    [#A9CFFF] max-w-6xl mx-3 md:mx-auto rounded-2xl overflow-hidden'>

        <div className='text-white'>
            <h2 className='text-3xl font-medium'>Do You Own a Premium Car?</h2>
            <p className='mt-2'>Monetize your vehicle effortlessly by listing it on CarZilla.</p>
            <p className='max-w-130'>We take care of insurance,driver verification
                and secure payments - so you can earn passive income, stress-free.</p>
                <button onClick={handleListYourCar} className='px-6 py-2 bg-white hover:bg-slate-100 transition-all
                text-primary rounded-lg text-sm mt-4 cursor-pointer'>List your car</button>
        </div>
        <motion.img
        initial={{ opacity: 0, x: 20}}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, delay: 0}}
        src={assets.banner_car_image} alt="car" className='max-h-45 mt-10' />
    </div>
  )
}

export default Banner
