const mongoose = require("mongoose");

async function connect() {
  const options = {
    dbName: process.env.DB_NAME,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true,
    retryWrites: true,
  };

  try {
    await mongoose.connect(process.env.DATABASE_URL, options);

    console.log("Connect success");
  } catch (error) {
    console.log("Connect failed");
  }
}

module.exports = { connect };
