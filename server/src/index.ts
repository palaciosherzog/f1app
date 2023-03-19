import cors from "cors";
import dotenv from "dotenv";
import express, { Express, Request, Response } from "express";
import { getScriptOutput } from "./getScriptOutput";

// TODO: we should just make this a python server, so that the sessions don't need to be loaded again

// logger.js
const pino = require("pino");

// Create a logging instance
const logger = pino({
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
});

dotenv.config();

const app: Express = express();

app.use(express.json());
app.use(cors());

// TODO: could make these all into 'GET' functions, it would make more sense, but for now, this'll do

app.post("/races", (req: Request, res: Response) => {
  getScriptOutput(["../f1analysis/getinfo.py", "races", JSON.stringify(req.body)], logger, (data) => res.send(data));
});

app.post("/laps", (req: Request, res: Response) => {
  getScriptOutput(["../f1analysis/getinfo.py", "laps", JSON.stringify(req.body)], logger, (data) => res.send(data));
});

app.post("/comp", (req: Request, res: Response) => {
  getScriptOutput(["../f1analysis/getinfo.py", "comp", JSON.stringify(req.body)], logger, (data) => res.send(data));
});

app.get("/", (_req: Request, res: Response) => {
  const args = ["arg1", "arg2"];

  const sendData = (data: String) => {
    res.send(`SERVER CHECK<br>------------<br>Used arguments ${args}. Got back:<br>${data}`);
  };

  getScriptOutput(["../f1analysis/servercheck.py", ...args], logger, sendData);
});

const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`GraF1 API listening on port ${port}`);
});
