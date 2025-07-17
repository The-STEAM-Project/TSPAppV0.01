import fp from "fastify-plugin";
import { google } from "googleapis";

export default fp(async app => {
  const saLocation = app.config.SERVICE_ACCOUNT_LOCATION;
  const jwt = new google.auth.JWT({
    keyFile: saLocation,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  app.decorate("drive", google.drive({ version: "v3", auth: jwt }));
});
