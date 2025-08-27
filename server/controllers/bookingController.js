import Booking from "../models/Booking.js"
import Car from "../models/Car.js"
import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";

dotenv.config();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// CHECK AVAILABILITY FOR GIVEN DATE

const checkAvailability = async (carId, pickupDate, returnDate) => {
    const bookings = await Booking.find({
        car: carId,
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
        const noOfDays = Math.ceil(returned - picked) / (1000* 60 * 60 * 24)
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
      const msg = {
        to: booking.user.email, // user’s email
        from: "noreply@howzellerz.store", // your verified sender
        subject: "Your Booking is Confirmed 🚗",
        html: `
          <h2>Hello ${booking.user.name},</h2>
          <p>Your booking for <b>${booking.car.brand} ${booking.car.model}</b> has been <b>confirmed</b>.</p>
          <p>
            <b>Pickup:</b> ${booking.pickupDate.toDateString()} <br/>
            <b>Return:</b> ${booking.returnDate.toDateString()} <br/>
            <b>Total:</b> ₹${booking.price}
          </p>
          <p>Thank you for choosing CarZilla 🚀</p>
        `,
      };

      try {
        await sgMail.send(msg);
        console.log("✅ Confirmation email sent to", booking.user.email);
      } catch (err) {
        console.error("❌ Email failed:", err.response?.body || err.message);
      }
    }
    // ✅ Send email if status is "Cancelled"
    else if (status === "Cancelled") {
      const msg = {
        to: booking.user.email, // user’s email
        from: "noreply@howzellerz.store", // your verified sender
        subject: "Your Booking is cancelled 🚗",
        html: `
          <h2>Hello ${booking.user.name},</h2>
          <p>Your booking for <b>${booking.car.brand} ${booking.car.model}</b> has been <b>cancelled</b>.</p>
          <p>
            <b>Pickup:</b> ${booking.pickupDate.toDateString()} <br/>
            <b>Return:</b> ${booking.returnDate.toDateString()} <br/>
            <b>Total:</b> $${booking.price}
          </p>
          <p>Thank you for choosing CarZilla 🚀</p>
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