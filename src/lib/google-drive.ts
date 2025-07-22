import { google } from "googleapis";

export function getGoogleDrive() {
  const jwt = new google.auth.JWT({
    keyFile: process.env.SERVICE_ACCOUNT_LOCATION,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  return google.drive({ version: "v3", auth: jwt });
}
