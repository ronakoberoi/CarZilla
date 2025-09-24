import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  let token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ success: false, message: "Not Authorized" });
  }

  try {
  
    if (token.startsWith("Bearer ")) {
      token = token.split(" ")[1];
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(401).json({ success: false, message: "Not Authorized" });
    }

    req.user = await User.findById(decoded).select("-password");

    if (!req.user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Not Authorized" });
  }
};