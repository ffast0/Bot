
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  user: {
    type: String,
  },
  username: {
    type: String,
  },
  chatId: {
    type: Number,
  },
  text: {
    type: String,
  },
  type: {
    type: String,
  },
  date: {
    type: String,
  },
  time: {
    type: String,
  }
}, {
  timestamps: true   // createdAt va updatedAt qo‘shadi
});

export default mongoose.models.Message ||
       mongoose.model("Message", messageSchema);