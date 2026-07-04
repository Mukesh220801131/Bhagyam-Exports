const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const User = require("./models/User");

dotenv.config({ path: path.join(__dirname, ".env") });

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.log("❌ Database Error:", error.message);
    process.exit(1);
  }
};

const createAdminUser = async () => {
  try {
    await connectDB();

    const existingAdmin = await User.findOne({ email: "admin@bhagyamexports.com" });

    if (existingAdmin) {
      existingAdmin.name = "Admin User";
      existingAdmin.role = "admin";
      existingAdmin.password = "Admin@123456";
      await existingAdmin.save();

      console.log("\n✅ Existing admin user updated successfully");
      console.log(`📧 Email: ${existingAdmin.email}`);
      console.log(`🔐 Password: Admin@123456`);
      console.log(`👤 Name: ${existingAdmin.name}`);
      console.log(`🔑 Role: ${existingAdmin.role}`);
      process.exit();
      return;
    }

    const adminUser = await User.create({
      name: "Admin User",
      email: "admin@bhagyamexports.com",
      password: "Admin@123456",
      role: "admin",
    });

    console.log("\n✅ Admin User Created Successfully");
    console.log(`📧 Email: ${adminUser.email}`);
    console.log(`🔐 Password: Admin@123456`);
    console.log(`👤 Name: ${adminUser.name}`);
    console.log(`🔑 Role: ${adminUser.role}`);

    process.exit();
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    process.exit(1);
  }
};

createAdminUser();
