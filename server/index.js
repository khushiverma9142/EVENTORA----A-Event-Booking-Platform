
const dns = require("dns");

dns.setServers(["8.8.8.8", "8.8.4.4"]);

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const authRoutes = require("./routes/auth");
const eventRoutes = require("./routes/event");
const bookingRoutes = require("./routes/booking");

const app = express();
const PORT = process.env.PORT || 5000;
app.listen(PORT,()=>{
  console.log(`Server running on ${PORT}`);
});

// Enable CORS for the React frontend
app.use(cors({
  origin: [
    'http://localhost:5173',
    process.env.CLIENT_URL,
    
  ],
  credentials:true
}));

app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/bookings", bookingRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });
