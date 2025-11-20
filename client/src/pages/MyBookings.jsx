import React, { useEffect, useState } from 'react'
import { useAppContext } from '../context/AppContext'
import Title from '../components/Title'
import { assets } from '../assets/assets'
import toast from 'react-hot-toast'
import { motion } from 'motion/react'

const MyBookings = () => {

  const{axios, user,currency, fetchPending} = useAppContext()
  const [bookings, setBookings] = useState([])
  const [autoPayTriggered, setAutoPayTriggered] = useState(false)

  const fetchMyBookings = async ()=> {
    try {
      const{ data } = await axios.get('/api/bookings/user')
      if(data.success){
        setBookings(data.bookings)
        // If URL contains ?pay=<bookingId> then trigger payment for that booking once
        try {
          const params = new URLSearchParams(window.location.search)
          const payId = params.get('pay')
          if (payId && !autoPayTriggered) {
            const bookingToPay = data.bookings.find(b => b._id === payId)
            if (bookingToPay) {
              setAutoPayTriggered(true)
              // slight delay to let UI render
              setTimeout(() => handlePay(bookingToPay), 400)
            }
          }
        } catch (e) {
          console.warn('auto-pay parse error', e)
        }
      }else{
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  // Load Razorpay checkout script
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (document.getElementById('razorpay-sdk')) return resolve(true)
      const script = document.createElement('script')
      script.id = 'razorpay-sdk'
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  const handlePay = async (booking) => {
    try {
      const ok = await loadRazorpayScript()
      if (!ok) return toast.error('Failed to load payment SDK')

      const { data } = await axios.post('/api/payments/create-order', { bookingId: booking._id })
      if (!data.success) return toast.error(data.message || 'Could not create order')
      const order = data.order

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_RhaCw3XgeS3Mfu', // fallback to provided test key
        amount: order.amount,
        currency: order.currency,
        name: 'CarZilla',
        description: `Booking payment for ${booking.car.brand} ${booking.car.model}`,
        order_id: order.id,
        prefill: {
          name: user?.name || '',
          email: user?.email || ''
        },
        handler: async function (response) {
          try {
            const verifyRes = await axios.post('/api/payments/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bookingId: booking._id
            })
            if (verifyRes.data.success) {
              // update local state
              setBookings((prev) => prev.map((b) => (b._id === booking._id ? { ...b, paymentStatus: 'Paid' } : b)))
              toast.success('Payment successful and booking updated')
            } else {
              toast.error(verifyRes.data.message || 'Payment verification failed')
            }
          } catch (err) {
            console.error(err)
            toast.error('Payment verification failed')
          }
        }
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (error) {
      console.error('handlePay error', error)
      toast.error('Payment failed to start')
    }
  }
  // Cancel Booking
  const handleCancelBooking = async (bookingId) => {
  try {
    const { data } = await axios.put(`/api/bookings/${bookingId}/cancel`);
    if (data.success) {
      setBookings((prev) =>
        prev.map((b) => (b._id === bookingId ? { ...b, status: "Cancelled" } : b))
      );
      toast.success("Booking cancelled successfully!");
      // <-- refresh global pending count immediately
      fetchPending && fetchPending();
    } else {
      toast.error(data.message);
    }
  } catch (error) {
    toast.error("Failed to cancel booking. Try again.");
    console.error(error);
  }
};

  useEffect(()=> {
    user && fetchMyBookings()
  },[user])
  return (
    <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6 }}
    className='px-6 md:px-16 lg:px-24 xl:px-32 2xl:px-48 mt-16 text-sm max-w-7xl'>
      <Title title='My Bookings' subTitle='View and manage your all car bookings' align="left" />
      <div>
{bookings.length === 0 ? (
<p className="text-center text-gray-500 mt-20">No bookings found</p>
) : (
        bookings.map((booking, index)=>(
          <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.4 }}
          key={booking._id} className='grid grid-cols-1 md:grid-cols-4 gap-6
          p-6 border border-borderColor rounded-lg mt-5 first:mt-12'>
            {/* Car Image + Info */}
            <div className='md:col-span-1'>
              <div className='rounded-md overflow-hidden mb-3'>
                <img src={booking.car.image} alt="" className='w-full h-auto aspect-video object-cover'/>
              </div>
              <p className='text-lg font-medium mt-2'>{booking.car.brand} {booking.car.model}</p>
              <p className='text-gray-500'>{booking.car.year} • {booking.car.category} • {booking.car.location}</p>
              </div>
              {/* Booking Info */}
              <div className='md:col-span-2'>
                <div className='flex items-center gap-2'>
                  <p className='px-3 py-1.5 bg-light rounded'>Booking #{index+1}</p>
                  <p className={`px-3 py-1 text-xs rounded-full ${booking.status === 'Confirmed' ? 'bg-green-400/15 text-green-600' : 
                    'bg-red-400/15 text-red-600'}`}>{booking.status}</p>
                </div>
                <div className='flex items-start gap-2 mt-3'>
                  <img src={assets.calendar_icon_colored} alt="" className='w-4 h-4 mt-1' />
                  <div>
                    <p className='text-gray-500'>Rental Period</p>
                    <p>{booking.pickupDate.split('T')[0]} To {booking.returnDate.split('T')[0]}</p>
                    </div>
                </div>
                <div className='flex items-start gap-2 mt-3'>
                  <img src={assets.location_icon_colored} alt="" className='w-4 h-4 mt-1' />
                  <div>
                    <p className='text-gray-500'>Pick-Up Location</p>
                    <p>{booking.car.location}</p>
                    </div>
                </div>
              </div>
                {/* Price */}
                <div className='md:col-span-1 flex flex-col justify-between gap-6'>
                  <div className='text-sm text-gray-500 text-right'>
                  <p>Total Price</p>
                  <h1 className='text-2xl font-semibold text-primary'>{currency}{booking.price}</h1>
                  <p>Booked on {booking.createdAt.split('T')[0]}</p>
                  {/**
                   * Show actions (Cancel / Pay) when:
                   * - booking is not cancelled AND
                   * - booking pickup date is in the future OR booking return date is today-or-future.
                   *
                   * This is more robust across timezones and avoids subtle false negatives
                   * when comparing date strings that may shift due to UTC/local timezone.
                   */}
                  {(() => {
                    try {
                      const today = new Date();
                      today.setHours(0,0,0,0);
                      const pickupDay = booking.pickupDate ? new Date(booking.pickupDate) : null;
                      const returnDay = booking.returnDate ? new Date(booking.returnDate) : null;
                      if (pickupDay) pickupDay.setHours(0,0,0,0);
                      if (returnDay) returnDay.setHours(0,0,0,0);

                      const isFuturePickup = pickupDay ? pickupDay.getTime() > today.getTime() : false;
                      const isOngoingOrFuture = returnDay ? returnDay.getTime() >= today.getTime() : false;

                      return (booking.status !== 'Cancelled' && (isFuturePickup || isOngoingOrFuture));
                    } catch (e) {
                      // on any parsing error, show actions conservatively
                      return booking.status !== 'Cancelled';
                    }
                  })() && (
                    <div className='flex flex-col items-end gap-2'>
                      <button 
                        onClick={() => handleCancelBooking(booking._id)} 
                        className='cursor-pointer mt-3 px-4 py-2 bg-primary hover:bg-primary-dull transition-all text-white rounded-lg'>
                        Cancel Booking
                      </button>
                      {booking.status === 'Confirmed' && booking.paymentStatus !== 'Paid' && (
                        <button onClick={() => handlePay(booking)} className='cursor-pointer mt-1 px-4 py-2 bg-primary hover:bg-primary-dull text-white rounded-lg '>
                          Pay Now
                        </button>
                      )}
                    </div>
                  )}
              </div>
              </div>
              </motion.div>
          ))
        )}
      </div>
    </motion.div>
  )
}

export default MyBookings
