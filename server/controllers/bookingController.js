import Booking from "../models/Booking.js"
import Car from "../models/Car.js"
import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";

dotenv.config();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// CHECK AVAILABILITY FOR GIVEN DATE

export const checkAvailability = async (carId, pickupDate, returnDate) => {
    const car = await Car.findById(carId);
    if (!car || !car.isAvaliable) {
      return false;
    }
    const bookings = await Booking.find({
        car: carId,
        status: { $ne: "Cancelled" },
        pickupDate: { $lte: returnDate },
        returnDate: { $gte: pickupDate },
    });
    return bookings.length === 0;
};

// API FOR FORM ON HOME_PAGE FOR GIVEN LOCATION AND DATE

export const checkAvailabilityOfCar = async (req, res)=>{
    try {
        const { location, pickupDate, returnDate } = req.body;
        // FETCH ALL CARS OF GIVEN LOCATION
        const cars = await Car.find({location, isAvaliable: true})

        const availableCarsPromises  = cars.map(async (car)=>{
            const isAvaliable = await checkAvailability(car._id, pickupDate, returnDate)
            return {...car._doc, isAvaliable: isAvaliable}
        })
        let availableCars = await Promise.all(availableCarsPromises)
        availableCars = availableCars.filter(car=> car.isAvaliable === true)
        res.json({success: true, availableCars})
    } catch (error) {
        console.log(error.message)
        res.json({success: false, message: error.message})
    }
}

// API TO CREATE BOOKING OF CAR

export const createBooking = async (req, res)=>{
    try {
        const {_id} = req.user;
        const {car, pickupDate, returnDate} = req.body;
        const isAvaliable = await checkAvailability(car, pickupDate, returnDate)
        if(!isAvaliable){
            return res.json({success: false, message: "Car is not Available"})
        }
        const carData = await Car.findById(car)
        const picked = new Date(pickupDate);
        const returned = new Date(returnDate);
        const noOfDays = Math.ceil((returned - picked) / (1000 * 60 * 60 * 24)) || 1;
        const price = carData.pricePerDay * noOfDays;

        await Booking.create({car, owner: carData.owner, user: _id, pickupDate, returnDate, price})
        res.json({success: true, message: "BOOKING CREATED"})
    } catch (error) {
        console.log(error.message)
        res.json({success: false, message: error.message})
    }
}

// API TO LIST USER BOOKINGS

export const getUserBookings = async (req, res)=>{
    try {
        const {_id} = req.user;
        const bookings = await Booking.find({user: _id }).populate("car").sort({createdAt: -1})
        res.json({success: true, bookings})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// API TO GET OWNER BOOKINGS

export const getOwnerBookings = async (req, res)=>{
    try {
        if(req.user.role !== 'owner'){
            return res.json({success: false, message: "NOT AUTHORIZED"})
        }
        const bookings = await Booking.find({owner: req.user._id}).populate('car user').select("-user.password").sort({createdAt: -1})
        res.json({success: true, bookings})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// API TO UPDATE STATUS

export const changeBookingStatus = async (req, res) => {
  try {
    const { _id } = req.user;
    const { bookingId, status } = req.body;

    const booking = await Booking.findById(bookingId)
      .populate("user")
      .populate("car");

    if (!booking) {
      return res.json({ success: false, message: "BOOKING NOT FOUND" });
    }

    if (booking.owner.toString() !== _id.toString()) {
      return res.json({ success: false, message: "UNAUTHORIZED" });
    }

    booking.status = status;
    await booking.save();

    // ✅ Send email if status is "Confirmed"
    if (status === "Confirmed") {
      // Build frontend links (pay link with booking id to trigger payment, and a fallback My Bookings page)
      const frontendBase = (process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
      const payUrl = `${frontendBase}/my-bookings?pay=${booking._id}`;
      const myBookingsUrl = `${frontendBase}/my-bookings`;

      const shouldShowPay = !(booking.paymentStatus && booking.paymentStatus === 'Paid');

      const msg = {
        to: booking.user.email,
        from: "noreply@howzellerz.store",
        subject: "✅ Your CarZilla Booking is Confirmed!",
        html: `
      <div style="font-family: Arial, sans-serif; background:#f9f9f9; padding:20px; color:#333;">
        <div style="max-width:600px; margin:auto; background:white; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.1);">
          <div style="background:#2563eb; color:white; text-align:center; padding:20px;">
            <h1 style="margin:0;">CarZilla 🚗</h1>
            <p style="margin:5px 0 0;">Your Booking is Confirmed</p>
          </div>

          <div style="padding:20px;">
            <h2>Hello ${booking.user.name},</h2>
            <p>Your booking has been <b style="color:green;">confirmed</b>. Get ready to ride!</p>

            <div style="text-align:center; margin:20px 0;">
              <img src="${booking.car.image}" alt="Car Image" style="max-width:100%; border-radius:10px; box-shadow:0 2px 6px rgba(0,0,0,0.2);" />
              <h3 style="margin:10px 0;">${booking.car.brand} ${booking.car.model} (${booking.car.year})</h3>
            </div>

            <table style="width:100%; border-collapse:collapse; margin:20px 0;">
              <tr>
                <td style="padding:10px; border:1px solid #ddd;"><b>Pickup</b></td>
                <td style="padding:10px; border:1px solid #ddd;">${booking.pickupDate.toDateString()}</td>
              </tr>
              <tr>
                <td style="padding:10px; border:1px solid #ddd;"><b>Return</b></td>
                <td style="padding:10px; border:1px solid #ddd;">${booking.returnDate.toDateString()}</td>
              </tr>
              <tr>
                <td style="padding:10px; border:1px solid #ddd;"><b>Total Price</b></td>
                <td style="padding:10px; border:1px solid #ddd; color:#2563eb;">₹${booking.price}</td>
              </tr>
            </table>

            ${shouldShowPay ? `
              <div style="text-align:center; margin:20px 0;">
                <a href="${payUrl}" style="display:inline-block; padding:12px 24px; background:#10b981; color:white; text-decoration:none; border-radius:8px; font-weight:600;">Pay Now</a>
              </div>
              <p style="text-align:center; font-size:13px; color:#555;">Or manage your booking and pay later from your <a href="${myBookingsUrl}">My Bookings</a> page.</p>
            ` : `
              <div style="text-align:center; margin:20px 0;">
                <a href="${myBookingsUrl}" style="display:inline-block; padding:12px 24px; background:#2563eb; color:white; text-decoration:none; border-radius:8px; font-weight:600;">View Booking</a>
              </div>
              <p style="text-align:center; font-size:13px; color:#555;">Your payment is already received. View your booking details on the <a href="${myBookingsUrl}">My Bookings</a> page.</p>
            `}

            <p style="margin-top:30px;">Thank you for choosing <b>CarZilla</b> 🚀</p>
          </div>

          <div style="background:#f3f4f6; padding:15px; text-align:center; font-size:12px; color:#555;">
            © ${new Date().getFullYear()} CarZilla. All rights reserved.
          </div>
        </div>
      </div>
    `,
      };

  try {
    await sgMail.send(msg);
    console.log("✅ Confirmation email sent to", booking.user.email);
  } catch (err) {
    console.error("❌ Email failed:", err.response?.body || err.message);
  }
}

else if (status === "Cancelled") {
  const msg = {
    to: booking.user.email,
    from: "noreply@howzellerz.store",
    subject: "❌ Your CarZilla Booking has been Cancelled",
    html: `
      <div style="font-family: Arial, sans-serif; background:#f9f9f9; padding:20px; color:#333;">
        <div style="max-width:600px; margin:auto; background:white; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.1);">
          
          <div style="background:#dc2626; color:white; text-align:center; padding:20px;">
            <h1 style="margin:0;">CarZilla 🚗</h1>
            <p style="margin:5px 0 0;">Your Booking is Cancelled</p>
          </div>

          <div style="padding:20px;">
            <h2>Hello ${booking.user.name},</h2>
            <p>We’re sorry to inform you that your booking has been <b style="color:#dc2626;">cancelled</b>.</p>

            <div style="text-align:center; margin:20px 0;">
              <img src="${booking.car.image}" alt="Car Image" style="max-width:100%; border-radius:10px; box-shadow:0 2px 6px rgba(0,0,0,0.2);" />
              <h3 style="margin:10px 0;">${booking.car.brand} ${booking.car.model} (${booking.car.year})</h3>
            </div>

            <table style="width:100%; border-collapse:collapse; margin:20px 0;">
              <tr>
                <td style="padding:10px; border:1px solid #ddd;"><b>Pickup</b></td>
                <td style="padding:10px; border:1px solid #ddd;">${booking.pickupDate.toDateString()}</td>
              </tr>
              <tr>
                <td style="padding:10px; border:1px solid #ddd;"><b>Return</b></td>
                <td style="padding:10px; border:1px solid #ddd;">${booking.returnDate.toDateString()}</td>
              </tr>
              <tr>
                <td style="padding:10px; border:1px solid #ddd;"><b>Total Price</b></td>
                <td style="padding:10px; border:1px solid #ddd; color:#dc2626;">₹${booking.price}</td>
              </tr>
            </table>
            <p style="margin-top:30px;">We hope to serve you soon again. <br/>Thank you for choosing <b>CarZilla</b> 🚀</p>
          </div>

          <div style="background:#f3f4f6; padding:15px; text-align:center; font-size:12px; color:#555;">
            © ${new Date().getFullYear()} CarZilla. All rights reserved.
          </div>
        </div>
      </div>
    `,
  };
  try {
    await sgMail.send(msg);
    console.log("✅ Cancellation email sent to", booking.user.email);
  } catch (err) {
    console.error("❌ Email failed:", err.response?.body || err.message);
  }
}
      res.json({ success: true, message: "STATUS UPDATED" });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Cancel booking

export const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const requester = req.user;
    if (!requester) return res.status(401).json({ success: false, message: 'Not authorized' });
    
    const booking = await Booking.findById(id).populate('user owner').populate('car');
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const requesterId = requester._id.toString();
    const isBookingUser = booking.user && booking.user._id.toString() === requesterId;
    const isBookingOwner = booking.owner && booking.owner._id.toString() === requesterId;
    // allow admins (if you have role), booking user or car owner to cancel
    if (!isBookingUser && !isBookingOwner && requester.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: cannot cancel this booking' });
    }

    booking.status = 'Cancelled';
    await booking.save();

    res.json({ success: true, message: "Booking cancelled successfully", booking });
  } catch (error) {
    console.error("Cancel booking error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};