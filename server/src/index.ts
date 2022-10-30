import cors from "cors";
import dotenv from "dotenv";
import express, { Express, Request, Response } from "express";
import { getScriptOutput } from "./getScriptOutput";

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

type RaceReq = {
  year: number;
};
type SessionId = {
  year: number;
  round: number;
  session: string;
};
type GraphArgs = {
  use_acc: boolean;
  x_axis: string;
};
type CompReq = {
  year: string;
  round: string;
  session: string;
  driver1: string;
  lap1: number;
  driver2: string;
  lap2: number;
  args?: GraphArgs;
};

// CONSIDERATION: could make these all into 'GET' functions, it would make more sense, but for now, this'll do

app.post("/races", (req: Request, res: Response) => {
  const { year }: RaceReq = req.body;
  getScriptOutput(["../f1analysis/getinfo.py", "races", year], logger, (data) => res.send(data));
});

app.post("/drivers", (req: Request, res: Response) => {
  const { year, round, session }: SessionId = req.body;
  getScriptOutput(["..f1analysis/getinfo.py", "drivers", year, round, session], logger, (data) => res.send(data));
});

app.post("/laps", (req: Request, res: Response) => {
  const { year, round, session }: SessionId = req.body;
  getScriptOutput(["../f1analysis/getinfo.py", "laps", year, round, session], logger, (data) => res.send(data));
});

// FOR THE FOLLOWING FUNCTIONS
// TODO: make this function get the race information of any race with any laps
// TODO: make this function more general to take any number of drivers & time comps to one reference driver

app.post("/both", (req: Request, res: Response) => {
  const { year, round, session, driver1, lap1, driver2, lap2, args }: CompReq = req.body;
  getScriptOutput(
    [
      "../f1analysis/getinfo.py",
      "comp",
      "both",
      year,
      round,
      session,
      driver1,
      lap1,
      driver2,
      lap2,
      JSON.stringify(args),
    ],
    logger,
    (data) => res.send(data)
  );
});

app.post("/graph", (req: Request, res: Response) => {
  const { year, round, session, driver1, lap1, driver2, lap2, args }: CompReq = req.body;
  getScriptOutput(
    [
      "../f1analysis/getinfo.py",
      "comp",
      "graph",
      year,
      round,
      session,
      driver1,
      lap1,
      driver2,
      lap2,
      JSON.stringify(args),
    ],
    logger,
    (data) => res.send(data)
  );
});

app.post("/map", (req: Request, res: Response) => {
  const { year, round, session, driver1, lap1, driver2, lap2, args }: CompReq = req.body;

  getScriptOutput(
    ["../f1analysis/getinfo.py", "comp", "map", year, round, session, driver1, lap1, driver2, lap2, "{}"],
    logger,
    (data) => res.send(data)
  );
});

app.get("/", (req: Request, res: Response) => {
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
