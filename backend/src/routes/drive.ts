import { FastifyPluginAsync } from "fastify";
import { google } from "googleapis";

const driveRoutes: FastifyPluginAsync = async (app) => {
  app.get("/drive/list", async (request, reply) => {
    // @ts-ignore: Fastify session does not know custom properties
    if (!request.session.googleToken) {
      return reply.code(401).send({ error: "Not signed in" });
    }

    const oauth2Client = new google.auth.OAuth2();
    // @ts-ignore
    oauth2Client.setCredentials({ ...request.session.googleToken });

    const drive = google.drive({ version: "v3", auth: oauth2Client });
    const res = await drive.files.list({
      pageSize: 10,
      fields: "files(id, name)",
    });

    reply.send(res.data.files);
  });
};

export default driveRoutes;
