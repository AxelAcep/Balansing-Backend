const express = require("express");
const cors = require("cors");
require("dotenv").config();
const session = require("express-session");
const { passport } = require("./passport");

const router = require("./routers");
const NotFoundMiddleware = require("./middlewares/NotFoundHandler");
const ErrorHandlerMiddleware = require("./middlewares/ErrorHandler");

const app = express();
app.set("trust proxy", 1);
const port = 5500;

app.use(
  session({
    secret: "Service",
    resave: false,
    saveUninitialized: true,
  }),
);


app.use(cors());
app.use(express.json());
app.use("/api", router);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use(NotFoundMiddleware);
app.use(ErrorHandlerMiddleware);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
