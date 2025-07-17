import { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";

const protectedRoutes: FastifyPluginAsync = async (app) => {
  function ensureLoggedIn(
    req: FastifyRequest,
    reply: FastifyReply,
    done: () => void
  ) {
    if (!req.user) return reply.code(401).send({ error: "Auth required" });

    app.supabase
      .from("admins")
      .select("*")
      .eq("email", req.user.email)
      .single()
      .then(({ data: admin, error: adminError }) => {
        if (adminError || !admin)
          return reply.code(403).send({ error: "Email not allowed" });
        done();
      });
  }

  app.addHook("preValidation", ensureLoggedIn);

  app.withTypeProvider<JsonSchemaToTsProvider>().get(
    "/integrations/drive/list",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            kidUuid: { type: "string", format: "uuid" },
            pageSize: { type: "number", minimum: 1, maximum: 100, default: 10 },
            pageToken: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { kidUuid, pageSize = 10, pageToken } = request.query;

      let query: any = {
        pageSize,
        fields:
          "nextPageToken, files(id, name, mimeType, createdTime, size, parents, thumbnailLink, webViewLink)",
      };

      if (pageToken) {
        query.pageToken = pageToken;
      }

      // If kidUuid is provided, filter by the kid's folder
      if (kidUuid) {
        // First get the kid's folder_id from the database
        const { data: kid, error: kidError } = await app.supabase
          .from("kids")
          .select("folder_id")
          .eq("uuid", kidUuid)
          .single();

        if (kidError) {
          return reply.code(404).send({ error: "Student not found" });
        }

        if (!kid.folder_id) {
          return reply
            .code(400)
            .send({ error: "Student folder not configured" });
        }

        // Validate that the folder exists and is accessible
        try {
          const folderCheck = await app.drive.files.get({
            fileId: kid.folder_id,
            fields: "id, name, mimeType",
          });

          // Verify it's actually a folder
          if (
            folderCheck.data.mimeType !== "application/vnd.google-apps.folder"
          ) {
            request.log.warn(
              {
                kidUuid,
                folderId: kid.folder_id,
                mimeType: folderCheck.data.mimeType,
              },
              "Student folder ID points to a file, not a folder"
            );

            return reply.send({
              files: [],
              nextPageToken: null,
              hasMore: false,
              warning: "Student folder ID is invalid (not a folder)",
            });
          }

          request.log.info(
            {
              kidUuid,
              folderId: kid.folder_id,
              folderName: folderCheck.data.name,
            },
            "Successfully validated student folder"
          );
        } catch (folderError) {
          request.log.warn(
            {
              kidUuid,
              folderId: kid.folder_id,
              error:
                folderError instanceof Error
                  ? folderError.message
                  : folderError,
              errorCode:
                folderError instanceof Error ? folderError.message : "unknown",
            },
            "Student folder not accessible in Google Drive"
          );

          return reply.send({
            files: [],
            nextPageToken: null,
            hasMore: false,
            warning: "Student folder not found or not accessible",
          });
        }

        // Filter files by the kid's folder
        query.q = `'${kid.folder_id}' in parents and trashed=false`;
      } else {
        // If no kidUuid, just get non-trashed files
        query.q = "trashed=false";
      }

      try {
        const res = await app.drive.files.list(query);

        reply.send({
          files: res.data.files || [],
          nextPageToken: res.data.nextPageToken,
          hasMore: !!res.data.nextPageToken,
        });
      } catch (error) {
        request.log.error(
          {
            error: error,
            message: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
            query: query,
            kidUuid: kidUuid,
            pageToken: pageToken,
          },
          "Google Drive API error"
        );
        reply.code(500).send({
          error: "Failed to fetch files from Google Drive",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  app.get("/profile", async (req, reply) => {
    const { data: staff, error } = await app.supabase
      .from("users")
      .select("*")
      .eq("id", req.user!.id)
      .single();

    if (error) return reply.code(400).send({ error: error.message });
    reply.send(staff);
  });

  app.withTypeProvider<JsonSchemaToTsProvider>().get(
    "/kids",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            search: { type: "string" },
            page: { type: "number", minimum: 1, default: 1 },
            limit: { type: "number", minimum: 1, maximum: 100, default: 20 },
          },
        },
      },
    },
    async (request, reply) => {
      const { search, page = 1, limit = 20 } = request.query;
      const offset = (page - 1) * limit;

      let query = app.supabase
        .from("kids")
        .select("uuid, folder_id", { count: "exact" });

      // Add search functionality if search term is provided
      if (search && search.trim()) {
        const searchTerm = search.trim();

        // Try exact UUID match first, then fallback to text search
        try {
          // Check if it's a valid UUID format for exact match
          const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (uuidRegex.test(searchTerm)) {
            query = query.eq("uuid", searchTerm);
          } else {
            // For partial searches, we need to use a different approach
            // Since Supabase doesn't handle UUID::text well, let's use a workaround
            // We'll search using the raw PostgREST syntax
            const { data: allKids, error: searchError } = await app.supabase
              .from("kids")
              .select("uuid, folder_id")
              .limit(1000); // Get a reasonable number to search through

            if (searchError) throw searchError;

            // Filter in JavaScript for partial UUID matches
            const filteredKids =
              allKids?.filter((kid) =>
                kid.uuid.toLowerCase().includes(searchTerm.toLowerCase())
              ) || [];

            if (filteredKids.length === 0) {
              return reply.send({
                kids: [],
                pagination: {
                  page,
                  limit,
                  total: 0,
                  totalPages: 0,
                  hasMore: false,
                },
              });
            }

            // Get UUIDs that match our search
            const matchingUuids = filteredKids.map((kid) => kid.uuid);
            query = query.in("uuid", matchingUuids);
          }
        } catch (err) {
          request.log.error({ error: err }, "Error in search logic");
          // Fallback to no search if there's an issue
        }
      }

      // Add pagination
      query = query.range(offset, offset + limit - 1);

      const { data: kids, error, count } = await query;

      if (error) {
        request.log.error(
          {
            error: error,
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            query: { search, page, limit, offset },
          },
          "Error fetching kids from database"
        );
        return reply.code(500).send({
          error: "Failed to fetch students",
          details: error.message,
          code: error.code,
        });
      }

      const totalPages = Math.ceil((count || 0) / limit);
      const hasMore = page < totalPages;

      reply.send({
        kids: kids || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages,
          hasMore,
        },
      });
    }
  );

  app.withTypeProvider<JsonSchemaToTsProvider>().post(
    "/media",
    {
      schema: {
        body: {
          type: "object",
          required: ["kidUuid", "fileName"],
          properties: {
            kidUuid: { type: "string", format: "uuid" },
            fileName: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (req, reply) => {
      const { kidUuid, fileName } = req.body;
      const uploaderId = req.user!.id;

      const { data: kid, error: errorKid } = await app.supabase
        .from("kids")
        .select("id")
        .eq("uuid", kidUuid)
        .single();
      if (errorKid) {
        req.log.error(errorKid);
        return reply.code(404).send("kid not found");
      }

      const { data, error } = await app.supabase
        .from("media")
        .insert([
          {
            kid_id: kid.id,
            file_name: fileName,
            uploaded_by: uploaderId,
          },
        ])
        .select("id");
      if (error) {
        req.log.error(error);
        return reply.code(400).send({ error: error.message });
      }

      reply.code(201).send({ id: data[0].id });
    }
  );
};

export default protectedRoutes;
