import Razorpay from 'razorpay';
import Booking from '../models/Booking.js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

export const createOrder = async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ success:false, message: 'bookingId required' });
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success:false, message: 'Booking not found' });
    // Ensure booking has a valid numeric price. If missing, try to compute from car pricePerDay.
    let price = Number(booking.price);
    if (!price || isNaN(price)) {
      // try populate car
      await booking.populate('car');
      if (booking.car && booking.pickupDate && booking.returnDate && booking.car.pricePerDay) {
        const picked = new Date(booking.pickupDate);
        const returned = new Date(booking.returnDate);
        const noOfDays = Math.max(1, Math.ceil((returned - picked) / (1000 * 60 * 60 * 24)));
        price = booking.car.pricePerDay * noOfDays;
        booking.price = price;
        await booking.save();
      }
    }
    if (!price || isNaN(price)) return res.status(400).json({ success:false, message: 'Invalid booking price' });
    const amountInPaise = Math.round(price * 100); // price assumed in rupees
    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `rcpt_${bookingId}`,
      payment_capture: 1
    };
    const order = await razorpayInstance.orders.create(options);
    // save order id to booking (optional)
    booking.razorpayOrderId = order.id;
    await booking.save();
    res.json({ success:true, order });
  } catch (error) {
    console.error('createOrder error', error);
    res.status(500).json({ success:false, message: 'Server error' });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bookingId) {
      return res.status(400).json({ success:false, message: 'Missing parameters' });
    }
    const generated_signature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');
    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ success:false, message: 'Invalid signature' });
    }
    // mark booking as paid
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success:false, message: 'Booking not found' });
    booking.paymentStatus = 'Paid';
    booking.razorpayPaymentId = razorpay_payment_id;
    booking.razorpaySignature = razorpay_signature;
    await booking.save();
    res.json({ success:true, message: 'Payment verified' });
  } catch (error) {
    console.error('verifyPayment error', error);
    res.status(500).json({ success:false, message: 'Server error' });
  }
};

export const webhookHandler = async (req, res) => {
  try {
    // Razorpay sends body as raw; express.raw used when registering route
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const signature = req.headers['x-razorpay-signature'];
    const body = req.body; // Buffer when using express.raw
    const expectedSignature = crypto.createHmac('sha256', secret).update(body).digest('hex');

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature');
      return res.status(400).send('invalid signature');
    }

    const payload = JSON.parse(body.toString());
    // Only handle payment.captured or payment.authorized events
    if (payload.event === 'payment.captured' || payload.event === 'payment.authorized') {
      const paymentEntity = payload.payload.payment.entity;
      const razorpayPaymentId = paymentEntity.id;
      const razorpayOrderId = paymentEntity.order_id;
      // find booking by razorpayOrderId
      const booking = await Booking.findOne({ razorpayOrderId: razorpayOrderId });
      if (booking) {
        booking.paymentStatus = 'Paid';
        booking.razorpayPaymentId = razorpayPaymentId;
        await booking.save();
        console.log('Booking marked as paid via webhook:', booking._id.toString());
      } else {
        console.warn('Booking not found for order id', razorpayOrderId);
      }
    }

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('webhookHandler error', error);
    res.status(500).send('server error');
  }
};
