import express from "express";
import { getCars, getUserData, loginUser, registerUser, auth0Login, setPassword } from "../controllers/userController.js";
import { protect } from "../middleware/auth.js"
const userRouter = express.Router();

userRouter.post('/register', registerUser)
userRouter.post('/login', loginUser)
userRouter.post('/auth0', auth0Login)
userRouter.post('/set-password', protect, setPassword)
userRouter.get('/data', protect, getUserData)
userRouter.get('/cars', getCars)

export default userRouter