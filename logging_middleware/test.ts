import { Log, initLogger } from "./index";

// TODO: Replace these placeholders with your actual details obtained from registration
const authConfig = {
  email: "retiknyadav614@gmail.com",
  name: "Retik Kumar Yadav",
  rollNo: "12322762",
  accessCode: "TRvZWq",
  clientID: "e6b74e27-1ad5-4669-acf9-ed3a8c897a4f",
  clientSecret: "VSzdeZuZbUYwjMNh"
};

const runTest = async () => {
  console.log("Initializing Logger...");
  initLogger(authConfig);

  console.log("Sending a test log...");
  const result = await Log("backend", "error", "handler", "received string, expected bool");

  if (result) {
    console.log("Log successfully created:", result);
  } else {
    console.log("Failed to create log. Check the console errors.");
  }
};

runTest();
