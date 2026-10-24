import { AuthUser, OfficerContext } from "../modules/auth/auth.types.js";

declare module "fastify" {
  interface FastifyRequest {
    currentUser?: AuthUser;
    officerContext?: OfficerContext;
  }
}
