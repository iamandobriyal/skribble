import { MongoClient } from 'mongodb';

export default async function handler(req, res) {
  const count = parseInt(req.query.count) || 10;

  // Connect to MongoDB
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();

  const db = client.db('skribble');
  const wordsCollection = db.collection('words');

  // Get a random selection of words from the collection
  const wordDocs = await wordsCollection.aggregate([{$sample: {size: count}}]).toArray();

  // Extract only the 'word' field from each document
  const words = wordDocs.map(doc => doc.word);

  res.status(200).json(words);

  await client.close();
}