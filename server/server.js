import express from "express";
import "dotenv/config";
import cors from "cors";
import connectDB from "./configs/db.js";
import userRouter from "./routes/userRoutes.js";
import ownerRouter from "./routes/ownerRoutes.js";
import bookingRouter from "./routes/bookingRoutes.js";
import paymentRouter from "./routes/paymentRoutes.js";
import chatRouter from "./routes/chatRoutes.js";
import { webhookHandler } from "./controllers/paymentController.js";
import Car from './models/Car.js';
import Booking from './models/Booking.js';

// INITIALIZE EXPRESS APP
const app = express()

// Connect Database
await connectDB()

// MIDDLEWARE
app.use(cors({
  origin: "https://carzilla-u6ho.onrender.com",
  credentials: true
}))


// Register Razorpay webhook route with raw body parser BEFORE express.json()
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), webhookHandler);

app.use(express.json());
app.use('/api/chat', chatRouter);

app.get('/', (req, res)=> res.send("Server is running"))
app.use('/api/user', userRouter)
app.use('/api/owner', ownerRouter)
app.use('/api/bookings', bookingRouter);
app.use('/api/payments', paymentRouter);

(async () => {
  try {
    await Car.collection.createIndex(
      {
        brand: "text",
        model: "text",
        description: "text",
        category: "text",
        location: "text"
      },
      { name: "CarTextIndex" }
    );
    console.log("Car text index created or already exists");
  } catch (err) {
    console.error("Could not create Car text index:", err.message);
  }
})();
(
  async () => {
    try {
      await Booking.collection.createIndex({ status: 'text' }, { name: 'BookingTextIndex' });
      console.log('Booking text index created or already exists');
    } catch (err) {
      console.error('Could not create Booking text index:', err.message);
    }
  }
)();

const PORT = process.env.PORT || 4020;

app.listen(PORT, () => console.log(`Server running on ${PORT}`))