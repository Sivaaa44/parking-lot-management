const mongoose = require('mongoose');
const ParkingLot = require('../models/parkingLot');
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const { getCurrentISTTime, formatISTDate } = require('./timeUtil');
require('dotenv').config();

// Chennai coordinates
const CHENNAI_COORDINATES = {
  lat: 13.0827,
  lng: 80.2707
};

// Sample parking lots in Chennai
const parkingLotData = [
  {
    name: 'T Nagar Parking Complex',
    address: 'Pondy Bazaar, T Nagar, Chennai',
    location: {
      type: 'Point',
      coordinates: [80.2338, 13.0417] // [longitude, latitude]
    },
    total_spots: { car: 1, bike: 1 },
    rates: {
      car: { first_hour: 50, additional_hour: 30, daily_cap: 300 },
      bike: { first_hour: 20, additional_hour: 10, daily_cap: 100 }
    }
  },
  {
    name: 'Marina Beach Parking',
    address: 'Marina Beach Road, Chennai',
    location: {
      type: 'Point',
      coordinates: [80.2830, 13.0557] // [longitude, latitude]
    },
    total_spots: { car: 1, bike: 1 },
    rates: {
      car: { first_hour: 60, additional_hour: 40, daily_cap: 350 },
      bike: { first_hour: 30, additional_hour: 15, daily_cap: 150 }
    }
  },
  {
    name: 'Phoenix MarketCity Parking',
    address: 'Velachery Main Road, Velachery, Chennai',
    location: {
      type: 'Point',
      coordinates: [80.2183, 12.9918] // [longitude, latitude]
    },
    total_spots: { car: 1, bike: 1 },
    rates: {
      car: { first_hour: 30, additional_hour: 20, daily_cap: 250 },
      bike: { first_hour: 15, additional_hour: 10, daily_cap: 120 }
    }
  },
  {
    name: 'Central Railway Station Parking',
    address: 'Chennai Central, Chennai',
    location: {
      type: 'Point',
      coordinates: [80.2765, 13.0831] // [longitude, latitude]
    },
    total_spots: { car: 1, bike: 1 },
    rates: {
      car: { first_hour: 40, additional_hour: 25, daily_cap: 280 },
      bike: { first_hour: 20, additional_hour: 10, daily_cap: 120 }
    }
  },
  {
    name: 'Anna Nagar Tower Parking',
    address: 'Anna Nagar, Chennai',
    location: {
      type: 'Point',
      coordinates: [80.2101, 13.0850] // [longitude, latitude]
    },
    total_spots: { car: 1, bike: 1 },
    rates: {
      car: { first_hour: 35, additional_hour: 20, daily_cap: 240 },
      bike: { first_hour: 15, additional_hour: 10, daily_cap: 100 }
    }
  }
];


// Function to seed the database
async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/parking-lot-management', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log(`Connected to MongoDB at ${formatISTDate(getCurrentISTTime())}`);
    
    // Check if data already exists
    const existingLots = await ParkingLot.countDocuments();
    if (existingLots > 0) {
      console.log('Data already seeded!');
      await mongoose.connection.close();
      return;
    }
    
    // Insert parking lots
    await ParkingLot.insertMany(parkingLotData);
    console.log('Parking lots seeded successfully!');
  
    
    console.log(`Database seeding completed at ${formatISTDate(getCurrentISTTime())}`);
    
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed function
seedDatabase(); 