import mongoose from 'mongoose';

// Define the structure of our test data
const TestDataSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    default: 'Success',
  }
});

// Check if the model already exists to prevent OverwriteModelError during hot reloads in Next.js
export default mongoose.models.TestData || mongoose.model('TestData', TestDataSchema);
