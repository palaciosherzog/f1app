const { spawn } = require("child_process");

export const getScriptOutput = async (args: (String | number)[], logger: any, endFunc: (data: String) => void) => {
  logger.info(`Running script: "../f1analysis/.venv/Scripts/python.exe" "${args.join('" "')}"`);

  // can pass -u as first argument in args to not buffer console output
  const subprocess = spawn("../f1analysis/.venv/Scripts/python.exe", [...args]);

  let hadError: boolean = false;

  // get & record data until get all of the data
  let dataString = "";
  subprocess.stdout.on("data", (data: object) => {
    dataString += data.toString();
  });

  // call appropriate function based on success or failure
  subprocess.stderr.on("data", (data: object) => {
    hadError = true;
    dataString += data.toString();
    logger.error(`Error while running "${args[0]}":\n${data.toString()}`);
  });
  subprocess.on("exit", () => {
    logger.info("Completed successfully.");
    endFunc(dataString);
  });
};
