import dbConnect from "../lib/mongodb.js";
import Message from "../models/Message.js";

export default async function handler(req, res) {
  await dbConnect();

  const messages = await Message.find().sort({ createdAt: -1 });

  res.status(200).json(messages);
}