const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const User = require("../models/User");

test("user passwords are hashed when a user is created", async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const email = `test-${Date.now()}@example.com`;
  const user = await User.create({
    name: "Test User",
    email,
    password: "Password123",
  });

  try {
    assert.notEqual(user.password, "Password123");
    assert.match(user.password, /^\$2[aby]\$/);
    assert.equal(await user.matchPassword("Password123"), true);
  } finally {
    await User.deleteOne({ _id: user._id });
    await mongoose.disconnect();
  }
});
